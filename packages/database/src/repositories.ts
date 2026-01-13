// ============================================
// VITAO JARVIS CRM - Repositories
// ============================================

import { SupabaseClient } from '@supabase/supabase-js';
import {
  Customer,
  Order,
  OrderItem,
  Interaction,
  Task,
  TaskEvent,
  KanbanCard,
  KanbanEvent,
  EventLog,
  AIRun,
  IdentityConflict,
  Profile,
  Tenant,
  Team,
  KanbanColumn,
  KanbanStage,
  EventSource,
  TaskStatus,
} from '@jarvis/shared';
import { hashSHA256, createIdempotencyKey } from '@jarvis/shared';

// ============ BASE REPOSITORY ============

export abstract class BaseRepository<T extends { id: string }> {
  constructor(
    protected supabase: SupabaseClient,
    protected tableName: string
  ) {}

  async findById(id: string): Promise<T | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data as T;
  }

  async create(entity: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(entity)
      .select()
      .single();

    if (error) throw error;
    return data as T;
  }

  async update(id: string, updates: Partial<T>): Promise<T> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as T;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}

// ============ CUSTOMER REPOSITORY ============

export class CustomerRepository extends BaseRepository<Customer> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'customers');
  }

  async upsertByIdentity(
    tenantId: string,
    customer: Partial<Customer>
  ): Promise<{ customer: Customer; isNew: boolean }> {
    // Try to find existing by CNPJ, CPF, phone, or email
    const existing = await this.findByIdentity(tenantId, customer);

    if (existing) {
      const updated = await this.update(existing.id, customer);
      return { customer: updated, isNew: false };
    }

    const created = await this.create({
      tenant_id: tenantId,
      ...customer,
    } as any);

    return { customer: created, isNew: true };
  }

  async findByIdentity(
    tenantId: string,
    identity: { cnpj?: string | null; cpf?: string | null; phone?: string | null; email?: string | null }
  ): Promise<Customer | null> {
    if (identity.cnpj) {
      const { data } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('cnpj', identity.cnpj)
        .single();
      if (data) return data as Customer;
    }

    if (identity.cpf) {
      const { data } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('cpf', identity.cpf)
        .single();
      if (data) return data as Customer;
    }

    if (identity.phone) {
      const { data } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('phone', identity.phone)
        .single();
      if (data) return data as Customer;
    }

    if (identity.email) {
      const { data } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('email', identity.email)
        .single();
      if (data) return data as Customer;
    }

    return null;
  }

  async bulkCreate(customers: Omit<Customer, 'id' | 'created_at' | 'updated_at'>[]): Promise<Customer[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(customers)
      .select();

    if (error) throw error;
    return (data || []) as Customer[];
  }
}

// ============ ORDER REPOSITORY ============

export class OrderRepository extends BaseRepository<Order> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'orders');
  }

  async createWithItems(
    order: Omit<Order, 'id' | 'created_at' | 'updated_at'>,
    items: Omit<OrderItem, 'id' | 'order_id' | 'created_at' | 'updated_at'>[]
  ): Promise<{ order: Order; items: OrderItem[] }> {
    const createdOrder = await this.create(order);

    const orderItems = items.map(item => ({
      ...item,
      order_id: createdOrder.id,
    }));

    const { data: createdItems, error } = await this.supabase
      .from('order_items')
      .insert(orderItems)
      .select();

    if (error) throw error;

    return {
      order: createdOrder,
      items: (createdItems || []) as OrderItem[],
    };
  }

  async findByExternalId(tenantId: string, externalId: string): Promise<Order | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('external_id', externalId)
      .single();

    if (error || !data) return null;
    return data as Order;
  }
}

// ============ INTERACTION REPOSITORY ============

export class InteractionRepository extends BaseRepository<Interaction> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'interactions');
  }

  async markAsResponded(id: string, respondedAt: Date = new Date()): Promise<Interaction> {
    return this.update(id, { responded_at: respondedAt } as any);
  }

  async findByPayloadHash(tenantId: string, payloadHash: string): Promise<Interaction | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('payload_hash', payloadHash)
      .single();

    if (error || !data) return null;
    return data as Interaction;
  }
}

// ============ TASK REPOSITORY ============

export class TaskRepository extends BaseRepository<Task> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'tasks');
  }

  async updateStatus(
    id: string,
    status: TaskStatus,
    actorId?: string,
    notes?: string
  ): Promise<Task> {
    const task = await this.findById(id);
    if (!task) throw new Error('Task not found');

    const updates: Partial<Task> = { status } as any;

    if (status === 'COMPLETED') {
      (updates as any).completed_at = new Date();
    }

    const updatedTask = await this.update(id, updates);

    // Create event
    await this.supabase.from('task_events').insert({
      task_id: id,
      actor_id: actorId,
      event_type: 'STATUS_CHANGED',
      old_value: { status: task.status },
      new_value: { status },
      notes,
    });

    return updatedTask;
  }

  async snooze(id: string, until: Date, actorId?: string): Promise<Task> {
    const task = await this.findById(id);
    if (!task) throw new Error('Task not found');

    const updatedTask = await this.update(id, {
      status: 'SNOOZED',
      snoozed_until: until,
    } as any);

    await this.supabase.from('task_events').insert({
      task_id: id,
      actor_id: actorId,
      event_type: 'SNOOZED',
      old_value: { status: task.status },
      new_value: { status: 'SNOOZED', snoozed_until: until },
    });

    return updatedTask;
  }

  async findPendingByReasonCode(
    tenantId: string,
    customerId: string,
    reasonCode: string
  ): Promise<Task | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('customer_id', customerId)
      .eq('reason_code', reasonCode)
      .in('status', ['PENDING', 'IN_PROGRESS'])
      .single();

    if (error || !data) return null;
    return data as Task;
  }
}

// ============ KANBAN REPOSITORY ============

export class KanbanRepository {
  constructor(private supabase: SupabaseClient) {}

  async getColumns(tenantId: string): Promise<KanbanColumn[]> {
    const { data, error } = await this.supabase
      .from('kanban_columns')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('position', { ascending: true });

    if (error) throw error;
    return (data || []) as KanbanColumn[];
  }

  async initializeColumns(tenantId: string): Promise<KanbanColumn[]> {
    const defaultColumns = [
      { stage: 'LEAD', name: 'Leads', position: 0, color: '#6366F1', sla_days: null },
      { stage: 'QUALIFICACAO', name: 'Qualificação', position: 1, color: '#8B5CF6', sla_days: 2 },
      { stage: 'ORCAMENTO_ENVIADO', name: 'Orçamento Enviado', position: 2, color: '#F59E0B', sla_days: 1 },
      { stage: 'EM_ATENDIMENTO', name: 'Em Atendimento', position: 3, color: '#3B82F6', sla_days: 2 },
      { stage: 'NEGOCIACAO', name: 'Negociação', position: 4, color: '#10B981', sla_days: 3 },
      { stage: 'VENDA_CONCLUIDA', name: 'Venda Concluída', position: 5, color: '#22C55E', sla_days: null },
      { stage: 'PERDIDO', name: 'Perdido', position: 6, color: '#EF4444', sla_days: null },
    ];

    const columns = defaultColumns.map(col => ({
      tenant_id: tenantId,
      ...col,
    }));

    const { data, error } = await this.supabase
      .from('kanban_columns')
      .insert(columns)
      .select();

    if (error) throw error;
    return (data || []) as KanbanColumn[];
  }

  async createCard(card: Omit<KanbanCard, 'id' | 'created_at' | 'updated_at'>): Promise<KanbanCard> {
    const { data, error } = await this.supabase
      .from('kanban_cards')
      .insert(card)
      .select()
      .single();

    if (error) throw error;

    // Create event
    await this.supabase.from('kanban_events').insert({
      tenant_id: card.tenant_id,
      card_id: data.id,
      actor_id: null,
      event_type: 'CREATED',
      from_stage: null,
      to_stage: card.stage,
      trigger: 'MANUAL',
      metadata: {},
    });

    return data as KanbanCard;
  }

  async moveCard(
    cardId: string,
    toStage: KanbanStage,
    actorId?: string,
    trigger: 'MANUAL' | 'RULE' | 'INTEGRATION' = 'MANUAL',
    ruleName?: string
  ): Promise<KanbanCard> {
    // Get current card
    const { data: card, error: fetchError } = await this.supabase
      .from('kanban_cards')
      .select('*')
      .eq('id', cardId)
      .single();

    if (fetchError || !card) throw new Error('Card not found');

    // Get target column
    const { data: column, error: colError } = await this.supabase
      .from('kanban_columns')
      .select('*')
      .eq('tenant_id', card.tenant_id)
      .eq('stage', toStage)
      .single();

    if (colError || !column) throw new Error('Target column not found');

    const now = new Date();
    const slaDeadline = column.sla_days
      ? new Date(now.getTime() + column.sla_days * 24 * 60 * 60 * 1000)
      : null;

    // Update card
    const { data: updatedCard, error: updateError } = await this.supabase
      .from('kanban_cards')
      .update({
        column_id: column.id,
        stage: toStage,
        entered_stage_at: now,
        sla_deadline: slaDeadline,
      })
      .eq('id', cardId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Create event
    await this.supabase.from('kanban_events').insert({
      tenant_id: card.tenant_id,
      card_id: cardId,
      actor_id: actorId,
      event_type: 'MOVED',
      from_stage: card.stage,
      to_stage: toStage,
      trigger,
      rule_name: ruleName,
      metadata: { sla_deadline: slaDeadline },
    });

    return updatedCard as KanbanCard;
  }

  async getCardByCustomer(tenantId: string, customerId: string): Promise<KanbanCard | null> {
    const { data, error } = await this.supabase
      .from('kanban_cards')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('customer_id', customerId)
      .single();

    if (error || !data) return null;
    return data as KanbanCard;
  }
}

// ============ EVENT LOG REPOSITORY ============

export class EventLogRepository extends BaseRepository<EventLog> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'event_log');
  }

  async logEvent(
    tenantId: string | null,
    source: EventSource,
    eventType: string,
    entityType: string,
    payload: Record<string, unknown>,
    options: {
      externalEventId?: string;
      entityId?: string;
    } = {}
  ): Promise<EventLog> {
    const payloadHash = hashSHA256(JSON.stringify(payload));
    const idempotencyKey = createIdempotencyKey(
      source,
      options.externalEventId || payloadHash,
      eventType
    );

    // Check if already exists
    const { data: existing } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .single();

    if (existing) {
      return existing as EventLog;
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert({
        tenant_id: tenantId,
        idempotency_key: idempotencyKey,
        source,
        external_event_id: options.externalEventId,
        event_type: eventType,
        entity_type: entityType,
        entity_id: options.entityId,
        payload_hash: payloadHash,
        payload,
      })
      .select()
      .single();

    if (error) throw error;
    return data as EventLog;
  }

  async markProcessed(id: string, error?: string): Promise<void> {
    await this.supabase
      .from(this.tableName)
      .update({
        processed_at: new Date(),
        error,
      })
      .eq('id', id);
  }
}

// ============ AI RUN REPOSITORY ============

export class AIRunRepository extends BaseRepository<AIRun> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'ai_runs');
  }

  async recordFeedback(
    id: string,
    feedback: 'positive' | 'negative',
    userId: string
  ): Promise<AIRun> {
    return this.update(id, {
      feedback,
      feedback_at: new Date(),
      feedback_by: userId,
    } as any);
  }
}

// ============ IDENTITY CONFLICT REPOSITORY ============

export class IdentityConflictRepository extends BaseRepository<IdentityConflict> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'identity_conflicts');
  }

  async resolve(
    id: string,
    resolution: 'MERGE_A_INTO_B' | 'MERGE_B_INTO_A' | 'KEEP_SEPARATE',
    resolvedBy: string
  ): Promise<IdentityConflict> {
    return this.update(id, {
      resolution,
      resolved_at: new Date(),
      resolved_by: resolvedBy,
    } as any);
  }

  async findUnresolved(tenantId: string): Promise<IdentityConflict[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .is('resolved_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as IdentityConflict[];
  }
}

// ============ TENANT REPOSITORY ============

export class TenantRepository extends BaseRepository<Tenant> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'tenants');
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) return null;
    return data as Tenant;
  }
}

// ============ PROFILE REPOSITORY ============

export class ProfileRepository extends BaseRepository<Profile> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'profiles');
  }

  async findByAuthUid(authUid: string): Promise<Profile | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('auth_uid', authUid)
      .single();

    if (error || !data) return null;
    return data as Profile;
  }
}

// ============ FACTORY ============

export function createRepositories(supabase: SupabaseClient) {
  return {
    customers: new CustomerRepository(supabase),
    orders: new OrderRepository(supabase),
    interactions: new InteractionRepository(supabase),
    tasks: new TaskRepository(supabase),
    kanban: new KanbanRepository(supabase),
    eventLog: new EventLogRepository(supabase),
    aiRuns: new AIRunRepository(supabase),
    identityConflicts: new IdentityConflictRepository(supabase),
    tenants: new TenantRepository(supabase),
    profiles: new ProfileRepository(supabase),
  };
}
