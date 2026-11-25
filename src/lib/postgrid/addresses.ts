/**
 * Address search-as-you-type through PostGrid's international address verification ("completions"). It needs its own
 * key, POSTGRID_API_KEY (the Print & Mail key used by the sync can't do this). Without a key the form simply has no
 * search box and the person types the address in. Outside production with no key, a few fake suggestions are used so
 * the form can be tried locally.
 */
import { env } from '../env';
import { isProduction } from '../signup';
import { countryIso } from '../phone';

const BASE = 'https://api.postgrid.com/v1/intl_addver';

export const postgridAddressKey = () => env('POSTGRID_API_KEY');
/** Whether the form should show the address search box. */
export const addressLookupAvailable = () => Boolean(postgridAddressKey()) || !isProduction();

export type Preview = { id: string; type: string; text: string; description?: string };
export type ResolvedAddress = {
  line1: string;
  line2: string | null;
  line3: string | null;
  line4: string | null;
  city: string | null;
  provinceOrState: string | null;
  postalOrZip: string | null;
  country: string | null;
};
export type FormAddress = { street1: string; street2: string; city: string; state: string; zip: string; country: string };

/** PostGrid's resolved address as the form's fields (country as a two-letter code). */
export function formAddress(a: ResolvedAddress): FormAddress {
  return {
    street1: a.line1 ?? '',
    street2: [a.line2, a.line3, a.line4].filter(Boolean).join(', '),
    city: a.city ?? '',
    state: a.provinceOrState ?? '',
    zip: a.postalOrZip ?? '',
    country: countryIso(a.country ?? '') || 'AU',
  };
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const key = postgridAddressKey();
  if (!key) throw new Error('POSTGRID_API_KEY is not set');
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-API-Key': key } });
  const body = (await res.json()) as { status?: string; message?: string; data: T };
  if (!res.ok || body.status === 'error') throw new Error(body.message || `PostGrid ${res.status}`);
  return body.data;
}

const DEV_PREVIEWS: Preview[] = [
  { id: 'dev-address', type: 'Address', text: '70 Chandos St', description: 'St Leonards NSW 2065' },
  { id: 'dev-unit', type: 'Address', text: '4 Shirley Rd', description: 'Roseville NSW 2069' },
];
const DEV_ADDRESSES: Record<string, ResolvedAddress> = {
  'dev-address': { line1: '70 Chandos St', line2: null, line3: null, line4: null, city: 'St Leonards', provinceOrState: 'NSW', postalOrZip: '2065', country: 'AU' },
  'dev-unit': { line1: '4 Shirley Rd', line2: null, line3: null, line4: null, city: 'Roseville', provinceOrState: 'NSW', postalOrZip: '2069', country: 'AU' },
};

export async function suggest(opts: { q?: string; container?: string; countries?: string }): Promise<Preview[]> {
  if (!postgridAddressKey()) return opts.q && opts.q.length >= 3 ? DEV_PREVIEWS : [];
  const p = new URLSearchParams({ properCase: 'true', limit: '8' });
  if (opts.q) p.set('partialStreet', opts.q);
  if (opts.container) {
    p.set('container', opts.container);
    p.set('advanced', 'true');
  }
  if (opts.countries) p.set('countriesFilter', opts.countries);
  const data = await call<Preview[]>(`/completions?${p}`);
  return Array.isArray(data) ? data : [];
}

export async function resolve(id: string): Promise<FormAddress> {
  if (!postgridAddressKey()) {
    const a = DEV_ADDRESSES[id];
    if (!a) throw new Error('Unknown address');
    return formAddress(a);
  }
  return formAddress(await call<ResolvedAddress>('/completions?properCase=true', { method: 'POST', body: JSON.stringify({ id }) }));
}
