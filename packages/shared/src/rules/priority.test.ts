import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateLifecycleStatus,
  calculatePriority,
  LIFECYCLE_THRESHOLDS,
  PRIORITY_WEIGHTS,
  PriorityContext,
} from './index';
import { LifecycleStatus, KanbanStage } from '../types';

describe('Rule Engine', () => {
  describe('Lifecycle Status', () => {
    it('should return ATIVO for 0-50 days', () => {
      expect(calculateLifecycleStatus(0)).toBe(LifecycleStatus.ATIVO);
      expect(calculateLifecycleStatus(25)).toBe(LifecycleStatus.ATIVO);
      expect(calculateLifecycleStatus(50)).toBe(LifecycleStatus.ATIVO);
    });

    it('should return EM_RISCO for 51-60 days', () => {
      expect(calculateLifecycleStatus(51)).toBe(LifecycleStatus.EM_RISCO);
      expect(calculateLifecycleStatus(55)).toBe(LifecycleStatus.EM_RISCO);
      expect(calculateLifecycleStatus(60)).toBe(LifecycleStatus.EM_RISCO);
    });

    it('should return INATIVO_RECENTE for 61-90 days', () => {
      expect(calculateLifecycleStatus(61)).toBe(LifecycleStatus.INATIVO_RECENTE);
      expect(calculateLifecycleStatus(75)).toBe(LifecycleStatus.INATIVO_RECENTE);
      expect(calculateLifecycleStatus(90)).toBe(LifecycleStatus.INATIVO_RECENTE);
    });

    it('should return INATIVO_ANTIGO for 90+ days', () => {
      expect(calculateLifecycleStatus(91)).toBe(LifecycleStatus.INATIVO_ANTIGO);
      expect(calculateLifecycleStatus(120)).toBe(LifecycleStatus.INATIVO_ANTIGO);
      expect(calculateLifecycleStatus(365)).toBe(LifecycleStatus.INATIVO_ANTIGO);
    });

    it('should return ATIVO for null (new customer)', () => {
      expect(calculateLifecycleStatus(null)).toBe(LifecycleStatus.ATIVO);
    });
  });

  describe('Priority Calculation', () => {
    const baseSettings = {
      sla_hours: 4,
      repurchase_cycle_default_days: 30,
      business_days: [1, 2, 3, 4, 5],
    };

    const baseCustomer = {
      id: 'test-customer',
      lifecycle_status: LifecycleStatus.ATIVO,
      last_order_at: null as Date | null,
      repurchase_cycle_days: 30,
    };

    // Scenario 1: P1 - Unanswered message > 2 hours
    it('should assign P1 for unanswered message > 2 hours', () => {
      const now = new Date();
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

      const ctx: PriorityContext = {
        customer: baseCustomer,
        lastInboundInteraction: {
          occurred_at: threeHoursAgo,
          responded_at: null,
          channel: 'WHATSAPP',
        },
        kanbanCard: null,
        pendingFollowup: null,
        settings: baseSettings,
        now,
      };

      const result = calculatePriority(ctx);
      expect(result.bucket).toBe('P1');
      expect(result.reason_code).toBe('MSG_UNANSWERED_2H');
    });

    // Scenario 2: P1 - SLA breaching
    it('should assign P1 for SLA breaching', () => {
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 1 * 60 * 60 * 1000);

      const ctx: PriorityContext = {
        customer: baseCustomer,
        lastInboundInteraction: null,
        kanbanCard: {
          stage: KanbanStage.EM_ATENDIMENTO,
          entered_stage_at: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          sla_deadline: oneHourFromNow,
        },
        pendingFollowup: null,
        settings: baseSettings,
        now,
      };

      const result = calculatePriority(ctx);
      expect(result.bucket).toBe('P1');
      expect(result.reason_code).toBe('SLA_BREACHING');
    });

    // Scenario 3: P1 - SLA already breached
    it('should assign P1 with higher score for already breached SLA', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);

      const ctx: PriorityContext = {
        customer: baseCustomer,
        lastInboundInteraction: null,
        kanbanCard: {
          stage: KanbanStage.EM_ATENDIMENTO,
          entered_stage_at: new Date(now.getTime() - 48 * 60 * 60 * 1000),
          sla_deadline: oneHourAgo,
        },
        pendingFollowup: null,
        settings: baseSettings,
        now,
      };

      const result = calculatePriority(ctx);
      expect(result.bucket).toBe('P1');
      expect(result.score).toBeGreaterThan(PRIORITY_WEIGHTS.sla_breaching);
    });

    // Scenario 4: P2 - Repurchase due
    it('should assign P2 for repurchase due', () => {
      const now = new Date();
      const lastOrder = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000); // 28 days ago

      const ctx: PriorityContext = {
        customer: {
          ...baseCustomer,
          last_order_at: lastOrder,
          repurchase_cycle_days: 30,
        },
        lastInboundInteraction: null,
        kanbanCard: null,
        pendingFollowup: null,
        settings: baseSettings,
        now,
      };

      const result = calculatePriority(ctx);
      expect(result.bucket).toBe('P2');
      expect(result.reason_code).toBe('REPURCHASE_DUE');
    });

    // Scenario 5: P2 - Repurchase overdue
    it('should assign P2 with higher score for overdue repurchase', () => {
      const now = new Date();
      const lastOrder = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000); // 35 days ago

      const ctx: PriorityContext = {
        customer: {
          ...baseCustomer,
          last_order_at: lastOrder,
          repurchase_cycle_days: 30,
        },
        lastInboundInteraction: null,
        kanbanCard: null,
        pendingFollowup: null,
        settings: baseSettings,
        now,
      };

      const result = calculatePriority(ctx);
      expect(result.bucket).toBe('P2');
      expect(result.score).toBeGreaterThan(PRIORITY_WEIGHTS.repurchase_due);
    });

    // Scenario 6: P3 - Quote stale > 2 days
    it('should assign P3 for stale quote', () => {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      const ctx: PriorityContext = {
        customer: {
          ...baseCustomer,
          last_order_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        },
        lastInboundInteraction: null,
        kanbanCard: {
          stage: KanbanStage.ORCAMENTO_ENVIADO,
          entered_stage_at: threeDaysAgo,
          sla_deadline: null,
        },
        pendingFollowup: null,
        settings: baseSettings,
        now,
      };

      const result = calculatePriority(ctx);
      expect(result.bucket).toBe('P3');
      expect(result.reason_code).toBe('QUOTE_STALE_2D');
    });

    // Scenario 7: P3 - Follow-up due
    it('should assign P3 for follow-up due', () => {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      const ctx: PriorityContext = {
        customer: {
          ...baseCustomer,
          last_order_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        },
        lastInboundInteraction: null,
        kanbanCard: {
          stage: KanbanStage.EM_ATENDIMENTO,
          entered_stage_at: threeDaysAgo,
          sla_deadline: null,
        },
        pendingFollowup: null,
        settings: baseSettings,
        now,
      };

      const result = calculatePriority(ctx);
      expect(result.bucket).toBe('P3');
      expect(result.reason_code).toBe('FOLLOWUP_DUE');
    });

    // Scenario 8: P4 - Post-sale D+45
    it('should assign P4 for post-sale check', () => {
      const now = new Date();
      const lastOrder = new Date(now.getTime() - 46 * 24 * 60 * 60 * 1000); // 46 days ago

      const ctx: PriorityContext = {
        customer: {
          ...baseCustomer,
          last_order_at: lastOrder,
          repurchase_cycle_days: 90, // Long cycle, so no P2
        },
        lastInboundInteraction: null,
        kanbanCard: null,
        pendingFollowup: null,
        settings: { ...baseSettings, repurchase_cycle_default_days: 90 },
        now,
      };

      const result = calculatePriority(ctx);
      expect(result.bucket).toBe('P4');
      expect(result.reason_code).toBe('POSTSALE_D45');
    });

    // Scenario 9: P1 priority over P2
    it('should prioritize P1 over P2', () => {
      const now = new Date();
      const lastOrder = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000);
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

      const ctx: PriorityContext = {
        customer: {
          ...baseCustomer,
          last_order_at: lastOrder,
          repurchase_cycle_days: 30,
        },
        lastInboundInteraction: {
          occurred_at: threeHoursAgo,
          responded_at: null,
          channel: 'WHATSAPP',
        },
        kanbanCard: null,
        pendingFollowup: null,
        settings: baseSettings,
        now,
      };

      const result = calculatePriority(ctx);
      expect(result.bucket).toBe('P1');
      expect(result.reason_code).toBe('MSG_UNANSWERED_2H');
    });

    // Scenario 10: No priority for active customer within cycle
    it('should have low score for active customer within cycle', () => {
      const now = new Date();
      const lastOrder = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      const ctx: PriorityContext = {
        customer: {
          ...baseCustomer,
          last_order_at: lastOrder,
          repurchase_cycle_days: 30,
        },
        lastInboundInteraction: null,
        kanbanCard: null,
        pendingFollowup: null,
        settings: baseSettings,
        now,
      };

      const result = calculatePriority(ctx);
      expect(result.score).toBe(0);
    });

    // Scenario 11: Responded message should not trigger P1
    it('should not trigger P1 for responded message', () => {
      const now = new Date();
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const ctx: PriorityContext = {
        customer: baseCustomer,
        lastInboundInteraction: {
          occurred_at: threeHoursAgo,
          responded_at: twoHoursAgo,
          channel: 'WHATSAPP',
        },
        kanbanCard: null,
        pendingFollowup: null,
        settings: baseSettings,
        now,
      };

      const result = calculatePriority(ctx);
      expect(result.bucket).not.toBe('P1');
    });

    // Scenario 12: Post-sale should not trigger outside window
    it('should not trigger P4 outside D+45-50 window', () => {
      const now = new Date();
      const lastOrder = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      const ctx: PriorityContext = {
        customer: {
          ...baseCustomer,
          last_order_at: lastOrder,
          repurchase_cycle_days: 90,
        },
        lastInboundInteraction: null,
        kanbanCard: null,
        pendingFollowup: null,
        settings: { ...baseSettings, repurchase_cycle_default_days: 90 },
        now,
      };

      const result = calculatePriority(ctx);
      // Should not be P4 for post-sale
      const postsaleFactor = result.factors.find(f => f.name === 'POSTSALE_D45');
      expect(postsaleFactor?.active).toBe(false);
    });
  });
});
