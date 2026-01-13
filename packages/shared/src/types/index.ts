// ============================================
// VITAO JARVIS CRM - Core Types
// ============================================

// ============ ENUMS ============

export enum LifecycleStatus {
  ATIVO = 'ATIVO',
  EM_RISCO = 'EM_RISCO',
  INATIVO_RECENTE = 'INATIVO_RECENTE',
  INATIVO_ANTIGO = 'INATIVO_ANTIGO',
}

export enum PriorityBucket {
  P1 = 'P1',
  P2 = 'P2',
  P3 = 'P3',
  P4 = 'P4',
}

export enum ReasonCode {
  // P1 - Urgente
  MSG_UNANSWERED_2H = 'MSG_UNANSWERED_2H',
  COMPLAINT = 'COMPLAINT',
  SLA_BREACHING = 'SLA_BREACHING',

  // P2 - Recompra
  REPURCHASE_DUE = 'REPURCHASE_DUE',

  // P3 - Follow-up
  QUOTE_STALE_2D = 'QUOTE_STALE_2D',
  FOLLOWUP_DUE = 'FOLLOWUP_DUE',

  // P4 - Pós-venda
  POSTSALE_D45 = 'POSTSALE_D45',
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  SNOOZED = 'SNOOZED',
}

export enum KanbanStage {
  LEAD = 'LEAD',
  QUALIFICACAO = 'QUALIFICACAO',
  ORCAMENTO_ENVIADO = 'ORCAMENTO_ENVIADO',
  EM_ATENDIMENTO = 'EM_ATENDIMENTO',
  NEGOCIACAO = 'NEGOCIACAO',
  VENDA_CONCLUIDA = 'VENDA_CONCLUIDA',
  PERDIDO = 'PERDIDO',
}

export enum InteractionChannel {
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  MEETING = 'MEETING',
  SMS = 'SMS',
  CHAT = 'CHAT',
}

export enum InteractionDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  SELLER = 'seller',
}

export enum EventSource {
  CSV_IMPORT = 'CSV_IMPORT',
  MERCOS = 'MERCOS',
  DESKRIO = 'DESKRIO',
  MANUAL = 'MANUAL',
  SYSTEM = 'SYSTEM',
  AI = 'AI',
}

// ============ BASE ENTITIES ============

export interface BaseEntity {
  id: string;
  created_at: Date;
  updated_at: Date;
}

// ============ MULTI-TENANT ============

export interface Tenant extends BaseEntity {
  name: string;
  slug: string;
  settings: TenantSettings;
  active: boolean;
}

export interface TenantSettings {
  timezone: string;
  business_days: number[];
  sla_hours: number;
  repurchase_cycle_default_days: number;
  ai_enabled: boolean;
  ai_auto_draft: boolean;
}

export interface Team extends BaseEntity {
  tenant_id: string;
  name: string;
  manager_id: string | null;
}

export interface Profile extends BaseEntity {
  auth_uid: string;
  tenant_id: string;
  team_id: string | null;
  role: UserRole;
  full_name: string;
  email: string;
  avatar_url: string | null;
  active: boolean;
}

// ============ CORE ENTITIES ============

export interface Customer extends BaseEntity {
  tenant_id: string;
  seller_id: string | null;

  // Identification
  external_id: string | null;
  cnpj: string | null;
  cpf: string | null;
  phone: string | null; // E.164 format
  email: string | null;

  // Basic info
  company_name: string | null;
  trade_name: string | null;
  contact_name: string | null;

  // Address
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;

  // Business metrics
  last_order_at: Date | null;
  first_order_at: Date | null;
  total_orders: number;
  total_revenue: number;
  average_ticket: number;
  repurchase_cycle_days: number | null;

  // Lifecycle
  lifecycle_status: LifecycleStatus;
  days_since_last_order: number | null;

  // Metadata
  tags: string[];
  notes: string | null;
}

export interface Order extends BaseEntity {
  tenant_id: string;
  customer_id: string;
  seller_id: string | null;

  external_id: string | null;
  order_number: string;

  status: string;
  total_amount: number;
  discount_amount: number;
  shipping_amount: number;
  net_amount: number;

  ordered_at: Date;
  shipped_at: Date | null;
  delivered_at: Date | null;

  notes: string | null;
  source: EventSource;
}

export interface OrderItem extends BaseEntity {
  order_id: string;
  product_sku: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  discount_amount: number;
}

export interface Interaction extends BaseEntity {
  tenant_id: string;
  customer_id: string;
  seller_id: string | null;

  external_id: string | null;
  channel: InteractionChannel;
  direction: InteractionDirection;

  occurred_at: Date;
  responded_at: Date | null;

  subject: string | null;
  content: string | null;
  content_preview: string | null;
  payload_hash: string | null;

  // AI analysis
  ai_summary: string | null;
  ai_intent: string | null;
  ai_sentiment_score: number | null;
  ai_sentiment_label: string | null;
  ai_objections: string[] | null;

  source: EventSource;
}

// ============ OPERATIONS ============

export interface Task extends BaseEntity {
  tenant_id: string;
  customer_id: string;
  assigned_to: string | null;

  priority_bucket: PriorityBucket;
  priority_score: number;
  reason_code: ReasonCode;
  reason_details: string | null;

  title: string;
  description: string | null;

  status: TaskStatus;
  due_at: Date;
  completed_at: Date | null;
  snoozed_until: Date | null;

  // AI suggestions
  ai_confidence: number | null;
  ai_suggestions: AISuggestion[] | null;

  source: EventSource;
}

export interface TaskEvent extends BaseEntity {
  task_id: string;
  actor_id: string | null;

  event_type: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;

  notes: string | null;
}

// ============ KANBAN ============

export interface KanbanColumn extends BaseEntity {
  tenant_id: string;
  stage: KanbanStage;
  name: string;
  position: number;
  color: string;
  sla_days: number | null;
}

export interface KanbanCard extends BaseEntity {
  tenant_id: string;
  customer_id: string;
  column_id: string;
  seller_id: string | null;

  stage: KanbanStage;
  position: number;

  title: string;
  value: number | null;
  entered_stage_at: Date;
  sla_deadline: Date | null;

  metadata: Record<string, unknown>;
}

export interface KanbanEvent extends BaseEntity {
  tenant_id: string;
  card_id: string;
  actor_id: string | null;

  event_type: 'CREATED' | 'MOVED' | 'UPDATED' | 'ARCHIVED';
  from_stage: KanbanStage | null;
  to_stage: KanbanStage | null;

  trigger: 'MANUAL' | 'RULE' | 'INTEGRATION';
  rule_name: string | null;

  metadata: Record<string, unknown>;
}

// ============ OBSERVABILITY ============

export interface EventLog extends BaseEntity {
  tenant_id: string;

  idempotency_key: string;
  source: EventSource;
  external_event_id: string | null;

  event_type: string;
  entity_type: string;
  entity_id: string | null;

  payload_hash: string | null;
  payload: Record<string, unknown>;

  processed_at: Date | null;
  error: string | null;
}

export interface AIRun extends BaseEntity {
  tenant_id: string;

  function_name: string;
  input_hash: string;

  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  latency_ms: number;

  input: Record<string, unknown>;
  output: Record<string, unknown>;

  confidence: number | null;
  feedback: 'positive' | 'negative' | null;
  feedback_at: Date | null;
  feedback_by: string | null;
}

// ============ IDENTITY RESOLUTION ============

export interface IdentityConflict extends BaseEntity {
  tenant_id: string;

  customer_id_a: string;
  customer_id_b: string;

  match_type: 'CNPJ' | 'CPF' | 'PHONE' | 'EMAIL';
  match_value: string;
  confidence: number;

  resolved_at: Date | null;
  resolved_by: string | null;
  resolution: 'MERGE_A_INTO_B' | 'MERGE_B_INTO_A' | 'KEEP_SEPARATE' | null;
}

// ============ AI TYPES ============

export interface AISuggestion {
  action: string;
  reason: string;
  confidence: number;
}

export interface AIConversationSummary {
  summary: string;
  key_points: string[];
  action_items: string[];
  confidence: number;
}

export interface AIIntentClassification {
  intent: string;
  sub_intent: string | null;
  confidence: number;
  entities: Record<string, string>;
}

export interface AISentimentAnalysis {
  score: number; // 0-100
  label: 'VERY_NEGATIVE' | 'NEGATIVE' | 'NEUTRAL' | 'POSITIVE' | 'VERY_POSITIVE';
  confidence: number;
}

export interface AIObjectionDetection {
  objections: Array<{
    type: string;
    text: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    suggested_response: string;
  }>;
  confidence: number;
}

export interface AINextBestAction {
  suggestions: Array<{
    action: string;
    reason: string;
    priority: number;
    template_id: string | null;
  }>;
  confidence: number;
}

export interface AIDraftReply {
  draft: string;
  tone: string;
  confidence: number;
  alternatives: string[];
}

// ============ API/UI TYPES ============

export interface TodayTask extends Task {
  customer: Pick<Customer, 'id' | 'company_name' | 'trade_name' | 'contact_name' | 'phone' | 'email' | 'lifecycle_status'>;
  seller: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null;
}

export interface Customer360 {
  customer: Customer;
  seller: Profile | null;

  orders: Order[];
  recent_interactions: Interaction[];
  active_tasks: Task[];
  kanban_card: KanbanCard | null;

  ai_summary: AIConversationSummary | null;
  ai_next_actions: AINextBestAction | null;

  timeline: TimelineEvent[];
}

export interface TimelineEvent {
  id: string;
  type: 'ORDER' | 'INTERACTION' | 'TASK' | 'KANBAN' | 'NOTE';
  occurred_at: Date;
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
}

export interface DashboardMetrics {
  period: {
    start: Date;
    end: Date;
  };

  funnel: {
    stage: KanbanStage;
    count: number;
    value: number;
  }[];

  pending_tasks: {
    bucket: PriorityBucket;
    count: number;
    overdue_count: number;
  }[];

  sla: {
    on_time: number;
    breached: number;
    at_risk: number;
  };

  conversion: {
    rate: number;
    total_leads: number;
    total_won: number;
    total_lost: number;
  };

  revenue: {
    total: number;
    average_ticket: number;
    growth_percent: number;
  };
}

// ============ CSV IMPORT TYPES ============

export interface CSVImportResult {
  file: string;
  entity_type: 'CUSTOMER' | 'ORDER' | 'INTERACTION';
  total_rows: number;
  imported: number;
  skipped: number;
  errors: CSVImportError[];
  duration_ms: number;
}

export interface CSVImportError {
  row: number;
  field: string | null;
  value: string | null;
  error: string;
}

// ============ INTEGRATION TYPES ============

export interface IntegrationStatus {
  adapter: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  last_sync_at: Date | null;
  last_error: string | null;
  events_processed: number;
  events_pending: number;
}
