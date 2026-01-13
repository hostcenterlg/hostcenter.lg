-- ============================================
-- VITAO JARVIS CRM - Seed Kanban Columns
-- Run after tenant creation to set up default columns
-- ============================================

-- This is a template - actual insertion happens in seed.ts
-- when creating a new tenant

-- Default kanban columns for reference:
-- INSERT INTO kanban_columns (tenant_id, stage, name, position, color, sla_days) VALUES
--   ('{tenant_id}', 'LEAD', 'Leads', 0, '#6366F1', NULL),
--   ('{tenant_id}', 'QUALIFICACAO', 'Qualificação', 1, '#8B5CF6', 2),
--   ('{tenant_id}', 'ORCAMENTO_ENVIADO', 'Orçamento Enviado', 2, '#F59E0B', 1),
--   ('{tenant_id}', 'EM_ATENDIMENTO', 'Em Atendimento', 3, '#3B82F6', 2),
--   ('{tenant_id}', 'NEGOCIACAO', 'Negociação', 4, '#10B981', 3),
--   ('{tenant_id}', 'VENDA_CONCLUIDA', 'Venda Concluída', 5, '#22C55E', NULL),
--   ('{tenant_id}', 'PERDIDO', 'Perdido', 6, '#EF4444', NULL);
