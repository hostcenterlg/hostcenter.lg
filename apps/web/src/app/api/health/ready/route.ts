import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * Kubernetes Readiness Probe
 * Returns 200 if the service can handle traffic
 * Checks database connectivity
 */
export async function GET() {
  const startTime = Date.now();

  try {
    const supabase = createServerClient();

    // Quick database check
    const { error } = await supabase
      .from('tenants')
      .select('id')
      .limit(1);

    const latency = Date.now() - startTime;

    // If latency is too high, consider not ready
    if (latency > 5000) {
      return NextResponse.json(
        {
          status: 'not_ready',
          reason: 'Database latency too high',
          latency_ms: latency,
          timestamp: new Date().toISOString(),
        },
        {
          status: 503,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        }
      );
    }

    if (error) {
      return NextResponse.json(
        {
          status: 'not_ready',
          reason: 'Database connection failed',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        {
          status: 503,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        }
      );
    }

    return NextResponse.json(
      {
        status: 'ready',
        latency_ms: latency,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'not_ready',
        reason: 'Internal error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  }
}
