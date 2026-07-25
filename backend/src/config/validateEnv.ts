// Validates critical environment variables at startup, before the server
// accepts any traffic. This exists specifically to catch the case where a
// deployment goes live still using the placeholder secrets shipped in
// .env.example — a placeholder JWT secret means anyone who has seen this
// codebase (a public template, a shared repo, etc.) can forge a valid auth
// token for any user, including an admin.
//
// In production this is a hard stop (the process refuses to boot). In
// development it's a loud warning only, so local setup isn't blocked.

const KNOWN_PLACEHOLDER_VALUES = new Set([
  'default-local-jwt-access-secret-123456',
  'default-local-jwt-refresh-secret-123456',
  'changeme',
  'secret',
  'your-secret-here',
]);

const MIN_SECRET_LENGTH = 32;

interface SecretCheck {
  envVar: string;
  value: string | undefined;
}

const isWeakSecret = (value: string | undefined): string | null => {
  if (!value) return 'is not set';
  if (KNOWN_PLACEHOLDER_VALUES.has(value)) return 'is still the default placeholder value from .env.example';
  if (value.length < MIN_SECRET_LENGTH) return `is too short (${value.length} chars, need at least ${MIN_SECRET_LENGTH})`;
  return null;
};

export const validateStartupSecrets = (): void => {
  const isProduction = process.env.NODE_ENV === 'production';

  const checks: SecretCheck[] = [
    { envVar: 'JWT_ACCESS_SECRET', value: process.env.JWT_ACCESS_SECRET },
    { envVar: 'JWT_REFRESH_SECRET', value: process.env.JWT_REFRESH_SECRET },
  ];

  const problems: string[] = [];

  for (const { envVar, value } of checks) {
    const problem = isWeakSecret(value);
    if (problem) {
      problems.push(`  - ${envVar} ${problem}`);
    }
  }

  // The two JWT secrets must also be different from each other — reusing
  // one secret for both access and refresh tokens weakens the security
  // boundary between them.
  if (
    process.env.JWT_ACCESS_SECRET &&
    process.env.JWT_REFRESH_SECRET &&
    process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET
  ) {
    problems.push('  - JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must not be the same value');
  }

  if (problems.length === 0) return;

  const message = [
    '',
    '🔴 STARTUP SECURITY CHECK FAILED',
    '',
    'The following environment variables are missing, default, or too weak to use safely:',
    ...problems,
    '',
    'Generate strong random values, e.g.:',
    '  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"',
    '',
  ].join('\n');

  if (isProduction) {
    console.error(message);
    console.error('Refusing to start in production with insecure secrets. Set NODE_ENV=development to bypass locally.\n');
    process.exit(1);
  } else {
    console.warn(message);
    console.warn('Continuing to start in development mode — but this MUST be fixed before deploying to production.\n');
  }
};
