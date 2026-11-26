/**
 * Planning Center People access for the member pages. Planning Center is the master record: nothing here is cached
 * beyond field definition ids, and the person id always comes from a verified session.
 *
 * Outside a live environment (see isLive) an in-memory demo person is used, so nothing real is read or written.
 */
import { Pco, type J } from '../sync/pco';
import { sydneyDate } from '../sync/util';
import { isLive } from '../signup';
import { countryOfNumber, e164Of, splitPhone } from '../phone';
import { signupConfig } from '../signup/config';
import { memberConfig } from './config';
import { birthYearKnown } from './validate';

export type Address = { street1: string; street2: string; city: string; state: string; zip: string; country: string };
export type DetailsInput = {
  firstName?: string;
  lastName?: string;
  /** YYYY-MM-DD */
  birthdate?: string;
  phone?: string;
  address?: Partial<Address>;
};
export type PersonSummary = { id: string; firstName: string; lastName: string; status: string; membership: string | null };
export type PersonDetails = PersonSummary & {
  birthdate: string;
  emails: { address: string; primary: boolean }[];
  /** In national form, e.g. "0410 527 179" */
  phone: string;
  /** ISO country of the phone number, for the form's dropdown */
  phoneCountry: string;
  address: Address | null;
  /** Ticked "Communication preferences" option names */
  lists: string[];
  unsubscribed: boolean;
};
export type SubscribeInput = { email: string; first: string; last: string; lists: string[]; extra: DetailsInput };
export type SubscribeResult = { personId: string; created: boolean; resubscribed: boolean; inactive: boolean };
export type RollBook = Partial<Record<keyof typeof memberConfig.rollBookFields, string>>;

export interface PeopleApi {
  findByEmail(email: string): Promise<PersonSummary[]>;
  get(id: string): Promise<PersonDetails | null>;
  /** Writes the changed fields only; returns the names of the fields that changed. */
  updateDetails(id: string, input: DetailsInput): Promise<string[]>;
  /** Fills fields that are blank on the record and never overwrites a value. Returns what it filled. */
  fillBlanks(id: string, input: DetailsInput): Promise<string[]>;
  /** Makes the person's ticked options exactly `selected` within the `managed` set. */
  setLists(id: string, selected: string[], managed: string[]): Promise<string[]>;
  setUnsubscribed(id: string, unsubscribed: boolean): Promise<void>;
  /** Removes the "Unsubscribed on" date (once a resubscribe has been passed to Mailchimp, the date has done its job). */
  clearUnsubscribedOn(id: string): Promise<void>;
  /** Sets the person inactive (Planning Center's own deactivate) and unsubscribes them. */
  deactivate(id: string): Promise<void>;
  setMembership(id: string, type: string): Promise<void>;
  /** Writes the Roll Book custom fields that exist; returns the names written and the ones that don't exist yet. */
  setRollBook(id: string, values: RollBook): Promise<{ written: string[]; missing: string[] }>;
  addNote(id: string, text: string): Promise<void>;
  subscribe(input: SubscribeInput): Promise<SubscribeResult>;
}

const lc = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();
const same = (a: string | null | undefined, b: string | null | undefined) => (a ?? '').trim() === (b ?? '').trim();

/** Friend type for a new signup: Centre-only subscribers are Swedenborg Centre Friends, everyone else Society Friends. */
export function friendTypeFor(listIds: string[]): string {
  return listIds.length > 0 && listIds.every((l) => l === 'centre') ? memberConfig.membership.centre : memberConfig.membership.society;
}

const optionsFor = (listIds: string[]) => signupConfig.lists.filter((l) => listIds.includes(l.id)).map((l) => l.option);

// ---- live ------------------------------------------------------------------------------------------

const summary = (p: J): PersonSummary => ({
  id: String(p.id),
  firstName: (p.attributes.first_name ?? '').trim(),
  lastName: (p.attributes.last_name ?? '').trim(),
  status: p.attributes.status ?? '',
  membership: p.attributes.membership || null,
});

const notFound = (e: unknown) => e instanceof Error && e.message.includes('-> 404');
const person = (id: string, attributes: object) => ({ data: { type: 'Person', id, attributes } });

export class LivePeople implements PeopleApi {
  private defs?: Map<string, string>;
  private noteCategoryId?: string;

  constructor(private pco: Pco) {}

  private async fieldId(name: string): Promise<string | undefined> {
    if (!this.defs) {
      const defs = await this.pco.all('/field_definitions');
      this.defs = new Map(defs.map((d: J) => [d.attributes.name as string, String(d.id)]));
    }
    return this.defs.get(name);
  }

  private async requireFieldId(name: string): Promise<string> {
    const id = await this.fieldId(name);
    if (!id) throw new Error(`Planning Center field "${name}" not found`);
    return id;
  }

  private async fieldRows(id: string, fieldId: string): Promise<J[]> {
    const rows = await this.pco.all(`/people/${id}/field_data`);
    return rows.filter((r: J) => r.relationships?.field_definition?.data?.id === fieldId);
  }

  private datum(fieldId: string, value: string) {
    return {
      data: { type: 'FieldDatum', attributes: { value }, relationships: { field_definition: { data: { type: 'FieldDefinition', id: fieldId } } } },
    };
  }

  async findByEmail(email: string): Promise<PersonSummary[]> {
    const found = await this.pco.request('GET', '/emails', undefined, { 'where[address]': email, per_page: 25 });
    const ids = [...new Set<string>((found.data as J[]).map((e) => e.relationships?.person?.data?.id).filter(Boolean))].slice(0, 10);
    const out: PersonSummary[] = [];
    for (const id of ids) {
      try {
        out.push(summary((await this.pco.request('GET', `/people/${id}`)).data));
      } catch (e) {
        if (!notFound(e)) throw e;
      }
    }
    return out;
  }

  async get(id: string): Promise<PersonDetails | null> {
    let r: J;
    try {
      r = await this.pco.request('GET', `/people/${id}`, undefined, { include: 'emails,addresses,phone_numbers,field_data' });
    } catch (e) {
      if (notFound(e)) return null;
      throw e;
    }
    const a = r.data.attributes;
    const prefsId = await this.fieldId('Communication preferences');
    const unsubId = await this.fieldId('Unsubscribed');
    const d: PersonDetails = {
      ...summary(r.data),
      birthdate: a.birthdate ?? '',
      emails: [],
      phone: '',
      phoneCountry: 'AU',
      address: null,
      lists: [],
      unsubscribed: false,
    };
    let phonePrimary = false;
    let addressPrimary = false;
    for (const inc of (r.included ?? []) as J[]) {
      const x = inc.attributes;
      if (inc.type === 'Email') d.emails.push({ address: (x.address ?? '').trim(), primary: Boolean(x.primary) });
      else if (inc.type === 'PhoneNumber' && (!d.phone || (x.primary && !phonePrimary))) {
        const sp = splitPhone(x);
        d.phone = sp.national;
        d.phoneCountry = sp.country;
        phonePrimary = Boolean(x.primary);
      } else if (inc.type === 'Address' && (!d.address || (x.primary && !addressPrimary))) {
        d.address = {
          street1: x.street_line_1 ?? '',
          street2: x.street_line_2 ?? '',
          city: x.city ?? '',
          state: x.state ?? '',
          zip: x.zip ?? '',
          country: x.country_code ?? '',
        };
        addressPrimary = Boolean(x.primary);
      } else if (inc.type === 'FieldDatum') {
        const fd = inc.relationships?.field_definition?.data?.id;
        if (prefsId && fd === prefsId && x.value) d.lists.push(String(x.value));
        if (unsubId && fd === unsubId) d.unsubscribed = true;
      }
    }
    return d;
  }

  async updateDetails(id: string, input: DetailsInput): Promise<string[]> {
    const cur = await this.get(id);
    if (!cur) throw new Error(`Planning Center person ${id} not found`);
    const changed: string[] = [];

    const attrs: Record<string, string> = {};
    if (input.firstName !== undefined && input.firstName.trim() && !same(input.firstName, cur.firstName)) {
      attrs.first_name = input.firstName.trim();
      changed.push('first name');
    }
    if (input.lastName !== undefined && input.lastName.trim() && !same(input.lastName, cur.lastName)) {
      attrs.last_name = input.lastName.trim();
      changed.push('last name');
    }
    if (input.birthdate && !same(input.birthdate, cur.birthdate)) {
      attrs.birthdate = input.birthdate;
      changed.push('birthday');
    }
    if (Object.keys(attrs).length) await this.pco.request('PATCH', `/people/${id}`, person(id, attrs));

    if (input.phone && input.phone.trim() && e164Of(input.phone, cur.phoneCountry) !== e164Of(cur.phone, cur.phoneCountry)) {
      const phones = await this.pco.all(`/people/${id}/phone_numbers`);
      const target = phones.find((p: J) => p.attributes.primary) ?? phones[0];
      if (target) {
        await this.pco.request('PATCH', `/people/${id}/phone_numbers/${target.id}`, {
          data: { type: 'PhoneNumber', attributes: { number: input.phone.trim() } },
        });
      } else {
        await this.pco.request('POST', `/people/${id}/phone_numbers`, {
          data: { type: 'PhoneNumber', attributes: { number: input.phone.trim(), location: 'Mobile', primary: true } },
        });
      }
      changed.push('phone');
    }

    const addr = input.address;
    if (addr && Object.values(addr).some((v) => (v ?? '').trim())) {
      const next: Address = { ...(cur.address ?? { street1: '', street2: '', city: '', state: '', zip: '', country: '' }) };
      for (const k of Object.keys(next) as (keyof Address)[]) if (addr[k] !== undefined) next[k] = (addr[k] ?? '').trim();
      const unchanged = cur.address && (Object.keys(next) as (keyof Address)[]).every((k) => same(next[k], cur.address![k]));
      if (!unchanged) {
        const attributes = {
          street_line_1: next.street1,
          street_line_2: next.street2,
          city: next.city,
          state: next.state,
          zip: next.zip,
          country_code: next.country,
        };
        const addresses = await this.pco.all(`/people/${id}/addresses`);
        const target = addresses.find((p: J) => p.attributes.primary) ?? addresses[0];
        if (target) {
          await this.pco.request('PATCH', `/people/${id}/addresses/${target.id}`, { data: { type: 'Address', attributes } });
        } else {
          await this.pco.request('POST', `/people/${id}/addresses`, {
            data: { type: 'Address', attributes: { ...attributes, location: 'Home', primary: true } },
          });
        }
        changed.push('address');
      }
    }
    return changed;
  }

  async fillBlanks(id: string, input: DetailsInput): Promise<string[]> {
    const cur = await this.get(id);
    if (!cur) return [];
    const fill: DetailsInput = {};
    if (!birthYearKnown(cur.birthdate) && input.birthdate) fill.birthdate = input.birthdate;
    if (!cur.phone && input.phone) fill.phone = input.phone;
    if (!cur.address && input.address && Object.values(input.address).some(Boolean)) fill.address = input.address;
    return Object.keys(fill).length ? this.updateDetails(id, fill) : [];
  }

  async setLists(id: string, selected: string[], managed: string[]): Promise<string[]> {
    const prefsId = await this.requireFieldId('Communication preferences');
    const rows = await this.fieldRows(id, prefsId);
    const have = new Set(rows.map((r) => String(r.attributes.value)));
    const changes: string[] = [];
    for (const o of selected) {
      if (!have.has(o)) {
        await this.pco.request('POST', `/people/${id}/field_data`, this.datum(prefsId, o));
        changes.push(`+${o}`);
      }
    }
    for (const r of rows) {
      const v = String(r.attributes.value);
      if (managed.includes(v) && !selected.includes(v)) {
        await this.pco.request('DELETE', `/people/${id}/field_data/${r.id}`);
        changes.push(`-${v}`);
      }
    }
    return changes;
  }

  async setUnsubscribed(id: string, unsubscribed: boolean): Promise<void> {
    const unsubId = await this.requireFieldId('Unsubscribed');
    const rows = await this.fieldRows(id, unsubId);
    if (unsubscribed) {
      if (!rows.length) await this.pco.request('POST', `/people/${id}/field_data`, this.datum(unsubId, 'Unsubscribed'));
      // Always today's date: an old date left behind would make the sync mistake a fresh unsubscribe for a resubscribe.
      const onId = await this.fieldId('Unsubscribed on');
      if (onId) {
        for (const r of await this.fieldRows(id, onId)) await this.pco.request('DELETE', `/people/${id}/field_data/${r.id}`);
        await this.pco.request('POST', `/people/${id}/field_data`, this.datum(onId, sydneyDate(new Date())));
      }
    } else {
      // Clear only the flag. The date stays until the resubscribe has been passed to Mailchimp (finishResubscribe, or the
      // nightly sync for anyone who resubscribes by hand in Planning Center); the sync reads "flag cleared, date kept" as
      // a resubscribe request.
      for (const r of rows) await this.pco.request('DELETE', `/people/${id}/field_data/${r.id}`);
    }
  }

  async clearUnsubscribedOn(id: string): Promise<void> {
    const onId = await this.fieldId('Unsubscribed on');
    if (!onId) return;
    for (const r of await this.fieldRows(id, onId)) await this.pco.request('DELETE', `/people/${id}/field_data/${r.id}`);
  }

  async deactivate(id: string): Promise<void> {
    await this.pco.request('PATCH', `/people/${id}`, person(id, { status: 'inactive' }));
    await this.setUnsubscribed(id, true);
  }

  async setMembership(id: string, type: string): Promise<void> {
    await this.pco.request('PATCH', `/people/${id}`, person(id, { membership: type }));
  }

  async setRollBook(id: string, values: RollBook): Promise<{ written: string[]; missing: string[] }> {
    const written: string[] = [];
    const missing: string[] = [];
    for (const [k, value] of Object.entries(values) as [keyof typeof memberConfig.rollBookFields, string | undefined][]) {
      if (!value) continue;
      const name = memberConfig.rollBookFields[k];
      const fieldId = await this.fieldId(name);
      if (!fieldId) {
        missing.push(name);
        continue;
      }
      for (const r of await this.fieldRows(id, fieldId)) await this.pco.request('DELETE', `/people/${id}/field_data/${r.id}`);
      await this.pco.request('POST', `/people/${id}/field_data`, this.datum(fieldId, value));
      written.push(name);
    }
    return { written, missing };
  }

  async addNote(id: string, text: string): Promise<void> {
    if (!this.noteCategoryId) {
      const cats = await this.pco.all('/note_categories');
      const c = cats.find((x: J) => x.attributes.name === memberConfig.noteCategory);
      if (!c) throw new Error(`Planning Center note category "${memberConfig.noteCategory}" not found`);
      this.noteCategoryId = String(c.id);
    }
    await this.pco.request('POST', `/people/${id}/notes`, {
      data: { type: 'Note', attributes: { note: text, note_category_id: Number(this.noteCategoryId) } },
    });
  }

  async subscribe(s: SubscribeInput): Promise<SubscribeResult> {
    const options = optionsFor(s.lists);
    const found = await this.findByEmail(s.email);
    // With several people on one address (a shared email), prefer the one whose first name matches.
    let target = found[0];
    if (found.length > 1) target = found.find((p) => lc(p.firstName) === lc(s.first)) ?? found[0];

    if (target && target.status !== 'active') {
      // Someone who deactivated is not quietly brought back: staff reactivate them on request.
      return { personId: target.id, created: false, resubscribed: false, inactive: true };
    }

    let created = false;
    let personId = target?.id;
    if (!personId) {
      const r = await this.pco.request('POST', '/people', {
        data: { type: 'Person', attributes: { first_name: s.first, last_name: s.last, membership: friendTypeFor(s.lists) } },
      });
      personId = String(r.data.id);
      await this.pco.request('POST', `/people/${personId}/emails`, {
        data: { type: 'Email', attributes: { address: s.email, location: 'Home', primary: true } },
      });
      created = true;
    }

    const prefsId = await this.requireFieldId('Communication preferences');
    const have = new Set((created ? [] : await this.fieldRows(personId, prefsId)).map((r) => String(r.attributes.value)));
    for (const o of options) if (!have.has(o)) await this.pco.request('POST', `/people/${personId}/field_data`, this.datum(prefsId, o));

    // Clear only the Unsubscribed flag (keeping its date): fresh consent, and the daily sync turns it into a Mailchimp
    // resubscribe request.
    const unsubId = await this.fieldId('Unsubscribed');
    const flags = unsubId && !created ? await this.fieldRows(personId, unsubId) : [];
    for (const r of flags) await this.pco.request('DELETE', `/people/${personId}/field_data/${r.id}`);

    await this.fillBlanks(personId, s.extra);
    return { personId, created, resubscribed: flags.length > 0, inactive: false };
  }
}

// ---- demo (not live) ---------------------------------------------------------------------------------

type DemoPerson = PersonDetails & { notes: string[]; roll: RollBook };
const demo = new Map<string, DemoPerson>();
let demoSeq = 100;

function demoSeed(): void {
  if (demo.size) return;
  demo.set('1', {
    id: '1',
    firstName: 'Test',
    lastName: 'Person',
    status: 'active',
    membership: memberConfig.membership.society,
    birthdate: '',
    emails: [{ address: 'test@example.com', primary: true }],
    phone: '',
    phoneCountry: 'AU',
    address: null,
    lists: ['Society news'],
    unsubscribed: false,
    notes: [],
    roll: {},
  });
}

export class DemoPeople implements PeopleApi {
  constructor() {
    demoSeed();
  }
  private must(id: string): DemoPerson {
    const p = demo.get(id);
    if (!p) throw new Error(`demo person ${id} not found`);
    return p;
  }
  async findByEmail(email: string): Promise<PersonSummary[]> {
    return [...demo.values()].filter((p) => p.emails.some((e) => lc(e.address) === lc(email))).map(({ id, firstName, lastName, status, membership }) => ({ id, firstName, lastName, status, membership }));
  }
  async get(id: string): Promise<PersonDetails | null> {
    const p = demo.get(id);
    if (!p) return null;
    const { notes: _n, roll: _r, ...d } = p;
    return { ...d, lists: [...d.lists] };
  }
  async updateDetails(id: string, input: DetailsInput): Promise<string[]> {
    const p = this.must(id);
    const changed: string[] = [];
    if (input.firstName?.trim() && !same(input.firstName, p.firstName)) (p.firstName = input.firstName.trim()), changed.push('first name');
    if (input.lastName?.trim() && !same(input.lastName, p.lastName)) (p.lastName = input.lastName.trim()), changed.push('last name');
    if (input.birthdate && !same(input.birthdate, p.birthdate)) (p.birthdate = input.birthdate), changed.push('birthday');
    if (input.phone?.trim() && e164Of(input.phone, p.phoneCountry) !== e164Of(p.phone, p.phoneCountry)) {
      p.phoneCountry = countryOfNumber(input.phone, p.phoneCountry) || p.phoneCountry;
      p.phone = input.phone.trim();
      changed.push('phone');
    }
    if (input.address && Object.values(input.address).some((v) => (v ?? '').trim())) {
      const next = { street1: '', street2: '', city: '', state: '', zip: '', country: '', ...(p.address ?? {}), ...input.address } as Address;
      if (JSON.stringify(next) !== JSON.stringify(p.address)) (p.address = next), changed.push('address');
    }
    return changed;
  }
  async fillBlanks(id: string, input: DetailsInput): Promise<string[]> {
    const p = this.must(id);
    const fill: DetailsInput = {};
    if (!birthYearKnown(p.birthdate) && input.birthdate) fill.birthdate = input.birthdate;
    if (!p.phone && input.phone) fill.phone = input.phone;
    if (!p.address && input.address && Object.values(input.address).some(Boolean)) fill.address = input.address;
    return this.updateDetails(id, fill);
  }
  async setLists(id: string, selected: string[], managed: string[]): Promise<string[]> {
    const p = this.must(id);
    const before = new Set(p.lists);
    p.lists = [...new Set([...p.lists.filter((l) => !managed.includes(l)), ...selected])];
    return [...selected.filter((s) => !before.has(s)).map((s) => `+${s}`), ...[...before].filter((b) => managed.includes(b) && !selected.includes(b)).map((b) => `-${b}`)];
  }
  async setUnsubscribed(id: string, unsubscribed: boolean): Promise<void> {
    this.must(id).unsubscribed = unsubscribed;
  }
  async clearUnsubscribedOn(_id: string): Promise<void> {}
  async deactivate(id: string): Promise<void> {
    const p = this.must(id);
    p.status = 'inactive';
    p.unsubscribed = true;
  }
  async setMembership(id: string, type: string): Promise<void> {
    this.must(id).membership = type;
  }
  async setRollBook(id: string, values: RollBook): Promise<{ written: string[]; missing: string[] }> {
    Object.assign(this.must(id).roll, values);
    return { written: Object.keys(values).map((k) => memberConfig.rollBookFields[k as keyof RollBook & string]), missing: [] };
  }
  async addNote(id: string, text: string): Promise<void> {
    this.must(id).notes.push(text);
    console.log(`[members] (demo) note on ${id}: ${text}`);
  }
  async subscribe(s: SubscribeInput): Promise<SubscribeResult> {
    const found = await this.findByEmail(s.email);
    if (found[0] && found[0].status !== 'active') return { personId: found[0].id, created: false, resubscribed: false, inactive: true };
    let id = found[0]?.id;
    let created = false;
    if (!id) {
      id = String(++demoSeq);
      demo.set(id, {
        id, firstName: s.first, lastName: s.last, status: 'active', membership: friendTypeFor(s.lists), birthdate: '',
        emails: [{ address: s.email, primary: true }], phone: '', phoneCountry: 'AU', address: null, lists: [], unsubscribed: false, notes: [], roll: {},
      });
      created = true;
    }
    const p = this.must(id);
    p.lists = [...new Set([...p.lists, ...optionsFor(s.lists)])];
    const resubscribed = !created && p.unsubscribed;
    p.unsubscribed = false;
    await this.fillBlanks(id, s.extra);
    return { personId: id, created, resubscribed, inactive: false };
  }
}

/** Planning Center when live, an in-memory demo otherwise. */
export function peopleApi(): PeopleApi {
  if (!isLive()) return new DemoPeople();
  return new LivePeople(Pco.fromEnv());
}

/** Test helper: forget the demo data. */
export function resetDemoPeople(): void {
  demo.clear();
  demoSeq = 100;
}
