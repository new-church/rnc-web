/**
 * Phone numbers for Planning Center.
 *
 * Planning Center refuses a separate country code ("country_code cannot be assigned"): it works the country out from the
 * number itself. So we write a national number for Australian numbers (as the existing records are stored, e.g.
 * "0410 527 179") and a full international number ("+64 21 123 4567") for everywhere else, and Planning Center fills in
 * the country, e164 and national forms. The country dropdown on the form only tells us how to read what was typed.
 */
import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

export const HOME_COUNTRY = 'AU';
/** Pinned to the top of the country menus; the rest follow alphabetically. */
export const PRIORITY_COUNTRIES = ['AU', 'NZ', 'GB', 'US', 'CA'] as const;

export type CountryOption = { iso: string; name: string; callingCode: string };

let cached: { priority: CountryOption[]; rest: CountryOption[] } | undefined;

export function countryOptions(): { priority: CountryOption[]; rest: CountryOption[] } {
  if (cached) return cached;
  const names = new Intl.DisplayNames(['en-AU'], { type: 'region' });
  const all: CountryOption[] = getCountries().flatMap((iso) => {
    const name = names.of(iso);
    return name && name !== iso ? [{ iso, name, callingCode: `+${getCountryCallingCode(iso)}` }] : [];
  });
  all.sort((a, b) => a.name.localeCompare(b.name, 'en'));
  const byIso = new Map(all.map((c) => [c.iso, c]));
  const pinned = new Set<string>(PRIORITY_COUNTRIES);
  cached = {
    priority: PRIORITY_COUNTRIES.flatMap((iso) => (byIso.has(iso) ? [byIso.get(iso)!] : [])),
    rest: all.filter((c) => !pinned.has(c.iso)),
  };
  return cached;
}

export const isCountry = (iso: string) => (getCountries() as string[]).includes(iso);

/** ISO code for a country given as a code or an English name ("Australia"), or '' if unknown. */
export function countryIso(value: string): string {
  const v = value.trim();
  if (/^[A-Za-z]{2}$/.test(v)) return v.toUpperCase();
  const lower = v.toLowerCase();
  const all = [...countryOptions().priority, ...countryOptions().rest];
  return all.find((c) => c.name.toLowerCase() === lower)?.iso ?? '';
}

export type PhoneResult = { ok: true; number: string; e164: string } | { ok: false };

/**
 * Reads what the person typed with the selected country, and returns the text to write to Planning Center.
 * A number typed with "+" or "00" is taken as international whatever the dropdown says.
 */
export function phoneForPlanningCenter(country: string, input: string): PhoneResult {
  const text = input.trim().replace(/^00/, '+');
  if (!text) return { ok: false };
  const parsed = parsePhoneNumberFromString(text, (isCountry(country) ? country : HOME_COUNTRY) as CountryCode);
  if (!parsed || !parsed.isValid()) return { ok: false };
  const number = parsed.country === HOME_COUNTRY ? parsed.formatNational() : parsed.formatInternational();
  return { ok: true, number, e164: parsed.number };
}

/** E.164 form of a stored number, for comparing without caring how it is spaced. */
export function e164Of(number: string, defaultCountry: string = HOME_COUNTRY): string {
  return parsePhoneNumberFromString(number, (isCountry(defaultCountry) ? defaultCountry : HOME_COUNTRY) as CountryCode)?.number ?? number.replace(/\D/g, '');
}

/** What the form shows for a Planning Center phone number: its country and the number in national form. */
export function splitPhone(a: { number?: string | null; e164?: string | null; national?: string | null; country_code?: string | null }): { country: string; national: string } {
  const country = a.country_code && isCountry(a.country_code) ? a.country_code : HOME_COUNTRY;
  return { country, national: (a.national || a.number || '').trim() };
}

/** The country a number belongs to ('' if it can't be told), for showing the right dropdown value. */
export function countryOfNumber(number: string, defaultCountry: string = HOME_COUNTRY): string {
  return parsePhoneNumberFromString(number, (isCountry(defaultCountry) ? defaultCountry : HOME_COUNTRY) as CountryCode)?.country ?? '';
}
