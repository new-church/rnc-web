/**
 * Membership applications, resignation requests and the Committee's decisions.
 * The Committee decides at a meeting (constitution Article 4 and 5); the site records the outcome. Planning Center is
 * the Roll Book: the decision goes there as the membership type, the Roll Book fields that exist, and a note.
 */
import type { Kv } from './kv';
import { key } from '../items-table/keys';
import { alertStaff } from '../signup/alert';
import { signupConfig } from '../signup/config';
import { announce } from '../notify';
import { audit } from './audit';
import { memberConfig } from './config';
import { randomToken } from './crypto';
import { mails, sendMail } from './mail';
import type { PeopleApi, PersonDetails } from './people';
import { friendTypeFor } from './people';
import { cleanMessage, parseBirthdate } from './validate';

export type RequestKind = 'apply' | 'resign';
export type RequestStatus = 'pending' | 'approved' | 'declined' | 'withdrawn';

export type MemberRequest = {
  kind: RequestKind;
  status: RequestStatus;
  personId: string;
  name: string;
  email: string;
  submittedAt: string;
  /** resignation lodged together with deactivating the account */
  alsoDeactivated?: boolean;
  consent?: { version: string; items: string[]; at: string };
  /** Optional note the person wrote for the Committee when applying */
  message?: string;
  decision?: {
    at: string;
    by: string;
    resolutionDate?: string;
    minuteRef?: string;
    proposedBy?: string;
    secondedBy?: string;
    reason?: string;
  };
};

export type RequestRow = { personId: string; sk: string; data: MemberRequest };

export const OPEN_QUEUE = key('MEMBERQ', 'open');
const personPk = (id: string) => key('PERSON', id);
const day = (d = new Date()) => d.toISOString().slice(0, 10);

export type Deps = { kv: Kv; people: PeopleApi };

export const isMember = (p: Pick<PersonDetails, 'membership'>) => p.membership === memberConfig.membership.member;

const asRow = (item: { pk: string; sk: string; data: unknown }): RequestRow => ({
  personId: item.pk.split('#')[1],
  sk: item.sk,
  data: item.data as MemberRequest,
});

/** A person's requests, newest first. */
export async function requestsFor(kv: Kv, personId: string): Promise<RequestRow[]> {
  const r = await kv.query({ pk: personPk(personId), sk: { op: 'begins_with', prefix: 'MEMBERREQ#' }, scanIndexForward: false, limit: 20 });
  return r.items.map(asRow);
}

export const pendingOf = (rows: RequestRow[], kind: RequestKind) => rows.find((r) => r.data.kind === kind && r.data.status === 'pending');

/** Everything waiting for the Committee, oldest first. */
export async function openRequests(kv: Kv): Promise<RequestRow[]> {
  const r = await kv.query({ index: 'gsi2', pk: OPEN_QUEUE, limit: 100 });
  return r.items.map(asRow);
}

async function putRequest(kv: Kv, personId: string, sk: string, data: MemberRequest): Promise<void> {
  const open = data.status === 'pending';
  await kv.put({
    pk: personPk(personId),
    sk,
    entityType: 'member_request',
    data: data as unknown as Record<string, unknown>,
    gsi2: open ? { pk: OPEN_QUEUE, sk: `${data.submittedAt}#${personId}` } : null,
    // Pending requests never expire. A decided one is kept as a working log; the Planning Center note is the record.
    ttl: open ? null : new Date(Date.now() + memberConfig.ttl.decided * 1000),
  });
}

const adminLink = () => `${signupConfig.siteUrl}/admin/membership`;

async function tell(subject: string, mail: () => Promise<void>): Promise<void> {
  try {
    await mail();
  } catch (err) {
    console.error(`[members] ${subject} email failed`, err instanceof Error ? err.message : err);
    await alertStaff('problem', `${subject} email could not be sent`, [`Error: ${String((err as Error).message ?? err).slice(0, 300)}`], [
      `${subject}: an email could not be sent. Check Postmark.`,
    ]);
  }
}

async function note(people: PeopleApi, personId: string, text: string): Promise<void> {
  try {
    await people.addNote(personId, text);
  } catch (err) {
    console.error('[members] note not saved', err instanceof Error ? err.message : err);
  }
}

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export async function applyForMembership(
  deps: Deps,
  who: { personId: string; email: string },
  consent: { avowed: boolean[]; guarantee: boolean; register: boolean; message?: string },
  ipHash?: string,
): Promise<Result> {
  const { kv, people } = deps;
  if (consent.avowed.length !== memberConfig.avowals.length || !consent.avowed.every(Boolean) || !consent.guarantee || !consent.register) {
    return { ok: false, error: 'Please tick each box to confirm you understand and agree.' };
  }
  const p = await people.get(who.personId);
  if (!p || p.status !== 'active') return { ok: false, error: 'We could not find your record.' };
  if (isMember(p)) return { ok: false, error: 'You are already a member.' };
  if (pendingOf(await requestsFor(kv, who.personId), 'apply')) return { ok: false, error: 'Your application is already with the Committee.' };

  const message = cleanMessage(consent.message);
  const now = new Date();
  const sk = `MEMBERREQ#${now.toISOString()}#${randomToken(3)}`;
  const data: MemberRequest = {
    kind: 'apply',
    status: 'pending',
    personId: who.personId,
    name: `${p.firstName} ${p.lastName}`.trim(),
    email: who.email,
    submittedAt: now.toISOString(),
    consent: { version: memberConfig.avowalVersion, items: [...memberConfig.avowals.map((_, i) => `avowal:${i + 1}`), 'guarantee', 'register'], at: now.toISOString() },
    ...(message ? { message } : {}),
  };
  await putRequest(kv, who.personId, sk, data);
  await audit(kv, who.personId, { action: 'membership_apply', via: 'member', ipHash });
  await announce('membership_applied', data.name, message ? 'with a message for the Committee' : undefined);
  await note(people, who.personId, `Applied for membership through the website on ${day(now)}. Acknowledged the guarantee, affirmed the four beliefs in Article 4 (wording ${memberConfig.avowalVersion}) and agreed to be on the register of members.${message ? ` Their message to the Committee: "${message}"` : ''} Awaiting the Committee.`);
  await tell('membership application', async () => {
    await sendMail({ ...mails.notifyCommittee('apply', { name: data.name, email: who.email, message }, adminLink()), to: memberConfig.notifyTo() });
  });
  await tell('application receipt', () => sendMail(mails.applicationReceived(who.email, p.firstName)));
  return { ok: true };
}

/** Deactivates the person in Planning Center (inactive and unsubscribed) and tells them. */
export async function deactivateAccount(deps: Deps, personId: string, email: string, ipHash?: string): Promise<void> {
  const p = await deps.people.get(personId);
  await deps.people.deactivate(personId);
  await audit(deps.kv, personId, { action: 'deactivate', via: 'member', ipHash });
  await announce('account_deactivated', p ? `${p.firstName} ${p.lastName}`.trim() : 'Someone');
  await note(deps.people, personId, `Account deactivated through the website on ${day()}. Set inactive and unsubscribed.`);
  await tell('deactivation', () => sendMail(mails.deactivated(email, p?.firstName ?? 'there')));
}

export async function requestResignation(
  deps: Deps,
  who: { personId: string; email: string },
  alsoDeactivate: boolean,
  ipHash?: string,
  rawMessage?: string,
): Promise<Result> {
  const { kv, people } = deps;
  const p = await people.get(who.personId);
  if (!p || p.status !== 'active') return { ok: false, error: 'We could not find your record.' };
  if (!isMember(p)) return { ok: false, error: 'You are not a member.' };
  if (pendingOf(await requestsFor(kv, who.personId), 'resign')) return { ok: false, error: 'Your resignation request is already with the Committee.' };

  const message = cleanMessage(rawMessage);
  const now = new Date();
  const data: MemberRequest = {
    kind: 'resign',
    status: 'pending',
    personId: who.personId,
    name: `${p.firstName} ${p.lastName}`.trim(),
    email: who.email,
    submittedAt: now.toISOString(),
    alsoDeactivated: alsoDeactivate,
    ...(message ? { message } : {}),
  };
  await putRequest(kv, who.personId, `MEMBERREQ#${now.toISOString()}#${randomToken(3)}`, data);
  await audit(kv, who.personId, { action: 'membership_resign_request', via: 'member', ipHash });
  await announce('resignation_requested', data.name, [alsoDeactivate ? 'also deactivating their account' : '', message ? 'with a message for the Committee' : ''].filter(Boolean).join(', ') || undefined);
  await note(people, who.personId, `Asked to resign as a member through the website on ${day(now)}${alsoDeactivate ? ' and deactivated their account' : ''}.${message ? ` Their message to the Committee: "${message}"` : ''} Awaiting the Committee.`);
  await tell('resignation request', async () => {
    await sendMail({ ...mails.notifyCommittee('resign', { name: data.name, email: who.email, deactivating: alsoDeactivate, message }, adminLink()), to: memberConfig.notifyTo() });
  });
  await tell('resignation receipt', () => sendMail(mails.resignationReceived(who.email, p.firstName)));
  if (alsoDeactivate) await deactivateAccount(deps, who.personId, who.email, ipHash);
  return { ok: true };
}

export async function withdrawRequest(deps: Deps, personId: string, sk: string): Promise<Result> {
  const { kv, people } = deps;
  const item = await kv.get({ pk: personPk(personId), sk });
  if (!item || !sk.startsWith('MEMBERREQ#')) return { ok: false, error: 'That request was not found.' };
  const data = item.data as unknown as MemberRequest;
  if (data.status !== 'pending') return { ok: false, error: 'That request has already been dealt with.' };
  await putRequest(kv, personId, sk, { ...data, status: 'withdrawn', decision: { at: new Date().toISOString(), by: 'member' } });
  await audit(kv, personId, { action: `membership_${data.kind}_withdrawn`, via: 'member' });
  await announce('request_withdrawn', data.name, data.kind === 'apply' ? 'membership application' : 'resignation request');
  await note(people, personId, `Withdrew their ${data.kind === 'apply' ? 'membership application' : 'resignation request'} on ${day()}.`);
  return { ok: true };
}

export type Decision = {
  personId: string;
  sk: string;
  decision: 'approve' | 'decline';
  decidedBy: string;
  resolutionDate: string;
  minuteRef: string;
  proposedBy?: string;
  secondedBy?: string;
  reason?: string;
};

/** The Secretary records what the Committee decided. Planning Center is written first; a failure leaves it pending. */
export async function decideRequest(deps: Deps, d: Decision): Promise<Result> {
  const { kv, people } = deps;
  const item = await kv.get({ pk: personPk(d.personId), sk: d.sk });
  if (!item || !d.sk.startsWith('MEMBERREQ#')) return { ok: false, error: 'That request was not found.' };
  const req = item.data as unknown as MemberRequest;
  if (req.status !== 'pending') return { ok: false, error: 'That request has already been dealt with.' };

  const resolutionDate = parseBirthdate(d.resolutionDate); // a valid past date, same rules
  if (!resolutionDate) return { ok: false, error: 'Please give the date of the Committee resolution.' };
  const minuteRef = d.minuteRef.trim().slice(0, 100);
  if (!minuteRef) return { ok: false, error: 'Please give the minute reference.' };
  const proposedBy = (d.proposedBy ?? '').trim().slice(0, 100);
  const secondedBy = (d.secondedBy ?? '').trim().slice(0, 100);
  const reason = (d.reason ?? '').trim().slice(0, 300);

  const p = await people.get(d.personId);
  if (!p) return { ok: false, error: 'The person was not found in Planning Center.' };
  const decision = { at: new Date().toISOString(), by: d.decidedBy, resolutionDate, minuteRef, proposedBy, secondedBy, reason };
  const ref = `resolution ${resolutionDate}, minute ${minuteRef}`;

  if (req.kind === 'apply' && d.decision === 'approve') {
    if (!proposedBy || !secondedBy) return { ok: false, error: 'Article 4 needs a proposer and a seconder.' };
    if (proposedBy.toLowerCase() === secondedBy.toLowerCase()) return { ok: false, error: 'The proposer and seconder must be different people.' };
    if (p.status !== 'active') return { ok: false, error: 'This person has deactivated their account, so they cannot be admitted. Reactivate them in Planning Center first.' };
    await people.setMembership(d.personId, memberConfig.membership.member);
    const roll = await people.setRollBook(d.personId, {
      joined: resolutionDate,
      resolution: ref,
      proposedBy,
      secondedBy,
      avowal: `${req.consent?.version ?? memberConfig.avowalVersion}, ${req.consent?.at.slice(0, 10) ?? ''}`.trim(),
    });
    await note(people, d.personId, `Admitted as a member. Committee ${ref}. Proposed by ${proposedBy}, seconded by ${secondedBy}. Avowed the four beliefs in Article 4 (${req.consent?.version ?? memberConfig.avowalVersion}) on ${req.consent?.at.slice(0, 10) ?? 'unknown date'}. Recorded by ${d.decidedBy}.${roll.missing.length ? ` (Roll Book fields not set up yet: ${roll.missing.join(', ')}.)` : ''}`);
    await putRequest(kv, d.personId, d.sk, { ...req, status: 'approved', decision });
    await audit(kv, d.personId, { action: 'membership_approved', via: 'admin', by: d.decidedBy });
    await announce('membership_approved', req.name, d.decidedBy);
    await tell('welcome', () => sendMail(mails.approved(req.email, p.firstName)));
    return { ok: true };
  }

  if (req.kind === 'apply' && d.decision === 'decline') {
    await note(people, d.personId, `Membership application declined. Committee ${ref}.${reason ? ` Reason: ${reason}.` : ''} Recorded by ${d.decidedBy}.`);
    await putRequest(kv, d.personId, d.sk, { ...req, status: 'declined', decision });
    await audit(kv, d.personId, { action: 'membership_declined', via: 'admin', by: d.decidedBy });
    await announce('membership_declined', req.name, d.decidedBy);
    await tell('decline', () => sendMail(mails.declined(req.email, p.firstName)));
    return { ok: true };
  }

  if (req.kind === 'resign' && d.decision === 'approve') {
    const friendLists = signupConfig.lists.filter((l) => p.lists.includes(l.option)).map((l) => l.id);
    await people.setMembership(d.personId, friendTypeFor(friendLists));
    const roll = await people.setRollBook(d.personId, { left: resolutionDate, resolution: ref });
    await note(people, d.personId, `Resigned as a member. Committee ${ref}. Now a friend${p.status === 'active' ? '' : ' (account deactivated)'}. Recorded by ${d.decidedBy}.${roll.missing.length ? ` (Roll Book fields not set up yet: ${roll.missing.join(', ')}.)` : ''}`);
    await putRequest(kv, d.personId, d.sk, { ...req, status: 'approved', decision });
    await audit(kv, d.personId, { action: 'membership_resignation_recorded', via: 'admin', by: d.decidedBy });
    await announce('resignation_recorded', req.name, d.decidedBy);
    if (p.status === 'active') await tell('resignation confirmation', () => sendMail(mails.resignationRecorded(req.email, p.firstName)));
    return { ok: true };
  }

  return { ok: false, error: 'A resignation request can only be recorded as accepted.' };
}
