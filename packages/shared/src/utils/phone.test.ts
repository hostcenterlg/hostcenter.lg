import { describe, it, expect } from 'vitest';
import { normalizePhoneE164, isValidE164, formatPhoneDisplay } from './index';

describe('Phone Normalization E.164', () => {
  describe('normalizePhoneE164', () => {
    it('should normalize Brazilian mobile with DDD (11 digits)', () => {
      expect(normalizePhoneE164('11987654321')).toBe('+5511987654321');
      expect(normalizePhoneE164('21 98765-4321')).toBe('+5521987654321');
      expect(normalizePhoneE164('(31) 99876-5432')).toBe('+5531998765432');
    });

    it('should normalize Brazilian landline with DDD (10 digits)', () => {
      expect(normalizePhoneE164('1132345678')).toBe('+551132345678');
      expect(normalizePhoneE164('21 3234-5678')).toBe('+552132345678');
    });

    it('should handle numbers starting with 0 (national prefix)', () => {
      expect(normalizePhoneE164('011987654321')).toBe('+5511987654321');
      expect(normalizePhoneE164('021987654321')).toBe('+5521987654321');
    });

    it('should handle numbers already with country code', () => {
      expect(normalizePhoneE164('5511987654321')).toBe('+5511987654321');
      expect(normalizePhoneE164('+5511987654321')).toBe('+5511987654321');
    });

    it('should return null for invalid inputs', () => {
      expect(normalizePhoneE164(null)).toBeNull();
      expect(normalizePhoneE164(undefined)).toBeNull();
      expect(normalizePhoneE164('')).toBeNull();
      expect(normalizePhoneE164('abc')).toBeNull();
    });

    it('should return null for incomplete numbers', () => {
      // 8-9 digits without DDD cannot be normalized
      expect(normalizePhoneE164('98765432')).toBeNull();
      expect(normalizePhoneE164('987654321')).toBeNull();
    });

    it('should handle various formats', () => {
      expect(normalizePhoneE164('11 9 8765-4321')).toBe('+5511987654321');
      expect(normalizePhoneE164('(11) 9.8765.4321')).toBe('+5511987654321');
      expect(normalizePhoneE164('+55 11 98765 4321')).toBe('+5511987654321');
    });
  });

  describe('isValidE164', () => {
    it('should validate correct E.164 format', () => {
      expect(isValidE164('+5511987654321')).toBe(true);
      expect(isValidE164('+14155551234')).toBe(true);
      expect(isValidE164('+1')).toBe(false); // Too short
    });

    it('should reject invalid formats', () => {
      expect(isValidE164('5511987654321')).toBe(false); // Missing +
      expect(isValidE164('+0123456789')).toBe(false); // Starts with 0
      expect(isValidE164(null)).toBe(false);
      expect(isValidE164('')).toBe(false);
    });
  });

  describe('formatPhoneDisplay', () => {
    it('should format Brazilian mobile numbers', () => {
      expect(formatPhoneDisplay('+5511987654321')).toBe('(11) 98765-4321');
      expect(formatPhoneDisplay('+5521998765432')).toBe('(21) 99876-5432');
    });

    it('should format Brazilian landline numbers', () => {
      expect(formatPhoneDisplay('+551132345678')).toBe('(11) 3234-5678');
    });

    it('should return original for non-Brazilian', () => {
      expect(formatPhoneDisplay('+14155551234')).toBe('+14155551234');
    });

    it('should handle null/undefined', () => {
      expect(formatPhoneDisplay(null)).toBe('');
      expect(formatPhoneDisplay(undefined)).toBe('');
    });
  });
});
