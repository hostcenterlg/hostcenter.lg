#!/usr/bin/env tsx
// ============================================
// VITAO JARVIS CRM - Migration Script
// ============================================

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { getPgPool, closePgPool } from './client';

async function migrate() {
  console.log('🔄 Running migrations...\n');

  const pool = getPgPool();
  const client = await pool.connect();

  try {
    // Create migrations tracking table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Get executed migrations
    const { rows: executed } = await client.query(
      'SELECT name FROM _migrations ORDER BY id'
    );
    const executedNames = new Set(executed.map(r => r.name));

    // Get migration files
    const migrationsDir = join(__dirname, '..', 'migrations');
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`Found ${files.length} migration files`);
    console.log(`Already executed: ${executedNames.size}\n`);

    let appliedCount = 0;

    for (const file of files) {
      if (executedNames.has(file)) {
        console.log(`⏭️  Skipping ${file} (already executed)`);
        continue;
      }

      console.log(`▶️  Executing ${file}...`);

      const sql = readFileSync(join(migrationsDir, file), 'utf-8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO _migrations (name) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`✅ ${file} executed successfully`);
        appliedCount++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ ${file} failed:`, err);
        throw err;
      }
    }

    console.log(`\n✅ Migration complete! Applied ${appliedCount} new migrations.`);
  } finally {
    client.release();
    await closePgPool();
  }
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
