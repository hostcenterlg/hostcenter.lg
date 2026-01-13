// ============================================
// VITAO JARVIS CRM - Database Client
// ============================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Pool } from 'pg';

// ============ TYPES ============

export interface DatabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceKey?: string;
  databaseUrl?: string;
}

// ============ SUPABASE CLIENT ============

let supabaseClient: SupabaseClient | null = null;
let supabaseAdminClient: SupabaseClient | null = null;

export function getSupabaseClient(config?: DatabaseConfig): SupabaseClient {
  if (supabaseClient) return supabaseClient;

  const url = config?.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = config?.supabaseAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase URL and Anon Key are required');
  }

  supabaseClient = createClient(url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
  });

  return supabaseClient;
}

export function getSupabaseAdminClient(config?: DatabaseConfig): SupabaseClient {
  if (supabaseAdminClient) return supabaseAdminClient;

  const url = config?.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = config?.supabaseServiceKey || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Supabase URL and Service Role Key are required');
  }

  supabaseAdminClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdminClient;
}

// ============ PG POOL (for migrations/workers) ============

let pgPool: Pool | null = null;

export function getPgPool(databaseUrl?: string): Pool {
  if (pgPool) return pgPool;

  const url = databaseUrl || process.env.DATABASE_URL;

  if (!url) {
    throw new Error('DATABASE_URL is required');
  }

  pgPool = new Pool({
    connectionString: url,
    max: 10,
    idleTimeoutMillis: 30000,
  });

  return pgPool;
}

export async function closePgPool(): Promise<void> {
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }
}

// ============ TRANSACTION HELPER ============

export async function withTransaction<T>(
  pool: Pool,
  fn: (client: import('pg').PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
