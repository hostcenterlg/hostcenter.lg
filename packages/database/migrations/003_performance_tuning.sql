-- ============================================
-- VITAO JARVIS CRM - Performance Tuning Migration
-- ============================================
-- Optimizations for P95 targets:
--   Hoje (Tasks View): P95 < 1.5s
--   Cliente360 (Customer Detail): P95 < 2.0s
--
-- Run after: 002_hardening.sql

-- ============================================
-- 1. TASKS BY CUSTOMER (Cliente360)
-- ============================================
-- Query: SELECT * FROM tasks WHERE customer_id = X ORDER BY created_at DESC LIMIT 20
-- Issue: idx_tasks_customer exists but lacks ordering and covering columns

CREATE INDEX IF NOT EXISTS idx_tasks_customer_360 ON tasks(
  customer_id,
  created_at DESC
) INCLUDE (
  id,
  tenant_id,
  priority_bucket,
  priority_score,
  reason_code,
  title,
  status,
  due_at
);

COMMENT ON INDEX idx_tasks_customer_360 IS
  'Cliente360: tasks by customer with descending created_at, covering common columns';

-- ============================================
-- 2. CUSTOMERS LOOKUP (Hoje JOIN)
-- ============================================
-- Query: SELECT ... FROM tasks JOIN customers ON tasks.customer_id = customers.id
-- Issue: customers primary key lookup needs to be fast for selected columns

-- Already has idx_customers_tenant, but Hoje needs specific columns
CREATE INDEX IF NOT EXISTS idx_customers_hoje_join ON customers(
  id
) INCLUDE (
  company_name,
  trade_name,
  contact_name,
  phone,
  email,
  lifecycle_status
);

COMMENT ON INDEX idx_customers_hoje_join IS
  'Hoje: covering index for customer JOIN columns in task list';

-- ============================================
-- 3. PROFILES LOOKUP (Hoje JOIN + Cliente360)
-- ============================================
-- Query: SELECT profiles.id, full_name, avatar_url WHERE id = X

CREATE INDEX IF NOT EXISTS idx_profiles_lookup ON profiles(
  id
) INCLUDE (
  full_name,
  avatar_url,
  email
);

COMMENT ON INDEX idx_profiles_lookup IS
  'Hoje/Cliente360: covering index for profile lookups';

-- ============================================
-- 4. KANBAN CARDS CUSTOMER (Cliente360)
-- ============================================
-- Query: SELECT *, column:kanban_columns(*) WHERE customer_id = X

CREATE INDEX IF NOT EXISTS idx_kanban_cards_customer_360 ON kanban_cards(
  customer_id
) INCLUDE (
  id,
  tenant_id,
  column_id,
  stage,
  title,
  value,
  entered_stage_at,
  sla_deadline
);

COMMENT ON INDEX idx_kanban_cards_customer_360 IS
  'Cliente360: covering index for kanban card by customer';

-- ============================================
-- 5. PARTIAL INDEX: ACTIVE TASKS ONLY
-- ============================================
-- Optimize Hoje view which only shows PENDING/IN_PROGRESS

CREATE INDEX IF NOT EXISTS idx_tasks_active_priority ON tasks(
  priority_bucket ASC,
  priority_score DESC,
  customer_id
) WHERE status IN ('PENDING', 'IN_PROGRESS');

COMMENT ON INDEX idx_tasks_active_priority IS
  'Hoje: active tasks sorted by priority with customer_id for JOIN';

-- ============================================
-- 6. STATISTICS UPDATE
-- ============================================
-- Ensure query planner has fresh statistics

ANALYZE tasks;
ANALYZE customers;
ANALYZE profiles;
ANALYZE orders;
ANALYZE interactions;
ANALYZE kanban_cards;

-- ============================================
-- 7. QUERY OPTIMIZER HINTS
-- ============================================
-- Configure work_mem for complex sorts (session level)
-- Production should set this in postgresql.conf

-- For large datasets, increase work_mem temporarily
-- SET work_mem = '256MB';

-- ============================================
-- INDEX SUMMARY
-- ============================================
--
-- Hoje Query Path:
--   1. idx_tasks_hoje_covering (status filter + priority sort)
--   2. idx_customers_hoje_join (customer_id -> selected columns)
--   3. idx_profiles_lookup (assigned_to -> name/avatar)
--
-- Cliente360 Query Path:
--   1. customers_pkey (direct ID lookup)
--   2. idx_profiles_lookup (seller lookup)
--   3. idx_orders_360 (orders by customer)
--   4. idx_interactions_360 (interactions by customer)
--   5. idx_tasks_customer_360 (tasks by customer)
--   6. idx_kanban_cards_customer_360 (kanban card by customer)
--
-- ============================================
-- MIGRATION COMPLETE
-- ============================================

SELECT 'Performance tuning indexes created' AS status;
