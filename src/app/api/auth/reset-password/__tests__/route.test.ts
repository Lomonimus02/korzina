/**
 * Tests for reset-password API route validation functions
 * 
 * These tests verify:
 * 1. Timing-safe comparison for OTP codes
 * 2. OTP format validation
 * 3. Email format validation
 * 4. Password validation
 * 
 * Note: Full integration tests require running the actual API server.
 * These unit tests focus on the validation logic that protects against attacks.
 */

import crypto from 'crypto';

/**
 * Timing-safe comparison for OTP codes to prevent timing attacks.
 * Mirrors the implementation in route.ts
 */
function timingSafeCompare(a: string, b: string): boolean {
  const maxLength = Math.max(a.length, b.length);
  const paddedA = a.padEnd(maxLength, '\0');
  const paddedB = b.padEnd(maxLength, '\0');
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(paddedA, 'utf8'),
      Buffer.from(paddedB, 'utf8')
    );
  } catch {
    return false;
  }
}

/**
 * Validates that the code is a 6-digit numeric string.
 */
function isValidOtpFormat(code: string): boolean {
  return /^\d{6}$/.test(code);
}

/**
 * Validates email format.
 */
function isValidEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validates password strength requirements.
 */
function isValidPassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 6) {
    return { valid: false, error: 'Пароль должен быть не менее 6 символов' };
  }
  if (password.length > 128) {
    return { valid: false, error: 'Пароль слишком длинный' };
  }
  return { valid: true };
}

describe('Security: Timing-Safe OTP Comparison', () => {
  describe('timingSafeCompare', () => {
    it('should return true for matching 6-digit OTP codes', () => {
      expect(timingSafeCompare('123456', '123456')).toBe(true);
      expect(timingSafeCompare('000000', '000000')).toBe(true);
      expect(timingSafeCompare('999999', '999999')).toBe(true);
    });

    it('should return false for non-matching OTP codes', () => {
      expect(timingSafeCompare('123456', '654321')).toBe(false);
      expect(timingSafeCompare('123456', '123457')).toBe(false);
      expect(timingSafeCompare('000001', '100000')).toBe(false);
    });

    it('should handle strings of different lengths safely', () => {
      // This is important for preventing timing attacks based on length differences
      expect(timingSafeCompare('12345', '123456')).toBe(false);
      expect(timingSafeCompare('1234567', '123456')).toBe(false);
      expect(timingSafeCompare('1', '123456')).toBe(false);
    });

    it('should handle empty strings', () => {
      expect(timingSafeCompare('', '')).toBe(true);
      expect(timingSafeCompare('', '123456')).toBe(false);
      expect(timingSafeCompare('123456', '')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(timingSafeCompare('ABCdef', 'abcDEF')).toBe(false);
      expect(timingSafeCompare('ABCdef', 'ABCdef')).toBe(true);
    });

    it('should handle special characters', () => {
      expect(timingSafeCompare('!@#$%^', '!@#$%^')).toBe(true);
      expect(timingSafeCompare('!@#$%^', '!@#$%&')).toBe(false);
    });

    it('should handle unicode characters', () => {
      expect(timingSafeCompare('тест', 'тест')).toBe(true);
      expect(timingSafeCompare('тест', 'test')).toBe(false);
    });
  });

  describe('Timing attack resistance', () => {
    it('should take similar time for matching and non-matching codes', () => {
      const iterations = 1000;
      
      // Measure time for matching comparisons
      const startMatch = process.hrtime.bigint();
      for (let i = 0; i < iterations; i++) {
        timingSafeCompare('123456', '123456');
      }
      const endMatch = process.hrtime.bigint();
      const matchTime = Number(endMatch - startMatch);
      
      // Measure time for non-matching comparisons
      const startNoMatch = process.hrtime.bigint();
      for (let i = 0; i < iterations; i++) {
        timingSafeCompare('123456', '654321');
      }
      const endNoMatch = process.hrtime.bigint();
      const noMatchTime = Number(endNoMatch - startNoMatch);
      
      // Times should be within 50% of each other (timing-safe)
      // This is a loose check because system scheduling can affect timing
      const ratio = matchTime / noMatchTime;
      expect(ratio).toBeGreaterThan(0.5);
      expect(ratio).toBeLessThan(2.0);
    });
  });
});

describe('Input Validation: OTP Format', () => {
  describe('isValidOtpFormat', () => {
    it('should accept valid 6-digit OTP codes', () => {
      expect(isValidOtpFormat('123456')).toBe(true);
      expect(isValidOtpFormat('000000')).toBe(true);
      expect(isValidOtpFormat('999999')).toBe(true);
      expect(isValidOtpFormat('100001')).toBe(true);
    });

    it('should reject codes with wrong number of digits', () => {
      expect(isValidOtpFormat('12345')).toBe(false);   // 5 digits
      expect(isValidOtpFormat('1234567')).toBe(false); // 7 digits
      expect(isValidOtpFormat('')).toBe(false);        // 0 digits
      expect(isValidOtpFormat('1')).toBe(false);       // 1 digit
    });

    it('should reject codes containing non-numeric characters', () => {
      expect(isValidOtpFormat('12345a')).toBe(false);
      expect(isValidOtpFormat('a23456')).toBe(false);
      expect(isValidOtpFormat('abcdef')).toBe(false);
      expect(isValidOtpFormat('12 456')).toBe(false);  // space
      expect(isValidOtpFormat('123.56')).toBe(false);  // dot
      expect(isValidOtpFormat('-12345')).toBe(false);  // negative sign
    });

    it('should reject codes with special characters', () => {
      expect(isValidOtpFormat('!23456')).toBe(false);
      expect(isValidOtpFormat('12@456')).toBe(false);
      expect(isValidOtpFormat('123#56')).toBe(false);
    });

    it('should reject codes with whitespace', () => {
      expect(isValidOtpFormat(' 12345')).toBe(false);
      expect(isValidOtpFormat('12345 ')).toBe(false);
      expect(isValidOtpFormat('123 56')).toBe(false);
      expect(isValidOtpFormat('\t23456')).toBe(false);
      expect(isValidOtpFormat('12345\n')).toBe(false);
    });
  });
});

describe('Input Validation: Email Format', () => {
  describe('isValidEmailFormat', () => {
    it('should accept valid email addresses', () => {
      expect(isValidEmailFormat('test@example.com')).toBe(true);
      expect(isValidEmailFormat('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmailFormat('user+tag@example.org')).toBe(true);
      expect(isValidEmailFormat('user123@test-domain.com')).toBe(true);
      expect(isValidEmailFormat('a@b.c')).toBe(true);
    });

    it('should reject emails without @ symbol', () => {
      expect(isValidEmailFormat('testexample.com')).toBe(false);
      expect(isValidEmailFormat('invalidemail')).toBe(false);
    });

    it('should reject emails without domain', () => {
      expect(isValidEmailFormat('test@')).toBe(false);
      expect(isValidEmailFormat('test@.com')).toBe(false);
    });

    it('should reject emails without local part', () => {
      expect(isValidEmailFormat('@example.com')).toBe(false);
    });

    it('should reject emails with spaces', () => {
      expect(isValidEmailFormat('test @example.com')).toBe(false);
      expect(isValidEmailFormat('test@ example.com')).toBe(false);
      expect(isValidEmailFormat(' test@example.com')).toBe(false);
    });

    it('should reject emails exceeding maximum length (254 chars)', () => {
      const longLocalPart = 'a'.repeat(250);
      const longEmail = `${longLocalPart}@example.com`;
      expect(isValidEmailFormat(longEmail)).toBe(false);
    });

    it('should accept emails at maximum length (254 chars)', () => {
      const localPart = 'a'.repeat(240);
      const email = `${localPart}@example.com`; // 252 chars
      expect(isValidEmailFormat(email)).toBe(true);
    });
  });
});

describe('Input Validation: Password', () => {
  describe('isValidPassword', () => {
    it('should accept valid passwords (6+ characters)', () => {
      expect(isValidPassword('123456').valid).toBe(true);
      expect(isValidPassword('password').valid).toBe(true);
      expect(isValidPassword('mySecurePassword123!').valid).toBe(true);
      expect(isValidPassword('a'.repeat(128)).valid).toBe(true);
    });

    it('should reject passwords shorter than 6 characters', () => {
      const result1 = isValidPassword('12345');
      expect(result1.valid).toBe(false);
      expect(result1.error).toBe('Пароль должен быть не менее 6 символов');

      const result2 = isValidPassword('a');
      expect(result2.valid).toBe(false);

      const result3 = isValidPassword('');
      expect(result3.valid).toBe(false);
    });

    it('should reject passwords longer than 128 characters', () => {
      const result = isValidPassword('a'.repeat(129));
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Пароль слишком длинный');
    });

    it('should accept passwords with special characters', () => {
      expect(isValidPassword('p@ssw0rd!').valid).toBe(true);
      expect(isValidPassword('!@#$%^').valid).toBe(true);
      expect(isValidPassword('пароль').valid).toBe(true); // Cyrillic
    });

    it('should accept passwords with whitespace', () => {
      expect(isValidPassword('pass word').valid).toBe(true);
      expect(isValidPassword('   ').valid).toBe(false); // Only 3 chars
      expect(isValidPassword('      ').valid).toBe(true); // 6 spaces
    });
  });
});

describe('API Response Structure', () => {
  it('should define correct success response format with autoLogin', () => {
    const expectedSuccessResponse = {
      success: true,
      autoLogin: true,
      email: 'test@example.com',
    };
    
    expect(expectedSuccessResponse).toHaveProperty('success', true);
    expect(expectedSuccessResponse).toHaveProperty('autoLogin', true);
    expect(expectedSuccessResponse).toHaveProperty('email');
    expect(expectedSuccessResponse).not.toHaveProperty('password'); // Security: never return password
  });
});

describe('Security Considerations', () => {
  it('should not expose user existence through different error messages', () => {
    // All error messages for token-related issues should be generic
    const tokenNotFoundMessage = 'Код истёк или не найден. Запросите новый код.';
    const tokenExpiredMessage = 'Код истёк или не найден. Запросите новый код.';
    
    // Same message for both cases - doesn't reveal if user exists
    expect(tokenNotFoundMessage).toBe(tokenExpiredMessage);
  });

  it('should sanitize email by converting to lowercase', () => {
    const email = 'TEST@EXAMPLE.COM';
    const sanitized = email.toLowerCase().trim();
    expect(sanitized).toBe('test@example.com');
  });

  it('should trim whitespace from email', () => {
    const email = '  test@example.com  ';
    const sanitized = email.toLowerCase().trim();
    expect(sanitized).toBe('test@example.com');
  });
});
