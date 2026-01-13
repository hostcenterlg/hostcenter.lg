// ============================================
// VITAO JARVIS CRM - Utility Functions
// ============================================

import { createHash } from 'crypto';

// ============ PHONE NORMALIZATION (E.164) ============

/**
 * Normalizes a phone number to E.164 format
 * Assumes Brazilian numbers by default (+55)
 */
export function normalizePhoneE164(phone: string | null | undefined, defaultCountry = '55'): string | null {
  if (!phone) return null;

  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');

  if (digits.length === 0) return null;

  // Handle Brazilian numbers
  if (defaultCountry === '55') {
    // If starts with 55 and has 12-13 digits, it's already international
    if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
      return `+${digits}`;
    }

    // If starts with 0, remove it (national prefix)
    if (digits.startsWith('0')) {
      digits = digits.substring(1);
    }

    // Brazilian mobile: 11 digits (2 DDD + 9 + 8 digits)
    // Brazilian landline: 10 digits (2 DDD + 8 digits)
    if (digits.length === 11 || digits.length === 10) {
      return `+55${digits}`;
    }

    // If 8 or 9 digits only (no DDD), we can't normalize properly
    if (digits.length === 8 || digits.length === 9) {
      // Return as-is but flagged as incomplete
      return null;
    }
  }

  // If already has country code (starts with known codes)
  if (digits.length >= 10) {
    // Check if it's already a valid international number
    if (digits.startsWith('1') && digits.length === 11) {
      return `+${digits}`; // US/Canada
    }
    if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
      return `+${digits}`; // Brazil
    }
  }

  // Default: prepend country code
  return `+${defaultCountry}${digits}`;
}

/**
 * Validates if a phone is in valid E.164 format
 */
export function isValidE164(phone: string | null | undefined): boolean {
  if (!phone) return false;
  // E.164: + followed by 1-15 digits
  return /^\+[1-9]\d{1,14}$/.test(phone);
}

/**
 * Formats an E.164 phone for display (Brazilian format)
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
  if (!phone) return '';

  const digits = phone.replace(/\D/g, '');

  // Brazilian format
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    const ddd = digits.substring(2, 4);
    const number = digits.substring(4);

    if (number.length === 9) {
      return `(${ddd}) ${number.substring(0, 5)}-${number.substring(5)}`;
    } else if (number.length === 8) {
      return `(${ddd}) ${number.substring(0, 4)}-${number.substring(4)}`;
    }
  }

  return phone;
}

// ============ DOCUMENT NORMALIZATION ============

/**
 * Normalizes CNPJ to digits only
 */
export function normalizeCNPJ(cnpj: string | null | undefined): string | null {
  if (!cnpj) return null;
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return null;
  return digits;
}

/**
 * Normalizes CPF to digits only
 */
export function normalizeCPF(cpf: string | null | undefined): string | null {
  if (!cpf) return null;
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return null;
  return digits;
}

/**
 * Validates CNPJ check digits
 */
export function isValidCNPJ(cnpj: string | null | undefined): boolean {
  const digits = normalizeCNPJ(cnpj);
  if (!digits) return false;

  // Check for known invalid patterns
  if (/^(\d)\1+$/.test(digits)) return false;

  // Validate check digits
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i]) * weights1[i];
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;

  if (parseInt(digits[12]) !== digit1) return false;

  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(digits[i]) * weights2[i];
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;

  return parseInt(digits[13]) === digit2;
}

/**
 * Validates CPF check digits
 */
export function isValidCPF(cpf: string | null | undefined): boolean {
  const digits = normalizeCPF(cpf);
  if (!digits) return false;

  // Check for known invalid patterns
  if (/^(\d)\1+$/.test(digits)) return false;

  // Validate check digits
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (parseInt(digits[9]) !== remainder) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;

  return parseInt(digits[10]) === remainder;
}

/**
 * Formats CNPJ for display
 */
export function formatCNPJ(cnpj: string | null | undefined): string {
  const digits = normalizeCNPJ(cnpj);
  if (!digits) return cnpj || '';
  return `${digits.substring(0, 2)}.${digits.substring(2, 5)}.${digits.substring(5, 8)}/${digits.substring(8, 12)}-${digits.substring(12)}`;
}

/**
 * Formats CPF for display
 */
export function formatCPF(cpf: string | null | undefined): string {
  const digits = normalizeCPF(cpf);
  if (!digits) return cpf || '';
  return `${digits.substring(0, 3)}.${digits.substring(3, 6)}.${digits.substring(6, 9)}-${digits.substring(9)}`;
}

// ============ EMAIL NORMALIZATION ============

/**
 * Normalizes email to lowercase, trimmed
 */
export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  if (!isValidEmail(normalized)) return null;
  return normalized;
}

/**
 * Validates email format
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  // Basic email validation
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ============ HASHING ============

/**
 * Creates a SHA-256 hash of the input
 */
export function hashSHA256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Creates an idempotency key from source and external ID
 */
export function createIdempotencyKey(source: string, externalId: string, eventType: string): string {
  return hashSHA256(`${source}:${eventType}:${externalId}`);
}

// ============ DATE UTILITIES ============

/**
 * Calculates days between two dates
 */
export function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.floor(Math.abs((date2.getTime() - date1.getTime()) / oneDay));
}

/**
 * Adds business days to a date
 * @param businessDays Array of weekdays (0=Sun, 1=Mon, ..., 6=Sat)
 */
export function addBusinessDays(
  date: Date,
  days: number,
  businessDays: number[] = [1, 2, 3, 4, 5]
): Date {
  const result = new Date(date);
  let added = 0;

  while (added < days) {
    result.setDate(result.getDate() + 1);
    if (businessDays.includes(result.getDay())) {
      added++;
    }
  }

  return result;
}

/**
 * Checks if a date is a business day
 */
export function isBusinessDay(date: Date, businessDays: number[] = [1, 2, 3, 4, 5]): boolean {
  return businessDays.includes(date.getDay());
}

/**
 * Gets the start of day for a date
 */
export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Gets the end of day for a date
 */
export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

// ============ STRING UTILITIES ============

/**
 * Truncates a string to a maximum length
 */
export function truncate(str: string, maxLength: number, suffix = '...'): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Generates a random ID (for testing/mocking)
 */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

// ============ OBJECT UTILITIES ============

/**
 * Deep clones an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Removes undefined values from an object
 */
export function removeUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}
