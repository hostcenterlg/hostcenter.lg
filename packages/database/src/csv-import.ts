#!/usr/bin/env tsx
// ============================================
// VITAO JARVIS CRM - CSV Import Script
// ============================================

import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import { getSupabaseAdminClient } from './client';
import { createRepositories } from './repositories';
import {
  normalizePhoneE164,
  normalizeCNPJ,
  normalizeCPF,
  normalizeEmail,
  hashSHA256,
} from '@jarvis/shared';
import type {
  Customer,
  Order,
  Interaction,
  CSVImportResult,
  CSVImportError,
  InteractionChannel,
  InteractionDirection,
  EventSource,
} from '@jarvis/shared';

// ============ TYPES ============

interface ImportOptions {
  tenantId: string;
  sellerId?: string;
  dryRun?: boolean;
}

interface CSVCustomer {
  external_id?: string;
  cnpj?: string;
  cpf?: string;
  phone?: string;
  email?: string;
  company_name?: string;
  trade_name?: string;
  contact_name?: string;
  address_street?: string;
  address_number?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  tags?: string;
  notes?: string;
}

interface CSVOrder {
  external_id?: string;
  customer_external_id?: string;
  customer_cnpj?: string;
  customer_cpf?: string;
  customer_phone?: string;
  customer_email?: string;
  order_number: string;
  status?: string;
  total_amount?: string;
  discount_amount?: string;
  shipping_amount?: string;
  ordered_at?: string;
  notes?: string;
}

interface CSVInteraction {
  external_id?: string;
  customer_external_id?: string;
  customer_cnpj?: string;
  customer_cpf?: string;
  customer_phone?: string;
  customer_email?: string;
  channel: string;
  direction: string;
  occurred_at?: string;
  responded_at?: string;
  subject?: string;
  content?: string;
}

// ============ CSV PARSER ============

async function parseCSV<T>(filePath: string): Promise<T[]> {
  const records: T[] = [];

  const parser = createReadStream(filePath).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      cast: true,
    })
  );

  for await (const record of parser) {
    records.push(record as T);
  }

  return records;
}

// ============ CUSTOMER IMPORT ============

export async function importCustomers(
  filePath: string,
  options: ImportOptions
): Promise<CSVImportResult> {
  const startTime = Date.now();
  const errors: CSVImportError[] = [];
  let imported = 0;
  let skipped = 0;

  const supabase = getSupabaseAdminClient();
  const repos = createRepositories(supabase);

  console.log(`[CSV Import] Loading customers from ${filePath}...`);
  const records = await parseCSV<CSVCustomer>(filePath);
  console.log(`[CSV Import] Found ${records.length} records`);

  for (let i = 0; i < records.length; i++) {
    const row = i + 2; // Account for header row
    const record = records[i];

    try {
      // Normalize identifiers
      const cnpj = normalizeCNPJ(record.cnpj);
      const cpf = normalizeCPF(record.cpf);
      const phone = normalizePhoneE164(record.phone);
      const email = normalizeEmail(record.email);

      // Validate at least one identifier
      if (!cnpj && !cpf && !phone && !email) {
        errors.push({
          row,
          field: null,
          value: null,
          error: 'At least one identifier required (cnpj, cpf, phone, or email)',
        });
        skipped++;
        continue;
      }

      const customerData: Partial<Customer> = {
        external_id: record.external_id || null,
        cnpj,
        cpf,
        phone,
        email,
        company_name: record.company_name || null,
        trade_name: record.trade_name || null,
        contact_name: record.contact_name || null,
        address_street: record.address_street || null,
        address_number: record.address_number || null,
        address_city: record.address_city || null,
        address_state: record.address_state || null,
        address_zip: record.address_zip?.replace(/\D/g, '') || null,
        tags: record.tags ? record.tags.split(',').map(t => t.trim()) : [],
        notes: record.notes || null,
        seller_id: options.sellerId || null,
      };

      if (!options.dryRun) {
        await repos.customers.upsertByIdentity(options.tenantId, customerData);
      }

      imported++;

      if (imported % 100 === 0) {
        console.log(`[CSV Import] Processed ${imported} customers...`);
      }
    } catch (err) {
      errors.push({
        row,
        field: null,
        value: JSON.stringify(record),
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      skipped++;
    }
  }

  // Log event
  if (!options.dryRun) {
    await repos.eventLog.logEvent(
      options.tenantId,
      'CSV_IMPORT',
      'CUSTOMERS_IMPORTED',
      'CUSTOMER',
      {
        file: filePath,
        total_rows: records.length,
        imported,
        skipped,
        errors: errors.length,
      }
    );
  }

  const result: CSVImportResult = {
    file: filePath,
    entity_type: 'CUSTOMER',
    total_rows: records.length,
    imported,
    skipped,
    errors,
    duration_ms: Date.now() - startTime,
  };

  console.log(`[CSV Import] Complete: ${imported} imported, ${skipped} skipped, ${errors.length} errors`);
  return result;
}

// ============ ORDER IMPORT ============

export async function importOrders(
  filePath: string,
  options: ImportOptions
): Promise<CSVImportResult> {
  const startTime = Date.now();
  const errors: CSVImportError[] = [];
  let imported = 0;
  let skipped = 0;

  const supabase = getSupabaseAdminClient();
  const repos = createRepositories(supabase);

  console.log(`[CSV Import] Loading orders from ${filePath}...`);
  const records = await parseCSV<CSVOrder>(filePath);
  console.log(`[CSV Import] Found ${records.length} records`);

  for (let i = 0; i < records.length; i++) {
    const row = i + 2;
    const record = records[i];

    try {
      // Find customer
      const customer = await repos.customers.findByIdentity(options.tenantId, {
        cnpj: normalizeCNPJ(record.customer_cnpj),
        cpf: normalizeCPF(record.customer_cpf),
        phone: normalizePhoneE164(record.customer_phone),
        email: normalizeEmail(record.customer_email),
      });

      if (!customer) {
        errors.push({
          row,
          field: 'customer',
          value: record.customer_external_id || record.customer_cnpj || record.customer_phone,
          error: 'Customer not found',
        });
        skipped++;
        continue;
      }

      // Check for duplicate
      if (record.external_id) {
        const existing = await repos.orders.findByExternalId(options.tenantId, record.external_id);
        if (existing) {
          skipped++;
          continue;
        }
      }

      const totalAmount = parseFloat(record.total_amount || '0');
      const discountAmount = parseFloat(record.discount_amount || '0');
      const shippingAmount = parseFloat(record.shipping_amount || '0');
      const netAmount = totalAmount - discountAmount + shippingAmount;

      const orderData = {
        tenant_id: options.tenantId,
        customer_id: customer.id,
        seller_id: options.sellerId || customer.seller_id || null,
        external_id: record.external_id || null,
        order_number: record.order_number || `ORD-${Date.now()}`,
        status: record.status || 'COMPLETED',
        total_amount: totalAmount,
        discount_amount: discountAmount,
        shipping_amount: shippingAmount,
        net_amount: netAmount,
        ordered_at: record.ordered_at ? new Date(record.ordered_at) : new Date(),
        notes: record.notes || null,
        source: 'CSV_IMPORT' as EventSource,
      };

      if (!options.dryRun) {
        await repos.orders.create(orderData as any);
      }

      imported++;

      if (imported % 100 === 0) {
        console.log(`[CSV Import] Processed ${imported} orders...`);
      }
    } catch (err) {
      errors.push({
        row,
        field: null,
        value: JSON.stringify(record),
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      skipped++;
    }
  }

  // Log event
  if (!options.dryRun) {
    await repos.eventLog.logEvent(
      options.tenantId,
      'CSV_IMPORT',
      'ORDERS_IMPORTED',
      'ORDER',
      {
        file: filePath,
        total_rows: records.length,
        imported,
        skipped,
        errors: errors.length,
      }
    );
  }

  const result: CSVImportResult = {
    file: filePath,
    entity_type: 'ORDER',
    total_rows: records.length,
    imported,
    skipped,
    errors,
    duration_ms: Date.now() - startTime,
  };

  console.log(`[CSV Import] Complete: ${imported} imported, ${skipped} skipped, ${errors.length} errors`);
  return result;
}

// ============ INTERACTION IMPORT ============

export async function importInteractions(
  filePath: string,
  options: ImportOptions
): Promise<CSVImportResult> {
  const startTime = Date.now();
  const errors: CSVImportError[] = [];
  let imported = 0;
  let skipped = 0;

  const supabase = getSupabaseAdminClient();
  const repos = createRepositories(supabase);

  console.log(`[CSV Import] Loading interactions from ${filePath}...`);
  const records = await parseCSV<CSVInteraction>(filePath);
  console.log(`[CSV Import] Found ${records.length} records`);

  const validChannels = ['WHATSAPP', 'EMAIL', 'PHONE', 'MEETING', 'SMS', 'CHAT'];
  const validDirections = ['INBOUND', 'OUTBOUND'];

  for (let i = 0; i < records.length; i++) {
    const row = i + 2;
    const record = records[i];

    try {
      // Find customer
      const customer = await repos.customers.findByIdentity(options.tenantId, {
        cnpj: normalizeCNPJ(record.customer_cnpj),
        cpf: normalizeCPF(record.customer_cpf),
        phone: normalizePhoneE164(record.customer_phone),
        email: normalizeEmail(record.customer_email),
      });

      if (!customer) {
        errors.push({
          row,
          field: 'customer',
          value: record.customer_external_id || record.customer_cnpj || record.customer_phone,
          error: 'Customer not found',
        });
        skipped++;
        continue;
      }

      // Validate channel
      const channel = record.channel?.toUpperCase();
      if (!validChannels.includes(channel)) {
        errors.push({
          row,
          field: 'channel',
          value: record.channel,
          error: `Invalid channel. Valid: ${validChannels.join(', ')}`,
        });
        skipped++;
        continue;
      }

      // Validate direction
      const direction = record.direction?.toUpperCase();
      if (!validDirections.includes(direction)) {
        errors.push({
          row,
          field: 'direction',
          value: record.direction,
          error: `Invalid direction. Valid: ${validDirections.join(', ')}`,
        });
        skipped++;
        continue;
      }

      // Check for duplicate by payload hash
      const content = record.content || '';
      const payloadHash = hashSHA256(`${customer.id}:${record.occurred_at}:${content}`);

      const existing = await repos.interactions.findByPayloadHash(options.tenantId, payloadHash);
      if (existing) {
        skipped++;
        continue;
      }

      const interactionData = {
        tenant_id: options.tenantId,
        customer_id: customer.id,
        seller_id: options.sellerId || customer.seller_id || null,
        external_id: record.external_id || null,
        channel: channel as InteractionChannel,
        direction: direction as InteractionDirection,
        occurred_at: record.occurred_at ? new Date(record.occurred_at) : new Date(),
        responded_at: record.responded_at ? new Date(record.responded_at) : null,
        subject: record.subject || null,
        content: content || null,
        content_preview: content?.substring(0, 500) || null,
        payload_hash: payloadHash,
        source: 'CSV_IMPORT' as EventSource,
      };

      if (!options.dryRun) {
        await repos.interactions.create(interactionData as any);
      }

      imported++;

      if (imported % 100 === 0) {
        console.log(`[CSV Import] Processed ${imported} interactions...`);
      }
    } catch (err) {
      errors.push({
        row,
        field: null,
        value: JSON.stringify(record),
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      skipped++;
    }
  }

  // Log event
  if (!options.dryRun) {
    await repos.eventLog.logEvent(
      options.tenantId,
      'CSV_IMPORT',
      'INTERACTIONS_IMPORTED',
      'INTERACTION',
      {
        file: filePath,
        total_rows: records.length,
        imported,
        skipped,
        errors: errors.length,
      }
    );
  }

  const result: CSVImportResult = {
    file: filePath,
    entity_type: 'INTERACTION',
    total_rows: records.length,
    imported,
    skipped,
    errors,
    duration_ms: Date.now() - startTime,
  };

  console.log(`[CSV Import] Complete: ${imported} imported, ${skipped} skipped, ${errors.length} errors`);
  return result;
}

// ============ CLI ============

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.log(`
Usage: pnpm csv:import <type> <file> <tenant_id> [seller_id] [--dry-run]

Types:
  customers     Import customer data
  orders        Import order data
  interactions  Import interaction data

Options:
  --dry-run     Validate without inserting data

Example:
  pnpm csv:import customers ./data/customers.csv abc-123-tenant
  pnpm csv:import orders ./data/orders.csv abc-123-tenant seller-id-456
  pnpm csv:import interactions ./data/interactions.csv abc-123-tenant --dry-run
    `);
    process.exit(1);
  }

  const [type, filePath, tenantId, ...rest] = args;
  const dryRun = rest.includes('--dry-run');
  const sellerId = rest.find(r => !r.startsWith('--'));

  const options: ImportOptions = {
    tenantId,
    sellerId,
    dryRun,
  };

  console.log(`\n=== CSV Import ===`);
  console.log(`Type: ${type}`);
  console.log(`File: ${filePath}`);
  console.log(`Tenant: ${tenantId}`);
  console.log(`Seller: ${sellerId || 'none'}`);
  console.log(`Dry Run: ${dryRun}`);
  console.log(`==================\n`);

  let result: CSVImportResult;

  switch (type) {
    case 'customers':
      result = await importCustomers(filePath, options);
      break;
    case 'orders':
      result = await importOrders(filePath, options);
      break;
    case 'interactions':
      result = await importInteractions(filePath, options);
      break;
    default:
      console.error(`Unknown type: ${type}`);
      process.exit(1);
  }

  console.log(`\n=== Result ===`);
  console.log(JSON.stringify(result, null, 2));

  if (result.errors.length > 0 && result.errors.length <= 10) {
    console.log(`\n=== Errors ===`);
    result.errors.forEach(e => console.log(`Row ${e.row}: ${e.error}`));
  }

  process.exit(result.errors.length > 0 ? 1 : 0);
}

main().catch(console.error);
