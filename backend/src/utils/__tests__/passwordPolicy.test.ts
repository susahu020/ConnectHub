import { checkPasswordStrength, checkPasswordAgainstIdentity } from '../passwordPolicy';

describe('checkPasswordStrength', () => {
  it('rejects passwords shorter than 8 characters', () => {
    expect(checkPasswordStrength('Ab1!').valid).toBe(false);
  });

  it('rejects an empty password', () => {
    expect(checkPasswordStrength('').valid).toBe(false);
  });

  it('rejects a password with fewer than 3 character classes (letters only)', () => {
    expect(checkPasswordStrength('abcdefghijk').valid).toBe(false);
  });

  it('rejects a password with only 2 character classes (lower + digit)', () => {
    expect(checkPasswordStrength('abcdefgh123').valid).toBe(false);
  });

  it('accepts a password with 3 character classes (upper, lower, digit)', () => {
    expect(checkPasswordStrength('Abcdefgh123').valid).toBe(true);
  });

  it('accepts a password with all 4 character classes', () => {
    expect(checkPasswordStrength('Abcdefg1!').valid).toBe(true);
  });

  it('rejects a well-known common password even if it technically meets length/class rules', () => {
    // "Password1" has upper/lower/digit (3 classes) and is 9 chars, but it's
    // on the common-password list and should be rejected regardless.
    const result = checkPasswordStrength('Password1');
    expect(result.valid).toBe(false);
  });

  it('rejects a sequential character run', () => {
    expect(checkPasswordStrength('Abcdefgh1').valid).toBe(false); // contains "abcdefgh"
  });

  it('rejects a single repeated character', () => {
    expect(checkPasswordStrength('AAAAAAAA').valid).toBe(false);
  });

  it('accepts a genuinely strong, non-predictable password', () => {
    expect(checkPasswordStrength('Tr0ub4dor&Zeb').valid).toBe(true);
  });
});

describe('checkPasswordAgainstIdentity', () => {
  const identity = { email: 'jane.doe@company.com', firstName: 'Jane', lastName: 'Doe' };

  it('rejects a password containing the email local-part', () => {
    const result = checkPasswordAgainstIdentity('JaneDoe12345!', identity);
    expect(result.valid).toBe(false);
  });

  it('rejects a password containing the first name', () => {
    const result = checkPasswordAgainstIdentity('MyNameIsJane1!', identity);
    expect(result.valid).toBe(false);
  });

  it('rejects a password containing the last name (case-insensitive)', () => {
    const result = checkPasswordAgainstIdentity('DOEfamily123!', identity);
    expect(result.valid).toBe(false);
  });

  it('accepts a password unrelated to the identity', () => {
    const result = checkPasswordAgainstIdentity('Tr0ub4dor&Zeb', identity);
    expect(result.valid).toBe(true);
  });

  it('does not false-positive on short name fragments (under 3 chars are ignored)', () => {
    // firstName "Al" (2 chars) should not cause every password containing "al" to fail
    const result = checkPasswordAgainstIdentity('Practical$Choice1', { email: null, firstName: 'Al', lastName: null });
    expect(result.valid).toBe(true);
  });

  it('handles missing identity fields gracefully', () => {
    const result = checkPasswordAgainstIdentity('Tr0ub4dor&Zeb', { email: null, firstName: null, lastName: null });
    expect(result.valid).toBe(true);
  });
});
