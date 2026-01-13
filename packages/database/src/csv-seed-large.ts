#!/usr/bin/env tsx
// ============================================
// VITAO JARVIS CRM - Large CSV Seed Generator
// ============================================

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const OUTPUT_DIR = join(process.cwd(), 'data', 'seed');

// ============ HELPERS ============

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysAgo: number): Date {
  return new Date(Date.now() - Math.random() * daysAgo * 24 * 60 * 60 * 1000);
}

function formatDate(date: Date): string {
  return date.toISOString();
}

function generateCNPJ(): string {
  const n = () => Math.floor(Math.random() * 10);
  return `${n()}${n()}.${n()}${n()}${n()}.${n()}${n()}${n()}/0001-${n()}${n()}`;
}

function generatePhone(): string {
  const ddd = randomItem(['11', '21', '31', '41', '51', '19', '27', '48']);
  const number = `9${randomInt(1000, 9999)}${randomInt(1000, 9999)}`;
  return `${ddd}${number}`;
}

function generateEmail(name: string, domain: string): string {
  return `${name.toLowerCase().replace(/\s+/g, '.')}@${domain}`;
}

// ============ DATA GENERATORS ============

const COMPANY_PREFIXES = [
  'Tech', 'Global', 'Prime', 'Alpha', 'Beta', 'Mega', 'Super', 'Ultra',
  'Master', 'Pro', 'Elite', 'Smart', 'Fast', 'Quick', 'Easy', 'Best',
  'Top', 'First', 'Great', 'Good', 'New', 'Modern', 'Classic', 'Premium',
];

const COMPANY_SUFFIXES = [
  'Solutions', 'Systems', 'Services', 'Tech', 'Corp', 'Group', 'Inc',
  'Ltda', 'SA', 'Comércio', 'Distribuidora', 'Atacado', 'Varejo',
  'Industrial', 'Comercial', 'Trading', 'Imports', 'Exports', 'Brasil',
];

const DOMAINS = [
  'empresa.com.br', 'comercio.com.br', 'industria.com.br', 'tech.com.br',
  'solutions.com.br', 'group.com.br', 'corp.com.br', 'brasil.com.br',
];

const FIRST_NAMES = [
  'João', 'Maria', 'Pedro', 'Ana', 'Carlos', 'Paula', 'Lucas', 'Julia',
  'Marcos', 'Fernanda', 'Rafael', 'Camila', 'Bruno', 'Leticia', 'Diego',
  'Larissa', 'Thiago', 'Amanda', 'Gabriel', 'Beatriz', 'Felipe', 'Carolina',
];

const LAST_NAMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves',
  'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho',
  'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Barbosa', 'Rocha',
];

const CITIES = [
  { city: 'São Paulo', state: 'SP' },
  { city: 'Rio de Janeiro', state: 'RJ' },
  { city: 'Belo Horizonte', state: 'MG' },
  { city: 'Curitiba', state: 'PR' },
  { city: 'Porto Alegre', state: 'RS' },
  { city: 'Brasília', state: 'DF' },
  { city: 'Salvador', state: 'BA' },
  { city: 'Fortaleza', state: 'CE' },
  { city: 'Recife', state: 'PE' },
  { city: 'Campinas', state: 'SP' },
];

const PRODUCT_NAMES = [
  'Widget Pro', 'Gadget Max', 'Tool Kit', 'Smart Device', 'Power Unit',
  'Control Panel', 'Sensor Pack', 'Cable Set', 'Connector Kit', 'Module X',
  'Component A', 'Part B', 'Assembly C', 'System D', 'Unit E',
];

const MESSAGE_TEMPLATES = [
  'Olá, gostaria de saber mais sobre os produtos.',
  'Preciso de um orçamento para 100 unidades.',
  'Qual o prazo de entrega para minha região?',
  'Vocês trabalham com atacado?',
  'Gostaria de agendar uma visita.',
  'Podem enviar o catálogo atualizado?',
  'Qual a forma de pagamento?',
  'Tive um problema com meu pedido.',
  'Muito obrigado pelo atendimento!',
  'Preciso de suporte técnico.',
  'Quando chegará minha entrega?',
  'Gostaria de fazer uma reclamação.',
  'Excelente produto, muito satisfeito!',
  'Quero cancelar meu pedido.',
  'Podem verificar o status do meu pedido?',
];

// ============ GENERATORS ============

function generateCustomers(count: number): string {
  const rows: string[] = [
    'external_id,cnpj,phone,email,company_name,trade_name,contact_name,address_city,address_state,tags,notes',
  ];

  for (let i = 0; i < count; i++) {
    const companyName = `${randomItem(COMPANY_PREFIXES)} ${randomItem(COMPANY_SUFFIXES)}`;
    const contactName = `${randomItem(FIRST_NAMES)} ${randomItem(LAST_NAMES)}`;
    const location = randomItem(CITIES);
    const domain = randomItem(DOMAINS);

    rows.push([
      `EXT-${i + 1}`,
      generateCNPJ(),
      generatePhone(),
      generateEmail(contactName, domain),
      companyName,
      companyName,
      contactName,
      location.city,
      location.state,
      randomItem(['varejo', 'atacado', 'industria', 'servicos']),
      `Cliente importado via CSV - ${i + 1}`,
    ].join(','));
  }

  return rows.join('\n');
}

function generateOrders(customerCount: number, ordersPerCustomer: number): string {
  const rows: string[] = [
    'external_id,customer_external_id,order_number,status,total_amount,discount_amount,shipping_amount,ordered_at,notes',
  ];

  let orderNum = 1;

  for (let c = 0; c < customerCount; c++) {
    const customerOrderCount = randomInt(1, ordersPerCustomer);

    for (let o = 0; o < customerOrderCount; o++) {
      const totalAmount = randomInt(500, 15000);
      const discountAmount = randomInt(0, Math.floor(totalAmount * 0.1));
      const shippingAmount = randomInt(20, 200);
      const orderedAt = randomDate(180); // Last 6 months

      rows.push([
        `ORD-${orderNum}`,
        `EXT-${c + 1}`,
        `PED-${orderNum.toString().padStart(6, '0')}`,
        randomItem(['COMPLETED', 'DELIVERED', 'SHIPPED', 'PENDING']),
        totalAmount.toFixed(2),
        discountAmount.toFixed(2),
        shippingAmount.toFixed(2),
        formatDate(orderedAt),
        `Pedido ${orderNum}`,
      ].join(','));

      orderNum++;
    }
  }

  return rows.join('\n');
}

function generateInteractions(customerCount: number, interactionsPerCustomer: number): string {
  const rows: string[] = [
    'external_id,customer_external_id,channel,direction,occurred_at,responded_at,subject,content',
  ];

  let interactionNum = 1;

  for (let c = 0; c < customerCount; c++) {
    const customerInteractionCount = randomInt(2, interactionsPerCustomer);

    for (let i = 0; i < customerInteractionCount; i++) {
      const channel = randomItem(['WHATSAPP', 'EMAIL', 'PHONE']);
      const direction = randomItem(['INBOUND', 'OUTBOUND']);
      const occurredAt = randomDate(90); // Last 3 months
      const hasResponse = direction === 'OUTBOUND' || Math.random() > 0.2;
      const respondedAt = hasResponse
        ? new Date(occurredAt.getTime() + randomInt(1, 4) * 60 * 60 * 1000)
        : null;
      const content = randomItem(MESSAGE_TEMPLATES);

      rows.push([
        `INT-${interactionNum}`,
        `EXT-${c + 1}`,
        channel,
        direction,
        formatDate(occurredAt),
        respondedAt ? formatDate(respondedAt) : '',
        channel === 'EMAIL' ? 'Assunto do email' : '',
        `"${content}"`,
      ].join(','));

      interactionNum++;
    }
  }

  return rows.join('\n');
}

// ============ MAIN ============

async function main() {
  const args = process.argv.slice(2);
  const customerCount = parseInt(args[0] || '1000', 10);
  const ordersPerCustomer = parseInt(args[1] || '5', 10);
  const interactionsPerCustomer = parseInt(args[2] || '10', 10);

  console.log(`\n🌱 Generating large seed data...`);
  console.log(`   Customers: ${customerCount}`);
  console.log(`   Orders per customer (max): ${ordersPerCustomer}`);
  console.log(`   Interactions per customer (max): ${interactionsPerCustomer}\n`);

  // Create output directory
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Generate customers
  console.log('Generating customers...');
  const customersCSV = generateCustomers(customerCount);
  writeFileSync(join(OUTPUT_DIR, 'customers.csv'), customersCSV);
  console.log(`✓ customers.csv (${customerCount} rows)`);

  // Generate orders
  console.log('Generating orders...');
  const ordersCSV = generateOrders(customerCount, ordersPerCustomer);
  const orderCount = ordersCSV.split('\n').length - 1;
  writeFileSync(join(OUTPUT_DIR, 'orders.csv'), ordersCSV);
  console.log(`✓ orders.csv (${orderCount} rows)`);

  // Generate interactions
  console.log('Generating interactions...');
  const interactionsCSV = generateInteractions(customerCount, interactionsPerCustomer);
  const interactionCount = interactionsCSV.split('\n').length - 1;
  writeFileSync(join(OUTPUT_DIR, 'interactions.csv'), interactionsCSV);
  console.log(`✓ interactions.csv (${interactionCount} rows)`);

  console.log(`\n✅ CSV files generated in ${OUTPUT_DIR}`);
  console.log(`\nTo import, run:`);
  console.log(`  pnpm csv:import customers ${OUTPUT_DIR}/customers.csv <tenant_id>`);
  console.log(`  pnpm csv:import orders ${OUTPUT_DIR}/orders.csv <tenant_id>`);
  console.log(`  pnpm csv:import interactions ${OUTPUT_DIR}/interactions.csv <tenant_id>\n`);
}

main().catch(console.error);
