import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  const startTime = Date.now();

  try {
    const supabase = createServerClient();

    // Test database connection
    const { data, error } = await supabase
      .from('tenants')
      .select('count')
      .limit(1);

    const dbLatency = Date.now() - startTime;

    if (error) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          checks: {
            database: {
              status: 'unhealthy',
              error: error.message,
              latency_ms: dbLatency,
            },
          },
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      checks: {
        database: {
          status: 'healthy',
          latency_ms: dbLatency,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        checks: {
          database: {
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        },
      },
      { status: 503 }
    );
  }
}
