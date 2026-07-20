import crypto from 'crypto';

const isProduction = process.env.NODE_ENV === 'production';

function resolveSecret(envVar: string): string {
  const value = process.env[envVar];
  if (value && value.trim().length > 0) return value;

  if (isProduction) {
    throw new Error(`FATAL: ${envVar} is not set. Refusing to start in production.`);
  }
  return crypto.randomBytes(48).toString('hex');
}

export const JWT_ACCESS_SECRET = resolveSecret('JWT_ACCESS_SECRET');
export const JWT_REFRESH_SECRET = resolveSecret('JWT_REFRESH_SECRET');
export const IS_PRODUCTION = isProduction;

const resolvedSmtpPort = parseInt(process.env.SMTP_PORT || '465', 10);

// Unified SMTP variables (cleanly stripped of dashboard space bugs)
export const SMTP_CONFIG = {
  host: (process.env.SMTP_HOST || 'smtp.gmail.com').trim(),
  port: resolvedSmtpPort,
  secure: resolvedSmtpPort === 465,
  user: (process.env.SMTP_USER || '').trim(),
  pass: (process.env.SMTP_PASS || '').trim(),
  from: process.env.SMTP_FROM || `"ConnectHub" <${process.env.SMTP_USER}>`,
};