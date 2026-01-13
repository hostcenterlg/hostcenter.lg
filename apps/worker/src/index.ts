// ============================================
// VITAO JARVIS CRM - Hardened Worker with pg-boss
// Production-ready with Correlation, Retry, DLQ
// ============================================

import 'dotenv/config';
import PgBoss from 'pg-boss';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import {
  calculateLifecycleStatus,
  calculatePriority,
  LIFECYCLE_THRESHOLDS,
  withRetry,
  sanitizeForLogging,
  type RetryConfig,
} from '@jarvis/shared';

// ============ CONFIG ============

const config = {
  databaseUrl: process.env.DATABASE_URL!,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  taskCheckIntervalMs: parseInt(process.env.TASK_CHECK_INTERVAL_MS || '60000', 10),
  dlqEnabled: process.env.DLQ_ENABLED !== 'false',
  maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
};

// ============ CLIENTS ============

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ============ CORRELATION CONTEXT ============

interface CorrelationContext {
  correlationId: string;
  parentEventId?: string;
  tenantId?: string;
  jobId?: string;
  jobName?: string;
}

function getCorrelationId(): string {
  return randomUUID();
}

// ============ STRUCTURED LOGGER ============

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  correlation_id?: string;
  job_id?: string;
  job_name?: string;
  tenant_id?: string;
  duration_ms?: number;
  [key: string]: unknown;
}

function log(
  level: LogLevel,
  message: string,
  context?: Partial<CorrelationContext>,
  data?: Record<string, unknown>
) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    correlation_id: context?.correlationId,
    job_id: context?.jobId,
    job_name: context?.jobName,
    tenant_id: context?.tenantId,
    ...sanitizeForLogging(data || {}),
  };

  // Remove undefined values
  Object.keys(entry).forEach((key) => {
    if (entry[key] === undefined) {
      delete entry[key];
    }
  });

  console.log(JSON.stringify(entry));
}

// ============ DLQ HANDLER ============

interface DLQEntry {
  tenant_id?: string;
  correlation_id?: string;
  queue_name: string;
  job_data: Record<string, unknown>;
  error_message: string;
  error_stack?: string;
  retry_count: number;
  max_retries: number;
}

async function sendToDLQ(entry: DLQEntry, ctx: CorrelationContext): Promise<void> {
  if (!config.dlqEnabled) {
    log('warn', 'DLQ disabled, dropping failed job', ctx, { queue: entry.queue_name });
    return;
  }

  try {
    const { error } = await supabase.from('dead_letter_queue').insert({
      tenant_id: entry.tenant_id,
      correlation_id: entry.correlation_id,
      queue_name: entry.queue_name,
      job_data: entry.job_data,
      error_message: entry.error_message,
      error_stack: entry.error_stack,
      retry_count: entry.retry_count,
      max_retries: entry.max_retries,
      status: 'PENDING',
    });

    if (error) {
      log('error', 'Failed to send to DLQ', ctx, { error: error.message });
    } else {
      log('info', 'Job sent to DLQ', ctx, { queue: entry.queue_name });
    }
  } catch (error) {
    log('error', 'DLQ insert error', ctx, {
      error: error instanceof Error ? error.message : 'Unknown',
    });
  }
}

// ============ EVENT LOG ============

async function logEvent(
  ctx: CorrelationContext,
  eventType: string,
  entityType: string,
  entityId: string | null,
  payload: Record<string, unknown>,
  durationMs?: number,
  error?: string
): Promise<void> {
  try {
    await supabase.from('event_log').insert({
      tenant_id: ctx.tenantId,
      correlation_id: ctx.correlationId,
      parent_event_id: ctx.parentEventId,
      idempotency_key: `${ctx.correlationId}:${eventType}:${entityId || 'none'}`,
      source: 'SYSTEM',
      event_type: eventType,
      entity_type: entityType,
      entity_id: entityId,
      payload: sanitizeForLogging(payload),
      duration_ms: durationMs,
      processed_at: error ? null : new Date(),
      error,
    });
  } catch (err) {
    log('error', 'Failed to log event', ctx, {
      error: err instanceof Error ? err.message : 'Unknown',
    });
  }
}

// ============ RETRY WRAPPER ============

const retryConfig: RetryConfig = {
  maxRetries: config.maxRetries,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterPercent: 20,
};

async function executeWithRetry<T>(
  fn: () => Promise<T>,
  ctx: CorrelationContext
): Promise<T> {
  const result = await withRetry(fn, retryConfig);

  if (!result.success) {
    throw result.error;
  }

  if (result.attempts > 1) {
    log('info', `Job succeeded after ${result.attempts} attempts`, ctx, {
      total_delay_ms: result.totalDelayMs,
    });
  }

  return result.result!;
}

// ============ JOB HANDLERS ============

interface UpdateLifecycleJob {
  tenantId: string;
}

async function handleUpdateLifecycle(job: PgBoss.Job<UpdateLifecycleJob>): Promise<void> {
  const correlationId = getCorrelationId();
  const { tenantId } = job.data;
  const startTime = Date.now();

  const ctx: CorrelationContext = {
    correlationId,
    jobId: job.id,
    jobName: 'update-lifecycle',
    tenantId,
  };

  log('info', 'Starting lifecycle update', ctx);

  try {
    await executeWithRetry(async () => {
      // Fetch all customers for tenant
      const { data: customers, error } = await supabase
        .from('customers')
        .select('id, last_order_at, lifecycle_status')
        .eq('tenant_id', tenantId);

      if (error) throw error;

      const now = new Date();
      let updated = 0;

      for (const customer of customers || []) {
        let daysSinceLastOrder: number | null = null;

        if (customer.last_order_at) {
          const lastOrder = new Date(customer.last_order_at);
          daysSinceLastOrder = Math.floor(
            (now.getTime() - lastOrder.getTime()) / (1000 * 60 * 60 * 24)
          );
        }

        const newStatus = calculateLifecycleStatus(daysSinceLastOrder, LIFECYCLE_THRESHOLDS);

        if (newStatus !== customer.lifecycle_status || daysSinceLastOrder !== null) {
          await supabase
            .from('customers')
            .update({
              lifecycle_status: newStatus,
              days_since_last_order: daysSinceLastOrder,
            })
            .eq('id', customer.id);
          updated++;
        }
      }

      const durationMs = Date.now() - startTime;

      await logEvent(
        ctx,
        'LIFECYCLE_UPDATE_COMPLETED',
        'tenant',
        tenantId,
        { totalCustomers: customers?.length || 0, updated },
        durationMs
      );

      log('info', 'Lifecycle update completed', ctx, {
        totalCustomers: customers?.length || 0,
        updated,
        duration_ms: durationMs,
      });
    }, ctx);
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    log('error', 'Lifecycle update failed', ctx, {
      error: errorMessage,
      duration_ms: durationMs,
    });

    await logEvent(
      ctx,
      'LIFECYCLE_UPDATE_FAILED',
      'tenant',
      tenantId,
      { error: errorMessage },
      durationMs,
      errorMessage
    );

    await sendToDLQ(
      {
        tenant_id: tenantId,
        correlation_id: correlationId,
        queue_name: 'update-lifecycle',
        job_data: job.data as Record<string, unknown>,
        error_message: errorMessage,
        error_stack: error instanceof Error ? error.stack : undefined,
        retry_count: (job.retrycount || 0) + 1,
        max_retries: config.maxRetries,
      },
      ctx
    );

    throw error;
  }
}

interface GenerateTasksJob {
  tenantId: string;
}

async function handleGenerateTasks(job: PgBoss.Job<GenerateTasksJob>): Promise<void> {
  const correlationId = getCorrelationId();
  const { tenantId } = job.data;
  const startTime = Date.now();

  const ctx: CorrelationContext = {
    correlationId,
    jobId: job.id,
    jobName: 'generate-tasks',
    tenantId,
  };

  log('info', 'Starting task generation', ctx);

  try {
    await executeWithRetry(async () => {
      // Fetch tenant settings
      const { data: tenant } = await supabase
        .from('tenants')
        .select('settings')
        .eq('id', tenantId)
        .single();

      const settings = tenant?.settings || {
        sla_hours: 4,
        repurchase_cycle_default_days: 30,
        business_days: [1, 2, 3, 4, 5],
      };

      // Fetch customers with their latest data
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', tenantId);

      if (customersError) throw customersError;

      let tasksCreated = 0;
      const now = new Date();

      for (const customer of customers || []) {
        // Check for existing pending tasks
        const { data: existingTasks } = await supabase
          .from('tasks')
          .select('reason_code')
          .eq('customer_id', customer.id)
          .in('status', ['PENDING', 'IN_PROGRESS']);

        const existingReasons = new Set((existingTasks || []).map((t) => t.reason_code));

        // Get last inbound interaction
        const { data: lastInteraction } = await supabase
          .from('interactions')
          .select('*')
          .eq('customer_id', customer.id)
          .eq('direction', 'INBOUND')
          .order('occurred_at', { ascending: false })
          .limit(1)
          .single();

        // Get kanban card
        const { data: kanbanCard } = await supabase
          .from('kanban_cards')
          .select('*')
          .eq('customer_id', customer.id)
          .single();

        // Calculate priority
        const priorityCtx = {
          customer: {
            id: customer.id,
            lifecycle_status: customer.lifecycle_status,
            last_order_at: customer.last_order_at ? new Date(customer.last_order_at) : null,
            repurchase_cycle_days: customer.repurchase_cycle_days,
          },
          lastInboundInteraction: lastInteraction
            ? {
                occurred_at: new Date(lastInteraction.occurred_at),
                responded_at: lastInteraction.responded_at
                  ? new Date(lastInteraction.responded_at)
                  : null,
                channel: lastInteraction.channel,
              }
            : null,
          kanbanCard: kanbanCard
            ? {
                stage: kanbanCard.stage,
                entered_stage_at: new Date(kanbanCard.entered_stage_at),
                sla_deadline: kanbanCard.sla_deadline ? new Date(kanbanCard.sla_deadline) : null,
              }
            : null,
          pendingFollowup: null,
          settings,
          now,
        };

        const priority = calculatePriority(priorityCtx);

        // Only create task if there's an active reason and no existing task
        if (priority.score > 0 && !existingReasons.has(priority.reason_code)) {
          const taskTitle = getTaskTitle(priority.reason_code);

          const { error: insertError } = await supabase.from('tasks').insert({
            tenant_id: tenantId,
            customer_id: customer.id,
            assigned_to: customer.seller_id,
            priority_bucket: priority.bucket,
            priority_score: priority.score,
            reason_code: priority.reason_code,
            reason_details: priority.reason_details,
            title: taskTitle,
            description: priority.reason_details,
            status: 'PENDING',
            due_at: priority.due_at,
            source: 'SYSTEM',
          });

          if (!insertError) {
            tasksCreated++;
          }
        }
      }

      const durationMs = Date.now() - startTime;

      await logEvent(
        ctx,
        'TASK_GENERATION_COMPLETED',
        'tenant',
        tenantId,
        { totalCustomers: customers?.length || 0, tasksCreated },
        durationMs
      );

      log('info', 'Task generation completed', ctx, {
        totalCustomers: customers?.length || 0,
        tasksCreated,
        duration_ms: durationMs,
      });
    }, ctx);
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    log('error', 'Task generation failed', ctx, {
      error: errorMessage,
      duration_ms: durationMs,
    });

    await sendToDLQ(
      {
        tenant_id: tenantId,
        correlation_id: correlationId,
        queue_name: 'generate-tasks',
        job_data: job.data as Record<string, unknown>,
        error_message: errorMessage,
        error_stack: error instanceof Error ? error.stack : undefined,
        retry_count: (job.retrycount || 0) + 1,
        max_retries: config.maxRetries,
      },
      ctx
    );

    throw error;
  }
}

function getTaskTitle(reasonCode: string): string {
  const titles: Record<string, string> = {
    MSG_UNANSWERED_2H: 'Responder mensagem pendente',
    COMPLAINT: 'Tratar reclamação urgente',
    SLA_BREACHING: 'SLA próximo do prazo',
    REPURCHASE_DUE: 'Contatar para recompra',
    QUOTE_STALE_2D: 'Acompanhar orçamento enviado',
    FOLLOWUP_DUE: 'Realizar follow-up',
    POSTSALE_D45: 'Pós-venda D+45',
  };
  return titles[reasonCode] || reasonCode;
}

interface ProcessEventLogJob {
  eventLogId: string;
}

async function handleProcessEventLog(job: PgBoss.Job<ProcessEventLogJob>): Promise<void> {
  const correlationId = getCorrelationId();
  const { eventLogId } = job.data;
  const startTime = Date.now();

  const ctx: CorrelationContext = {
    correlationId,
    jobId: job.id,
    jobName: 'process-event-log',
  };

  log('info', 'Processing event log', ctx, { eventLogId });

  try {
    await executeWithRetry(async () => {
      // Fetch event
      const { data: event, error } = await supabase
        .from('event_log')
        .select('*')
        .eq('id', eventLogId)
        .single();

      if (error || !event) {
        throw new Error(`Event not found: ${eventLogId}`);
      }

      ctx.tenantId = event.tenant_id;
      ctx.parentEventId = event.id;

      // Skip if already processed
      if (event.processed_at) {
        log('info', 'Event already processed', ctx, { eventLogId });
        return;
      }

      // Process based on event type
      // For now, just mark as processed
      const durationMs = Date.now() - startTime;

      await supabase
        .from('event_log')
        .update({
          processed_at: new Date(),
          duration_ms: durationMs,
          correlation_id: correlationId,
        })
        .eq('id', eventLogId);

      log('info', 'Event processed', ctx, {
        eventType: event.event_type,
        duration_ms: durationMs,
      });
    }, ctx);
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Mark as error
    await supabase
      .from('event_log')
      .update({
        error: errorMessage,
        duration_ms: durationMs,
      })
      .eq('id', eventLogId);

    log('error', 'Event processing failed', ctx, {
      error: errorMessage,
      duration_ms: durationMs,
    });

    await sendToDLQ(
      {
        correlation_id: correlationId,
        queue_name: 'process-event-log',
        job_data: job.data as Record<string, unknown>,
        error_message: errorMessage,
        error_stack: error instanceof Error ? error.stack : undefined,
        retry_count: (job.retrycount || 0) + 1,
        max_retries: config.maxRetries,
      },
      ctx
    );

    throw error;
  }
}

interface UpdateKanbanSLAJob {
  tenantId: string;
}

async function handleUpdateKanbanSLA(job: PgBoss.Job<UpdateKanbanSLAJob>): Promise<void> {
  const correlationId = getCorrelationId();
  const { tenantId } = job.data;
  const startTime = Date.now();

  const ctx: CorrelationContext = {
    correlationId,
    jobId: job.id,
    jobName: 'update-kanban-sla',
    tenantId,
  };

  log('info', 'Checking Kanban SLA breaches', ctx);

  try {
    await executeWithRetry(async () => {
      const now = new Date();

      // Find cards with breached SLA
      const { data: breachedCards, error } = await supabase
        .from('kanban_cards')
        .select('id, customer_id, stage, sla_deadline')
        .eq('tenant_id', tenantId)
        .not('sla_deadline', 'is', null)
        .lt('sla_deadline', now.toISOString());

      if (error) throw error;

      let tasksCreated = 0;

      for (const card of breachedCards || []) {
        // Check if task already exists
        const { data: existingTask } = await supabase
          .from('tasks')
          .select('id')
          .eq('customer_id', card.customer_id)
          .eq('reason_code', 'SLA_BREACHING')
          .in('status', ['PENDING', 'IN_PROGRESS'])
          .single();

        if (!existingTask) {
          // Get customer for seller_id
          const { data: customer } = await supabase
            .from('customers')
            .select('seller_id, company_name')
            .eq('id', card.customer_id)
            .single();

          // Create SLA breach task
          await supabase.from('tasks').insert({
            tenant_id: tenantId,
            customer_id: card.customer_id,
            assigned_to: customer?.seller_id,
            priority_bucket: 'P1',
            priority_score: 1000,
            reason_code: 'SLA_BREACHING',
            reason_details: `SLA estourado no estágio ${card.stage}`,
            title: 'SLA próximo do prazo',
            description: `Card de ${customer?.company_name || 'cliente'} está com SLA estourado`,
            status: 'PENDING',
            due_at: now,
            source: 'SYSTEM',
          });

          tasksCreated++;
        }
      }

      const durationMs = Date.now() - startTime;

      await logEvent(
        ctx,
        'SLA_CHECK_COMPLETED',
        'tenant',
        tenantId,
        { breachedCards: breachedCards?.length || 0, tasksCreated },
        durationMs
      );

      log('info', 'SLA check completed', ctx, {
        breachedCards: breachedCards?.length || 0,
        tasksCreated,
        duration_ms: durationMs,
      });
    }, ctx);
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    log('error', 'SLA check failed', ctx, {
      error: errorMessage,
      duration_ms: durationMs,
    });

    await sendToDLQ(
      {
        tenant_id: tenantId,
        correlation_id: correlationId,
        queue_name: 'update-kanban-sla',
        job_data: job.data as Record<string, unknown>,
        error_message: errorMessage,
        error_stack: error instanceof Error ? error.stack : undefined,
        retry_count: (job.retrycount || 0) + 1,
        max_retries: config.maxRetries,
      },
      ctx
    );

    throw error;
  }
}

// ============ HEALTH STATE ============

interface WorkerHealth {
  status: 'healthy' | 'unhealthy';
  uptime_ms: number;
  jobs_processed: number;
  jobs_failed: number;
  dlq_pending: number;
}

const workerStartTime = Date.now();

const workerHealth: WorkerHealth = {
  status: 'healthy',
  uptime_ms: 0,
  jobs_processed: 0,
  jobs_failed: 0,
  dlq_pending: 0,
};

function updateHealth(processed: boolean = true, failed: boolean = false): void {
  workerHealth.uptime_ms = Date.now() - workerStartTime;
  if (processed) workerHealth.jobs_processed++;
  if (failed) workerHealth.jobs_failed++;
}

async function updateDLQCount(): Promise<void> {
  try {
    const { count } = await supabase
      .from('dead_letter_queue')
      .select('id', { count: 'exact', head: true })
      .in('status', ['PENDING', 'RETRYING']);

    workerHealth.dlq_pending = count || 0;
  } catch {
    // Ignore errors
  }
}

// ============ MAIN ============

async function main(): Promise<void> {
  const correlationId = getCorrelationId();
  const ctx: CorrelationContext = { correlationId, jobName: 'startup' };

  log('info', 'Starting JARVIS CRM Worker', ctx, {
    concurrency: config.concurrency,
    dlq_enabled: config.dlqEnabled,
    max_retries: config.maxRetries,
  });

  // Initialize pg-boss
  const boss = new PgBoss(config.databaseUrl);

  boss.on('error', (error) => {
    log('error', 'pg-boss error', ctx, { error: error.message });
    workerHealth.status = 'unhealthy';
  });

  await boss.start();
  log('info', 'pg-boss started', ctx);

  // Register job handlers with completion tracking
  const wrapHandler = <T>(
    handler: (job: PgBoss.Job<T>) => Promise<void>
  ): ((job: PgBoss.Job<T>) => Promise<void>) => {
    return async (job: PgBoss.Job<T>) => {
      try {
        await handler(job);
        updateHealth(true, false);
      } catch (error) {
        updateHealth(true, true);
        throw error;
      }
    };
  };

  await boss.work<UpdateLifecycleJob>(
    'update-lifecycle',
    { teamConcurrency: config.concurrency },
    wrapHandler(handleUpdateLifecycle)
  );

  await boss.work<GenerateTasksJob>(
    'generate-tasks',
    { teamConcurrency: config.concurrency },
    wrapHandler(handleGenerateTasks)
  );

  await boss.work<ProcessEventLogJob>(
    'process-event-log',
    { teamConcurrency: config.concurrency },
    wrapHandler(handleProcessEventLog)
  );

  await boss.work<UpdateKanbanSLAJob>(
    'update-kanban-sla',
    { teamConcurrency: config.concurrency },
    wrapHandler(handleUpdateKanbanSLA)
  );

  log('info', 'Job handlers registered', ctx);

  // Schedule recurring jobs for each tenant
  const { data: tenants } = await supabase.from('tenants').select('id').eq('active', true);

  for (const tenant of tenants || []) {
    // Update lifecycle every hour
    await boss.schedule('update-lifecycle', `0 * * * *`, { tenantId: tenant.id });

    // Generate tasks every 5 minutes
    await boss.schedule('generate-tasks', `*/5 * * * *`, { tenantId: tenant.id });

    // Check SLA every 15 minutes
    await boss.schedule('update-kanban-sla', `*/15 * * * *`, { tenantId: tenant.id });

    log('info', 'Scheduled jobs for tenant', ctx, { tenantId: tenant.id });
  }

  // Update DLQ count periodically
  setInterval(updateDLQCount, 60000);
  await updateDLQCount();

  // Handle graceful shutdown
  const shutdown = async (): Promise<void> => {
    log('info', 'Shutting down worker', ctx);
    workerHealth.status = 'unhealthy';
    await boss.stop({ graceful: true });
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  log('info', 'Worker is running', ctx, {
    tenants_scheduled: tenants?.length || 0,
  });
}

main().catch((error) => {
  const ctx: CorrelationContext = { correlationId: getCorrelationId(), jobName: 'startup' };
  log('error', 'Worker failed to start', ctx, { error: error.message });
  process.exit(1);
});

// Export health for external monitoring
export { workerHealth };
