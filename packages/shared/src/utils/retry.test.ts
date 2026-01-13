// ============================================
// VITAO JARVIS CRM - Retry & Circuit Breaker Tests
// ============================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  withRetry,
  calculateRetryDelay,
  isRetryableError,
  CircuitBreaker,
  CircuitState,
  resetAllCircuitBreakers,
} from './retry';

describe('Retry Logic', () => {
  describe('calculateRetryDelay', () => {
    it('should calculate exponential backoff', () => {
      const delay0 = calculateRetryDelay(0);
      const delay1 = calculateRetryDelay(1);
      const delay2 = calculateRetryDelay(2);

      // With jitter, these should be approximately 1000, 2000, 4000
      expect(delay0).toBeGreaterThanOrEqual(800);
      expect(delay0).toBeLessThanOrEqual(1200);
      expect(delay1).toBeGreaterThan(delay0);
      expect(delay2).toBeGreaterThan(delay1);
    });

    it('should cap at max delay', () => {
      const delay10 = calculateRetryDelay(10, {
        maxRetries: 10,
        baseDelayMs: 1000,
        maxDelayMs: 5000,
        backoffMultiplier: 2,
        jitterPercent: 0,
      });
      expect(delay10).toBe(5000);
    });
  });

  describe('isRetryableError', () => {
    it('should identify retryable errors by code', () => {
      expect(isRetryableError({ code: 'ECONNRESET' })).toBe(true);
      expect(isRetryableError({ code: 'ETIMEDOUT' })).toBe(true);
      expect(isRetryableError({ code: 'UNKNOWN' })).toBe(false);
    });

    it('should identify retryable errors by status', () => {
      expect(isRetryableError({ status: 503 })).toBe(true);
      expect(isRetryableError({ status: 429 })).toBe(true);
      expect(isRetryableError({ status: 400 })).toBe(false);
    });

    it('should identify retryable errors by message', () => {
      expect(isRetryableError(new Error('connection timeout'))).toBe(true);
      expect(isRetryableError(new Error('network error'))).toBe(true);
      expect(isRetryableError(new Error('invalid input'))).toBe(false);
    });
  });

  describe('withRetry', () => {
    it('should succeed on first try', async () => {
      const result = await withRetry(async () => 'success');
      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      let attempts = 0;
      const result = await withRetry(
        async () => {
          attempts++;
          if (attempts < 3) {
            const error = new Error('connection timeout');
            throw error;
          }
          return 'success';
        },
        { maxRetries: 5, baseDelayMs: 10, jitterPercent: 0 }
      );

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(3);
    });

    it('should fail after max retries', async () => {
      const result = await withRetry(
        async () => {
          throw new Error('network error');
        },
        { maxRetries: 2, baseDelayMs: 10, jitterPercent: 0 }
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('network error');
      expect(result.attempts).toBe(3); // initial + 2 retries
    });
  });
});

describe('Circuit Breaker', () => {
  beforeEach(() => {
    resetAllCircuitBreakers();
  });

  describe('CircuitBreaker', () => {
    it('should start in CLOSED state', () => {
      const cb = new CircuitBreaker('test');
      expect(cb.getState().state).toBe(CircuitState.CLOSED);
    });

    it('should open after failure threshold', () => {
      const cb = new CircuitBreaker('test', {
        failureThreshold: 3,
        successThreshold: 2,
        openTimeoutMs: 1000,
        halfOpenMaxAttempts: 1,
      });

      cb.recordFailure();
      expect(cb.getState().state).toBe(CircuitState.CLOSED);

      cb.recordFailure();
      expect(cb.getState().state).toBe(CircuitState.CLOSED);

      cb.recordFailure();
      expect(cb.getState().state).toBe(CircuitState.OPEN);
    });

    it('should reset failure count on success', () => {
      const cb = new CircuitBreaker('test', {
        failureThreshold: 3,
        successThreshold: 2,
        openTimeoutMs: 1000,
        halfOpenMaxAttempts: 1,
      });

      cb.recordFailure();
      cb.recordFailure();
      expect(cb.getState().failureCount).toBe(2);

      cb.recordSuccess();
      expect(cb.getState().failureCount).toBe(0);
    });

    it('should not allow execution when OPEN', () => {
      const cb = new CircuitBreaker('test', {
        failureThreshold: 1,
        successThreshold: 1,
        openTimeoutMs: 10000,
        halfOpenMaxAttempts: 1,
      });

      cb.recordFailure();
      expect(cb.isAllowed()).toBe(false);
    });

    it('should transition to HALF_OPEN after timeout', async () => {
      const cb = new CircuitBreaker('test', {
        failureThreshold: 1,
        successThreshold: 1,
        openTimeoutMs: 50,
        halfOpenMaxAttempts: 1,
      });

      cb.recordFailure();
      expect(cb.getState().state).toBe(CircuitState.OPEN);

      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(cb.getState().state).toBe(CircuitState.HALF_OPEN);
      expect(cb.isAllowed()).toBe(true);
    });

    it('should close after success threshold in HALF_OPEN', async () => {
      const cb = new CircuitBreaker('test', {
        failureThreshold: 1,
        successThreshold: 2,
        openTimeoutMs: 10,
        halfOpenMaxAttempts: 3,
      });

      cb.recordFailure();
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Trigger state check to transition to HALF_OPEN
      cb.getState();

      // Need 2 successes to close
      cb.recordSuccess();
      expect(cb.getState().state).toBe(CircuitState.HALF_OPEN);

      cb.recordSuccess();
      expect(cb.getState().state).toBe(CircuitState.CLOSED);
    });

    it('should execute function successfully', async () => {
      const cb = new CircuitBreaker('test');
      const result = await cb.execute(async () => 'success');
      expect(result).toBe('success');
    });
  });
});
