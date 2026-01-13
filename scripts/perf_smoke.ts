#!/usr/bin/env npx ts-node
// ============================================
// VITAO JARVIS CRM - Performance Smoke Test
// ============================================
// Tests P50/P95/P99 latency for critical queries
// Targets: Hoje P95 < 1.5s, Cliente360 P95 < 2.0s
//
// Usage: npx ts-node scripts/perf_smoke.ts
// Requires: SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL

import { createClient } from '@supabase/supabase-js';

// ============ CONFIG ============

const ITERATIONS = 30;
const HOJE_TARGET_P95_MS = 1500;
const CLIENTE360_TARGET_P95_MS = 2000;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE credentials');
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ============ STATS HELPERS ============

interface PerfStats {
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
  avg: number;
  samples: number;
}

function calculateStats(latencies: number[]): PerfStats {
  if (latencies.length === 0) {
    return { min: 0, max: 0, p50: 0, p95: 0, p99: 0, avg: 0, samples: 0 };
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const n = sorted.length;

  const percentile = (p: number) => {
    const idx = Math.ceil((p / 100) * n) - 1;
    return sorted[Math.max(0, Math.min(idx, n - 1))]!;
  };

  return {
    min: sorted[0]!,
    max: sorted[n - 1]!,
    p50: percentile(50),
    p95: percentile(95),
    p99: percentile(99),
    avg: Math.round(latencies.reduce((a, b) => a + b, 0) / n),
    samples: n,
  };
}

function printStats(name: string, stats: PerfStats, targetP95: number): boolean {
  const passed = stats.p95 <= targetP95;
  const status = passed ? '✅ PASS' : '❌ FAIL';

  console.log(`\n${name}`);
  console.log('─'.repeat(50));
  console.log(`  Samples: ${stats.samples}`);
  console.log(`  Min:     ${stats.min}ms`);
  console.log(`  P50:     ${stats.p50}ms`);
  console.log(`  P95:     ${stats.p95}ms (target: ${targetP95}ms) ${status}`);
  console.log(`  P99:     ${stats.p99}ms`);
  console.log(`  Max:     ${stats.max}ms`);
  console.log(`  Avg:     ${stats.avg}ms`);

  return passed;
}

// ============ QUERY FUNCTIONS ============

async function queryHoje(): Promise<number> {
  const start = Date.now();

  // Exact query from apps/web/src/app/(auth)/hoje/page.tsx
  await supabase
    .from('tasks')
    .select(`
      *,
      customer:customers(id, company_name, trade_name, contact_name, phone, email, lifecycle_status),
      seller:profiles(id, full_name, avatar_url)
    `)
    .in('status', ['PENDING', 'IN_PROGRESS'])
    .order('priority_bucket', { ascending: true })
    .order('priority_score', { ascending: false })
    .limit(100);

  return Date.now() - start;
}

async function queryCliente360(customerId: string): Promise<number> {
  const start = Date.now();

  // Exact queries from apps/web/src/app/(auth)/clientes/[id]/page.tsx
  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single();

  await Promise.all([
    customer?.seller_id
      ? supabase.from('profiles').select('*').eq('id', customer.seller_id).single()
      : Promise.resolve({ data: null }),
    supabase
      .from('orders')
      .select('*')
      .eq('customer_id', customerId)
      .order('ordered_at', { ascending: false })
      .limit(20),
    supabase
      .from('interactions')
      .select('*')
      .eq('customer_id', customerId)
      .order('occurred_at', { ascending: false })
      .limit(50),
    supabase
      .from('tasks')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('kanban_cards')
      .select('*, column:kanban_columns(*)')
      .eq('customer_id', customerId)
      .single(),
  ]);

  return Date.now() - start;
}

// ============ MAIN ============

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║          VITAO JARVIS CRM - Performance Smoke Test             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Iterations: ${ITERATIONS}`);
  console.log(`Targets: Hoje P95 < ${HOJE_TARGET_P95_MS}ms, Cliente360 P95 < ${CLIENTE360_TARGET_P95_MS}ms`);

  // Get a sample customer for Cliente360 tests
  const { data: customers } = await supabase
    .from('customers')
    .select('id')
    .limit(10);

  if (!customers || customers.length === 0) {
    console.error('\n❌ No customers found in database. Seed data first.');
    process.exit(1);
  }

  const testCustomerIds = customers.map((c) => c.id);
  console.log(`\nUsing ${testCustomerIds.length} customers for Cliente360 tests`);

  // ============ HOJE BENCHMARK ============

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('BENCHMARKING: Hoje (Tasks View)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const hojeLatencies: number[] = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const latency = await queryHoje();
    hojeLatencies.push(latency);
    process.stdout.write(`\r  Progress: ${i + 1}/${ITERATIONS} (${latency}ms)`);
  }

  const hojeStats = calculateStats(hojeLatencies);
  const hojePassed = printStats('HOJE RESULTS', hojeStats, HOJE_TARGET_P95_MS);

  // ============ CLIENTE360 BENCHMARK ============

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('BENCHMARKING: Cliente360 (Customer Detail View)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const cliente360Latencies: number[] = [];

  for (let i = 0; i < ITERATIONS; i++) {
    // Rotate through available customers
    const customerId = testCustomerIds[i % testCustomerIds.length]!;
    const latency = await queryCliente360(customerId);
    cliente360Latencies.push(latency);
    process.stdout.write(`\r  Progress: ${i + 1}/${ITERATIONS} (${latency}ms)`);
  }

  const cliente360Stats = calculateStats(cliente360Latencies);
  const cliente360Passed = printStats('CLIENTE360 RESULTS', cliente360Stats, CLIENTE360_TARGET_P95_MS);

  // ============ SUMMARY ============

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                     PERFORMANCE SUMMARY                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Hoje:       P95=${hojeStats.p95}ms (target: ${HOJE_TARGET_P95_MS}ms) ${hojePassed ? '✅' : '❌'}`);
  console.log(`  Cliente360: P95=${cliente360Stats.p95}ms (target: ${CLIENTE360_TARGET_P95_MS}ms) ${cliente360Passed ? '✅' : '❌'}`);
  console.log('');

  if (hojePassed && cliente360Passed) {
    console.log('🎉 ALL PERFORMANCE TARGETS MET');
    process.exit(0);
  } else {
    console.log('❌ PERFORMANCE TARGETS NOT MET');
    console.log('');
    console.log('Recommended actions:');
    if (!hojePassed) {
      console.log('  - Check idx_tasks_hoje_covering index');
      console.log('  - Run EXPLAIN ANALYZE on Hoje query');
      console.log('  - Consider reducing JOIN columns');
    }
    if (!cliente360Passed) {
      console.log('  - Check idx_orders_360 and idx_interactions_360 indexes');
      console.log('  - Add idx_tasks_customer_360 for tasks by customer_id');
      console.log('  - Verify parallel query execution');
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Perf smoke test failed:', err);
  process.exit(1);
});
