-- ============================================
-- VITAO JARVIS CRM - Initial Schema
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE lifecycle_status AS ENUM (
  'ATIVO',
  'EM_RISCO',
  'INATIVO_RECENTE',
  'INATIVO_ANTIGO'
);

CREATE TYPE priority_bucket AS ENUM ('P1', 'P2', 'P3', 'P4');

CREATE TYPE reason_code AS ENUM (
  'MSG_UNANSWERED_2H',
  'COMPLAINT',
  'SLA_BREACHING',
  'REPURCHASE_DUE',
  'QUOTE_STALE_2D',
  'FOLLOWUP_DUE',
  'POSTSALE_D45'
);

CREATE TYPE task_status AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'SNOOZED'
);

CREATE TYPE kanban_stage AS ENUM (
  'LEAD',
  'QUALIFICACAO',
  'ORCAMENTO_ENVIADO',
  'EM_ATENDIMENTO',
  'NEGOCIACAO',
  'VENDA_CONCLUIDA',
  'PERDIDO'
);

CREATE TYPE interaction_channel AS ENUM (
  'WHATSAPP',
  'EMAIL',
  'PHONE',
  'MEETING',
  'SMS',
  'CHAT'
);

CREATE TYPE interaction_direction AS ENUM ('INBOUND', 'OUTBOUND');

CREATE TYPE user_role AS ENUM ('admin', 'manager', 'seller');

CREATE TYPE event_source AS ENUM (
  'CSV_IMPORT',
  'MERCOS',
  'DESKRIO',
  'MANUAL',
  'SYSTEM',
  'AI'
);

-- ============================================
-- MULTI-TENANT TABLES
-- ============================================

-- Tenants (companies using the CRM)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  settings JSONB NOT NULL DEFAULT '{
    "timezone": "America/Sao_Paulo",
    "business_days": [1, 2, 3, 4, 5],
    "sla_hours": 4,
    "repurchase_cycle_default_days": 30,
    "ai_enabled": true,
    "ai_auto_draft": false
  }',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Teams within tenants
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  manager_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_teams_tenant ON teams(tenant_id);

-- User profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_uid UUID UNIQUE NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  role user_role NOT NULL DEFAULT 'seller',
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_tenant ON profiles(tenant_id);
CREATE INDEX idx_profiles_auth_uid ON profiles(auth_uid);
CREATE INDEX idx_profiles_team ON profiles(team_id);

-- Add foreign key for team manager after profiles exists
ALTER TABLE teams ADD CONSTRAINT fk_teams_manager
  FOREIGN KEY (manager_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- ============================================
-- CORE TABLES
-- ============================================

-- Customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Identification
  external_id VARCHAR(255),
  cnpj VARCHAR(14),
  cpf VARCHAR(11),
  phone VARCHAR(20),
  email VARCHAR(255),

  -- Basic info
  company_name VARCHAR(255),
  trade_name VARCHAR(255),
  contact_name VARCHAR(255),

  -- Address
  address_street VARCHAR(255),
  address_number VARCHAR(50),
  address_complement VARCHAR(100),
  address_neighborhood VARCHAR(100),
  address_city VARCHAR(100),
  address_state VARCHAR(2),
  address_zip VARCHAR(10),

  -- Business metrics (denormalized for performance)
  last_order_at TIMESTAMPTZ,
  first_order_at TIMESTAMPTZ,
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_revenue DECIMAL(15,2) NOT NULL DEFAULT 0,
  average_ticket DECIMAL(15,2) NOT NULL DEFAULT 0,
  repurchase_cycle_days INTEGER,

  -- Lifecycle
  lifecycle_status lifecycle_status NOT NULL DEFAULT 'ATIVO',
  days_since_last_order INTEGER,

  -- Metadata
  tags TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_customers_seller ON customers(seller_id);
CREATE INDEX idx_customers_lifecycle ON customers(tenant_id, lifecycle_status);
CREATE INDEX idx_customers_cnpj ON customers(tenant_id, cnpj) WHERE cnpj IS NOT NULL;
CREATE INDEX idx_customers_cpf ON customers(tenant_id, cpf) WHERE cpf IS NOT NULL;
CREATE INDEX idx_customers_phone ON customers(tenant_id, phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_customers_email ON customers(tenant_id, email) WHERE email IS NOT NULL;
CREATE INDEX idx_customers_last_order ON customers(tenant_id, last_order_at);
CREATE INDEX idx_customers_search ON customers USING gin(
  (company_name || ' ' || COALESCE(trade_name, '') || ' ' || COALESCE(contact_name, '')) gin_trgm_ops
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  external_id VARCHAR(255),
  order_number VARCHAR(100) NOT NULL,

  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  shipping_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(15,2) NOT NULL DEFAULT 0,

  ordered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  notes TEXT,
  source event_source NOT NULL DEFAULT 'MANUAL',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_tenant ON orders(tenant_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_seller ON orders(seller_id);
CREATE INDEX idx_orders_ordered_at ON orders(tenant_id, ordered_at);
CREATE INDEX idx_orders_external ON orders(tenant_id, external_id) WHERE external_id IS NOT NULL;

-- Order Items
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  product_sku VARCHAR(100) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(15,2) NOT NULL,
  total_price DECIMAL(15,2) NOT NULL,
  discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- Interactions
CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  external_id VARCHAR(255),
  channel interaction_channel NOT NULL,
  direction interaction_direction NOT NULL,

  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,

  subject VARCHAR(255),
  content TEXT,
  content_preview VARCHAR(500),
  payload_hash VARCHAR(64),

  -- AI analysis
  ai_summary TEXT,
  ai_intent VARCHAR(100),
  ai_sentiment_score INTEGER CHECK (ai_sentiment_score >= 0 AND ai_sentiment_score <= 100),
  ai_sentiment_label VARCHAR(20),
  ai_objections TEXT[],

  source event_source NOT NULL DEFAULT 'MANUAL',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_interactions_tenant ON interactions(tenant_id);
CREATE INDEX idx_interactions_customer ON interactions(customer_id);
CREATE INDEX idx_interactions_seller ON interactions(seller_id);
CREATE INDEX idx_interactions_occurred ON interactions(tenant_id, occurred_at);
CREATE INDEX idx_interactions_unanswered ON interactions(tenant_id, customer_id, occurred_at)
  WHERE direction = 'INBOUND' AND responded_at IS NULL;

-- ============================================
-- OPERATIONS TABLES
-- ============================================

-- Tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,

  priority_bucket priority_bucket NOT NULL,
  priority_score INTEGER NOT NULL DEFAULT 0,
  reason_code reason_code NOT NULL,
  reason_details TEXT,

  title VARCHAR(255) NOT NULL,
  description TEXT,

  status task_status NOT NULL DEFAULT 'PENDING',
  due_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,

  -- AI
  ai_confidence DECIMAL(3,2),
  ai_suggestions JSONB,

  source event_source NOT NULL DEFAULT 'SYSTEM',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_tenant ON tasks(tenant_id);
CREATE INDEX idx_tasks_customer ON tasks(customer_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(tenant_id, status);
CREATE INDEX idx_tasks_priority ON tasks(tenant_id, priority_bucket, priority_score DESC);
CREATE INDEX idx_tasks_due ON tasks(tenant_id, due_at) WHERE status IN ('PENDING', 'IN_PROGRESS');
CREATE INDEX idx_tasks_today ON tasks(tenant_id, assigned_to, priority_bucket, status)
  WHERE status IN ('PENDING', 'IN_PROGRESS');

-- Task Events
CREATE TABLE task_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  event_type VARCHAR(50) NOT NULL,
  old_value JSONB,
  new_value JSONB,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_task_events_task ON task_events(task_id);
CREATE INDEX idx_task_events_actor ON task_events(actor_id);

-- ============================================
-- KANBAN TABLES
-- ============================================

-- Kanban Columns
CREATE TABLE kanban_columns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  stage kanban_stage NOT NULL,
  name VARCHAR(100) NOT NULL,
  position INTEGER NOT NULL,
  color VARCHAR(7) NOT NULL DEFAULT '#6B7280',
  sla_days INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, stage)
);

CREATE INDEX idx_kanban_columns_tenant ON kanban_columns(tenant_id);

-- Kanban Cards
CREATE TABLE kanban_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  column_id UUID NOT NULL REFERENCES kanban_columns(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  stage kanban_stage NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,

  title VARCHAR(255) NOT NULL,
  value DECIMAL(15,2),
  entered_stage_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sla_deadline TIMESTAMPTZ,

  metadata JSONB NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, customer_id)
);

CREATE INDEX idx_kanban_cards_tenant ON kanban_cards(tenant_id);
CREATE INDEX idx_kanban_cards_column ON kanban_cards(column_id);
CREATE INDEX idx_kanban_cards_customer ON kanban_cards(customer_id);
CREATE INDEX idx_kanban_cards_seller ON kanban_cards(seller_id);
CREATE INDEX idx_kanban_cards_stage ON kanban_cards(tenant_id, stage);
CREATE INDEX idx_kanban_cards_sla ON kanban_cards(tenant_id, sla_deadline) WHERE sla_deadline IS NOT NULL;

-- Kanban Events (audit log)
CREATE TABLE kanban_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES kanban_cards(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('CREATED', 'MOVED', 'UPDATED', 'ARCHIVED')),
  from_stage kanban_stage,
  to_stage kanban_stage,

  trigger VARCHAR(20) NOT NULL CHECK (trigger IN ('MANUAL', 'RULE', 'INTEGRATION')),
  rule_name VARCHAR(100),

  metadata JSONB NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kanban_events_card ON kanban_events(card_id);
CREATE INDEX idx_kanban_events_tenant ON kanban_events(tenant_id, created_at);

-- ============================================
-- OBSERVABILITY TABLES
-- ============================================

-- Event Log (for idempotency and audit)
CREATE TABLE event_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

  idempotency_key VARCHAR(64) NOT NULL,
  source event_source NOT NULL,
  external_event_id VARCHAR(255),

  event_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,

  payload_hash VARCHAR(64),
  payload JSONB NOT NULL DEFAULT '{}',

  processed_at TIMESTAMPTZ,
  error TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(idempotency_key)
);

CREATE INDEX idx_event_log_tenant ON event_log(tenant_id);
CREATE INDEX idx_event_log_source ON event_log(source, created_at);
CREATE INDEX idx_event_log_entity ON event_log(entity_type, entity_id);
CREATE INDEX idx_event_log_unprocessed ON event_log(source, created_at) WHERE processed_at IS NULL;

-- AI Runs (track AI usage)
CREATE TABLE ai_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  function_name VARCHAR(100) NOT NULL,
  input_hash VARCHAR(64) NOT NULL,

  model VARCHAR(100) NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,

  input JSONB NOT NULL,
  output JSONB NOT NULL,

  confidence DECIMAL(3,2),
  feedback VARCHAR(10) CHECK (feedback IN ('positive', 'negative')),
  feedback_at TIMESTAMPTZ,
  feedback_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_runs_tenant ON ai_runs(tenant_id, created_at);
CREATE INDEX idx_ai_runs_function ON ai_runs(function_name, created_at);
CREATE INDEX idx_ai_runs_feedback ON ai_runs(tenant_id, feedback) WHERE feedback IS NOT NULL;

-- ============================================
-- IDENTITY RESOLUTION
-- ============================================

-- Identity Conflicts
CREATE TABLE identity_conflicts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  customer_id_a UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_id_b UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  match_type VARCHAR(10) NOT NULL CHECK (match_type IN ('CNPJ', 'CPF', 'PHONE', 'EMAIL')),
  match_value VARCHAR(255) NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,

  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolution VARCHAR(20) CHECK (resolution IN ('MERGE_A_INTO_B', 'MERGE_B_INTO_A', 'KEEP_SEPARATE')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_identity_conflicts_tenant ON identity_conflicts(tenant_id);
CREATE INDEX idx_identity_conflicts_unresolved ON identity_conflicts(tenant_id, created_at)
  WHERE resolved_at IS NULL;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    AND tablename IN ('tenants', 'teams', 'profiles', 'customers', 'orders',
      'order_items', 'interactions', 'tasks', 'kanban_columns', 'kanban_cards',
      'identity_conflicts')
  LOOP
    EXECUTE format('
      CREATE TRIGGER update_%s_updated_at
      BEFORE UPDATE ON %s
      FOR EACH ROW EXECUTE FUNCTION update_updated_at()
    ', t, t);
  END LOOP;
END;
$$;

-- Update customer metrics after order
CREATE OR REPLACE FUNCTION update_customer_metrics()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE customers SET
    total_orders = (SELECT COUNT(*) FROM orders WHERE customer_id = NEW.customer_id),
    total_revenue = (SELECT COALESCE(SUM(net_amount), 0) FROM orders WHERE customer_id = NEW.customer_id),
    average_ticket = (SELECT COALESCE(AVG(net_amount), 0) FROM orders WHERE customer_id = NEW.customer_id),
    last_order_at = (SELECT MAX(ordered_at) FROM orders WHERE customer_id = NEW.customer_id),
    first_order_at = (SELECT MIN(ordered_at) FROM orders WHERE customer_id = NEW.customer_id),
    days_since_last_order = EXTRACT(DAY FROM NOW() - (SELECT MAX(ordered_at) FROM orders WHERE customer_id = NEW.customer_id))::INTEGER
  WHERE id = NEW.customer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_update_customer_metrics
AFTER INSERT OR UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_customer_metrics();

-- Update lifecycle status based on days since last order
CREATE OR REPLACE FUNCTION update_lifecycle_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.days_since_last_order IS NULL THEN
    NEW.lifecycle_status = 'ATIVO';
  ELSIF NEW.days_since_last_order <= 50 THEN
    NEW.lifecycle_status = 'ATIVO';
  ELSIF NEW.days_since_last_order <= 60 THEN
    NEW.lifecycle_status = 'EM_RISCO';
  ELSIF NEW.days_since_last_order <= 90 THEN
    NEW.lifecycle_status = 'INATIVO_RECENTE';
  ELSE
    NEW.lifecycle_status = 'INATIVO_ANTIGO';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_update_lifecycle
BEFORE INSERT OR UPDATE OF days_since_last_order ON customers
FOR EACH ROW EXECUTE FUNCTION update_lifecycle_status();

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_conflicts ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's tenant_id
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM profiles WHERE auth_uid = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function to get current user's profile_id
CREATE OR REPLACE FUNCTION get_current_profile_id()
RETURNS UUID AS $$
  SELECT id FROM profiles WHERE auth_uid = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function to check if user is admin/manager
CREATE OR REPLACE FUNCTION is_admin_or_manager()
RETURNS BOOLEAN AS $$
  SELECT role IN ('admin', 'manager') FROM profiles WHERE auth_uid = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Tenants: Users can only see their own tenant
CREATE POLICY tenants_select ON tenants FOR SELECT
  USING (id = get_current_tenant_id());

-- Teams: Users can see teams in their tenant
CREATE POLICY teams_select ON teams FOR SELECT
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY teams_insert ON teams FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id() AND is_admin_or_manager());

CREATE POLICY teams_update ON teams FOR UPDATE
  USING (tenant_id = get_current_tenant_id() AND is_admin_or_manager());

-- Profiles: Users can see profiles in their tenant
CREATE POLICY profiles_select ON profiles FOR SELECT
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY profiles_update ON profiles FOR UPDATE
  USING (auth_uid = auth.uid() OR is_admin_or_manager());

-- Customers: Sellers see their own, managers/admins see all in tenant
CREATE POLICY customers_select ON customers FOR SELECT
  USING (
    tenant_id = get_current_tenant_id() AND
    (is_admin_or_manager() OR seller_id = get_current_profile_id() OR seller_id IS NULL)
  );

CREATE POLICY customers_insert ON customers FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY customers_update ON customers FOR UPDATE
  USING (
    tenant_id = get_current_tenant_id() AND
    (is_admin_or_manager() OR seller_id = get_current_profile_id())
  );

-- Orders: Same as customers
CREATE POLICY orders_select ON orders FOR SELECT
  USING (
    tenant_id = get_current_tenant_id() AND
    (is_admin_or_manager() OR seller_id = get_current_profile_id() OR seller_id IS NULL)
  );

CREATE POLICY orders_insert ON orders FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

-- Order Items: Through order access
CREATE POLICY order_items_select ON order_items FOR SELECT
  USING (
    order_id IN (SELECT id FROM orders WHERE tenant_id = get_current_tenant_id())
  );

CREATE POLICY order_items_insert ON order_items FOR INSERT
  WITH CHECK (
    order_id IN (SELECT id FROM orders WHERE tenant_id = get_current_tenant_id())
  );

-- Interactions: Same as customers
CREATE POLICY interactions_select ON interactions FOR SELECT
  USING (
    tenant_id = get_current_tenant_id() AND
    (is_admin_or_manager() OR seller_id = get_current_profile_id() OR seller_id IS NULL)
  );

CREATE POLICY interactions_insert ON interactions FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY interactions_update ON interactions FOR UPDATE
  USING (
    tenant_id = get_current_tenant_id() AND
    (is_admin_or_manager() OR seller_id = get_current_profile_id())
  );

-- Tasks: Sellers see assigned, managers/admins see all
CREATE POLICY tasks_select ON tasks FOR SELECT
  USING (
    tenant_id = get_current_tenant_id() AND
    (is_admin_or_manager() OR assigned_to = get_current_profile_id() OR assigned_to IS NULL)
  );

CREATE POLICY tasks_insert ON tasks FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY tasks_update ON tasks FOR UPDATE
  USING (
    tenant_id = get_current_tenant_id() AND
    (is_admin_or_manager() OR assigned_to = get_current_profile_id())
  );

-- Task Events
CREATE POLICY task_events_select ON task_events FOR SELECT
  USING (
    task_id IN (SELECT id FROM tasks WHERE tenant_id = get_current_tenant_id())
  );

CREATE POLICY task_events_insert ON task_events FOR INSERT
  WITH CHECK (
    task_id IN (SELECT id FROM tasks WHERE tenant_id = get_current_tenant_id())
  );

-- Kanban Columns: All in tenant
CREATE POLICY kanban_columns_select ON kanban_columns FOR SELECT
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY kanban_columns_all ON kanban_columns FOR ALL
  USING (tenant_id = get_current_tenant_id() AND is_admin_or_manager());

-- Kanban Cards: Same as customers
CREATE POLICY kanban_cards_select ON kanban_cards FOR SELECT
  USING (
    tenant_id = get_current_tenant_id() AND
    (is_admin_or_manager() OR seller_id = get_current_profile_id() OR seller_id IS NULL)
  );

CREATE POLICY kanban_cards_insert ON kanban_cards FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY kanban_cards_update ON kanban_cards FOR UPDATE
  USING (
    tenant_id = get_current_tenant_id() AND
    (is_admin_or_manager() OR seller_id = get_current_profile_id())
  );

-- Kanban Events
CREATE POLICY kanban_events_select ON kanban_events FOR SELECT
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY kanban_events_insert ON kanban_events FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

-- Event Log
CREATE POLICY event_log_select ON event_log FOR SELECT
  USING (tenant_id = get_current_tenant_id() OR tenant_id IS NULL);

CREATE POLICY event_log_insert ON event_log FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id() OR tenant_id IS NULL);

-- AI Runs
CREATE POLICY ai_runs_select ON ai_runs FOR SELECT
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY ai_runs_insert ON ai_runs FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY ai_runs_update ON ai_runs FOR UPDATE
  USING (tenant_id = get_current_tenant_id());

-- Identity Conflicts: Admins/managers only
CREATE POLICY identity_conflicts_select ON identity_conflicts FOR SELECT
  USING (tenant_id = get_current_tenant_id() AND is_admin_or_manager());

CREATE POLICY identity_conflicts_all ON identity_conflicts FOR ALL
  USING (tenant_id = get_current_tenant_id() AND is_admin_or_manager());
