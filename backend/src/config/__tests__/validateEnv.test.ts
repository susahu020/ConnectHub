import { validateStartupSecrets } from '../validateEnv';

describe('validateStartupSecrets', () => {
  const strongSecretA = 'a'.repeat(48);
  const strongSecretB = 'b'.repeat(48);

  let originalEnv: NodeJS.ProcessEnv;
  let exitSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    originalEnv = { ...process.env };
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code}) called`);
    }) as any);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('passes silently with two distinct, sufficiently long secrets', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_ACCESS_SECRET = strongSecretA;
    process.env.JWT_REFRESH_SECRET = strongSecretB;

    expect(() => validateStartupSecrets()).not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('refuses to start in production with the known .env.example placeholder secrets', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_ACCESS_SECRET = 'default-local-jwt-access-secret-123456';
    process.env.JWT_REFRESH_SECRET = 'default-local-jwt-refresh-secret-123456';

    expect(() => validateStartupSecrets()).toThrow('process.exit(1) called');
    expect(errorSpy).toHaveBeenCalled();
  });

  it('refuses to start in production when a secret is missing', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_ACCESS_SECRET = strongSecretA;
    delete process.env.JWT_REFRESH_SECRET;

    expect(() => validateStartupSecrets()).toThrow('process.exit(1) called');
  });

  it('refuses to start in production when a secret is too short', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_ACCESS_SECRET = 'short';
    process.env.JWT_REFRESH_SECRET = strongSecretB;

    expect(() => validateStartupSecrets()).toThrow('process.exit(1) called');
  });

  it('refuses to start in production when access and refresh secrets are identical', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_ACCESS_SECRET = strongSecretA;
    process.env.JWT_REFRESH_SECRET = strongSecretA;

    expect(() => validateStartupSecrets()).toThrow('process.exit(1) called');
  });

  it('only warns (does not exit) in development with weak secrets', () => {
    process.env.NODE_ENV = 'development';
    process.env.JWT_ACCESS_SECRET = 'default-local-jwt-access-secret-123456';
    process.env.JWT_REFRESH_SECRET = 'default-local-jwt-refresh-secret-123456';

    expect(() => validateStartupSecrets()).not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });
});
