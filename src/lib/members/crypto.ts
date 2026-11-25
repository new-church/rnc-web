import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { env } from '../env';
import { isLive } from '../signup';

/** Server secret for hashing codes and tokens: the existing SIGNUP_SECRET. */
function secret(): string {
  const k = env('SIGNUP_SECRET');
  if (k) return k;
  if (isLive()) throw new Error('Missing SIGNUP_SECRET');
  return 'dev-only-members-secret';
}

export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');
export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
/** Keyed hash, so a leaked table can't be used to guess codes or secrets. */
export const hmac = (purpose: string, data: string) => createHmac('sha256', secret()).update(`${purpose}:${data}`).digest('hex');
export const sixDigitCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Short hash of an IP address for logs and counters (never the address itself). */
export const ipHash = (ip: string | undefined) => (ip ? hmac('ip', ip).slice(0, 16) : 'unknown');
