# VITAO JARVIS CRM - Production Hardening Audit

## Top 20 Gaps por Risco (Ordenado por Severidade)

### CRÍTICO (P0) - Correção Imediata

| # | Gap | Categoria | Risco | Arquivo Afetado |
|---|-----|-----------|-------|-----------------|
| 1 | **profiles_update RLS não verifica tenant_id** | Segurança | Cross-tenant data access - usuário pode atualizar perfil de outro tenant | `001_initial_schema.sql:639-640` |
| 2 | **kanban_columns policies conflitantes** | Segurança | SELECT policy + ALL policy = comportamento indefinido, bypass potencial | `001_initial_schema.sql:723-727` |
| 3 | **identity_conflicts policies conflitantes** | Segurança | Mesma issue - SELECT + ALL policies duplicadas | `001_initial_schema.sql:770-774` |
| 4 | **Sem DELETE policies** | Segurança | Dados podem ser deletados sem verificação de tenant | `001_initial_schema.sql` |
| 5 | **order_items RLS usa subquery** | Performance/Segurança | N+1 query, performance ruim + edge cases de bypass | `001_initial_schema.sql:669-677` |

### ALTO (P1) - Correção em 24h

| # | Gap | Categoria | Risco | Arquivo Afetado |
|---|-----|-----------|-------|-----------------|
| 6 | **Sem PII audit trail** | LGPD | Não há rastreio de acesso a dados sensíveis | `001_initial_schema.sql` |
| 7 | **Sem mascaramento de PII** | LGPD | CPF/CNPJ/telefone expostos em logs e respostas | `packages/shared/src/utils/` |
| 8 | **Sem DLQ table** | Robustez | Eventos falhos são perdidos permanentemente | `001_initial_schema.sql` |
| 9 | **Sem correlation_id em event_log** | Observabilidade | Impossível rastrear fluxo de eventos distribuídos | `001_initial_schema.sql:423-444` |
| 10 | **Sem retry com backoff no worker** | Robustez | Falhas transitórias causam perda de dados | `apps/worker/src/index.ts` |

### MÉDIO (P2) - Correção em 1 Semana

| # | Gap | Categoria | Risco | Arquivo Afetado |
|---|-----|-----------|-------|-----------------|
| 11 | **Sem circuit breaker** | Robustez | Cascading failures em integrações externas | `apps/worker/src/index.ts` |
| 12 | **Sem webhook signature verification** | Segurança | Webhooks podem ser falsificados | `apps/web/src/app/api/` |
| 13 | **Sem sync incremental** | Performance | Full sync a cada ciclo = lentidão | `packages/database/` |
| 14 | **Health endpoint incompleto** | Observabilidade | Não verifica worker, fila, ou dependencies | `apps/web/src/app/api/health/route.ts` |
| 15 | **Índices faltando para Hoje P95<1.5s** | Performance | Query Hoje pode exceder SLA | `001_initial_schema.sql` |

### BAIXO (P3) - Backlog Priorizado

| # | Gap | Categoria | Risco | Arquivo Afetado |
|---|-----|-----------|-------|-----------------|
| 16 | **Índices faltando para Cliente360 P95<2.0s** | Performance | Query Cliente360 pode exceder SLA | `001_initial_schema.sql` |
| 17 | **Sem liveness/readiness separados** | Observabilidade | K8s probes inadequados | `apps/web/src/app/api/health/` |
| 18 | **Logs não estruturados no worker** | Observabilidade | Difícil debugging em produção | `apps/worker/src/index.ts` |
| 19 | **Sem rate limiting em APIs** | Segurança | DoS potencial | `apps/web/src/app/api/` |
| 20 | **Sem métricas de business** | Observabilidade | Sem visibilidade de KPIs | `apps/worker/`, `apps/web/` |

---

## Detalhamento Técnico

### Gap 1: profiles_update RLS não verifica tenant_id

**Atual:**
```sql
CREATE POLICY profiles_update ON profiles FOR UPDATE
  USING (auth_uid = auth.uid() OR is_admin_or_manager());
```

**Problema:** Admin de tenant A pode atualizar profiles de tenant B se souber o UUID.

**Fix:**
```sql
CREATE POLICY profiles_update ON profiles FOR UPDATE
  USING (
    tenant_id = get_current_tenant_id() AND
    (auth_uid = auth.uid() OR is_admin_or_manager())
  );
```

### Gap 2-3: Policies conflitantes

**Problema:** `FOR SELECT` + `FOR ALL` na mesma tabela cria comportamento indefinido.

**Fix:** Remover policy redundante ou usar apenas `FOR ALL`.

### Gap 5: order_items subquery

**Atual:**
```sql
CREATE POLICY order_items_select ON order_items FOR SELECT
  USING (order_id IN (SELECT id FROM orders WHERE tenant_id = get_current_tenant_id()));
```

**Fix:** Adicionar `tenant_id` direto na tabela `order_items` para evitar subquery.

### Gap 6-7: PII Compliance

**Implementar:**
1. Tabela `pii_access_log` para audit trail
2. Função `mask_pii()` para mascarar dados em logs/responses
3. Trigger para logar acesso a campos sensíveis

### Gap 8: DLQ

**Criar tabela:**
```sql
CREATE TABLE dead_letter_queue (
  id UUID PRIMARY KEY,
  original_event_id UUID,
  payload JSONB,
  error TEXT,
  retry_count INTEGER,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
);
```

### Gap 9: correlation_id

**Adicionar coluna:**
```sql
ALTER TABLE event_log ADD COLUMN correlation_id UUID;
CREATE INDEX idx_event_log_correlation ON event_log(correlation_id);
```

### Gap 10-11: Retry + Circuit Breaker

**Implementar:**
- Exponential backoff: 1s, 2s, 4s, 8s, 16s (max 5 retries)
- Jitter: ±20%
- Circuit breaker: open after 5 failures, half-open after 30s

---

## Arquivos Alterados (Patches)

1. `packages/database/migrations/002_hardening.sql` - Todas as correções de schema
2. `packages/shared/src/utils/pii.ts` - Mascaramento de PII
3. `packages/shared/src/utils/retry.ts` - Retry com backoff + circuit breaker
4. `apps/worker/src/index.ts` - Worker com correlation, retry, DLQ
5. `apps/web/src/app/api/health/route.ts` - Health checks melhorados
6. `apps/web/src/app/api/webhooks/route.ts` - Webhook signature verification

---

## Checklist de Validação (30 minutos)

Ver arquivo: `docs/VALIDATION_CHECKLIST.md`
