import type { AstroCookies } from 'astro';
import { memberKv } from './kv';
import { ipHash } from './crypto';
import type { Kv } from './kv';
import { peopleApi, type PeopleApi, type PersonDetails } from './people';
import { csrfOk, readSession, sessionToken, type MemberSession } from './session';

export type Context = { kv: Kv; people: PeopleApi; token: string; session: MemberSession };
export type PersonContext = Context & { personId: string; person: PersonDetails };

/** The signed-in member session behind the cookie, or null. */
export async function memberContext(cookies: AstroCookies): Promise<Context | null> {
  const token = sessionToken(cookies);
  if (!token) return null;
  const kv = memberKv();
  const session = await readSession(kv, token);
  return session ? { kv, people: peopleApi(), token, session } : null;
}

/**
 * The session plus the person's live Planning Center record. The person always comes from the session, never from
 * the request. Returns a redirect target when there is no session, no chosen person, or the person is not active.
 */
export async function personContext(cookies: AstroCookies): Promise<PersonContext | { redirect: string }> {
  const ctx = await memberContext(cookies);
  if (!ctx) return { redirect: '/account' };
  if (!ctx.session.personId) return { redirect: '/account/who' };
  const person = await ctx.people.get(ctx.session.personId);
  if (!person || person.status !== 'active') return { redirect: '/account?error=gone' };
  return { ...ctx, personId: ctx.session.personId, person };
}

/** For POST handlers: the person context plus the parsed form, after the CSRF token has been checked. */
export async function postContext(
  request: Request,
  cookies: AstroCookies,
  clientAddress?: string,
): Promise<(PersonContext & { form: FormData; ip: string }) | { redirect: string }> {
  const ctx = await personContext(cookies);
  if ('redirect' in ctx) return ctx;
  const form = await request.formData();
  if (!csrfOk(ctx.session, form.get('csrf'))) return { redirect: '/account/details?error=csrf' };
  return { ...ctx, form, ip: ipHash(clientAddress) };
}

export const see = (to: string) => new Response(null, { status: 303, headers: { Location: to } });
