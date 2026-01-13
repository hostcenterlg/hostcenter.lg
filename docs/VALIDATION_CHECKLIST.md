# VITAO JARVIS CRM - Checklist de Validacao (30 minutos)

## Pre-Requisitos

- [ ] Supabase local ou staging configurado
- [ ] Arquivo `.env` preenchido com credenciais
- [ ] pnpm instalado

## Setup (5 min)

```bash
# Instalar dependencias
pnpm install

# Rodar migration de hardening
psql $DATABASE_URL -f packages/database/migrations/002_hardening.sql

# Verificar migration
psql $DATABASE_URL -c "\dt" | grep -E "pii_access|dead_letter|sync_state|webhook_deliveries"
```

**Esperado:** 4 novas tabelas listadas

---

## 1. Validacao de RLS Policies (5 min)

### 1.1 Testar profiles_update com tenant_id
```sql
-- Como usuario do tenant A, tentar atualizar profile do tenant B
-- Deve falhar com RLS
SET LOCAL "request.jwt.claims" = '{"sub": "user-a-uuid"}';
UPDATE profiles SET full_name = 'HACKED' WHERE id = 'profile-tenant-b-uuid';
-- Esperado: 0 rows affected
```

### 1.2 Verificar policies sem conflito
```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('kanban_columns', 'identity_conflicts')
ORDER BY tablename, cmd;
-- Esperado: Policies separadas por operacao (SELECT, INSERT, UPDATE, DELETE)
```

### 1.3 Verificar DELETE policies
```sql
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public' AND cmd = 'DELETE';
-- Esperado: Policies para customers, orders, interactions, tasks, etc.
```

---

## 2. Validacao LGPD/PII (5 min)

### 2.1 Testar mascaramento de CPF
```typescript
import { maskCPF, maskCNPJ, maskPhone, maskEmail } from '@jarvis/shared';

console.log(maskCPF('12345678901'));      // 123.***.***-01
console.log(maskCNPJ('12345678000190'));  // 12.***.***/****-90
console.log(maskPhone('+5511987654321')); // +5511****4321
console.log(maskEmail('user@test.com'));  // us***@test.com
```

### 2.2 Verificar tabela pii_access_log
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'pii_access_log';
-- Esperado: tenant_id, actor_id, table_name, record_id, field_name, action, created_at
```

### 2.3 Testar funcao mask_cpf no banco
```sql
SELECT mask_cpf('12345678901');
-- Esperado: 123.***.***-01
```

---

## 3. Validacao DLQ (3 min)

### 3.1 Verificar tabela DLQ
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'dead_letter_queue';
-- Esperado: queue_name, job_data, error_message, retry_count, status, etc.
```

### 3.2 Verificar enum dlq_status
```sql
SELECT enumlabel FROM pg_enum
WHERE enumtypid = 'dlq_status'::regtype;
-- Esperado: PENDING, RETRYING, FAILED, RECOVERED
```

---

## 4. Validacao Observabilidade (5 min)

### 4.1 Verificar correlation_id em event_log
```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'event_log'
AND column_name IN ('correlation_id', 'parent_event_id', 'duration_ms');
-- Esperado: 3 colunas
```

### 4.2 Testar health endpoint
```bash
curl http://localhost:3000/api/health
# Esperado: {"status":"healthy","checks":{"database":{"status":"healthy"}}}

curl "http://localhost:3000/api/health?verbose=true"
# Esperado: Incluir dlq check
```

### 4.3 Testar liveness/readiness
```bash
curl http://localhost:3000/api/health/live
# Esperado: {"status":"alive"}

curl http://localhost:3000/api/health/ready
# Esperado: {"status":"ready","latency_ms":...}
```

---

## 5. Validacao Webhook (5 min)

### 5.1 Testar endpoint webhook
```bash
# GET para verificar configuracao
curl http://localhost:3000/api/webhooks
# Esperado: {"status":"ok","endpoint":"/api/webhooks","signature_required":...}
```

### 5.2 Testar POST com payload
```bash
# Sem signature (dev mode)
curl -X POST http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{"type":"order.created","tenant_id":"test-tenant","data":{"order_id":"123"}}'
# Esperado: {"status":"accepted","event_id":"..."}
```

### 5.3 Testar idempotencia
```bash
# Enviar mesmo request 2x com mesmo idempotency key
curl -X POST http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -H "x-idempotency-key: test-123" \
  -d '{"type":"order.created","tenant_id":"test-tenant","data":{}}'

# Segunda chamada
curl -X POST http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -H "x-idempotency-key: test-123" \
  -d '{"type":"order.created","tenant_id":"test-tenant","data":{}}'
# Esperado: {"status":"duplicate","message":"Webhook already processed"}
```

---

## 6. Validacao Performance (2 min)

### 6.1 Verificar indices de performance
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'tasks'
AND indexname LIKE '%hoje%';
-- Esperado: idx_tasks_hoje_query, idx_tasks_hoje_covering
```

### 6.2 Verificar indices Cliente360
```sql
SELECT indexname FROM pg_indexes
WHERE indexname LIKE '%360%';
-- Esperado: idx_interactions_360, idx_orders_360
```

---

## Resumo de Validacao

| Area | Status | Notas |
|------|--------|-------|
| RLS Policies | [ ] OK / [ ] FALHA | |
| LGPD/PII | [ ] OK / [ ] FALHA | |
| DLQ | [ ] OK / [ ] FALHA | |
| Observabilidade | [ ] OK / [ ] FALHA | |
| Webhook | [ ] OK / [ ] FALHA | |
| Performance | [ ] OK / [ ] FALHA | |

---

## Troubleshooting

### Migration falhou
```bash
# Verificar erro
psql $DATABASE_URL -f packages/database/migrations/002_hardening.sql 2>&1 | head -50

# Rollback manual se necessario
psql $DATABASE_URL -c "DROP TABLE IF EXISTS dead_letter_queue, pii_access_log, sync_state, webhook_deliveries CASCADE;"
```

### RLS blocking service role
```sql
-- Verificar se service role tem bypass
SELECT usename, usebypassrls
FROM pg_user
WHERE usename = 'postgres';
-- Esperado: usebypassrls = true
```

### Health endpoint 503
```bash
# Verificar conexao com banco
curl "http://localhost:3000/api/health?verbose=true"

# Verificar logs
tail -f apps/web/.next/server/logs/*
```
