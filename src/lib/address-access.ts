/**
 * Access to the address lookup (it costs money per search) is earned with a passed Turnstile check: the form asks for
 * one the first time someone types in the address box, and a short-lived signed cookie then lets the lookup answer.
 * A request with no cookie, an expired one or a forged one is refused. See /api/address/session.
 */
import type { AstroCookies } from 'astro';
import { hmac, safeEqual } from './members/crypto';
import { isProduction } from './signup';

const NAME = (production: boolean) => (production ? '__Host-rnc_addr' : 'rnc_addr');
export const ADDRESS_ACCESS_MINUTES = 30;

const sign = (expiresAt: number) => `${expiresAt}.${hmac('address-access', String(expiresAt))}`;

export function hasAddressAccess(cookies: AstroCookies, now = Date.now()): boolean {
  const v = cookies.get(NAME(isProduction()))?.value ?? '';
  const [exp, mac] = v.split('.');
  const expiresAt = Number(exp);
  if (!exp || !mac || !Number.isFinite(expiresAt) || expiresAt <= now) return false;
  return safeEqual(v, sign(expiresAt));
}

export function grantAddressAccess(cookies: AstroCookies, now = Date.now()): void {
  cookies.set(NAME(isProduction()), sign(now + ADDRESS_ACCESS_MINUTES * 60_000), {
    path: '/',
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    maxAge: ADDRESS_ACCESS_MINUTES * 60,
  });
}
