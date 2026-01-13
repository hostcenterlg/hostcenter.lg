import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  latency_ms?: number;
  error?: string;
  details?: Record<string, unknown>;
}

interface HealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  uptime_seconds: number;
  checks: {
    database: HealthCheck;
    dlq?: HealthCheck;
  };
}

const startTime = Date.now();

// Thresholds
const DB_LATENCY_WARN_MS = 500;
const DB_LATENCY_ERROR_MS = 2000;
const DLQ_WARN_THRESHOLD = 10;
const DLQ_ERROR_THRESHOLD = 100;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const verbose = url.searchParams.get('verbose') === 'true';
  const checkStart = Date.now();

  try {
    const supabase = createServerClient();

    // Check database
    const dbStart = Date.now();
    const { error: dbError } = await supabase
      .from('tenants')
      .select('id')
      .limit(1)
      .single();

    const dbLatency = Date.now() - dbStart;

    let dbStatus: HealthCheck['status'] = 'healthy';
    if (dbError && dbError.code !== 'PGRST116') {
      // PGRST116 = no rows, which is OK
      dbStatus = 'unhealthy';
    } else if (dbLatency > DB_LATENCY_ERROR_MS) {
      dbStatus = 'unhealthy';
    } else if (dbLatency > DB_LATENCY_WARN_MS) {
      dbStatus = 'degraded';
    }

    const dbCheck: HealthCheck = {
      status: dbStatus,
      latency_ms: dbLatency,
      ...(dbError && dbError.code !== 'PGRST116' ? { error: dbError.message } : {}),
    };

    // Check DLQ (optional, only if verbose)
    let dlqCheck: HealthCheck | undefined;
    if (verbose) {
      try {
        const { count, error: dlqError } = await supabase
          .from('dead_letter_queue')
          .select('id', { count: 'exact', head: true })
          .in('status', ['PENDING', 'RETRYING']);

        if (dlqError) {
          dlqCheck = { status: 'unhealthy', error: dlqError.message };
        } else {
          const pending = count || 0;
          let dlqStatus: HealthCheck['status'] = 'healthy';

          if (pending >= DLQ_ERROR_THRESHOLD) {
            dlqStatus = 'unhealthy';
          } else if (pending >= DLQ_WARN_THRESHOLD) {
            dlqStatus = 'degraded';
          }

          dlqCheck = {
            status: dlqStatus,
            details: { pending_count: pending },
          };
        }
      } catch {
        dlqCheck = { status: 'degraded', error: 'DLQ table may not exist' };
      }
    }

    // Determine overall status
    const allChecks = [dbCheck, dlqCheck].filter(Boolean) as HealthCheck[];
    let overallStatus: HealthResponse['status'] = 'healthy';

    if (allChecks.some((c) => c.status === 'unhealthy')) {
      overallStatus = 'unhealthy';
    } else if (allChecks.some((c) => c.status === 'degraded')) {
      overallStatus = 'degraded';
    }

    const response: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || process.env.NEXT_PUBLIC_VERSION || '0.1.0',
      uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
      checks: {
        database: dbCheck,
        ...(dlqCheck ? { dlq: dlqCheck } : {}),
      },
    };

    const httpStatus = overallStatus === 'unhealthy' ? 503 : 200;

    return NextResponse.json(response, {
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Check-Duration-Ms': String(Date.now() - checkStart),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '0.1.0',
        uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
        checks: {
          database: {
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        },
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
