import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { hashSHA256 } from '@jarvis/shared';

// ============ CONFIG ============

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';
const SIGNATURE_HEADER = 'x-webhook-signature';
const TIMESTAMP_HEADER = 'x-webhook-timestamp';
const IDEMPOTENCY_HEADER = 'x-idempotency-key';

// Signature validity window (5 minutes)
const SIGNATURE_VALIDITY_MS = 5 * 60 * 1000;

// Supabase client with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// ============ SIGNATURE VERIFICATION ============

interface VerificationResult {
  valid: boolean;
  error?: string;
}

function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  timestamp: string | null
): VerificationResult {
  if (!WEBHOOK_SECRET) {
    // In development, skip signature check if no secret configured
    if (process.env.NODE_ENV === 'development') {
      return { valid: true };
    }
    return { valid: false, error: 'Webhook secret not configured' };
  }

  if (!signature) {
    return { valid: false, error: 'Missing signature header' };
  }

  if (!timestamp) {
    return { valid: false, error: 'Missing timestamp header' };
  }

  // Check timestamp to prevent replay attacks
  const webhookTime = parseInt(timestamp, 10);
  const now = Date.now();

  if (isNaN(webhookTime)) {
    return { valid: false, error: 'Invalid timestamp format' };
  }

  if (Math.abs(now - webhookTime) > SIGNATURE_VALIDITY_MS) {
    return { valid: false, error: 'Timestamp outside validity window' };
  }

  // Compute expected signature
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = createHmac('sha256', WEBHOOK_SECRET)
    .update(signedPayload)
    .digest('hex');

  // Use timing-safe comparison
  try {
    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (sigBuffer.length !== expectedBuffer.length) {
      return { valid: false, error: 'Invalid signature' };
    }

    if (!timingSafeEqual(sigBuffer, expectedBuffer)) {
      return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Signature verification failed' };
  }
}

// ============ IDEMPOTENCY CHECK ============

interface IdempotencyResult {
  isDuplicate: boolean;
  existingResponse?: Record<string, unknown>;
}

async function checkIdempotency(
  tenantId: string,
  idempotencyKey: string
): Promise<IdempotencyResult> {
  const { data: existing } = await supabase
    .from('webhook_deliveries')
    .select('processed_at, response_status, response_body')
    .eq('tenant_id', tenantId)
    .eq('idempotency_key', idempotencyKey)
    .single();

  if (existing?.processed_at) {
    return {
      isDuplicate: true,
      existingResponse: {
        status: existing.response_status,
        body: existing.response_body ? JSON.parse(existing.response_body) : null,
      },
    };
  }

  return { isDuplicate: false };
}

async function recordWebhookDelivery(
  tenantId: string,
  idempotencyKey: string,
  webhookType: string,
  payloadHash: string,
  responseStatus: number,
  responseBody: string
): Promise<void> {
  await supabase.from('webhook_deliveries').upsert({
    tenant_id: tenantId,
    idempotency_key: idempotencyKey,
    webhook_type: webhookType,
    payload_hash: payloadHash,
    processed_at: new Date(),
    response_status: responseStatus,
    response_body: responseBody,
  });
}

// ============ WEBHOOK HANDLER ============

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // Read raw body for signature verification
  const rawBody = await request.text();
  const signature = request.headers.get(SIGNATURE_HEADER);
  const timestamp = request.headers.get(TIMESTAMP_HEADER);
  const idempotencyKey = request.headers.get(IDEMPOTENCY_HEADER);

  // Verify signature
  const verification = verifyWebhookSignature(rawBody, signature, timestamp);
  if (!verification.valid) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: verification.error,
      },
      { status: 401 }
    );
  }

  // Parse payload
  let payload: {
    type: string;
    tenant_id: string;
    data: Record<string, unknown>;
    source?: string;
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 }
    );
  }

  // Validate required fields
  if (!payload.type || !payload.tenant_id) {
    return NextResponse.json(
      { error: 'Missing required fields: type, tenant_id' },
      { status: 400 }
    );
  }

  const { type: webhookType, tenant_id: tenantId, data, source = 'WEBHOOK' } = payload;
  const payloadHash = hashSHA256(rawBody);

  // Generate idempotency key if not provided
  const effectiveIdempotencyKey = idempotencyKey || `${webhookType}:${payloadHash}`;

  // Check idempotency
  const idempotencyResult = await checkIdempotency(tenantId, effectiveIdempotencyKey);
  if (idempotencyResult.isDuplicate) {
    return NextResponse.json(
      {
        status: 'duplicate',
        message: 'Webhook already processed',
        original_response: idempotencyResult.existingResponse,
      },
      {
        status: 200,
        headers: {
          'X-Idempotency-Status': 'duplicate',
        },
      }
    );
  }

  try {
    // Log event for async processing
    const { data: eventLog, error: logError } = await supabase
      .from('event_log')
      .insert({
        tenant_id: tenantId,
        idempotency_key: effectiveIdempotencyKey,
        source: source as 'MERCOS' | 'DESKRIO' | 'CSV_IMPORT' | 'MANUAL' | 'SYSTEM' | 'AI',
        event_type: webhookType,
        entity_type: data?.entity_type as string || 'unknown',
        entity_id: data?.entity_id as string || null,
        payload_hash: payloadHash,
        payload: data,
      })
      .select('id')
      .single();

    if (logError) {
      throw new Error(`Failed to log event: ${logError.message}`);
    }

    const durationMs = Date.now() - startTime;

    const response = {
      status: 'accepted',
      event_id: eventLog.id,
      idempotency_key: effectiveIdempotencyKey,
      processing_ms: durationMs,
    };

    // Record successful delivery
    await recordWebhookDelivery(
      tenantId,
      effectiveIdempotencyKey,
      webhookType,
      payloadHash,
      202,
      JSON.stringify(response)
    );

    return NextResponse.json(response, {
      status: 202,
      headers: {
        'X-Event-Id': eventLog.id,
        'X-Processing-Time-Ms': String(durationMs),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const durationMs = Date.now() - startTime;

    // Log failed delivery (don't block response)
    await recordWebhookDelivery(
      tenantId,
      effectiveIdempotencyKey,
      webhookType,
      payloadHash,
      500,
      JSON.stringify({ error: errorMessage })
    ).catch(() => {});

    return NextResponse.json(
      {
        error: 'Processing failed',
        message: errorMessage,
        processing_ms: durationMs,
      },
      { status: 500 }
    );
  }
}

// ============ VERIFICATION ENDPOINT ============

export async function GET() {
  // Health check for webhook endpoint
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/webhooks',
    signature_required: !!WEBHOOK_SECRET,
    headers: {
      signature: SIGNATURE_HEADER,
      timestamp: TIMESTAMP_HEADER,
      idempotency: IDEMPOTENCY_HEADER,
    },
  });
}
