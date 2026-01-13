// ============================================
// VITAO JARVIS CRM - Rules Engine
// ============================================

import {
  LifecycleStatus,
  PriorityBucket,
  ReasonCode,
  KanbanStage,
  Customer,
  Interaction,
  Task,
  KanbanCard,
  TenantSettings,
} from '../types';
import { daysBetween, addBusinessDays } from '../utils';

// ============ LIFECYCLE STATUS RULES ============

export interface LifecycleThresholds {
  ativo_max_days: number;
  em_risco_max_days: number;
  inativo_recente_max_days: number;
}

export const DEFAULT_LIFECYCLE_THRESHOLDS: LifecycleThresholds = {
  ativo_max_days: 50,
  em_risco_max_days: 60,
  inativo_recente_max_days: 90,
};

/**
 * Calculates lifecycle status based on days since last order
 */
export function calculateLifecycleStatus(
  daysSinceLastOrder: number | null,
  thresholds: LifecycleThresholds = DEFAULT_LIFECYCLE_THRESHOLDS
): LifecycleStatus {
  // New customers with no orders yet are considered ATIVO
  if (daysSinceLastOrder === null) {
    return LifecycleStatus.ATIVO;
  }

  if (daysSinceLastOrder <= thresholds.ativo_max_days) {
    return LifecycleStatus.ATIVO;
  }

  if (daysSinceLastOrder <= thresholds.em_risco_max_days) {
    return LifecycleStatus.EM_RISCO;
  }

  if (daysSinceLastOrder <= thresholds.inativo_recente_max_days) {
    return LifecycleStatus.INATIVO_RECENTE;
  }

  return LifecycleStatus.INATIVO_ANTIGO;
}

/**
 * Calculates days since last order for a customer
 */
export function calculateDaysSinceLastOrder(
  lastOrderAt: Date | null,
  referenceDate: Date = new Date()
): number | null {
  if (!lastOrderAt) return null;
  return daysBetween(lastOrderAt, referenceDate);
}

// ============ PRIORITY SCORING RULES ============

export interface PriorityWeights {
  sla_breaching: number;
  msg_unanswered_2h: number;
  complaint: number;
  repurchase_due: number;
  quote_stale_2d: number;
  followup_due: number;
  postsale_d45: number;
  overdue_multiplier: number;
}

export const DEFAULT_PRIORITY_WEIGHTS: PriorityWeights = {
  sla_breaching: 1000,
  msg_unanswered_2h: 900,
  complaint: 950,
  repurchase_due: 500,
  quote_stale_2d: 300,
  followup_due: 200,
  postsale_d45: 100,
  overdue_multiplier: 1.5,
};

export interface PriorityContext {
  // Customer data
  customer: Pick<Customer, 'id' | 'lifecycle_status' | 'last_order_at' | 'repurchase_cycle_days'>;

  // Recent interactions
  lastInboundInteraction: Pick<Interaction, 'occurred_at' | 'responded_at' | 'channel'> | null;

  // Kanban state
  kanbanCard: Pick<KanbanCard, 'stage' | 'entered_stage_at' | 'sla_deadline'> | null;

  // Pending follow-up
  pendingFollowup: { due_at: Date } | null;

  // Settings
  settings: Pick<TenantSettings, 'sla_hours' | 'repurchase_cycle_default_days' | 'business_days'>;

  // Reference date (for testing)
  now?: Date;
}

export interface PriorityResult {
  bucket: PriorityBucket;
  score: number;
  reason_code: ReasonCode;
  reason_details: string;
  due_at: Date;
  factors: PriorityFactor[];
}

export interface PriorityFactor {
  name: string;
  score: number;
  active: boolean;
  details: string;
}

/**
 * Calculates priority score and bucket for a customer
 */
export function calculatePriority(
  ctx: PriorityContext,
  weights: PriorityWeights = DEFAULT_PRIORITY_WEIGHTS
): PriorityResult {
  const now = ctx.now || new Date();
  const factors: PriorityFactor[] = [];

  // ============ P1 CHECKS (URGENT) ============

  // Check for complaint (would come from interaction analysis)
  // For now, we don't have this data in context - handled separately

  // Check for SLA breaching
  let slaBreach = false;
  let slaScore = 0;
  if (ctx.kanbanCard?.sla_deadline) {
    const hoursToDeadline = (ctx.kanbanCard.sla_deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursToDeadline <= 0) {
      slaBreach = true;
      slaScore = weights.sla_breaching * weights.overdue_multiplier;
    } else if (hoursToDeadline <= 2) {
      slaBreach = true;
      slaScore = weights.sla_breaching;
    }
  }
  factors.push({
    name: 'SLA_BREACHING',
    score: slaScore,
    active: slaBreach,
    details: slaBreach ? 'SLA próximo do prazo ou estourado' : 'SLA OK',
  });

  // Check for unanswered message > 2h
  let msgUnanswered = false;
  let msgScore = 0;
  if (ctx.lastInboundInteraction && !ctx.lastInboundInteraction.responded_at) {
    const hoursSinceMessage = (now.getTime() - ctx.lastInboundInteraction.occurred_at.getTime()) / (1000 * 60 * 60);
    if (hoursSinceMessage >= 2) {
      msgUnanswered = true;
      const overdueHours = hoursSinceMessage - 2;
      msgScore = weights.msg_unanswered_2h + (overdueHours * 10);
    }
  }
  factors.push({
    name: 'MSG_UNANSWERED_2H',
    score: msgScore,
    active: msgUnanswered,
    details: msgUnanswered ? 'Mensagem sem resposta há mais de 2h' : 'Sem mensagens pendentes',
  });

  // ============ P2 CHECKS (REPURCHASE) ============

  let repurchaseDue = false;
  let repurchaseScore = 0;
  const repurchaseCycle = ctx.customer.repurchase_cycle_days || ctx.settings.repurchase_cycle_default_days;

  if (ctx.customer.last_order_at) {
    const daysSince = daysBetween(ctx.customer.last_order_at, now);
    const daysUntilDue = repurchaseCycle - daysSince;

    // Trigger when within 5 days of cycle or overdue
    if (daysUntilDue <= 5) {
      repurchaseDue = true;
      if (daysUntilDue < 0) {
        // Overdue
        repurchaseScore = weights.repurchase_due * weights.overdue_multiplier;
      } else {
        repurchaseScore = weights.repurchase_due;
      }
    }
  }
  factors.push({
    name: 'REPURCHASE_DUE',
    score: repurchaseScore,
    active: repurchaseDue,
    details: repurchaseDue ? `Ciclo de recompra atingido (${repurchaseCycle} dias)` : 'Dentro do ciclo',
  });

  // ============ P3 CHECKS (FOLLOW-UP) ============

  // Quote stale > 2 days
  let quoteStale = false;
  let quoteScore = 0;
  if (ctx.kanbanCard?.stage === KanbanStage.ORCAMENTO_ENVIADO) {
    const daysSinceQuote = daysBetween(ctx.kanbanCard.entered_stage_at, now);
    if (daysSinceQuote >= 2) {
      quoteStale = true;
      quoteScore = weights.quote_stale_2d + ((daysSinceQuote - 2) * 20);
    }
  }
  factors.push({
    name: 'QUOTE_STALE_2D',
    score: quoteScore,
    active: quoteStale,
    details: quoteStale ? 'Orçamento enviado há mais de 2 dias' : 'N/A',
  });

  // Follow-up due (from EM_ATENDIMENTO)
  let followupDue = false;
  let followupScore = 0;
  if (ctx.pendingFollowup) {
    if (now >= ctx.pendingFollowup.due_at) {
      followupDue = true;
      const daysOverdue = daysBetween(ctx.pendingFollowup.due_at, now);
      followupScore = weights.followup_due * (1 + daysOverdue * 0.2);
    }
  } else if (ctx.kanbanCard?.stage === KanbanStage.EM_ATENDIMENTO) {
    // Auto-calculate follow-up due
    const followupDeadline = addBusinessDays(ctx.kanbanCard.entered_stage_at, 2, ctx.settings.business_days);
    if (now >= followupDeadline) {
      followupDue = true;
      followupScore = weights.followup_due;
    }
  }
  factors.push({
    name: 'FOLLOWUP_DUE',
    score: followupScore,
    active: followupDue,
    details: followupDue ? 'Follow-up pendente' : 'Sem follow-up pendente',
  });

  // ============ P4 CHECKS (POST-SALE) ============

  let postsaleDue = false;
  let postsaleScore = 0;
  if (ctx.customer.last_order_at) {
    const daysSinceOrder = daysBetween(ctx.customer.last_order_at, now);
    // D+45 post-sale check
    if (daysSinceOrder >= 45 && daysSinceOrder <= 50) {
      postsaleDue = true;
      postsaleScore = weights.postsale_d45;
    }
  }
  factors.push({
    name: 'POSTSALE_D45',
    score: postsaleScore,
    active: postsaleDue,
    details: postsaleDue ? 'Pós-venda D+45' : 'N/A',
  });

  // ============ DETERMINE PRIORITY ============

  const totalScore = factors.reduce((sum, f) => sum + f.score, 0);

  // Priority bucket based on precedence
  let bucket: PriorityBucket;
  let reason_code: ReasonCode;
  let reason_details: string;
  let due_at: Date;

  // P1 takes precedence
  const p1Active = factors.find(f => ['SLA_BREACHING', 'MSG_UNANSWERED_2H'].includes(f.name) && f.active);
  if (p1Active) {
    bucket = PriorityBucket.P1;
    if (p1Active.name === 'MSG_UNANSWERED_2H') {
      reason_code = ReasonCode.MSG_UNANSWERED_2H;
      reason_details = p1Active.details;
      due_at = now; // Immediate
    } else {
      reason_code = ReasonCode.SLA_BREACHING;
      reason_details = p1Active.details;
      due_at = ctx.kanbanCard?.sla_deadline || now;
    }
  }
  // P2
  else if (repurchaseDue) {
    bucket = PriorityBucket.P2;
    reason_code = ReasonCode.REPURCHASE_DUE;
    reason_details = factors.find(f => f.name === 'REPURCHASE_DUE')!.details;
    const cycle = ctx.customer.repurchase_cycle_days || ctx.settings.repurchase_cycle_default_days;
    due_at = ctx.customer.last_order_at
      ? new Date(ctx.customer.last_order_at.getTime() + cycle * 24 * 60 * 60 * 1000)
      : now;
  }
  // P3
  else if (quoteStale || followupDue) {
    bucket = PriorityBucket.P3;
    if (quoteStale) {
      reason_code = ReasonCode.QUOTE_STALE_2D;
      reason_details = factors.find(f => f.name === 'QUOTE_STALE_2D')!.details;
      due_at = addBusinessDays(ctx.kanbanCard!.entered_stage_at, 1, ctx.settings.business_days);
    } else {
      reason_code = ReasonCode.FOLLOWUP_DUE;
      reason_details = factors.find(f => f.name === 'FOLLOWUP_DUE')!.details;
      due_at = ctx.pendingFollowup?.due_at || now;
    }
  }
  // P4
  else if (postsaleDue) {
    bucket = PriorityBucket.P4;
    reason_code = ReasonCode.POSTSALE_D45;
    reason_details = factors.find(f => f.name === 'POSTSALE_D45')!.details;
    due_at = ctx.customer.last_order_at
      ? new Date(ctx.customer.last_order_at.getTime() + 45 * 24 * 60 * 60 * 1000)
      : now;
  }
  // No priority
  else {
    // Default to lowest priority with no specific reason
    bucket = PriorityBucket.P4;
    reason_code = ReasonCode.POSTSALE_D45; // Placeholder
    reason_details = 'Sem ação prioritária';
    due_at = addBusinessDays(now, 7, ctx.settings.business_days);
  }

  return {
    bucket,
    score: totalScore,
    reason_code,
    reason_details,
    due_at,
    factors,
  };
}

// ============ KANBAN RULES ============

export interface KanbanTrigger {
  stage: KanbanStage;
  action: 'FOLLOWUP' | 'POSTSALE' | 'REMINDER';
  business_days: number;
  description: string;
}

export const KANBAN_TRIGGERS: KanbanTrigger[] = [
  {
    stage: KanbanStage.ORCAMENTO_ENVIADO,
    action: 'FOLLOWUP',
    business_days: 1,
    description: 'Follow-up após envio de orçamento',
  },
  {
    stage: KanbanStage.EM_ATENDIMENTO,
    action: 'FOLLOWUP',
    business_days: 2,
    description: 'Follow-up durante atendimento',
  },
  {
    stage: KanbanStage.VENDA_CONCLUIDA,
    action: 'POSTSALE',
    business_days: 45,
    description: 'Pós-venda / CS',
  },
];

/**
 * Calculates the SLA deadline for a kanban stage
 */
export function calculateSLADeadline(
  stage: KanbanStage,
  enteredAt: Date,
  businessDays: number[] = [1, 2, 3, 4, 5],
  slaDays?: number
): Date | null {
  const trigger = KANBAN_TRIGGERS.find(t => t.stage === stage);
  if (!trigger && !slaDays) return null;

  const days = slaDays ?? trigger!.business_days;
  return addBusinessDays(enteredAt, days, businessDays);
}

// ============ IDENTITY MATCHING ============

export interface IdentityMatch {
  type: 'CNPJ' | 'CPF' | 'PHONE' | 'EMAIL';
  value: string;
  confidence: number;
}

/**
 * Finds potential identity matches for a customer
 * Returns matches in order of confidence (CNPJ > CPF > PHONE > EMAIL)
 */
export function findIdentityMatches(
  customer: Pick<Customer, 'cnpj' | 'cpf' | 'phone' | 'email'>
): IdentityMatch[] {
  const matches: IdentityMatch[] = [];

  if (customer.cnpj) {
    matches.push({ type: 'CNPJ', value: customer.cnpj, confidence: 1.0 });
  }

  if (customer.cpf) {
    matches.push({ type: 'CPF', value: customer.cpf, confidence: 1.0 });
  }

  if (customer.phone) {
    matches.push({ type: 'PHONE', value: customer.phone, confidence: 0.9 });
  }

  if (customer.email) {
    matches.push({ type: 'EMAIL', value: customer.email, confidence: 0.8 });
  }

  return matches;
}

/**
 * Determines if two customers are likely the same entity
 */
export function areCustomersMatching(
  a: Pick<Customer, 'cnpj' | 'cpf' | 'phone' | 'email'>,
  b: Pick<Customer, 'cnpj' | 'cpf' | 'phone' | 'email'>
): { match: boolean; type: string | null; confidence: number } {
  // CNPJ is definitive
  if (a.cnpj && b.cnpj) {
    return {
      match: a.cnpj === b.cnpj,
      type: 'CNPJ',
      confidence: a.cnpj === b.cnpj ? 1.0 : 0,
    };
  }

  // CPF is definitive
  if (a.cpf && b.cpf) {
    return {
      match: a.cpf === b.cpf,
      type: 'CPF',
      confidence: a.cpf === b.cpf ? 1.0 : 0,
    };
  }

  // Phone is high confidence
  if (a.phone && b.phone && a.phone === b.phone) {
    return { match: true, type: 'PHONE', confidence: 0.9 };
  }

  // Email is medium confidence
  if (a.email && b.email && a.email === b.email) {
    return { match: true, type: 'EMAIL', confidence: 0.8 };
  }

  return { match: false, type: null, confidence: 0 };
}

// ============ TASK GENERATION ============

export interface TaskGenerationContext {
  customer: Customer;
  kanbanCard: KanbanCard | null;
  lastInboundInteraction: Interaction | null;
  settings: TenantSettings;
  existingTasks: Task[];
  now?: Date;
}

/**
 * Generates tasks for a customer based on business rules
 */
export function generateTasksForCustomer(ctx: TaskGenerationContext): Omit<Task, 'id' | 'created_at' | 'updated_at'>[] {
  const now = ctx.now || new Date();
  const tasks: Omit<Task, 'id' | 'created_at' | 'updated_at'>[] = [];

  // Skip if customer already has pending tasks for the same reason
  const existingReasons = new Set(
    ctx.existingTasks
      .filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS')
      .map(t => t.reason_code)
  );

  const priorityCtx: PriorityContext = {
    customer: ctx.customer,
    lastInboundInteraction: ctx.lastInboundInteraction,
    kanbanCard: ctx.kanbanCard,
    pendingFollowup: null,
    settings: ctx.settings,
    now,
  };

  const priority = calculatePriority(priorityCtx);

  // Only generate task if there's an active reason and no existing task for it
  if (priority.score > 0 && !existingReasons.has(priority.reason_code)) {
    tasks.push({
      tenant_id: ctx.customer.tenant_id,
      customer_id: ctx.customer.id,
      assigned_to: ctx.customer.seller_id,
      priority_bucket: priority.bucket,
      priority_score: priority.score,
      reason_code: priority.reason_code,
      reason_details: priority.reason_details,
      title: getTaskTitle(priority.reason_code),
      description: priority.reason_details,
      status: 'PENDING' as any,
      due_at: priority.due_at,
      completed_at: null,
      snoozed_until: null,
      ai_confidence: null,
      ai_suggestions: null,
      source: 'SYSTEM' as any,
    });
  }

  return tasks;
}

function getTaskTitle(reasonCode: ReasonCode): string {
  const titles: Record<ReasonCode, string> = {
    [ReasonCode.MSG_UNANSWERED_2H]: 'Responder mensagem pendente',
    [ReasonCode.COMPLAINT]: 'Tratar reclamação urgente',
    [ReasonCode.SLA_BREACHING]: 'SLA próximo do prazo',
    [ReasonCode.REPURCHASE_DUE]: 'Contatar para recompra',
    [ReasonCode.QUOTE_STALE_2D]: 'Acompanhar orçamento enviado',
    [ReasonCode.FOLLOWUP_DUE]: 'Realizar follow-up',
    [ReasonCode.POSTSALE_D45]: 'Pós-venda D+45',
  };
  return titles[reasonCode];
}

// ============ EXPORTS ============

export {
  DEFAULT_LIFECYCLE_THRESHOLDS as LIFECYCLE_THRESHOLDS,
  DEFAULT_PRIORITY_WEIGHTS as PRIORITY_WEIGHTS,
};
