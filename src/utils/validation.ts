/**
 * Form Validation Utility
 *
 * Pure TypeScript utility for client-side form validation.
 * No side effects, no framework imports.
 *
 * Validates: Requirements 13.3, 14.3, 10.4
 */

export interface ValidationResult {
  valid: boolean;
  message: string;
}

/**
 * Validates a phone number.
 * Strips all non-digit characters and checks that 10–15 digits remain.
 */
export function validatePhone(value: string): ValidationResult {
  const trimmed = value.trim();

  if (trimmed === '') {
    return { valid: false, message: 'Phone number is required' };
  }

  const digits = trimmed.replace(/\D/g, '');

  if (digits.length < 10) {
    return { valid: false, message: 'Phone number must contain at least 10 digits' };
  }

  if (digits.length > 15) {
    return { valid: false, message: 'Phone number must contain no more than 15 digits' };
  }

  return { valid: true, message: '' };
}

/**
 * Validates an email address.
 * Must have exactly one @, non-empty local-part, domain with at least one dot,
 * and TLD of at least 2 characters.
 */
export function validateEmail(value: string): ValidationResult {
  const trimmed = value.trim();
  const invalidResult: ValidationResult = {
    valid: false,
    message: 'Please enter a valid email address',
  };

  if (trimmed === '') {
    return invalidResult;
  }

  const atParts = trimmed.split('@');

  // Must have exactly one @
  if (atParts.length !== 2) {
    return invalidResult;
  }

  const [localPart, domain] = atParts;

  // Local-part must be non-empty
  if (localPart.length === 0) {
    return invalidResult;
  }

  // Domain must contain at least one dot
  const lastDotIndex = domain.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return invalidResult;
  }

  // TLD (after last dot) must be ≥ 2 characters
  const tld = domain.slice(lastDotIndex + 1);
  if (tld.length < 2) {
    return invalidResult;
  }

  // Domain part before TLD must be non-empty
  const domainBeforeTld = domain.slice(0, lastDotIndex);
  if (domainBeforeTld.length === 0) {
    return invalidResult;
  }

  return { valid: true, message: '' };
}

/**
 * Validates that a value is non-empty after trimming.
 */
export function validateRequired(value: string, fieldName?: string): ValidationResult {
  if (value.trim() === '') {
    const name = fieldName || 'This field';
    return { valid: false, message: `${name} is required` };
  }

  return { valid: true, message: '' };
}

/**
 * Validates that a value does not exceed maxLength characters.
 */
export function validateMaxLength(
  value: string,
  maxLength: number,
  fieldName?: string,
): ValidationResult {
  if (value.length > maxLength) {
    const name = fieldName || 'This field';
    return {
      valid: false,
      message: `${name} must be ${maxLength} characters or less`,
    };
  }

  return { valid: true, message: '' };
}
