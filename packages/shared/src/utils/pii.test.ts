// ============================================
// VITAO JARVIS CRM - PII Masking Tests
// ============================================

import { describe, it, expect } from 'vitest';
import {
  maskCPF,
  maskCNPJ,
  maskPhone,
  maskEmail,
  maskName,
  sanitizeForLogging,
} from './pii';

describe('PII Masking', () => {
  describe('maskCPF', () => {
    it('should mask a valid CPF', () => {
      expect(maskCPF('12345678901')).toBe('123.***.***-01');
    });

    it('should mask CPF with formatting', () => {
      expect(maskCPF('123.456.789-01')).toBe('123.***.***-01');
    });

    it('should return empty string for null', () => {
      expect(maskCPF(null)).toBe('');
    });

    it('should return original for invalid length', () => {
      expect(maskCPF('12345')).toBe('12345');
    });
  });

  describe('maskCNPJ', () => {
    it('should mask a valid CNPJ', () => {
      expect(maskCNPJ('12345678000190')).toBe('12.***.***/****-90');
    });

    it('should mask CNPJ with formatting', () => {
      expect(maskCNPJ('12.345.678/0001-90')).toBe('12.***.***/****-90');
    });

    it('should return empty string for undefined', () => {
      expect(maskCNPJ(undefined)).toBe('');
    });
  });

  describe('maskPhone', () => {
    it('should mask a phone number', () => {
      const result = maskPhone('+5511987654321');
      expect(result).toMatch(/^\+5511.*4321$/);
    });

    it('should handle short phone numbers', () => {
      expect(maskPhone('1234')).toBe('1234');
    });
  });

  describe('maskEmail', () => {
    it('should mask an email address', () => {
      expect(maskEmail('user@example.com')).toBe('us***@example.com');
    });

    it('should handle short local part', () => {
      expect(maskEmail('a@example.com')).toBe('a@example.com');
    });
  });

  describe('maskName', () => {
    it('should mask a name', () => {
      const result = maskName('Joao Silva');
      expect(result).toContain('J');
      expect(result).toContain('S');
      expect(result).toContain('*');
    });
  });

  describe('sanitizeForLogging', () => {
    it('should redact sensitive fields', () => {
      const obj = {
        name: 'Test',
        cpf: '12345678901',
        email: 'test@test.com',
        password: 'secret',
        data: 'safe',
      };
      const result = sanitizeForLogging(obj);
      expect(result.name).toBe('Test');
      expect(result.cpf).toBe('[REDACTED]');
      expect(result.email).toBe('[REDACTED]');
      expect(result.password).toBe('[REDACTED]');
      expect(result.data).toBe('safe');
    });
  });
});
