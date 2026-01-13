# VITAO JARVIS CRM

B2B AI-native CRM com foco em produtividade de vendas e prevenção de churn.

## Stack

- **Monorepo**: pnpm workspaces
- **Web**: Next.js 14 (App Router) + Tailwind CSS + shadcn/ui
- **Worker**: Node.js + pg-boss (Postgres)
- **Database**: Supabase Postgres + RLS (Row Level Security)
- **Auth**: Supabase Auth (multi-tenant)

## Estrutura do Projeto

```
vitao-jarvis-crm/
├── apps/
│   ├── web/              # Next.js frontend
│   └── worker/           # Background jobs (pg-boss)
├── packages/
│   ├── shared/           # Tipos, regras de negócio, utilidades
│   └── database/         # Migrations, queries, repositórios, CSV import
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Requisitos

- Node.js >= 20
- pnpm >= 8
- Docker (para Supabase local)

## Instalação

```bash
# Clonar repositório
git clone <repo-url>
cd vitao-jarvis-crm

# Instalar dependências
pnpm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais
```

## Variáveis de Ambiente

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database (para worker/migrations)
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres

# Worker
WORKER_CONCURRENCY=5
TASK_CHECK_INTERVAL_MS=60000

# AI (MVP - mock por padrão)
AI_PROVIDER=mock
AI_CONFIDENCE_THRESHOLD=0.7
```

## Como Rodar

### 1. Iniciar Supabase Local

```bash
# Se usando Supabase CLI
supabase start

# Ou use sua instância Supabase Cloud
```

### 2. Executar Migrations

```bash
pnpm db:migrate
```

### 3. Seed de Dados (Opcional)

```bash
# Seed básico para desenvolvimento
pnpm db:seed

# Gerar CSVs para teste de performance (1000 clientes)
pnpm csv:seed-large 1000 5 10
```

### 4. Iniciar Aplicações

```bash
# Desenvolvimento (web + worker em paralelo)
pnpm dev

# Ou separadamente:
pnpm dev:web     # http://localhost:3000
pnpm dev:worker  # Background jobs
```

### 5. Build de Produção

```bash
pnpm build
```

## Telas Implementadas

| Tela | Rota | Descrição |
|------|------|-----------|
| Login | `/login` | Autenticação via Supabase Auth |
| Hoje | `/hoje` | Centro de tarefas P1-P4 com motivo e CTA |
| Kanban | `/kanban` | Pipeline de vendas auditável |
| Clientes | `/clientes` | Lista de clientes |
| Cliente 360 | `/clientes/[id]` | Visão unificada do cliente |
| Dashboard | `/dashboard` | Métricas para gestor |
| Integrações | `/integracoes` | Status de adapters e logs |
| Health | `/api/health` | Endpoint de health check |

## Regras de Negócio

### Status por Dias Sem Comprar

| Status | Dias |
|--------|------|
| ATIVO | 0-50 |
| EM_RISCO | 51-60 |
| INATIVO_RECENTE | 61-90 |
| INATIVO_ANTIGO | 90+ |

### Prioridades (Tela Hoje)

| Prioridade | Gatilhos | Peso Base |
|------------|----------|-----------|
| P1 | MSG_UNANSWERED_2H, COMPLAINT, SLA_BREACHING | 900-1000 |
| P2 | REPURCHASE_DUE (ciclo vs last_order_at) | 500 |
| P3 | QUOTE_STALE_2D, FOLLOWUP_DUE | 200-300 |
| P4 | POSTSALE_D45 | 100 |

### Cadência Kanban

| Estágio | Ação | Prazo |
|---------|------|-------|
| ORCAMENTO_ENVIADO | Follow-up | 1 dia útil |
| EM_ATENDIMENTO | Follow-up | 2 dias úteis |
| VENDA_CONCLUIDA | Pós-venda/CS | D+45 |

## CSV Mode

Importar dados via CSV:

```bash
# Gerar CSVs de teste
pnpm csv:seed-large 1000

# Importar clientes
pnpm csv:import customers ./data/seed/customers.csv <tenant_id>

# Importar pedidos
pnpm csv:import orders ./data/seed/orders.csv <tenant_id>

# Importar interações
pnpm csv:import interactions ./data/seed/interactions.csv <tenant_id>
```

### Formato dos CSVs

**customers.csv**
```csv
external_id,cnpj,phone,email,company_name,trade_name,contact_name,address_city,address_state,tags,notes
```

**orders.csv**
```csv
external_id,customer_external_id,order_number,status,total_amount,discount_amount,shipping_amount,ordered_at,notes
```

**interactions.csv**
```csv
external_id,customer_external_id,channel,direction,occurred_at,responded_at,subject,content
```

## Testes

```bash
# Rodar todos os testes
pnpm test

# Apenas testes unitários (shared)
pnpm test:unit

# Testes com watch
pnpm --filter @jarvis/shared test:watch
```

### Cobertura de Testes

- **Normalização de telefone E.164** - 8 cenários
- **Matching de identidade** - 7 cenários (CNPJ > CPF > Phone > Email)
- **Rule Engine (P1-P4)** - 12 cenários de priorização
- **Idempotência** - UNIQUE(idempotency_key) no event_log

## Integrações (TODO)

### Mercos

```typescript
// Contrato definido em packages/integrations/mercos/types.ts
// Endpoints necessários:
// POST /api/webhooks/mercos
// GET /api/integrations/mercos/sync
```

### Deskrio

```typescript
// Contrato definido em packages/integrations/deskrio/types.ts
// Endpoints necessários:
// POST /api/webhooks/deskrio
// POST /api/integrations/deskrio/send
```

## IA (MVP)

Funções disponíveis com mock:

- `summarize_conversation` - Resumo de conversas
- `classify_intent` - Classificação de intenção
- `detect_objections` - Detecção de objeções
- `sentiment_score` - Score de sentimento (0-100)
- `next_best_action` - 3 sugestões com "por que"
- `draft_reply` - Rascunho de resposta

### Guardrails

- Anti prompt-injection (filtro de padrões perigosos)
- Confidence gating (abaixo de 70% sugere ação humana)
- Log de `ai_runs` com feedback 👍/👎

## Segurança

### RLS (Row Level Security)

Todas as tabelas têm RLS habilitado com políticas baseadas em:

- `tenant_id` - Isolamento multi-tenant
- `seller_id` - Vendedor vê apenas seus clientes (exceto admin/manager)
- `auth.uid()` - Vinculado ao usuário autenticado

### Helpers SQL

```sql
get_current_tenant_id()  -- Retorna tenant_id do usuário atual
get_current_profile_id() -- Retorna profile_id do usuário atual
is_admin_or_manager()    -- Verifica se é admin ou manager
```

## Assumptions (Premissas)

1. **Fuso horário**: America/Sao_Paulo por padrão
2. **Dias úteis**: Segunda a Sexta (configurável por tenant)
3. **Ciclo de recompra padrão**: 30 dias
4. **SLA padrão**: 4 horas para resposta
5. **Telefones**: Formato brasileiro por padrão (+55)
6. **CNPJ/CPF**: Validação de dígitos verificadores implementada
7. **Integrações Mercos/Deskrio**: Apenas contratos e stubs (sem implementação de endpoints reais)
8. **IA**: Mock por padrão, sem chamadas externas

## Definition of Done (DoD)

- [x] Monorepo TypeScript com pnpm workspaces
- [x] Next.js App Router + Tailwind + shadcn/ui
- [x] Worker Node.js + pg-boss
- [x] Supabase Postgres + RLS multi-tenant
- [x] Tela Hoje com P1-P4, reason_code e CTA
- [x] Cliente 360 com tabs (Resumo/Pedidos/Conversas/Tarefas/IA)
- [x] Kanban auditável com kanban_events
- [x] Dashboard com métricas de gestor
- [x] CSV Mode funcional (import + seed)
- [x] Integrações: adapters/stubs + contratos
- [x] IA MVP com mock + ai_runs
- [x] Testes unitários: telefone, identidade, 12 cenários P1-P4
- [x] Idempotência: UNIQUE(idempotency_key)
- [x] Migrations + RLS policies
- [x] Health endpoint /api/health
- [x] README com documentação completa

## Licença

Proprietário - VITAO JARVIS CRM
