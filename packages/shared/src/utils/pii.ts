// ============================================
// VITAO JARVIS CRM - PII Masking Utilities
// LGPD Compliance
// ============================================

/**
 * PII field types that require masking
 */
export type PIIFieldType = 'cpf' | 'cnpj' | 'phone' | 'email' | 'name';

/**
 * Masks a CPF (Brazilian individual taxpayer ID)
 * Format: 123.456.789-00 -> 123.XXX.XXX-00 (masked)
 */
export function maskCPF(cpf: string | null | undefined): string {
  if (!cpf) return '';
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return cpf;
  return `${clean.slice(0, 3)}.***.***-${clean.slice(9)}`;
}

/**
 * Masks a CNPJ (Brazilian company taxpayer ID)
 * Format: 12.345.678/0001-90 -> 12.XXX.XXX/XXXX-90 (masked)
 */
export function maskCNPJ(cnpj: string | null | undefined): string {
  if (!cnpj) return '';
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length !== 14) return cnpj;
  return `${clean.slice(0, 2)}.***.***/****-${clean.slice(12)}`;
}

/**
 * Masks a phone number
 * Format: +5511987654321 -> +5511XXXX4321 (masked)
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '');
  if (clean.length < 8) return phone;

  // Keep first 4 and last 4 digits
  const prefix = phone.startsWith('+') ? '+' : '';
  const firstDigits = clean.slice(0, 4);
  const lastDigits = clean.slice(-4);
  const maskedMiddle = '*'.repeat(Math.max(0, clean.length - 8));

  return `${prefix}${firstDigits}${maskedMiddle}${lastDigits}`;
}

/**
 * Masks an email address
 * Format: user@example.com -> usXXX@example.com (masked)
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '';

  const atIndex = email.indexOf('@');
  if (atIndex <= 1) return email;

  const localPart = email.slice(0, atIndex);
  const domain = email.slice(atIndex);

  // Keep first 2 chars of local part
  const visible = localPart.slice(0, 2);
  return `${visible}***${domain}`;
}

/**
 * Masks a name (keeps first and last name initials)
 * Format: "Joao Silva Santos" -> "JXXX SXXX SXXX" (masked)
 */
export function maskName(name: string | null | undefined): string {
  if (!name) return '';

  return name
    .split(' ')
    .map((part) => {
      if (part.length === 0) return part;
      return `${part[0]}${'*'.repeat(Math.max(0, part.length - 1))}`;
    })
    .join(' ');
}

/**
 * Auto-detects and masks PII based on field type
 */
export function maskPII(value: string | null | undefined, fieldType: PIIFieldType): string {
  switch (fieldType) {
    case 'cpf':
      return maskCPF(value);
    case 'cnpj':
      return maskCNPJ(value);
    case 'phone':
      return maskPhone(value);
    case 'email':
      return maskEmail(value);
    case 'name':
      return maskName(value);
    default:
      return value || '';
  }
}

/**
 * Masks PII fields in an object
 */
export function maskObjectPII<T extends Record<string, unknown>>(
  obj: T,
  piiFields: Partial<Record<keyof T, PIIFieldType>>
): T {
  const result = { ...obj };

  for (const [field, fieldType] of Object.entries(piiFields)) {
    if (field in result && typeof result[field] === 'string') {
      (result as Record<string, unknown>)[field] = maskPII(
        result[field] as string,
        fieldType as PIIFieldType
      );
    }
  }

  return result;
}

/**
 * Customer PII fields mapping
 */
export const CUSTOMER_PII_FIELDS: Record<string, PIIFieldType> = {
  cpf: 'cpf',
  cnpj: 'cnpj',
  phone: 'phone',
  email: 'email',
  contact_name: 'name',
};

/**
 * Masks all PII fields in a customer object
 */
export function maskCustomerPII<T extends Record<string, unknown>>(customer: T): T {
  return maskObjectPII(customer, CUSTOMER_PII_FIELDS as Partial<Record<keyof T, PIIFieldType>>);
}

/**
 * Interface for PII access logging
 */
export interface PIIAccessLogEntry {
  tenant_id: string;
  actor_id: string;
  table_name: string;
  record_id: string;
  field_name: string;
  action: 'VIEW' | 'EXPORT' | 'REVEAL' | 'MODIFY';
  reason?: string;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Creates a PII access log entry (to be inserted into pii_access_log table)
 */
export function createPIIAccessLog(
  tenantId: string,
  actorId: string,
  tableName: string,
  recordId: string,
  fieldName: string,
  action: PIIAccessLogEntry['action'],
  reason?: string
): PIIAccessLogEntry {
  return {
    tenant_id: tenantId,
    actor_id: actorId,
    table_name: tableName,
    record_id: recordId,
    field_name: fieldName,
    action,
    reason,
  };
}

/**
 * Sanitizes object for logging (removes or masks PII)
 */
export function sanitizeForLogging<T extends Record<string, unknown>>(
  obj: T,
  fieldsToMask: string[] = ['cpf', 'cnpj', 'phone', 'email', 'password', 'token', 'api_key']
): T {
  const result = { ...obj };

  for (const field of fieldsToMask) {
    if (field in result) {
      if (typeof result[field] === 'string') {
        (result as Record<string, unknown>)[field] = '[REDACTED]';
      }
    }
  }

  return result;
}
