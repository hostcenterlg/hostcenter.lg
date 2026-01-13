import { NextResponse } from 'next/server';

/**
 * Kubernetes Liveness Probe
 * Returns 200 if the process is running
 * No external dependencies checked
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'alive',
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    }
  );
}
