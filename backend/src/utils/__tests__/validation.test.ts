import { registerSchema, loginSchema, resetPasswordSchema, verifyEmailSchema } from '../validation';

describe('registerSchema', () => {
  const validBody = {
    email: 'newhire@example.com',
    password: 'SecurePass123!',
    firstName: 'Jane',
    lastName: 'Doe',
  };

  it('accepts a valid registration payload', () => {
    const result = registerSchema.safeParse({ body: validBody });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email address', () => {
    const result = registerSchema.safeParse({ body: { ...validBody, email: 'not-an-email' } });
    expect(result.success).toBe(false);
  });

  it('rejects a password shorter than the minimum length', () => {
    const result = registerSchema.safeParse({ body: { ...validBody, password: '123' } });
    expect(result.success).toBe(false);
  });

  it('rejects a missing first name', () => {
    const { firstName, ...rest } = validBody;
    const result = registerSchema.safeParse({ body: rest });
    expect(result.success).toBe(false);
  });

  it('rejects a role outside the allowed enum', () => {
    const result = registerSchema.safeParse({ body: { ...validBody, role: 'SUPERUSER' } });
    expect(result.success).toBe(false);
  });

  it('accepts an omitted (optional) role', () => {
    const result = registerSchema.safeParse({ body: validBody });
    expect(result.success).toBe(true);
  });
});

describe('loginSchema', () => {
  it('accepts a valid login payload', () => {
    const result = loginSchema.safeParse({ body: { email: 'user@example.com', password: 'anything' } });
    expect(result.success).toBe(true);
  });

  it('rejects an empty password', () => {
    const result = loginSchema.safeParse({ body: { email: 'user@example.com', password: '' } });
    expect(result.success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  it('accepts a valid reset payload', () => {
    const result = resetPasswordSchema.safeParse({ body: { token: 'abc123', password: 'NewPassword123!' } });
    expect(result.success).toBe(true);
  });

  it('rejects a missing token', () => {
    const result = resetPasswordSchema.safeParse({ body: { token: '', password: 'NewPassword123!' } });
    expect(result.success).toBe(false);
  });
});

describe('verifyEmailSchema', () => {
  it('accepts a 6-digit OTP', () => {
    const result = verifyEmailSchema.safeParse({ body: { email: 'user@example.com', otp: '123456' } });
    expect(result.success).toBe(true);
  });

  it('rejects an OTP that is not exactly 6 digits', () => {
    const result = verifyEmailSchema.safeParse({ body: { email: 'user@example.com', otp: '123' } });
    expect(result.success).toBe(false);
  });
});
