#!/usr/bin/env npx ts-node
// ============================================
// GATE 6: Health Endpoints Smoke Test
// ============================================
// Usage: npx ts-node scripts/gate_health_smoke.ts
// Requires: Web server running on localhost:3000

const BASE_URL = process.env.HEALTH_URL || 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function log(message: string) {
  console.log(`[HEALTH-SMOKE] ${message}`);
}

function pass(name: string, details: string = '') {
  results.push({ name, passed: true, details });
  console.log(`  ✅ PASS: ${name}${details ? ` - ${details}` : ''}`);
}

function fail(name: string, details: string) {
  results.push({ name, passed: false, details });
  console.log(`  ❌ FAIL: ${name} - ${details}`);
}

async function testLivenessProbe() {
  log('Testing /api/health/live (liveness probe)...');

  try {
    const startTime = Date.now();
    const response = await fetch(`${BASE_URL}/api/health/live`);
    const latency = Date.now() - startTime;

    if (response.status !== 200) {
      fail('Liveness probe status', `Expected 200, got ${response.status}`);
      return;
    }

    const body = await response.json();

    if (body.status === 'alive') {
      pass('Liveness probe', `Status: alive, Latency: ${latency}ms`);
    } else {
      fail('Liveness probe', `Expected status: alive, got: ${body.status}`);
    }

    // Liveness should be fast (< 100ms)
    if (latency < 100) {
      pass('Liveness latency', `${latency}ms < 100ms threshold`);
    } else {
      fail('Liveness latency', `${latency}ms >= 100ms threshold`);
    }
  } catch (error) {
    fail('Liveness probe', error instanceof Error ? error.message : 'Unknown error');
  }
}

async function testReadinessProbe() {
  log('Testing /api/health/ready (readiness probe)...');

  try {
    const startTime = Date.now();
    const response = await fetch(`${BASE_URL}/api/health/ready`);
    const latency = Date.now() - startTime;

    const body = await response.json();

    if (response.status === 200 && body.status === 'ready') {
      pass('Readiness probe', `Status: ready, DB latency: ${body.latency_ms}ms`);
    } else if (response.status === 503) {
      fail('Readiness probe', `Not ready: ${body.reason || 'unknown'}`);
    } else {
      fail('Readiness probe', `Unexpected status: ${response.status}`);
    }

    // Readiness should complete in reasonable time (< 5s)
    if (latency < 5000) {
      pass('Readiness latency', `${latency}ms < 5000ms threshold`);
    } else {
      fail('Readiness latency', `${latency}ms >= 5000ms threshold`);
    }
  } catch (error) {
    fail('Readiness probe', error instanceof Error ? error.message : 'Unknown error');
  }
}

async function testMainHealthEndpoint() {
  log('Testing /api/health (main health endpoint)...');

  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    const body = await response.json();

    // Check response structure
    if (!body.status) {
      fail('Health status field', 'Missing status field');
      return;
    }
    pass('Health status field', `Status: ${body.status}`);

    if (!body.timestamp) {
      fail('Health timestamp field', 'Missing timestamp field');
    } else {
      pass('Health timestamp field', body.timestamp);
    }

    if (!body.version) {
      fail('Health version field', 'Missing version field');
    } else {
      pass('Health version field', body.version);
    }

    if (typeof body.uptime_seconds !== 'number') {
      fail('Health uptime field', 'Missing uptime_seconds field');
    } else {
      pass('Health uptime field', `${body.uptime_seconds}s`);
    }

    // Check database health
    if (!body.checks?.database) {
      fail('Health database check', 'Missing database check');
    } else {
      const db = body.checks.database;
      if (db.status === 'healthy') {
        pass('Health database check', `Latency: ${db.latency_ms}ms`);
      } else {
        fail('Health database check', `Status: ${db.status}, Error: ${db.error}`);
      }
    }
  } catch (error) {
    fail('Main health endpoint', error instanceof Error ? error.message : 'Unknown error');
  }
}

async function testVerboseHealthEndpoint() {
  log('Testing /api/health?verbose=true...');

  try {
    const response = await fetch(`${BASE_URL}/api/health?verbose=true`);
    const body = await response.json();

    // Verbose should include DLQ check
    if (body.checks?.dlq) {
      const dlq = body.checks.dlq;
      pass('Health DLQ check (verbose)', `Status: ${dlq.status}, Pending: ${dlq.details?.pending_count || 0}`);
    } else {
      // DLQ check is optional if table doesn't exist
      log('  ⚠️ DLQ check not available (table may not exist)');
      pass('Health DLQ check (verbose)', 'Not available (expected if migration not run)');
    }
  } catch (error) {
    fail('Verbose health endpoint', error instanceof Error ? error.message : 'Unknown error');
  }
}

async function testHealthThresholds() {
  log('Testing health response headers...');

  try {
    const response = await fetch(`${BASE_URL}/api/health`);

    const durationHeader = response.headers.get('X-Health-Check-Duration-Ms');
    if (durationHeader) {
      pass('Health duration header', `${durationHeader}ms`);
    } else {
      fail('Health duration header', 'Missing X-Health-Check-Duration-Ms header');
    }

    const cacheControl = response.headers.get('Cache-Control');
    if (cacheControl?.includes('no-cache')) {
      pass('Health cache control', cacheControl);
    } else {
      fail('Health cache control', `Expected no-cache, got: ${cacheControl}`);
    }
  } catch (error) {
    fail('Health headers', error instanceof Error ? error.message : 'Unknown error');
  }
}

async function main() {
  console.log('\n========================================');
  console.log('GATE 6: Health Endpoints Smoke Test');
  console.log('========================================\n');

  log(`Target URL: ${BASE_URL}`);
  console.log('');

  // Check if server is running
  try {
    await fetch(`${BASE_URL}/api/health/live`);
  } catch (error) {
    console.error('ERROR: Cannot connect to server at', BASE_URL);
    console.error('Make sure the web server is running: pnpm dev:web');
    process.exit(1);
  }

  await testLivenessProbe();
  await testReadinessProbe();
  await testMainHealthEndpoint();
  await testVerboseHealthEndpoint();
  await testHealthThresholds();

  console.log('\n========================================');
  console.log('RESULTS SUMMARY');
  console.log('========================================');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`\nTotal: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n🎉 GATE 6: ALL PASS\n');
    process.exit(0);
  } else {
    console.log('\n❌ GATE 6: SOME FAILURES\n');
    process.exit(1);
  }
}

main();
