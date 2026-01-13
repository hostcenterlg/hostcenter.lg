#!/usr/bin/env tsx
// ============================================
// VITAO JARVIS CRM - Demo Seed Script
// ============================================
// Creates rich demo dataset for presentations
// Usage: pnpm seed:demo
//
// Dataset:
//   - 15 customers (all lifecycle statuses)
//   - 25+ orders
//   - 45+ interactions
//   - 35+ tasks (all reason_codes)
//   - 12+ kanban cards
//   - 25+ kanban events
//   - 5+ DLQ examples

import { getSupabaseAdminClient } from './client';
import { createRepositories, KanbanRepository } from './repositories';
import {
  normalizePhoneE164,
  normalizeCNPJ,
  KanbanStage,
} from '@jarvis/shared';

// Demo tenant/user IDs (fixed for DEMO_MODE)
export const DEMO_TENANT_ID = '11111111-1111-1111-1111-111111111111';
export const DEMO_USER_ID = '22222222-2222-2222-2222-222222222222';
export const DEMO_AUTH_UID = '33333333-3333-3333-3333-333333333333';

async function seedDemo() {
  console.log('🎬 VITAO JARVIS CRM - Demo Seed\n');
  console.log('Creating rich demo dataset...\n');

  const supabase = getSupabaseAdminClient();
  const kanbanRepo = new KanbanRepository(supabase);

  // ============ CLEANUP ============
  console.log('Cleaning existing demo data...');
  await supabase.from('tenants').delete().eq('slug', 'demo');
  console.log('✓ Cleaned\n');

  // ============ CREATE TENANT ============
  console.log('Creating demo tenant...');
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      id: DEMO_TENANT_ID,
      name: 'VITAO Distribuidora Demo',
      slug: 'demo',
      settings: {
        timezone: 'America/Sao_Paulo',
        business_days: [1, 2, 3, 4, 5],
        sla_hours: 4,
        repurchase_cycle_default_days: 30,
        ai_enabled: true,
        ai_auto_draft: true,
      },
    })
    .select()
    .single();

  if (tenantError) throw tenantError;
  console.log(`✓ Tenant: ${tenant.id}\n`);

  // ============ KANBAN COLUMNS ============
  console.log('Creating kanban columns...');
  await kanbanRepo.initializeColumns(tenant.id);
  const columns = await kanbanRepo.getColumns(tenant.id);
  console.log(`✓ ${columns.length} columns\n`);

  // ============ TEAM ============
  const { data: team } = await supabase
    .from('teams')
    .insert({ tenant_id: tenant.id, name: 'Equipe SP' })
    .select()
    .single();

  // ============ PROFILES ============
  console.log('Creating profiles...');

  const { data: demoUser } = await supabase
    .from('profiles')
    .insert({
      id: DEMO_USER_ID,
      auth_uid: DEMO_AUTH_UID,
      tenant_id: tenant.id,
      team_id: team!.id,
      role: 'admin',
      full_name: 'Demo Admin',
      email: 'demo@vitao.com.br',
    })
    .select()
    .single();

  const sellers: any[] = [];
  const sellerNames = [
    { name: 'João Silva', email: 'joao@vitao.com.br' },
    { name: 'Maria Santos', email: 'maria@vitao.com.br' },
    { name: 'Carlos Oliveira', email: 'carlos@vitao.com.br' },
  ];

  for (let i = 0; i < sellerNames.length; i++) {
    const { data: seller } = await supabase
      .from('profiles')
      .insert({
        auth_uid: `44444444-4444-4444-4444-44444444444${i}`,
        tenant_id: tenant.id,
        team_id: team!.id,
        role: 'seller',
        full_name: sellerNames[i].name,
        email: sellerNames[i].email,
      })
      .select()
      .single();
    sellers.push(seller);
  }
  console.log(`✓ ${sellers.length + 1} profiles\n`);

  // ============ CUSTOMERS (15) ============
  console.log('Creating 15 customers...');

  const customerConfigs = [
    // ATIVO (5 customers)
    { name: 'Supermercado Bom Preço', status: 'ATIVO', days: 5, seller: 0 },
    { name: 'Padaria Pão Quente', status: 'ATIVO', days: 12, seller: 0 },
    { name: 'Restaurante Sabor & Cia', status: 'ATIVO', days: 18, seller: 1 },
    { name: 'Bar do Zé', status: 'ATIVO', days: 8, seller: 1 },
    { name: 'Lanchonete Express', status: 'ATIVO', days: 3, seller: 2 },

    // EM_RISCO (4 customers)
    { name: 'Mercadinho da Esquina', status: 'EM_RISCO', days: 52, seller: 0 },
    { name: 'Açougue Premium', status: 'EM_RISCO', days: 55, seller: 1 },
    { name: 'Pizzaria Bella', status: 'EM_RISCO', days: 58, seller: 2 },
    { name: 'Doceria Amor', status: 'EM_RISCO', days: 54, seller: 0 },

    // INATIVO_RECENTE (3 customers)
    { name: 'Café Colonial', status: 'INATIVO_RECENTE', days: 68, seller: 1 },
    { name: 'Hamburgueria Top', status: 'INATIVO_RECENTE', days: 75, seller: 2 },
    { name: 'Sushi Express', status: 'INATIVO_RECENTE', days: 82, seller: 0 },

    // INATIVO_ANTIGO (2 customers)
    { name: 'Cantina Italiana', status: 'INATIVO_ANTIGO', days: 120, seller: 1 },
    { name: 'Churrascaria Gaúcha', status: 'INATIVO_ANTIGO', days: 150, seller: 2 },

    // LEAD (1 customer - no orders)
    { name: 'Novo Restaurante Plaza', status: 'ATIVO', days: null, seller: 0 },
  ];

  const customers: any[] = [];
  for (let i = 0; i < customerConfigs.length; i++) {
    const c = customerConfigs[i];
    const cnpj = `${(10 + i).toString().padStart(2, '0')}.${(100 + i).toString().padStart(3, '0')}.${(200 + i).toString().padStart(3, '0')}/0001-${(10 + i).toString().padStart(2, '0')}`;

    const lastOrderAt = c.days ? new Date(Date.now() - c.days * 24 * 60 * 60 * 1000) : null;

    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        tenant_id: tenant.id,
        seller_id: sellers[c.seller].id,
        company_name: c.name,
        trade_name: c.name.split(' ')[0],
        contact_name: `Gerente ${c.name.split(' ')[0]}`,
        cnpj: normalizeCNPJ(cnpj),
        phone: normalizePhoneE164(`119${(80000000 + i * 1111111).toString()}`),
        email: `contato@${c.name.toLowerCase().replace(/\s+/g, '')}.com.br`,
        lifecycle_status: c.status,
        days_since_last_order: c.days,
        last_order_at: lastOrderAt,
        first_order_at: lastOrderAt ? new Date(lastOrderAt.getTime() - 180 * 24 * 60 * 60 * 1000) : null,
        total_orders: c.days ? Math.floor(Math.random() * 15) + 3 : 0,
        total_revenue: c.days ? Math.random() * 80000 + 10000 : 0,
        average_ticket: c.days ? Math.random() * 3000 + 800 : 0,
        repurchase_cycle_days: 30,
        address_city: 'São Paulo',
        address_state: 'SP',
        address_street: `Rua ${c.name.split(' ')[1] || 'Principal'}`,
        address_number: String(100 + i * 10),
        address_neighborhood: ['Centro', 'Vila Mariana', 'Pinheiros', 'Moema'][i % 4],
        address_zip: `0${1000 + i * 100}-000`,
      })
      .select()
      .single();

    if (error) throw error;
    customers.push(customer);
  }
  console.log(`✓ ${customers.length} customers\n`);

  // ============ ORDERS (25+) ============
  console.log('Creating 25+ orders...');
  let orderCount = 0;

  for (const customer of customers) {
    if (!customer.last_order_at) continue;

    const numOrders = Math.min(5, Math.floor(Math.random() * 4) + 2);

    for (let i = 0; i < numOrders; i++) {
      const orderedAt = new Date(
        new Date(customer.last_order_at).getTime() - i * 25 * 24 * 60 * 60 * 1000
      );

      const totalAmount = Math.random() * 4000 + 800;
      const discountAmount = Math.random() * 150;

      await supabase.from('orders').insert({
        tenant_id: tenant.id,
        customer_id: customer.id,
        seller_id: customer.seller_id,
        order_number: `PED-${String(orderedAt.getTime()).slice(-6)}-${i}`,
        status: ['COMPLETED', 'DELIVERED', 'PENDING'][i % 3],
        total_amount: totalAmount,
        discount_amount: discountAmount,
        shipping_amount: 0,
        net_amount: totalAmount - discountAmount,
        ordered_at: orderedAt,
        source: 'CSV_IMPORT',
      });
      orderCount++;
    }
  }
  console.log(`✓ ${orderCount} orders\n`);

  // ============ INTERACTIONS (45+) ============
  console.log('Creating 45+ interactions...');
  let interactionCount = 0;

  const sentimentMessages = [
    { content: 'Adorei o atendimento! Vocês são ótimos!', sentiment: 85, label: 'POSITIVO' },
    { content: 'Produto chegou em perfeito estado, obrigado.', sentiment: 75, label: 'POSITIVO' },
    { content: 'Preciso de ajuda com o pedido, podem verificar?', sentiment: 50, label: 'NEUTRO' },
    { content: 'O preço está muito alto, vocês fazem desconto?', sentiment: 40, label: 'NEUTRO' },
    { content: 'Estou decepcionado com o atraso na entrega.', sentiment: 25, label: 'NEGATIVO' },
    { content: 'Produto veio com defeito, quero trocar.', sentiment: 20, label: 'NEGATIVO' },
  ];

  for (const customer of customers) {
    const numInteractions = Math.floor(Math.random() * 5) + 2;

    for (let i = 0; i < numInteractions; i++) {
      const occurredAt = new Date(Date.now() - Math.random() * 45 * 24 * 60 * 60 * 1000);
      const isInbound = Math.random() > 0.4;
      const msg = sentimentMessages[Math.floor(Math.random() * sentimentMessages.length)];

      await supabase.from('interactions').insert({
        tenant_id: tenant.id,
        customer_id: customer.id,
        seller_id: customer.seller_id,
        channel: ['WHATSAPP', 'EMAIL', 'PHONE'][Math.floor(Math.random() * 3)],
        direction: isInbound ? 'INBOUND' : 'OUTBOUND',
        occurred_at: occurredAt,
        responded_at: isInbound && Math.random() > 0.2
          ? new Date(occurredAt.getTime() + Math.random() * 2 * 60 * 60 * 1000)
          : null,
        content: msg.content,
        content_preview: msg.content.substring(0, 50),
        ai_sentiment_score: msg.sentiment,
        ai_sentiment_label: msg.label,
        source: 'CSV_IMPORT',
      });
      interactionCount++;
    }
  }

  // Add specific MSG_UNANSWERED_2H examples (3 customers with unanswered messages)
  const urgentCustomers = customers.filter(c => c.lifecycle_status === 'ATIVO').slice(0, 3);
  for (const customer of urgentCustomers) {
    await supabase.from('interactions').insert({
      tenant_id: tenant.id,
      customer_id: customer.id,
      seller_id: customer.seller_id,
      channel: 'WHATSAPP',
      direction: 'INBOUND',
      occurred_at: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3h ago
      responded_at: null,
      content: '⚠️ URGENTE: Preciso falar sobre meu pedido agora!',
      content_preview: '⚠️ URGENTE: Preciso falar...',
      source: 'DESKRIO',
    });
    interactionCount++;
  }
  console.log(`✓ ${interactionCount} interactions\n`);

  // ============ TASKS (35+ with all reason_codes) ============
  console.log('Creating 35+ tasks (all reason_codes)...');

  const taskTemplates = [
    // P1 - MSG_UNANSWERED_2H (5 tasks)
    { reason: 'MSG_UNANSWERED_2H', bucket: 'P1', title: '🔴 Responder WhatsApp urgente', score: 800, count: 5 },

    // P2 - REPURCHASE_DUE (8 tasks)
    { reason: 'REPURCHASE_DUE', bucket: 'P2', title: '🟠 Ciclo de recompra vencendo', score: 600, count: 8 },

    // P2 - COMPLAINT (2 tasks)
    { reason: 'COMPLAINT', bucket: 'P2', title: '🟠 Resolver reclamação', score: 650, count: 2 },

    // P3 - QUOTE_STALE_2D (6 tasks)
    { reason: 'QUOTE_STALE_2D', bucket: 'P3', title: '🟡 Acompanhar orçamento', score: 400, count: 6 },

    // P3 - FOLLOWUP_DUE (6 tasks)
    { reason: 'FOLLOWUP_DUE', bucket: 'P3', title: '🟡 Follow-up pendente', score: 350, count: 6 },

    // P3 - SLA_BREACHING (3 tasks)
    { reason: 'SLA_BREACHING', bucket: 'P3', title: '🟡 SLA próximo do limite', score: 450, count: 3 },

    // P4 - POSTSALE_D45 (5 tasks)
    { reason: 'POSTSALE_D45', bucket: 'P4', title: '🟢 Pós-venda D+45', score: 200, count: 5 },
  ];

  let taskCount = 0;
  for (const template of taskTemplates) {
    for (let i = 0; i < template.count; i++) {
      const customer = customers[(taskCount + i) % customers.length];
      const daysOffset = template.bucket === 'P1' ? 0 : template.bucket === 'P2' ? 1 : template.bucket === 'P3' ? 3 : 7;

      await supabase.from('tasks').insert({
        tenant_id: tenant.id,
        customer_id: customer.id,
        assigned_to: customer.seller_id,
        priority_bucket: template.bucket,
        priority_score: template.score + Math.floor(Math.random() * 100),
        reason_code: template.reason,
        reason_details: `${customer.company_name} - ${template.title}`,
        title: template.title,
        description: `Ação necessária para ${customer.company_name}. Cliente ${customer.lifecycle_status}.`,
        status: i === 0 ? 'IN_PROGRESS' : 'PENDING',
        due_at: new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000),
        ai_confidence: 0.85 + Math.random() * 0.14,
        ai_suggestions: {
          action: 'Entrar em contato via WhatsApp',
          script: `Olá! Tudo bem com você? Vi que faz ${customer.days_since_last_order || 'alguns'} dias desde seu último pedido...`,
        },
        source: 'SYSTEM',
      });
      taskCount++;
    }
  }
  console.log(`✓ ${taskCount} tasks\n`);

  // ============ KANBAN CARDS + EVENTS (12 cards, 25+ events) ============
  console.log('Creating 12 kanban cards + 25 events...');

  const stages: KanbanStage[] = ['LEAD', 'QUALIFICACAO', 'ORCAMENTO_ENVIADO', 'EM_ATENDIMENTO', 'NEGOCIACAO', 'VENDA_CONCLUIDA'];
  let cardCount = 0;
  let eventCount = 0;

  for (let i = 0; i < 12; i++) {
    const customer = customers[i % customers.length];
    const stage = stages[i % stages.length];
    const column = columns.find(c => c.stage === stage);
    if (!column) continue;

    const enteredAt = new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000);

    const { data: card } = await supabase.from('kanban_cards').insert({
      tenant_id: tenant.id,
      customer_id: customer.id,
      column_id: column.id,
      seller_id: customer.seller_id,
      stage,
      position: i,
      title: customer.company_name,
      value: Math.random() * 15000 + 2000,
      entered_stage_at: enteredAt,
      sla_deadline: column.sla_days ? new Date(enteredAt.getTime() + column.sla_days * 24 * 60 * 60 * 1000) : null,
    }).select().single();

    cardCount++;

    // Create 2-3 events per card
    const numEvents = Math.floor(Math.random() * 2) + 2;
    let prevStage = stages[Math.max(0, stages.indexOf(stage) - 2)];

    for (let j = 0; j < numEvents; j++) {
      const eventAt = new Date(enteredAt.getTime() - (numEvents - j) * 2 * 24 * 60 * 60 * 1000);
      const toStage = stages[Math.min(stages.indexOf(stage), stages.indexOf(prevStage) + 1)];

      await supabase.from('kanban_events').insert({
        tenant_id: tenant.id,
        card_id: card!.id,
        actor_id: customer.seller_id,
        event_type: j === 0 ? 'CREATED' : 'MOVED',
        from_stage: j === 0 ? null : prevStage,
        to_stage: toStage,
        trigger: ['MANUAL', 'RULE', 'INTEGRATION'][j % 3],
        created_at: eventAt,
      });

      prevStage = toStage;
      eventCount++;
    }
  }
  console.log(`✓ ${cardCount} cards, ${eventCount} events\n`);

  // ============ DLQ EXAMPLES ============
  console.log('Creating 5 DLQ examples...');

  const dlqExamples = [
    { type: 'webhook_failed', error: 'Connection timeout to https://external.api/webhook', retries: 3 },
    { type: 'ai_analysis_failed', error: 'OpenAI rate limit exceeded', retries: 2 },
    { type: 'email_send_failed', error: 'SMTP authentication failed', retries: 5 },
    { type: 'csv_import_row_failed', error: 'Invalid CNPJ format: 123456', retries: 1 },
    { type: 'notification_failed', error: 'Push notification service unavailable', retries: 3 },
  ];

  for (let i = 0; i < dlqExamples.length; i++) {
    const dlq = dlqExamples[i];
    const customer = customers[i % customers.length];

    await supabase.from('event_log').insert({
      tenant_id: tenant.id,
      idempotency_key: `dlq-demo-${Date.now()}-${i}`,
      source: 'SYSTEM',
      event_type: dlq.type,
      entity_type: 'customer',
      entity_id: customer.id,
      processed_at: null, // Not processed = in DLQ
      error: `[Attempt ${dlq.retries}/5] ${dlq.error}`,
      payload: {
        customer_id: customer.id,
        customer_name: customer.company_name,
        retry_count: dlq.retries,
        last_attempt: new Date().toISOString(),
        original_error: dlq.error,
      },
    });
  }
  console.log('✓ 5 DLQ entries\n');

  // ============ SUMMARY ============
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🎬 DEMO SEED COMPLETE!\n');
  console.log('Dataset summary:');
  console.log(`  ✓ 1 tenant (slug: demo)`);
  console.log(`  ✓ ${sellers.length + 1} profiles (1 admin, ${sellers.length} sellers)`);
  console.log(`  ✓ ${customers.length} customers`);
  console.log(`  ✓ ${orderCount} orders`);
  console.log(`  ✓ ${interactionCount} interactions`);
  console.log(`  ✓ ${taskCount} tasks (all reason_codes covered)`);
  console.log(`  ✓ ${cardCount} kanban cards`);
  console.log(`  ✓ ${eventCount} kanban events`);
  console.log(`  ✓ 5 DLQ examples`);
  console.log('');
  console.log('Demo Mode IDs (for DEMO_MODE=true):');
  console.log(`  DEMO_TENANT_ID: ${DEMO_TENANT_ID}`);
  console.log(`  DEMO_USER_ID: ${DEMO_USER_ID}`);
  console.log('');
  console.log('To start demo mode:');
  console.log('  DEMO_MODE=true pnpm dev:web');
  console.log('═══════════════════════════════════════════════════════════\n');
}

seedDemo()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Demo seed failed:', err);
    process.exit(1);
  });
