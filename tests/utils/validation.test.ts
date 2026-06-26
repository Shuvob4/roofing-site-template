import { describe, it, expect } from 'vitest';
import {
  validatePhone,
  validateEmail,
  validateRequired,
  validateMaxLength,
} from '@utils/validation';

describe('validatePhone', () => {
  it('returns valid for 10 digits', () => {
    const result = validatePhone('5551234567');
    expect(result.valid).toBe(true);
    expect(result.message).toBe('');
  });

  it('returns valid for 15 digits', () => {
    const result = validatePhone('123456789012345');
    expect(result.valid).toBe(true);
    expect(result.message).toBe('');
  });

  it('returns valid for formatted phone with plus and dashes (+1-555-123-4567)', () => {
    const result = validatePhone('+1-555-123-4567');
    expect(result.valid).toBe(true);
    expect(result.message).toBe('');
  });

  it('returns valid for formatted phone with parens ((555) 123-4567)', () => {
    const result = validatePhone('(555) 123-4567');
    expect(result.valid).toBe(true);
    expect(result.message).toBe('');
  });

  it('returns invalid for 9 digits', () => {
    const result = validatePhone('555123456');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Phone number must contain at least 10 digits');
  });

  it('returns invalid for 16 digits', () => {
    const result = validatePhone('1234567890123456');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Phone number must contain no more than 15 digits');
  });

  it('returns invalid for empty string', () => {
    const result = validatePhone('');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Phone number is required');
  });

  it('returns invalid for letters only (no digits)', () => {
    const result = validatePhone('abcdefghij');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Phone number must contain at least 10 digits');
  });
});

describe('validateEmail', () => {
  it('returns valid for user@domain.tld', () => {
    const result = validateEmail('user@domain.tld');
    expect(result.valid).toBe(true);
    expect(result.message).toBe('');
  });

  it('returns valid for user@sub.domain.com', () => {
    const result = validateEmail('user@sub.domain.com');
    expect(result.valid).toBe(true);
    expect(result.message).toBe('');
  });

  it('returns invalid when missing @', () => {
    const result = validateEmail('userdomain.com');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Please enter a valid email address');
  });

  it('returns invalid when missing domain (no dot after @)', () => {
    const result = validateEmail('user@domain');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Please enter a valid email address');
  });

  it('returns invalid for single-char TLD', () => {
    const result = validateEmail('user@domain.x');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Please enter a valid email address');
  });

  it('returns invalid for empty string', () => {
    const result = validateEmail('');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Please enter a valid email address');
  });

  it('returns invalid when no dot after @', () => {
    const result = validateEmail('user@domaincom');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Please enter a valid email address');
  });
});

describe('validateRequired', () => {
  it('returns valid for non-empty string', () => {
    const result = validateRequired('hello');
    expect(result.valid).toBe(true);
    expect(result.message).toBe('');
  });

  it('returns invalid for empty string', () => {
    const result = validateRequired('');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('This field is required');
  });

  it('returns invalid for whitespace-only string', () => {
    const result = validateRequired('   ');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('This field is required');
  });

  it('uses custom field name in message', () => {
    const result = validateRequired('', 'Name');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Name is required');
  });
});

describe('validateMaxLength', () => {
  it('returns valid when within limit', () => {
    const result = validateMaxLength('hello', 10);
    expect(result.valid).toBe(true);
    expect(result.message).toBe('');
  });

  it('returns valid when exactly at limit', () => {
    const result = validateMaxLength('hello', 5);
    expect(result.valid).toBe(true);
    expect(result.message).toBe('');
  });

  it('returns invalid when exceeding limit', () => {
    const result = validateMaxLength('hello world', 5);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('This field must be 5 characters or less');
  });

  it('uses custom field name in message', () => {
    const result = validateMaxLength('hello world', 5, 'Message');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Message must be 5 characters or less');
  });
});
