import crypto from 'crypto';

/**
 * Decode a base32 string into a standard Buffer.
 */
function decodeBase32(base32: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = base32.toUpperCase().replace(/=+$/, '');
  let bits = '';
  for (let i = 0; i < clean.length; i++) {
    const val = alphabet.indexOf(clean[i]);
    if (val === -1) {
      throw new Error('Invalid base32 character');
    }
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

/**
 * Generate a cryptographically secure random base32 secret.
 */
export function generateSecret(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes = crypto.randomBytes(16);
  let secret = '';
  for (let i = 0; i < bytes.length; i++) {
    secret += alphabet[bytes[i] % alphabet.length];
  }
  return secret;
}

/**
 * Compute the 6-digit TOTP code for a given base32 secret and timestamp.
 */
export function generateTOTP(secret: string, time: number = Date.now()): string {
  const counter = Math.floor(time / 1000 / 30);
  const key = decodeBase32(secret);

  // Write counter as an 8-byte big-endian buffer
  const counterBuf = Buffer.alloc(8);
  let tmp = counter;
  for (let i = 7; i >= 0; i--) {
    counterBuf[i] = tmp & 0xff;
    tmp = tmp >> 8;
  }

  const hmac = crypto.createHmac('sha1', key);
  hmac.update(counterBuf);
  const digest = hmac.digest();

  // Dynamic truncation
  const offset = digest[digest.length - 1] & 0xf;
  const binary = ((digest[offset] & 0x7f) << 24) |
                 ((digest[offset + 1] & 0xff) << 16) |
                 ((digest[offset + 2] & 0xff) << 8) |
                 (digest[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Verify if a code is correct within a +/- 1 step tolerance window.
 */
export function verifyTOTP(token: string, secret: string): boolean {
  const time = Date.now();
  // Check previous, current, and next 30-second steps
  for (let offset = -1; offset <= 1; offset++) {
    const stepTime = time + (offset * 30 * 1000);
    if (generateTOTP(secret, stepTime) === token) {
      return true;
    }
  }
  return false;
}

/**
 * Generate 8-digit numeric backup recovery codes.
 */
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomInt(10000000, 99999999).toString();
    codes.push(code);
  }
  return codes;
}
