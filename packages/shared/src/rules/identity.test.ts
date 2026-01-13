import { describe, it, expect } from 'vitest';
import { findIdentityMatches, areCustomersMatching } from './index';

describe('Identity Matching', () => {
  describe('findIdentityMatches', () => {
    it('should return CNPJ with highest confidence', () => {
      const matches = findIdentityMatches({
        cnpj: '12345678000190',
        cpf: null,
        phone: '+5511987654321',
        email: 'test@example.com',
      });

      expect(matches[0].type).toBe('CNPJ');
      expect(matches[0].confidence).toBe(1.0);
    });

    it('should return CPF with highest confidence when no CNPJ', () => {
      const matches = findIdentityMatches({
        cnpj: null,
        cpf: '12345678901',
        phone: '+5511987654321',
        email: 'test@example.com',
      });

      expect(matches[0].type).toBe('CPF');
      expect(matches[0].confidence).toBe(1.0);
    });

    it('should return phone with 0.9 confidence', () => {
      const matches = findIdentityMatches({
        cnpj: null,
        cpf: null,
        phone: '+5511987654321',
        email: 'test@example.com',
      });

      expect(matches[0].type).toBe('PHONE');
      expect(matches[0].confidence).toBe(0.9);
    });

    it('should return email with 0.8 confidence', () => {
      const matches = findIdentityMatches({
        cnpj: null,
        cpf: null,
        phone: null,
        email: 'test@example.com',
      });

      expect(matches[0].type).toBe('EMAIL');
      expect(matches[0].confidence).toBe(0.8);
    });

    it('should return all available matches in order', () => {
      const matches = findIdentityMatches({
        cnpj: '12345678000190',
        cpf: '12345678901',
        phone: '+5511987654321',
        email: 'test@example.com',
      });

      expect(matches.length).toBe(4);
      expect(matches[0].type).toBe('CNPJ');
      expect(matches[1].type).toBe('CPF');
      expect(matches[2].type).toBe('PHONE');
      expect(matches[3].type).toBe('EMAIL');
    });

    it('should return empty array when no identifiers', () => {
      const matches = findIdentityMatches({
        cnpj: null,
        cpf: null,
        phone: null,
        email: null,
      });

      expect(matches.length).toBe(0);
    });
  });

  describe('areCustomersMatching', () => {
    it('should match by CNPJ with 100% confidence', () => {
      const result = areCustomersMatching(
        { cnpj: '12345678000190', cpf: null, phone: null, email: null },
        { cnpj: '12345678000190', cpf: null, phone: null, email: null }
      );

      expect(result.match).toBe(true);
      expect(result.type).toBe('CNPJ');
      expect(result.confidence).toBe(1.0);
    });

    it('should not match different CNPJs', () => {
      const result = areCustomersMatching(
        { cnpj: '12345678000190', cpf: null, phone: null, email: null },
        { cnpj: '98765432000111', cpf: null, phone: null, email: null }
      );

      expect(result.match).toBe(false);
      expect(result.type).toBe('CNPJ');
      expect(result.confidence).toBe(0);
    });

    it('should match by CPF when no CNPJ', () => {
      const result = areCustomersMatching(
        { cnpj: null, cpf: '12345678901', phone: null, email: null },
        { cnpj: null, cpf: '12345678901', phone: null, email: null }
      );

      expect(result.match).toBe(true);
      expect(result.type).toBe('CPF');
      expect(result.confidence).toBe(1.0);
    });

    it('should match by phone with 0.9 confidence', () => {
      const result = areCustomersMatching(
        { cnpj: null, cpf: null, phone: '+5511987654321', email: null },
        { cnpj: null, cpf: null, phone: '+5511987654321', email: null }
      );

      expect(result.match).toBe(true);
      expect(result.type).toBe('PHONE');
      expect(result.confidence).toBe(0.9);
    });

    it('should match by email with 0.8 confidence', () => {
      const result = areCustomersMatching(
        { cnpj: null, cpf: null, phone: null, email: 'test@example.com' },
        { cnpj: null, cpf: null, phone: null, email: 'test@example.com' }
      );

      expect(result.match).toBe(true);
      expect(result.type).toBe('EMAIL');
      expect(result.confidence).toBe(0.8);
    });

    it('should not match when no common identifiers', () => {
      const result = areCustomersMatching(
        { cnpj: null, cpf: null, phone: '+5511987654321', email: null },
        { cnpj: null, cpf: null, phone: null, email: 'test@example.com' }
      );

      expect(result.match).toBe(false);
      expect(result.type).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it('should prioritize CNPJ over other identifiers', () => {
      const result = areCustomersMatching(
        {
          cnpj: '12345678000190',
          cpf: '12345678901',
          phone: '+5511987654321',
          email: 'a@example.com',
        },
        {
          cnpj: '12345678000190',
          cpf: '98765432100',
          phone: '+5521987654321',
          email: 'b@example.com',
        }
      );

      expect(result.match).toBe(true);
      expect(result.type).toBe('CNPJ');
    });
  });
});
