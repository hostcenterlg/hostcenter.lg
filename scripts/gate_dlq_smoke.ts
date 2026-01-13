#!/usr/bin/env npx ts-node
// ============================================
// GATE 5: DLQ Reprocess Smoke Test
// ============================================
// Usage: npx ts-node scripts/gate_dlq_smoke.ts
// Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function log(message: string) {
  console.log(`[DLQ-SMOKE] ${message}`);
}

function pass(name: string, details: string = '') {
  results.push({ name, passed: true, details });
  console.log(`  ✅ PASS: ${name}${details ? ` - ${details}` : ''}`);
}

function fail(name: string, details: string) {
  results.push({ name, passed: false, details });
  console.log(`  ❌ FAIL: ${name} - ${details}`);
}

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function cleanup() {
  log('Cleaning up test DLQ entries...');
  await adminClient.from('dead_letter_queue').delete().like('queue_name', 'test-%');
}

async function testDLQTableExists() {
  log('Testing DLQ table exists...');

  const { data, error } = await adminClient.from('dead_letter_queue').select('id').limit(1);

  if (error && error.code === '42P01') {
    fail('DLQ table exists', 'Table does not exist - run 002_hardening.sql migration');
    return false;
  }

  if (error) {
    fail('DLQ table exists', error.message);
    return false;
  }

  pass('DLQ table exists');
  return true;
}

async function testDLQInsert() {
  log('Testing DLQ insert (simulating failed job)...');

  const dlqEntry = {
    queue_name: 'test-failed-job-' + Date.now(),
    job_data: { test: true, payload: 'test data' },
    error_message: 'Simulated failure for testing',
    error_stack: 'Error: Test\n    at test.ts:1:1',
    retry_count: 0,
    max_retries: 3,
    status: 'PENDING',
  };

  const { data, error } = await adminClient
    .from('dead_letter_queue')
    .insert(dlqEntry)
    .select('id, status, created_at')
    .single();

  if (error) {
    fail('DLQ insert', error.message);
    return null;
  }

  pass('DLQ insert', `Created entry ${data.id}`);
  return data.id;
}

async function testDLQStatusTracking(dlqId: string) {
  log('Testing DLQ status tracking...');

  // Update to RETRYING
  const { error: retryError } = await adminClient
    .from('dead_letter_queue')
    .update({
      status: 'RETRYING',
      retry_count: 1,
      last_retry_at: new Date(),
    })
    .eq('id', dlqId);

  if (retryError) {
    fail('DLQ status update to RETRYING', retryError.message);
    return;
  }

  // Verify status
  const { data: retryData } = await adminClient
    .from('dead_letter_queue')
    .select('status, retry_count')
    .eq('id', dlqId)
    .single();

  if (retryData?.status === 'RETRYING' && retryData?.retry_count === 1) {
    pass('DLQ status update to RETRYING');
  } else {
    fail('DLQ status update to RETRYING', `Got status: ${retryData?.status}`);
  }

  // Update to FAILED (max retries exceeded)
  const { error: failError } = await adminClient
    .from('dead_letter_queue')
    .update({
      status: 'FAILED',
      retry_count: 3,
    })
    .eq('id', dlqId);

  if (failError) {
    fail('DLQ status update to FAILED', failError.message);
    return;
  }

  const { data: failData } = await adminClient
    .from('dead_letter_queue')
    .select('status')
    .eq('id', dlqId)
    .single();

  if (failData?.status === 'FAILED') {
    pass('DLQ status update to FAILED');
  } else {
    fail('DLQ status update to FAILED', `Got status: ${failData?.status}`);
  }
}

async function testDLQRecovery(dlqId: string) {
  log('Testing DLQ recovery (manual reprocess)...');

  // Simulate successful reprocess
  const { error: recoverError } = await adminClient
    .from('dead_letter_queue')
    .update({
      status: 'RECOVERED',
      recovered_at: new Date(),
    })
    .eq('id', dlqId);

  if (recoverError) {
    fail('DLQ recovery', recoverError.message);
    return;
  }

  const { data: recoverData } = await adminClient
    .from('dead_letter_queue')
    .select('status, recovered_at')
    .eq('id', dlqId)
    .single();

  if (recoverData?.status === 'RECOVERED' && recoverData?.recovered_at) {
    pass('DLQ recovery', 'Entry marked as RECOVERED');
  } else {
    fail('DLQ recovery', `Got status: ${recoverData?.status}`);
  }
}

async function testDLQQuery() {
  log('Testing DLQ pending query...');

  // Insert a pending entry
  await adminClient.from('dead_letter_queue').insert({
    queue_name: 'test-pending-' + Date.now(),
    job_data: { test: true },
    error_message: 'Test pending entry',
    retry_count: 0,
    max_retries: 3,
    status: 'PENDING',
  });

  const { data, error } = await adminClient
    .from('dead_letter_queue')
    .select('id, queue_name, status')
    .in('status', ['PENDING', 'RETRYING'])
    .like('queue_name', 'test-%');

  if (error) {
    fail('DLQ pending query', error.message);
    return;
  }

  if (data && data.length > 0) {
    pass('DLQ pending query', `Found ${data.length} pending entries`);
  } else {
    fail('DLQ pending query', 'No pending entries found');
  }
}

async function main() {
  console.log('\n========================================');
  console.log('GATE 5: DLQ Reprocess Smoke Test');
  console.log('========================================\n');

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  try {
    await cleanup();

    const tableExists = await testDLQTableExists();
    if (!tableExists) {
      console.log('\n❌ GATE 5: FAILED - DLQ table does not exist\n');
      process.exit(1);
    }

    const dlqId = await testDLQInsert();
    if (dlqId) {
      await testDLQStatusTracking(dlqId);
      await testDLQRecovery(dlqId);
    }

    await testDLQQuery();
    await cleanup();

    console.log('\n========================================');
    console.log('RESULTS SUMMARY');
    console.log('========================================');

    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;

    console.log(`\nTotal: ${results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);

    if (failed === 0) {
      console.log('\n🎉 GATE 5: ALL PASS\n');
      process.exit(0);
    } else {
      console.log('\n❌ GATE 5: SOME FAILURES\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('ERROR:', error);
    await cleanup();
    process.exit(1);
  }
}

main();
