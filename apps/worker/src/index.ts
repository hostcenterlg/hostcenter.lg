// ============================================
// VITAO JARVIS CRM - Worker with pg-boss
// ============================================

import 'dotenv/config';
import PgBoss from 'pg-boss';
import { createClient } from '@supabase/supabase-js';
import { calculateLifecycleStatus, calculatePriority, LIFECYCLE_THRESHOLDS } from '@jarvis/shared';

// ============ CONFIG ============

const config = {
  databaseUrl: process.env.DATABASE_URL!,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  taskCheckIntervalMs: parseInt(process.env.TASK_CHECK_INTERVAL_MS || '60000', 10),
};

// ============ CLIENTS ============

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ============ LOGGER ============

function log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data,
  };
  console.log(JSON.stringify(entry));
}

// ============ JOB HANDLERS ============

interface UpdateLifecycleJob {
  tenantId: string;
}

async function handleUpdateLifecycle(job: PgBoss.Job<UpdateLifecycleJob>) {
  const { tenantId } = job.data;
  log('info', 'Starting lifecycle update', { tenantId, jobId: job.id });

  try {
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

    log('info', 'Lifecycle update completed', {
      tenantId,
      jobId: job.id,
      totalCustomers: customers?.length || 0,
      updated,
    });
  } catch (error) {
    log('error', 'Lifecycle update failed', {
      tenantId,
      jobId: job.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

interface GenerateTasksJob {
  tenantId: string;
}

async function handleGenerateTasks(job: PgBoss.Job<GenerateTasksJob>) {
  const { tenantId } = job.data;
  log('info', 'Starting task generation', { tenantId, jobId: job.id });

  try {
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

      const existingReasons = new Set((existingTasks || []).map(t => t.reason_code));

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
              sla_deadline: kanbanCard.sla_deadline
                ? new Date(kanbanCard.sla_deadline)
                : null,
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

    log('info', 'Task generation completed', {
      tenantId,
      jobId: job.id,
      totalCustomers: customers?.length || 0,
      tasksCreated,
    });
  } catch (error) {
    log('error', 'Task generation failed', {
      tenantId,
      jobId: job.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
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

async function handleProcessEventLog(job: PgBoss.Job<ProcessEventLogJob>) {
  const { eventLogId } = job.data;
  log('info', 'Processing event log', { eventLogId, jobId: job.id });

  try {
    // Fetch event
    const { data: event, error } = await supabase
      .from('event_log')
      .select('*')
      .eq('id', eventLogId)
      .single();

    if (error || !event) {
      throw new Error(`Event not found: ${eventLogId}`);
    }

    // Skip if already processed
    if (event.processed_at) {
      log('info', 'Event already processed', { eventLogId });
      return;
    }

    // Process based on event type
    // This is where you would handle different event types
    // For now, just mark as processed

    await supabase
      .from('event_log')
      .update({ processed_at: new Date() })
      .eq('id', eventLogId);

    log('info', 'Event processed', {
      eventLogId,
      jobId: job.id,
      eventType: event.event_type,
    });
  } catch (error) {
    // Mark as error
    await supabase
      .from('event_log')
      .update({ error: error instanceof Error ? error.message : 'Unknown error' })
      .eq('id', eventLogId);

    log('error', 'Event processing failed', {
      eventLogId,
      jobId: job.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

interface UpdateKanbanSLAJob {
  tenantId: string;
}

async function handleUpdateKanbanSLA(job: PgBoss.Job<UpdateKanbanSLAJob>) {
  const { tenantId } = job.data;
  log('info', 'Checking Kanban SLA breaches', { tenantId, jobId: job.id });

  try {
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

    log('info', 'SLA check completed', {
      tenantId,
      jobId: job.id,
      breachedCards: breachedCards?.length || 0,
      tasksCreated,
    });
  } catch (error) {
    log('error', 'SLA check failed', {
      tenantId,
      jobId: job.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

// ============ MAIN ============

async function main() {
  log('info', 'Starting JARVIS CRM Worker');

  // Initialize pg-boss
  const boss = new PgBoss(config.databaseUrl);

  boss.on('error', (error) => {
    log('error', 'pg-boss error', { error: error.message });
  });

  await boss.start();
  log('info', 'pg-boss started');

  // Register job handlers
  await boss.work<UpdateLifecycleJob>('update-lifecycle', { teamConcurrency: config.concurrency }, handleUpdateLifecycle);
  await boss.work<GenerateTasksJob>('generate-tasks', { teamConcurrency: config.concurrency }, handleGenerateTasks);
  await boss.work<ProcessEventLogJob>('process-event-log', { teamConcurrency: config.concurrency }, handleProcessEventLog);
  await boss.work<UpdateKanbanSLAJob>('update-kanban-sla', { teamConcurrency: config.concurrency }, handleUpdateKanbanSLA);

  log('info', 'Job handlers registered');

  // Schedule recurring jobs for each tenant
  const { data: tenants } = await supabase.from('tenants').select('id').eq('active', true);

  for (const tenant of tenants || []) {
    // Update lifecycle every hour
    await boss.schedule('update-lifecycle', `0 * * * *`, { tenantId: tenant.id });

    // Generate tasks every 5 minutes
    await boss.schedule('generate-tasks', `*/5 * * * *`, { tenantId: tenant.id });

    // Check SLA every 15 minutes
    await boss.schedule('update-kanban-sla', `*/15 * * * *`, { tenantId: tenant.id });

    log('info', 'Scheduled jobs for tenant', { tenantId: tenant.id });
  }

  // Handle graceful shutdown
  const shutdown = async () => {
    log('info', 'Shutting down worker');
    await boss.stop({ graceful: true });
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  log('info', 'Worker is running');
}

main().catch((error) => {
  log('error', 'Worker failed to start', { error: error.message });
  process.exit(1);
});
