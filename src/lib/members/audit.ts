import type { Kv } from './kv';
import { key } from '../items-table/keys';
import { memberConfig } from './config';
import { randomToken } from './crypto';

export type AuditEvent = {
  action: string;
  /** Names of the fields changed, never their values */
  fields?: string[];
  via: 'member' | 'admin' | 'signup';
  by?: string;
  ipHash?: string;
};

/** Writes one audit row under the person (kept 2 years). Never throws: an audit failure must not block the change. */
export async function audit(kv: Kv, personId: string, event: AuditEvent, now = new Date()): Promise<void> {
  try {
    await kv.put({
      pk: key('PERSON', personId),
      sk: `AUDIT#${now.toISOString()}#${randomToken(4)}`,
      entityType: 'audit',
      data: { ...event, at: now.toISOString() },
      ttl: new Date(now.getTime() + memberConfig.ttl.audit * 1000),
    });
  } catch (err) {
    console.error('[members] audit write failed', err instanceof Error ? err.message : err);
  }
}
