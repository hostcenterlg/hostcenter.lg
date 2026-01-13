-- ============================================
-- VITAO JARVIS CRM - Hardening Migration
-- Production Security, LGPD, Observability & Performance
-- ============================================

-- ============================================
-- 1. FIX RLS POLICIES
-- ============================================

-- Fix 1: profiles_update must check tenant_id
DROP POLICY IF EXISTS profiles_update ON profiles;
CREATE POLICY profiles_update ON profiles FOR UPDATE
  USING (
    tenant_id = get_current_tenant_id() AND
    (auth_uid = auth.uid() OR is_admin_or_manager())
  );

-- Fix 2: Remove conflicting kanban_columns policies
DROP POLICY IF EXISTS kanban_columns_select ON kanban_columns;
DROP POLICY IF EXISTS kanban_columns_all ON kanban_columns;

-- Recreate with proper separation
CREATE POLICY kanban_columns_select ON kanban_columns FOR SELECT
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY kanban_columns_insert ON kanban_columns FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id() AND is_admin_or_manager());

CREATE POLICY kanban_columns_update ON kanban_columns FOR UPDATE
  USING (tenant_id = get_current_tenant_id() AND is_admin_or_manager());

CREATE POLICY kanban_columns_delete ON kanban_columns FOR DELETE
  USING (tenant_id = get_current_tenant_id() AND is_admin_or_manager());

-- Fix 3: Remove conflicting identity_conflicts policies
DROP POLICY IF EXISTS identity_conflicts_select ON identity_conflicts;
DROP POLICY IF EXISTS identity_conflicts_all ON identity_conflicts;

-- Recreate with proper separation
CREATE POLICY identity_conflicts_select ON identity_conflicts FOR SELECT
  USING (tenant_id = get_current_tenant_id() AND is_admin_or_manager());

CREATE POLICY identity_conflicts_insert ON identity_conflicts FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id() AND is_admin_or_manager());

CREATE POLICY identity_conflicts_update ON identity_conflicts FOR UPDATE
  USING (tenant_id = get_current_tenant_id() AND is_admin_or_manager());

CREATE POLICY identity_conflicts_delete ON identity_conflicts FOR DELETE
  USING (tenant_id = get_current_tenant_id() AND is_admin_or_manager());

-- Fix 4: Add missing DELETE policies
CREATE POLICY customers_delete ON customers FOR DELETE
  USING (tenant_id = get_current_tenant_id() AND is_admin_or_manager());

CREATE POLICY orders_delete ON orders FOR DELETE
  USING (tenant_id = get_current_tenant_id() AND is_admin_or_manager());

CREATE POLICY interactions_delete ON interactions FOR DELETE
  USING (tenant_id = get_current_tenant_id() AND is_admin_or_manager());

CREATE POLICY tasks_delete ON tasks FOR DELETE
  USING (tenant_id = get_current_tenant_id() AND is_admin_or_manager());

CREATE POLICY kanban_cards_delete ON kanban_cards FOR DELETE
  USING (tenant_id = get_current_tenant_id() AND is_admin_or_manager());

CREATE POLICY teams_delete ON teams FOR DELETE
  USING (tenant_id = get_current_tenant_id() AND is_admin_or_manager());

-- Fix 5: Add tenant_id to order_items for direct RLS (avoid subquery)
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Backfill tenant_id from orders
UPDATE order_items oi
SET tenant_id = o.tenant_id
FROM orders o
WHERE oi.order_id = o.id AND oi.tenant_id IS NULL;

-- Make NOT NULL after backfill
ALTER TABLE order_items ALTER COLUMN tenant_id SET NOT NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_order_items_tenant ON order_items(tenant_id);

-- Drop old policies and recreate with direct tenant check
DROP POLICY IF EXISTS order_items_select ON order_items;
DROP POLICY IF EXISTS order_items_insert ON order_items;

CREATE POLICY order_items_select ON order_items FOR SELECT
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY order_items_insert ON order_items FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY order_items_update ON order_items FOR UPDATE
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY order_items_delete ON order_items FOR DELETE
  USING (tenant_id = get_current_tenant_id() AND is_admin_or_manager());

-- Same fix for task_events
ALTER TABLE task_events ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

UPDATE task_events te
SET tenant_id = t.tenant_id
FROM tasks t
WHERE te.task_id = t.id AND te.tenant_id IS NULL;

ALTER TABLE task_events ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_task_events_tenant ON task_events(tenant_id);

DROP POLICY IF EXISTS task_events_select ON task_events;
DROP POLICY IF EXISTS task_events_insert ON task_events;

CREATE POLICY task_events_select ON task_events FOR SELECT
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY task_events_insert ON task_events FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY task_events_delete ON task_events FOR DELETE
  USING (tenant_id = get_current_tenant_id() AND is_admin_or_manager());

-- ============================================
-- 2. PII AUDIT TRAIL (LGPD)
-- ============================================

CREATE TABLE IF NOT EXISTS pii_access_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- What was accessed
  table_name VARCHAR(50) NOT NULL,
  record_id UUID NOT NULL,
  field_name VARCHAR(50) NOT NULL,

  -- Action
  action VARCHAR(20) NOT NULL CHECK (action IN ('VIEW', 'EXPORT', 'REVEAL', 'MODIFY')),

  -- Context
  ip_address INET,
  user_agent TEXT,
  reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pii_access_tenant ON pii_access_log(tenant_id, created_at);
CREATE INDEX idx_pii_access_record ON pii_access_log(table_name, record_id);
CREATE INDEX idx_pii_access_actor ON pii_access_log(actor_id);

-- RLS for pii_access_log (admin only)
ALTER TABLE pii_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY pii_access_log_select ON pii_access_log FOR SELECT
  USING (tenant_id = get_current_tenant_id() AND is_admin_or_manager());

CREATE POLICY pii_access_log_insert ON pii_access_log FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

-- ============================================
-- 3. DEAD LETTER QUEUE
-- ============================================

CREATE TYPE dlq_status AS ENUM ('PENDING', 'RETRYING', 'FAILED', 'RECOVERED');

CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

  -- Original event reference
  original_event_id UUID REFERENCES event_log(id) ON DELETE SET NULL,
  correlation_id UUID,

  -- Job info
  queue_name VARCHAR(100) NOT NULL,
  job_data JSONB NOT NULL,

  -- Error tracking
  error_message TEXT NOT NULL,
  error_stack TEXT,
  error_code VARCHAR(50),

  -- Retry info
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  last_retry_at TIMESTAMPTZ,

  -- Status
  status dlq_status NOT NULL DEFAULT 'PENDING',
  recovered_at TIMESTAMPTZ,
  recovered_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dlq_tenant ON dead_letter_queue(tenant_id);
CREATE INDEX idx_dlq_status ON dead_letter_queue(status, next_retry_at) WHERE status IN ('PENDING', 'RETRYING');
CREATE INDEX idx_dlq_queue ON dead_letter_queue(queue_name, created_at);
CREATE INDEX idx_dlq_correlation ON dead_letter_queue(correlation_id);

-- RLS for DLQ
ALTER TABLE dead_letter_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY dlq_select ON dead_letter_queue FOR SELECT
  USING (tenant_id = get_current_tenant_id() AND is_admin_or_manager());

CREATE POLICY dlq_insert ON dead_letter_queue FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id() OR tenant_id IS NULL);

CREATE POLICY dlq_update ON dead_letter_queue FOR UPDATE
  USING (tenant_id = get_current_tenant_id() AND is_admin_or_manager());

-- ============================================
-- 4. OBSERVABILITY: CORRELATION_ID
-- ============================================

ALTER TABLE event_log ADD COLUMN IF NOT EXISTS correlation_id UUID;
ALTER TABLE event_log ADD COLUMN IF NOT EXISTS parent_event_id UUID REFERENCES event_log(id);
ALTER TABLE event_log ADD COLUMN IF NOT EXISTS duration_ms INTEGER;
ALTER TABLE event_log ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_event_log_correlation ON event_log(correlation_id);
CREATE INDEX IF NOT EXISTS idx_event_log_parent ON event_log(parent_event_id);

-- ============================================
-- 5. SYNC STATE TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS sync_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Integration
  source event_source NOT NULL,
  entity_type VARCHAR(50) NOT NULL,

  -- State
  last_sync_at TIMESTAMPTZ,
  last_sync_cursor VARCHAR(255), -- For pagination/incremental sync
  last_sync_count INTEGER DEFAULT 0,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'IDLE' CHECK (status IN ('IDLE', 'RUNNING', 'ERROR')),
  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, source, entity_type)
);

CREATE INDEX idx_sync_state_tenant ON sync_state(tenant_id);
CREATE INDEX idx_sync_state_source ON sync_state(source, entity_type);

ALTER TABLE sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY sync_state_select ON sync_state FOR SELECT
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY sync_state_all ON sync_state FOR ALL
  USING (tenant_id = get_current_tenant_id() AND is_admin_or_manager());

-- ============================================
-- 6. WEBHOOK IDEMPOTENCY
-- ============================================

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Idempotency
  idempotency_key VARCHAR(64) NOT NULL,

  -- Webhook info
  webhook_type VARCHAR(50) NOT NULL,
  payload_hash VARCHAR(64) NOT NULL,

  -- Processing
  processed_at TIMESTAMPTZ,
  response_status INTEGER,
  response_body TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, idempotency_key)
);

CREATE INDEX idx_webhook_deliveries_tenant ON webhook_deliveries(tenant_id, created_at);
CREATE INDEX idx_webhook_deliveries_type ON webhook_deliveries(webhook_type, created_at);

ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY webhook_deliveries_select ON webhook_deliveries FOR SELECT
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY webhook_deliveries_insert ON webhook_deliveries FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

-- ============================================
-- 7. PERFORMANCE INDEXES
-- ============================================

-- Hoje View P95 < 1.5s (composite index for priority query)
CREATE INDEX IF NOT EXISTS idx_tasks_hoje_query ON tasks(
  tenant_id,
  assigned_to,
  status,
  priority_bucket,
  priority_score DESC
) WHERE status IN ('PENDING', 'IN_PROGRESS');

-- Include commonly selected columns to avoid table lookup
CREATE INDEX IF NOT EXISTS idx_tasks_hoje_covering ON tasks(
  tenant_id,
  assigned_to,
  status,
  priority_bucket
) INCLUDE (
  id,
  customer_id,
  priority_score,
  reason_code,
  title,
  due_at
) WHERE status IN ('PENDING', 'IN_PROGRESS');

-- Cliente360 P95 < 2.0s
CREATE INDEX IF NOT EXISTS idx_interactions_360 ON interactions(
  customer_id,
  occurred_at DESC
) INCLUDE (
  id,
  channel,
  direction,
  content_preview,
  ai_summary
);

CREATE INDEX IF NOT EXISTS idx_orders_360 ON orders(
  customer_id,
  ordered_at DESC
) INCLUDE (
  id,
  order_number,
  status,
  net_amount
);

-- Kanban view optimization
CREATE INDEX IF NOT EXISTS idx_kanban_cards_view ON kanban_cards(
  tenant_id,
  column_id,
  position
) INCLUDE (
  id,
  customer_id,
  title,
  value,
  sla_deadline
);

-- Dashboard aggregations
CREATE INDEX IF NOT EXISTS idx_orders_dashboard ON orders(
  tenant_id,
  ordered_at,
  status
) INCLUDE (net_amount);

CREATE INDEX IF NOT EXISTS idx_customers_dashboard ON customers(
  tenant_id,
  lifecycle_status
) INCLUDE (total_revenue, total_orders);

-- ============================================
-- 8. CIRCUIT BREAKER STATE
-- ============================================

CREATE TABLE IF NOT EXISTS circuit_breaker_state (
  id VARCHAR(100) PRIMARY KEY, -- service_name

  state VARCHAR(20) NOT NULL DEFAULT 'CLOSED' CHECK (state IN ('CLOSED', 'OPEN', 'HALF_OPEN')),
  failure_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,

  last_failure_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 9. HELPER FUNCTIONS
-- ============================================

-- Generate correlation ID if not provided
CREATE OR REPLACE FUNCTION generate_correlation_id()
RETURNS UUID AS $$
BEGIN
  RETURN uuid_generate_v4();
END;
$$ LANGUAGE plpgsql;

-- Log PII access
CREATE OR REPLACE FUNCTION log_pii_access(
  p_tenant_id UUID,
  p_actor_id UUID,
  p_table_name VARCHAR(50),
  p_record_id UUID,
  p_field_name VARCHAR(50),
  p_action VARCHAR(20),
  p_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO pii_access_log (tenant_id, actor_id, table_name, record_id, field_name, action, reason)
  VALUES (p_tenant_id, p_actor_id, p_table_name, p_record_id, p_field_name, p_action, p_reason)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mask PII function
CREATE OR REPLACE FUNCTION mask_cpf(cpf VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
  IF cpf IS NULL OR LENGTH(cpf) < 11 THEN
    RETURN cpf;
  END IF;
  RETURN SUBSTRING(cpf, 1, 3) || '.***.***-' || SUBSTRING(cpf, 10, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION mask_cnpj(cnpj VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
  IF cnpj IS NULL OR LENGTH(cnpj) < 14 THEN
    RETURN cnpj;
  END IF;
  RETURN SUBSTRING(cnpj, 1, 2) || '.***.***/****-' || SUBSTRING(cnpj, 13, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION mask_phone(phone VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
  IF phone IS NULL OR LENGTH(phone) < 8 THEN
    RETURN phone;
  END IF;
  -- Keep country code and last 4 digits
  RETURN SUBSTRING(phone, 1, 5) || '****' || SUBSTRING(phone, LENGTH(phone) - 3, 4);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION mask_email(email VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
  at_pos INTEGER;
BEGIN
  IF email IS NULL THEN
    RETURN email;
  END IF;

  at_pos := POSITION('@' IN email);
  IF at_pos <= 1 THEN
    RETURN email;
  END IF;

  RETURN SUBSTRING(email, 1, 2) || '***@' || SUBSTRING(email, at_pos + 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 10. UPDATED_AT TRIGGER FOR NEW TABLES
-- ============================================

CREATE TRIGGER update_dead_letter_queue_updated_at
BEFORE UPDATE ON dead_letter_queue
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_sync_state_updated_at
BEFORE UPDATE ON sync_state
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

COMMENT ON TABLE pii_access_log IS 'LGPD audit trail for PII access';
COMMENT ON TABLE dead_letter_queue IS 'Failed events for retry and manual recovery';
COMMENT ON TABLE sync_state IS 'Incremental sync state tracking';
COMMENT ON TABLE webhook_deliveries IS 'Idempotent webhook delivery tracking';
COMMENT ON TABLE circuit_breaker_state IS 'Circuit breaker state for external services';
