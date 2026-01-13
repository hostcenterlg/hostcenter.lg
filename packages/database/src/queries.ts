// ============================================
// VITAO JARVIS CRM - Database Queries
// ============================================

import { SupabaseClient } from '@supabase/supabase-js';
import {
  Customer,
  Order,
  Interaction,
  Task,
  KanbanCard,
  KanbanColumn,
  Profile,
  TodayTask,
  Customer360,
  DashboardMetrics,
  PriorityBucket,
  KanbanStage,
  LifecycleStatus,
} from '@jarvis/shared';

// ============ CUSTOMER QUERIES ============

export async function getCustomerById(
  supabase: SupabaseClient,
  customerId: string
): Promise<Customer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single();

  if (error || !data) return null;
  return data as Customer;
}

export async function getCustomersBySeller(
  supabase: SupabaseClient,
  sellerId: string,
  options: { limit?: number; offset?: number; status?: LifecycleStatus } = {}
): Promise<Customer[]> {
  let query = supabase
    .from('customers')
    .select('*')
    .eq('seller_id', sellerId);

  if (options.status) {
    query = query.eq('lifecycle_status', options.status);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error } = await query.order('updated_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Customer[];
}

export async function searchCustomers(
  supabase: SupabaseClient,
  query: string,
  options: { limit?: number } = {}
): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .or(`company_name.ilike.%${query}%,trade_name.ilike.%${query}%,contact_name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(options.limit || 20);

  if (error) throw error;
  return (data || []) as Customer[];
}

export async function findCustomerByIdentity(
  supabase: SupabaseClient,
  identity: { cnpj?: string; cpf?: string; phone?: string; email?: string }
): Promise<Customer | null> {
  // Priority: CNPJ > CPF > Phone > Email
  if (identity.cnpj) {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('cnpj', identity.cnpj)
      .single();
    if (data) return data as Customer;
  }

  if (identity.cpf) {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('cpf', identity.cpf)
      .single();
    if (data) return data as Customer;
  }

  if (identity.phone) {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', identity.phone)
      .single();
    if (data) return data as Customer;
  }

  if (identity.email) {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('email', identity.email)
      .single();
    if (data) return data as Customer;
  }

  return null;
}

// ============ TASK QUERIES ============

export async function getTodayTasks(
  supabase: SupabaseClient,
  options: {
    assignedTo?: string;
    bucket?: PriorityBucket;
    limit?: number;
    offset?: number;
  } = {}
): Promise<TodayTask[]> {
  let query = supabase
    .from('tasks')
    .select(`
      *,
      customer:customers(id, company_name, trade_name, contact_name, phone, email, lifecycle_status),
      seller:profiles(id, full_name, avatar_url)
    `)
    .in('status', ['PENDING', 'IN_PROGRESS']);

  if (options.assignedTo) {
    query = query.eq('assigned_to', options.assignedTo);
  }

  if (options.bucket) {
    query = query.eq('priority_bucket', options.bucket);
  }

  query = query
    .order('priority_bucket', { ascending: true })
    .order('priority_score', { ascending: false })
    .order('due_at', { ascending: true });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as TodayTask[];
}

export async function getTasksByCustomer(
  supabase: SupabaseClient,
  customerId: string
): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Task[];
}

// ============ KANBAN QUERIES ============

export async function getKanbanColumns(
  supabase: SupabaseClient
): Promise<KanbanColumn[]> {
  const { data, error } = await supabase
    .from('kanban_columns')
    .select('*')
    .order('position', { ascending: true });

  if (error) throw error;
  return (data || []) as KanbanColumn[];
}

export async function getKanbanCards(
  supabase: SupabaseClient,
  options: {
    stage?: KanbanStage;
    sellerId?: string;
    limit?: number;
  } = {}
): Promise<(KanbanCard & { customer: Customer })[]> {
  let query = supabase
    .from('kanban_cards')
    .select(`
      *,
      customer:customers(*)
    `);

  if (options.stage) {
    query = query.eq('stage', options.stage);
  }

  if (options.sellerId) {
    query = query.eq('seller_id', options.sellerId);
  }

  query = query.order('position', { ascending: true });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as (KanbanCard & { customer: Customer })[];
}

export async function getKanbanCardByCustomer(
  supabase: SupabaseClient,
  customerId: string
): Promise<KanbanCard | null> {
  const { data, error } = await supabase
    .from('kanban_cards')
    .select('*')
    .eq('customer_id', customerId)
    .single();

  if (error || !data) return null;
  return data as KanbanCard;
}

// ============ CUSTOMER 360 ============

export async function getCustomer360(
  supabase: SupabaseClient,
  customerId: string
): Promise<Customer360 | null> {
  // Fetch customer
  const customer = await getCustomerById(supabase, customerId);
  if (!customer) return null;

  // Fetch related data in parallel
  const [
    sellerResult,
    ordersResult,
    interactionsResult,
    tasksResult,
    kanbanCardResult,
  ] = await Promise.all([
    customer.seller_id
      ? supabase.from('profiles').select('*').eq('id', customer.seller_id).single()
      : { data: null },
    supabase
      .from('orders')
      .select('*')
      .eq('customer_id', customerId)
      .order('ordered_at', { ascending: false })
      .limit(20),
    supabase
      .from('interactions')
      .select('*')
      .eq('customer_id', customerId)
      .order('occurred_at', { ascending: false })
      .limit(50),
    supabase
      .from('tasks')
      .select('*')
      .eq('customer_id', customerId)
      .in('status', ['PENDING', 'IN_PROGRESS'])
      .order('priority_bucket', { ascending: true }),
    supabase
      .from('kanban_cards')
      .select('*')
      .eq('customer_id', customerId)
      .single(),
  ]);

  // Build timeline
  const timeline = buildTimeline(
    ordersResult.data || [],
    interactionsResult.data || [],
    tasksResult.data || []
  );

  return {
    customer,
    seller: sellerResult.data as Profile | null,
    orders: (ordersResult.data || []) as Order[],
    recent_interactions: (interactionsResult.data || []) as Interaction[],
    active_tasks: (tasksResult.data || []) as Task[],
    kanban_card: kanbanCardResult.data as KanbanCard | null,
    ai_summary: null, // Filled by AI service
    ai_next_actions: null, // Filled by AI service
    timeline,
  };
}

function buildTimeline(
  orders: Order[],
  interactions: Interaction[],
  tasks: Task[]
): Customer360['timeline'] {
  const events: Customer360['timeline'] = [];

  for (const order of orders) {
    events.push({
      id: order.id,
      type: 'ORDER',
      occurred_at: new Date(order.ordered_at),
      title: `Pedido #${order.order_number}`,
      description: `R$ ${order.net_amount.toFixed(2)} - ${order.status}`,
      metadata: { order_id: order.id },
    });
  }

  for (const interaction of interactions) {
    events.push({
      id: interaction.id,
      type: 'INTERACTION',
      occurred_at: new Date(interaction.occurred_at),
      title: `${interaction.channel} - ${interaction.direction}`,
      description: interaction.content_preview || interaction.subject || null,
      metadata: { channel: interaction.channel },
    });
  }

  for (const task of tasks) {
    events.push({
      id: task.id,
      type: 'TASK',
      occurred_at: new Date(task.created_at),
      title: task.title,
      description: task.reason_details,
      metadata: { priority: task.priority_bucket },
    });
  }

  return events.sort((a, b) => b.occurred_at.getTime() - a.occurred_at.getTime());
}

// ============ DASHBOARD QUERIES ============

export async function getDashboardMetrics(
  supabase: SupabaseClient,
  options: {
    startDate?: Date;
    endDate?: Date;
    teamId?: string;
  } = {}
): Promise<DashboardMetrics> {
  const startDate = options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = options.endDate || new Date();

  // Fetch funnel data
  const { data: funnelData } = await supabase
    .from('kanban_cards')
    .select('stage, value');

  const funnel = Object.values(KanbanStage).map(stage => {
    const cards = (funnelData || []).filter(c => c.stage === stage);
    return {
      stage,
      count: cards.length,
      value: cards.reduce((sum, c) => sum + (c.value || 0), 0),
    };
  });

  // Fetch pending tasks
  const { data: tasksData } = await supabase
    .from('tasks')
    .select('priority_bucket, due_at')
    .in('status', ['PENDING', 'IN_PROGRESS']);

  const now = new Date();
  const pendingTasks = Object.values(PriorityBucket).map(bucket => {
    const tasks = (tasksData || []).filter(t => t.priority_bucket === bucket);
    return {
      bucket,
      count: tasks.length,
      overdue_count: tasks.filter(t => new Date(t.due_at) < now).length,
    };
  });

  // Fetch SLA data
  const { data: slaData } = await supabase
    .from('kanban_cards')
    .select('sla_deadline')
    .not('sla_deadline', 'is', null);

  const sla = {
    on_time: (slaData || []).filter(c => !c.sla_deadline || new Date(c.sla_deadline) > now).length,
    breached: (slaData || []).filter(c => c.sla_deadline && new Date(c.sla_deadline) < now).length,
    at_risk: (slaData || []).filter(c => {
      if (!c.sla_deadline) return false;
      const deadline = new Date(c.sla_deadline);
      const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursLeft > 0 && hoursLeft <= 24;
    }).length,
  };

  // Fetch conversion data
  const { data: wonData } = await supabase
    .from('kanban_events')
    .select('id')
    .eq('to_stage', 'VENDA_CONCLUIDA')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  const { data: lostData } = await supabase
    .from('kanban_events')
    .select('id')
    .eq('to_stage', 'PERDIDO')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  const { data: leadsData } = await supabase
    .from('kanban_events')
    .select('id')
    .eq('event_type', 'CREATED')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  const totalWon = wonData?.length || 0;
  const totalLost = lostData?.length || 0;
  const totalLeads = leadsData?.length || 0;

  const conversion = {
    rate: totalLeads > 0 ? (totalWon / totalLeads) * 100 : 0,
    total_leads: totalLeads,
    total_won: totalWon,
    total_lost: totalLost,
  };

  // Fetch revenue data
  const { data: revenueData } = await supabase
    .from('orders')
    .select('net_amount')
    .gte('ordered_at', startDate.toISOString())
    .lte('ordered_at', endDate.toISOString());

  const totalRevenue = (revenueData || []).reduce((sum, o) => sum + o.net_amount, 0);
  const orderCount = revenueData?.length || 0;

  const revenue = {
    total: totalRevenue,
    average_ticket: orderCount > 0 ? totalRevenue / orderCount : 0,
    growth_percent: 0, // Would need previous period data
  };

  return {
    period: { start: startDate, end: endDate },
    funnel,
    pending_tasks: pendingTasks,
    sla,
    conversion,
    revenue,
  };
}

// ============ INTERACTION QUERIES ============

export async function getUnansweredInteractions(
  supabase: SupabaseClient,
  options: {
    sellerId?: string;
    minHoursOld?: number;
  } = {}
): Promise<Interaction[]> {
  let query = supabase
    .from('interactions')
    .select('*')
    .eq('direction', 'INBOUND')
    .is('responded_at', null);

  if (options.sellerId) {
    query = query.eq('seller_id', options.sellerId);
  }

  if (options.minHoursOld) {
    const cutoff = new Date(Date.now() - options.minHoursOld * 60 * 60 * 1000);
    query = query.lt('occurred_at', cutoff.toISOString());
  }

  query = query.order('occurred_at', { ascending: true });

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as Interaction[];
}

// ============ PROFILE QUERIES ============

export async function getProfileByAuthUid(
  supabase: SupabaseClient,
  authUid: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_uid', authUid)
    .single();

  if (error || !data) return null;
  return data as Profile;
}

export async function getTeamMembers(
  supabase: SupabaseClient,
  teamId: string
): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('team_id', teamId)
    .eq('active', true)
    .order('full_name', { ascending: true });

  if (error) throw error;
  return (data || []) as Profile[];
}
