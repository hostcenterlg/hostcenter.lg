#!/usr/bin/env tsx
// ============================================
// VITAO JARVIS CRM - Seed Script
// ============================================

import { getSupabaseAdminClient } from './client';
import { createRepositories, KanbanRepository } from './repositories';
import {
  normalizePhoneE164,
  normalizeCNPJ,
  KanbanStage,
  LifecycleStatus,
} from '@jarvis/shared';

async function seed() {
  console.log('🌱 Starting seed...\n');

  const supabase = getSupabaseAdminClient();
  const repos = createRepositories(supabase);
  const kanbanRepo = new KanbanRepository(supabase);

  // ============ CREATE TENANT ============
  console.log('Creating tenant...');
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      name: 'Demo Company',
      slug: 'demo',
      settings: {
        timezone: 'America/Sao_Paulo',
        business_days: [1, 2, 3, 4, 5],
        sla_hours: 4,
        repurchase_cycle_default_days: 30,
        ai_enabled: true,
        ai_auto_draft: false,
      },
    })
    .select()
    .single();

  if (tenantError) {
    console.error('Error creating tenant:', tenantError);
    throw tenantError;
  }
  console.log(`✓ Tenant created: ${tenant.id}\n`);

  // ============ CREATE KANBAN COLUMNS ============
  console.log('Creating kanban columns...');
  await kanbanRepo.initializeColumns(tenant.id);
  console.log('✓ Kanban columns created\n');

  // ============ CREATE TEAM ============
  console.log('Creating team...');
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .insert({
      tenant_id: tenant.id,
      name: 'Vendas SP',
    })
    .select()
    .single();

  if (teamError) throw teamError;
  console.log(`✓ Team created: ${team.id}\n`);

  // ============ CREATE PROFILES ============
  console.log('Creating profiles...');

  // Admin
  const { data: admin, error: adminError } = await supabase
    .from('profiles')
    .insert({
      auth_uid: '00000000-0000-0000-0000-000000000001',
      tenant_id: tenant.id,
      team_id: team.id,
      role: 'admin',
      full_name: 'Admin Jarvis',
      email: 'admin@demo.com',
    })
    .select()
    .single();
  if (adminError) throw adminError;

  // Manager
  const { data: manager, error: managerError } = await supabase
    .from('profiles')
    .insert({
      auth_uid: '00000000-0000-0000-0000-000000000002',
      tenant_id: tenant.id,
      team_id: team.id,
      role: 'manager',
      full_name: 'Maria Gestora',
      email: 'maria@demo.com',
    })
    .select()
    .single();
  if (managerError) throw managerError;

  // Update team manager
  await supabase
    .from('teams')
    .update({ manager_id: manager.id })
    .eq('id', team.id);

  // Sellers
  const sellerData = [
    { name: 'João Silva', email: 'joao@demo.com', uid: '00000000-0000-0000-0000-000000000003' },
    { name: 'Ana Costa', email: 'ana@demo.com', uid: '00000000-0000-0000-0000-000000000004' },
    { name: 'Pedro Santos', email: 'pedro@demo.com', uid: '00000000-0000-0000-0000-000000000005' },
  ];

  const sellers = [];
  for (const s of sellerData) {
    const { data: seller, error } = await supabase
      .from('profiles')
      .insert({
        auth_uid: s.uid,
        tenant_id: tenant.id,
        team_id: team.id,
        role: 'seller',
        full_name: s.name,
        email: s.email,
      })
      .select()
      .single();
    if (error) throw error;
    sellers.push(seller);
  }
  console.log(`✓ Created ${sellers.length + 2} profiles\n`);

  // ============ CREATE CUSTOMERS ============
  console.log('Creating customers...');
  const customerData = [
    // Active customers
    {
      company_name: 'Tech Solutions Ltda',
      cnpj: normalizeCNPJ('12.345.678/0001-90'),
      phone: normalizePhoneE164('11987654321'),
      email: 'contato@techsolutions.com.br',
      contact_name: 'Carlos Tech',
      lifecycle_status: 'ATIVO',
      days_since_last_order: 10,
      seller_id: sellers[0].id,
    },
    {
      company_name: 'Comercial ABC',
      cnpj: normalizeCNPJ('23.456.789/0001-01'),
      phone: normalizePhoneE164('11976543210'),
      email: 'compras@comercialabc.com.br',
      contact_name: 'Roberto ABC',
      lifecycle_status: 'ATIVO',
      days_since_last_order: 25,
      seller_id: sellers[0].id,
    },
    // At risk
    {
      company_name: 'Indústria XYZ',
      cnpj: normalizeCNPJ('34.567.890/0001-12'),
      phone: normalizePhoneE164('11965432109'),
      email: 'industria@xyz.com.br',
      contact_name: 'Fernanda XYZ',
      lifecycle_status: 'EM_RISCO',
      days_since_last_order: 55,
      seller_id: sellers[1].id,
    },
    {
      company_name: 'Atacado Central',
      cnpj: normalizeCNPJ('45.678.901/0001-23'),
      phone: normalizePhoneE164('11954321098'),
      email: 'central@atacado.com.br',
      contact_name: 'Marcos Central',
      lifecycle_status: 'EM_RISCO',
      days_since_last_order: 58,
      seller_id: sellers[1].id,
    },
    // Inactive recent
    {
      company_name: 'Distribuidora Norte',
      cnpj: normalizeCNPJ('56.789.012/0001-34'),
      phone: normalizePhoneE164('11943210987'),
      email: 'norte@distribuidora.com.br',
      contact_name: 'Paula Norte',
      lifecycle_status: 'INATIVO_RECENTE',
      days_since_last_order: 75,
      seller_id: sellers[2].id,
    },
    // Inactive old
    {
      company_name: 'Velha Guarda Comércio',
      cnpj: normalizeCNPJ('67.890.123/0001-45'),
      phone: normalizePhoneE164('11932109876'),
      email: 'velhaguarda@comercio.com.br',
      contact_name: 'José Antigo',
      lifecycle_status: 'INATIVO_ANTIGO',
      days_since_last_order: 120,
      seller_id: sellers[2].id,
    },
    // New lead (no orders)
    {
      company_name: 'Nova Empresa SA',
      cnpj: normalizeCNPJ('78.901.234/0001-56'),
      phone: normalizePhoneE164('11921098765'),
      email: 'nova@empresa.com.br',
      contact_name: 'Lucas Novo',
      lifecycle_status: 'ATIVO',
      days_since_last_order: null,
      seller_id: sellers[0].id,
    },
  ];

  const customers = [];
  for (const c of customerData) {
    const lastOrderAt = c.days_since_last_order
      ? new Date(Date.now() - c.days_since_last_order * 24 * 60 * 60 * 1000)
      : null;

    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        tenant_id: tenant.id,
        ...c,
        last_order_at: lastOrderAt,
        first_order_at: lastOrderAt ? new Date(lastOrderAt.getTime() - 90 * 24 * 60 * 60 * 1000) : null,
        total_orders: lastOrderAt ? Math.floor(Math.random() * 10) + 1 : 0,
        total_revenue: lastOrderAt ? Math.random() * 50000 + 5000 : 0,
        average_ticket: lastOrderAt ? Math.random() * 5000 + 500 : 0,
        repurchase_cycle_days: 30,
        address_city: 'São Paulo',
        address_state: 'SP',
      })
      .select()
      .single();
    if (error) throw error;
    customers.push(customer);
  }
  console.log(`✓ Created ${customers.length} customers\n`);

  // ============ CREATE ORDERS ============
  console.log('Creating orders...');
  for (const customer of customers) {
    if (!customer.last_order_at) continue;

    const orderCount = Math.floor(Math.random() * 5) + 1;
    for (let i = 0; i < orderCount; i++) {
      const orderedAt = new Date(
        new Date(customer.last_order_at).getTime() - i * 30 * 24 * 60 * 60 * 1000
      );

      const totalAmount = Math.random() * 5000 + 500;
      const discountAmount = Math.random() * 200;
      const shippingAmount = Math.random() * 100;

      const { error } = await supabase.from('orders').insert({
        tenant_id: tenant.id,
        customer_id: customer.id,
        seller_id: customer.seller_id,
        order_number: `ORD-${Date.now()}-${i}`,
        status: i === 0 ? 'COMPLETED' : 'DELIVERED',
        total_amount: totalAmount,
        discount_amount: discountAmount,
        shipping_amount: shippingAmount,
        net_amount: totalAmount - discountAmount + shippingAmount,
        ordered_at: orderedAt,
        source: 'MANUAL',
      });
      if (error) throw error;
    }
  }
  console.log('✓ Orders created\n');

  // ============ CREATE INTERACTIONS ============
  console.log('Creating interactions...');
  const channels = ['WHATSAPP', 'EMAIL', 'PHONE'];

  for (const customer of customers) {
    // Create some interactions
    const interactionCount = Math.floor(Math.random() * 8) + 2;

    for (let i = 0; i < interactionCount; i++) {
      const occurredAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      const isInbound = Math.random() > 0.5;
      const hasResponse = !isInbound || Math.random() > 0.3;

      const { error } = await supabase.from('interactions').insert({
        tenant_id: tenant.id,
        customer_id: customer.id,
        seller_id: customer.seller_id,
        channel: channels[Math.floor(Math.random() * channels.length)],
        direction: isInbound ? 'INBOUND' : 'OUTBOUND',
        occurred_at: occurredAt,
        responded_at: hasResponse && isInbound
          ? new Date(occurredAt.getTime() + Math.random() * 4 * 60 * 60 * 1000)
          : null,
        content: `Mensagem de teste ${i + 1} para ${customer.company_name}`,
        content_preview: `Mensagem de teste ${i + 1}...`,
        source: 'MANUAL',
      });
      if (error) throw error;
    }

    // Create one unanswered message for some customers (P1)
    if (Math.random() > 0.6) {
      const { error } = await supabase.from('interactions').insert({
        tenant_id: tenant.id,
        customer_id: customer.id,
        seller_id: customer.seller_id,
        channel: 'WHATSAPP',
        direction: 'INBOUND',
        occurred_at: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        responded_at: null,
        content: 'Olá, preciso de ajuda com meu pedido. Podem me atender?',
        content_preview: 'Olá, preciso de ajuda...',
        source: 'MANUAL',
      });
      if (error) throw error;
    }
  }
  console.log('✓ Interactions created\n');

  // ============ CREATE KANBAN CARDS ============
  console.log('Creating kanban cards...');
  const stages: KanbanStage[] = [
    'LEAD',
    'QUALIFICACAO',
    'ORCAMENTO_ENVIADO',
    'EM_ATENDIMENTO',
    'NEGOCIACAO',
  ];

  // Get columns
  const columns = await kanbanRepo.getColumns(tenant.id);

  for (let i = 0; i < customers.length && i < stages.length; i++) {
    const customer = customers[i];
    const stage = stages[i];
    const column = columns.find(c => c.stage === stage);

    if (!column) continue;

    const now = new Date();
    const enteredAt = new Date(now.getTime() - Math.random() * 5 * 24 * 60 * 60 * 1000);
    const slaDeadline = column.sla_days
      ? new Date(enteredAt.getTime() + column.sla_days * 24 * 60 * 60 * 1000)
      : null;

    const { error } = await supabase.from('kanban_cards').insert({
      tenant_id: tenant.id,
      customer_id: customer.id,
      column_id: column.id,
      seller_id: customer.seller_id,
      stage,
      position: i,
      title: customer.company_name,
      value: Math.random() * 10000 + 1000,
      entered_stage_at: enteredAt,
      sla_deadline: slaDeadline,
      metadata: {},
    });
    if (error) throw error;
  }
  console.log('✓ Kanban cards created\n');

  // ============ CREATE TASKS ============
  console.log('Creating tasks...');
  const reasonCodes = [
    { code: 'MSG_UNANSWERED_2H', bucket: 'P1', title: 'Responder mensagem pendente' },
    { code: 'REPURCHASE_DUE', bucket: 'P2', title: 'Contatar para recompra' },
    { code: 'QUOTE_STALE_2D', bucket: 'P3', title: 'Acompanhar orçamento enviado' },
    { code: 'FOLLOWUP_DUE', bucket: 'P3', title: 'Realizar follow-up' },
    { code: 'POSTSALE_D45', bucket: 'P4', title: 'Pós-venda D+45' },
  ];

  for (const customer of customers) {
    // Create 1-2 tasks per customer
    const taskCount = Math.floor(Math.random() * 2) + 1;

    for (let i = 0; i < taskCount; i++) {
      const reason = reasonCodes[Math.floor(Math.random() * reasonCodes.length)];
      const dueAt = new Date(Date.now() + (Math.random() - 0.5) * 7 * 24 * 60 * 60 * 1000);

      const { error } = await supabase.from('tasks').insert({
        tenant_id: tenant.id,
        customer_id: customer.id,
        assigned_to: customer.seller_id,
        priority_bucket: reason.bucket,
        priority_score: Math.floor(Math.random() * 500) + 100,
        reason_code: reason.code,
        reason_details: `${reason.title} - ${customer.company_name}`,
        title: reason.title,
        description: `Tarefa automática para ${customer.company_name}`,
        status: 'PENDING',
        due_at: dueAt,
        source: 'SYSTEM',
      });
      if (error) throw error;
    }
  }
  console.log('✓ Tasks created\n');

  // ============ SUMMARY ============
  console.log('===========================================');
  console.log('✅ Seed completed successfully!\n');
  console.log('Summary:');
  console.log(`  Tenant ID: ${tenant.id}`);
  console.log(`  Tenant Slug: ${tenant.slug}`);
  console.log(`  Team ID: ${team.id}`);
  console.log(`  Admin: ${admin.email}`);
  console.log(`  Manager: ${manager.email}`);
  console.log(`  Sellers: ${sellers.map(s => s.email).join(', ')}`);
  console.log(`  Customers: ${customers.length}`);
  console.log('===========================================\n');

  console.log('To login, create users in Supabase Auth with these emails:');
  console.log('  - admin@demo.com (admin)');
  console.log('  - maria@demo.com (manager)');
  console.log('  - joao@demo.com, ana@demo.com, pedro@demo.com (sellers)\n');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
