// ============================================
// VITAO JARVIS CRM - Demo Mode
// ============================================
// Enabled via DEMO_MODE=true environment variable
// Provides:
//   - Fixed tenant/user for demos
//   - Demo action buttons (webhook, report, DLQ)
//   - Never affects production data

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// Fixed IDs for demo mode (must match seed-demo.ts)
export const DEMO_TENANT_ID = '11111111-1111-1111-1111-111111111111';
export const DEMO_USER_ID = '22222222-2222-2222-2222-222222222222';
export const DEMO_AUTH_UID = '33333333-3333-3333-3333-333333333333';

export interface DemoConfig {
  enabled: boolean;
  tenantId: string;
  userId: string;
  features: {
    simulateWebhook: boolean;
    generateReport: boolean;
    insertDlq: boolean;
    triggerAi: boolean;
  };
}

export function getDemoConfig(): DemoConfig {
  return {
    enabled: DEMO_MODE,
    tenantId: DEMO_TENANT_ID,
    userId: DEMO_USER_ID,
    features: {
      simulateWebhook: DEMO_MODE,
      generateReport: DEMO_MODE,
      insertDlq: DEMO_MODE,
      triggerAi: DEMO_MODE,
    },
  };
}

// Demo action types
export type DemoAction =
  | 'simulate-webhook'
  | 'generate-report'
  | 'insert-dlq'
  | 'reprocess-dlq'
  | 'trigger-ai-analysis'
  | 'reset-demo-data';

// Demo action payloads
export interface WebhookSimulation {
  type: 'order' | 'interaction' | 'customer';
  customerId?: string;
  data?: Record<string, unknown>;
}

export interface DlqSimulation {
  eventType: string;
  error: string;
  entityId?: string;
}

// Console banner for demo mode
export function logDemoBanner(): void {
  if (!DEMO_MODE) return;

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    🎬 DEMO MODE ENABLED                        ║
╠════════════════════════════════════════════════════════════════╣
║  This instance is running in demo mode.                        ║
║  Demo features are available in the UI.                        ║
║                                                                 ║
║  Tenant: ${DEMO_TENANT_ID}              ║
║  User:   ${DEMO_USER_ID}              ║
╚════════════════════════════════════════════════════════════════╝
  `);
}
