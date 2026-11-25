/**
 * Address search-as-you-type through Google Places (Places API (New)), called from our server so the key stays secret.
 * Needs GOOGLE_PLACES_API_KEY (a Google Cloud key restricted to "Places API (New)"). Without a key the form simply has
 * no search box and the person types the address in. Outside production with no key, two fake suggestions are used so
 * the form can be tried locally.
 *
 * A search "session" (a random id the browser makes when someone starts typing) is sent with every request, so Google
 * bills a whole search plus the final pick as one session.
 */
import { env } from './env';
import { isProduction } from './signup';

const API = 'https://places.googleapis.com/v1';

export const placesKey = () => env('GOOGLE_PLACES_API_KEY');
/** Whether the form should show the address search box. */
export const addressLookupAvailable = () => Boolean(placesKey()) || !isProduction();

export type Preview = { id: string; type: string; text: string; description?: string };
export type FormAddress = { street1: string; street2: string; city: string; state: string; zip: string; country: string };
type Component = { longText?: string; shortText?: string; types?: string[] };

/** Google's address components as the form's fields (state and country as short codes, e.g. NSW and AU). */
export function addressFromComponents(components: Component[]): FormAddress {
  const find = (type: string) => components.find((c) => c.types?.includes(type));
  const long = (type: string) => find(type)?.longText?.trim() ?? '';
  const short = (type: string) => find(type)?.shortText?.trim() ?? '';

  const unit = long('subpremise');
  const number = long('street_number');
  const road = short('route') || long('route'); // "Chandos St", as the existing records write it
  const street = [number, road].filter(Boolean).join(' ');
  return {
    street1: unit ? `${unit}${street ? '/' : ''}${street}` : street || long('premise'),
    street2: '',
    city: long('locality') || long('postal_town') || long('sublocality_level_1') || long('administrative_area_level_2'),
    state: short('administrative_area_level_1'),
    zip: long('postal_code'),
    country: short('country') || 'AU',
  };
}

async function google<T>(path: string, init: RequestInit & { mask?: string }): Promise<T> {
  const key = placesKey();
  if (!key) throw new Error('GOOGLE_PLACES_API_KEY is not set');
  const { mask, ...rest } = init;
  const res = await fetch(`${API}${path}`, {
    ...rest,
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, ...(mask ? { 'X-Goog-FieldMask': mask } : {}) },
  });
  const body = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(body.error?.message ?? `Google Places ${res.status}`);
  return body;
}

const DEV_PREVIEWS: Preview[] = [
  { id: 'dev-address', type: 'Address', text: '70 Chandos St', description: 'St Leonards NSW, Australia' },
  { id: 'dev-unit', type: 'Address', text: '4 Shirley Rd', description: 'Roseville NSW, Australia' },
];
const DEV_ADDRESSES: Record<string, FormAddress> = {
  'dev-address': { street1: '70 Chandos St', street2: '', city: 'St Leonards', state: 'NSW', zip: '2065', country: 'AU' },
  'dev-unit': { street1: '4 Shirley Rd', street2: '', city: 'Roseville', state: 'NSW', zip: '2069', country: 'AU' },
};

export async function suggest(opts: { q: string; session?: string }): Promise<Preview[]> {
  if (!placesKey()) return opts.q.length >= 3 ? DEV_PREVIEWS : [];
  const data = await google<{ suggestions?: { placePrediction?: { placeId: string; text?: { text: string }; structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } } } }[] }>('/places:autocomplete', {
    method: 'POST',
    body: JSON.stringify({
      input: opts.q,
      regionCode: 'au', // ranks Australian results first; addresses elsewhere still come up
      includedPrimaryTypes: ['street_address', 'premise', 'subpremise'],
      languageCode: 'en-AU',
      ...(opts.session ? { sessionToken: opts.session } : {}),
    }),
  });
  return (data.suggestions ?? []).flatMap((s) => {
    const p = s.placePrediction;
    if (!p) return [];
    return [{ id: p.placeId, type: 'Address', text: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '', description: p.structuredFormat?.secondaryText?.text }];
  });
}

export async function resolve(id: string, session?: string): Promise<FormAddress> {
  if (!placesKey()) {
    const a = DEV_ADDRESSES[id];
    if (!a) throw new Error('Unknown address');
    return a;
  }
  if (!/^[A-Za-z0-9_-]{10,300}$/.test(id)) throw new Error('Bad place id');
  const q = session ? `?sessionToken=${encodeURIComponent(session)}` : '';
  const data = await google<{ addressComponents?: Component[] }>(`/places/${id}${q}`, { method: 'GET', mask: 'addressComponents' });
  return addressFromComponents(data.addressComponents ?? []);
}
