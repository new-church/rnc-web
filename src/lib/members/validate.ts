import { isCountry, phoneForPlanningCenter } from '../phone';
import type { Address, DetailsInput } from './people';

const trim = (v: FormDataEntryValue | null | undefined, max: number) => String(v ?? '').trim().slice(0, max);

export const isEmail = (s: string) => /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/.test(s) && s.length <= 200;

/** True only when the person typed "yes" (any case, spaces ignored) into a confirmation box. */
export const typedYes = (v: FormDataEntryValue | null | undefined) => String(v ?? '').trim().toLowerCase() === 'yes';

export const normaliseEmail = (s: string) => s.trim().toLowerCase();

/** A plausible past date as YYYY-MM-DD, or null. */
export function parseBirthdate(s: string, now = new Date()): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return null;
  if (+m[1] < 1900 || d.getTime() > now.getTime()) return null;
  return s;
}

export type ExtraResult = { ok: true; value: DetailsInput } | { ok: false; error: string };

/**
 * Reads the optional "more details" fields shared by the signup form and the details page.
 * Everything is optional; a field that is filled in must be valid, and an address must be complete.
 */
export function parseExtra(form: FormData): ExtraResult {
  const out: DetailsInput = {};
  const birthdate = trim(form.get('birthdate'), 10);
  if (birthdate) {
    const b = parseBirthdate(birthdate);
    if (!b) return { ok: false, error: 'Please check the date of birth.' };
    out.birthdate = b;
  }

  const phone = trim(form.get('phone'), 30);
  if (phone) {
    const p = phoneForPlanningCenter(trim(form.get('phoneCountry'), 2).toUpperCase(), phone);
    if (!p.ok) return { ok: false, error: 'Please check the phone number and its country.' };
    out.phone = p.number;
  }

  const address: Address = {
    street1: trim(form.get('street1'), 100),
    street2: trim(form.get('street2'), 100),
    city: trim(form.get('city'), 60),
    state: trim(form.get('state'), 40),
    zip: trim(form.get('zip'), 12),
    country: trim(form.get('country'), 2).toUpperCase() || 'AU',
  };
  const anyAddress = [address.street1, address.street2, address.city, address.state, address.zip].some(Boolean);
  if (anyAddress) {
    if (!address.street1 || !address.city || !address.zip) return { ok: false, error: 'Please give the street, suburb or town, and postcode for your address.' };
    if (!isCountry(address.country)) return { ok: false, error: 'Please check the country.' };
    if (address.country === 'AU' && !/^\d{4}$/.test(address.zip)) return { ok: false, error: 'Please check the postcode.' };
    out.address = address;
  }
  return { ok: true, value: out };
}
