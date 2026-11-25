/**
 * Planning Center People -> Mailchimp (church audience). Planning Center is the master.
 *
 * Port of ssnc.mailchimp-sync/pco_to_mailchimp.py. Rules:
 *  - Synced: active people with a membership type and a usable email who are not ticked
 *    Unsubscribed or Bounced. Contacts are matched by the Planning Center id stored in the
 *    PCOID merge field first, then by email, so an email change renames the existing row.
 *  - Tags are managed only within the sets below: "type:<membership type>" and "tag:<preference>".
 *  - Never resubscribes anyone and never permanently deletes. Unsubscribes flow back to Planning
 *    Center (flag + "Unsubscribed on" date). A person whose "Unsubscribed" flag is unticked while
 *    the date is kept is a resubscribe request: Mailchimp status "pending" (confirmation email).
 *  - Deactivated people (Planning Center status inactive) who are still subscribed are unsubscribed and
 *    archived (reversible, never the permanent delete); this keeps mail from reaching someone who left.
 *  - Cleaned (bounced) rows are a worklist, never flagged on the person. If the address changes
 *    the new one is added and the old cleaned row archived.
 */
import { Mailchimp, type McMember } from "./mailchimp";
import {
  datumRelationships,
  fieldValues,
  hasField,
  loadSnapshot,
  type J,
  type Pco,
  type PcoSnapshot,
} from "./pco";
import { attempt, cleanName, newResult, personName, sameList, sydneyDate, type JobResult } from "./util";

const TYPE_PREFIX = "type:";
/** Planning Center "Communication preferences" option (lower case) -> Mailchimp tag. */
const TAG_MAP: Record<string, string> = {
  "society news": "tag:Society News",
  "swedenborg centre news": "tag:Swedenborg Centre News",
  candela: "tag:Candela",
};
const NOTE_CATEGORY = "Mailchimp";

type Rec = { fname: string; lname: string; tags: Set<string>; people: string[] };

export async function syncMailchimp(opts: {
  apply: boolean;
  pco: Pco;
  mc?: Mailchimp;
  snapshot?: PcoSnapshot;
}): Promise<JobResult> {
  const { apply, pco } = opts;
  const mc = opts.mc ?? Mailchimp.fromEnv();
  const snap = opts.snapshot ?? (await loadSnapshot(pco));
  const result = newResult(apply);
  const L = result.lines;

  // ---- who should be in Mailchimp --------------------------------------------------------------
  const synced = new Map<string, Rec>();
  const skipped: Record<string, number> = {};
  const skip = (k: string) => (skipped[k] = (skipped[k] ?? 0) + 1);
  const flagged = new Map<string, { unsub: boolean; bounced: boolean }>();
  const emailPeople = new Map<string, string[]>();
  for (const p of snap.people.values()) {
    const unsub = hasField(p, snap.unsubFieldId);
    const bounced = hasField(p, snap.bouncedFieldId);
    const emails = p.emails.filter((e) => e.address);
    for (const e of emails) {
      const a = e.address.toLowerCase();
      const f = flagged.get(a) ?? { unsub: false, bounced: false };
      f.unsub ||= unsub;
      f.bounced ||= bounced;
      flagged.set(a, f);
      emailPeople.set(a, [...(emailPeople.get(a) ?? []), p.id]);
    }
    if (p.status !== "active") {
      skip("inactive");
      continue;
    }
    if (!p.membership) {
      skip(emails.length ? "no membership type" : "no membership type and no email");
      continue;
    }
    const usable = [...emails].sort((a, b) => Number(b.primary) - Number(a.primary)).find((e) => !e.blocked);
    if (!usable) {
      skip("no usable email");
      continue;
    }
    if (unsub || bounced) {
      skip("unsubscribed or bounced");
      continue;
    }
    const email = usable.address.toLowerCase();
    const rec = synced.get(email) ?? { fname: "", lname: "", tags: new Set<string>(), people: [] };
    rec.people.push(p.id);
    if (!rec.fname && !rec.lname) {
      rec.fname = cleanName(p.firstName);
      rec.lname = cleanName(p.lastName);
    }
    rec.tags.add(TYPE_PREFIX + p.membership);
    for (const t of fieldValues(p, snap.prefsFieldId)) {
      const tag = TAG_MAP[t.toLowerCase()];
      if (tag) rec.tags.add(tag);
    }
    synced.set(email, rec);
  }

  // ---- current Mailchimp state -------------------------------------------------------------------
  const members = await mc.members();
  const tagIds = await mc.tagIds();
  const managed = new Set<string>([...Object.values(TAG_MAP), ...snap.membershipTypes.map((t) => TYPE_PREFIX + t)]);
  const missingTags = [...managed].filter((t) => !tagIds.has(t)).sort();
  const byPcoid = new Map<string, Set<string>>();
  for (const [e, m] of members) for (const i of m.pcoids) byPcoid.set(i, (byPcoid.get(i) ?? new Set()).add(e));

  // ---- push plan -----------------------------------------------------------------------------------
  const toAdd: string[] = [];
  const nameUpdates: string[] = [];
  const idUpdates: string[] = [];
  const emailChanges: { old: string; new: string; cleaned: boolean }[] = [];
  const tagChanges: { email: string; add: Set<string>; remove: Set<string> }[] = [];
  const ambiguous: [string, string[]][] = [];
  const blockedMoves: [string, string, string][] = [];
  const moveConflicts: [string, string][] = [];
  const otherIds: [string, string[]][] = [];
  const movedFrom = new Set<string>();
  const cleanedMoves = new Set<string>();

  for (const [email, rec] of [...synced].sort(([a], [b]) => a.localeCompare(b))) {
    const ids = [...rec.people].sort();
    const cands = new Set<string>();
    for (const i of ids) for (const c of byPcoid.get(i) ?? []) cands.add(c);
    if (cands.size > 1) {
      ambiguous.push([email, [...cands].sort()]);
      continue;
    }
    let row = email;
    if (cands.size === 1 && !cands.has(email)) {
      const old = [...cands][0];
      if (synced.has(old)) {
        // the old address still belongs to someone else: treat this one as separate
      } else if (!["subscribed", "cleaned"].includes(members.get(old)!.status)) {
        blockedMoves.push([old, email, members.get(old)!.status]);
        continue;
      } else if (members.has(email)) {
        moveConflicts.push([old, email]);
        continue;
      } else {
        row = old;
        const cleaned = members.get(old)!.status === "cleaned";
        emailChanges.push({ old, new: email, cleaned });
        movedFrom.add(old);
        if (cleaned) cleanedMoves.add(old);
      }
    }
    const m = members.get(row);
    if (!m) {
      toAdd.push(email);
      if (rec.tags.size) tagChanges.push({ email, add: new Set(rec.tags), remove: new Set() });
      continue;
    }
    if (m.status !== "subscribed" && !cleanedMoves.has(row)) {
      if (!sameList(m.pcoids, ids)) otherIds.push([row, ids]);
      continue; // unsubscribed / cleaned / pending: only the id is stored
    }
    if (m.fname !== rec.fname || m.lname !== rec.lname) nameUpdates.push(email);
    if (!sameList(m.pcoids, ids)) idUpdates.push(email);
    const cur = new Set([...m.tags].filter((t) => managed.has(t)));
    const add = new Set([...rec.tags].filter((t) => !cur.has(t)));
    const remove = new Set([...cur].filter((t) => !rec.tags.has(t)));
    if (add.size || remove.size) tagChanges.push({ email, add, remove });
  }
  for (const [e, m] of [...members].sort(([a], [b]) => a.localeCompare(b))) {
    if (synced.has(e) || movedFrom.has(e)) continue;
    const expect = [...(emailPeople.get(e) ?? [])].sort();
    if (expect.length && !sameList(m.pcoids, expect)) otherIds.push([e, expect]);
  }
  const archiveOrphans = [...members]
    .filter(([e, m]) => m.status === "cleaned" && !emailPeople.has(e) && !movedFrom.has(e))
    .map(([e]) => e)
    .sort();

  // ---- pull-back, resubscribe, cleaned worklist ---------------------------------------------------
  const people = snap.people;
  const pull: { email: string; pids: string[]; date: string }[] = [];
  const resub: { email: string; pids: string[] }[] = [];
  const pullUnmatched: string[] = [];
  for (const [e, m] of [...members].sort(([a], [b]) => a.localeCompare(b))) {
    if (m.status !== "unsubscribed") continue;
    const pids = emailPeople.get(e) ?? [];
    if (!pids.length) {
      pullUnmatched.push(e);
      continue;
    }
    const todo = pids.filter((id) => !hasField(people.get(id)!, snap.unsubFieldId));
    if (!todo.length) continue; // already flagged
    const withDate = todo.filter((id) => hasField(people.get(id)!, snap.unsubOnFieldId));
    if (withDate.length) resub.push({ email: e, pids: withDate });
    else pull.push({ email: e, pids: todo, date: sydneyDate(m.changed) });
  }
  const cleanedRows = [...members]
    .filter(([e, m]) => m.status === "cleaned" && emailPeople.has(e) && !movedFrom.has(e))
    .map(([e, m]) => ({ email: e, pids: emailPeople.get(e)!, date: sydneyDate(m.changed) }))
    .sort((a, b) => a.email.localeCompare(b.email));

  const notesNeeded: { pid: string; email: string }[] = [];
  for (const c of cleanedRows) {
    for (const pid of c.pids) {
      if (!(await bounceNoteExists(pco, pid, c.email))) notesNeeded.push({ pid, email: c.email });
    }
  }
  const unsubFlaggedStillSubscribed: string[] = [];
  const bouncedFlaggedStillSubscribed: string[] = [];
  for (const [e, m] of members) {
    if (m.status !== "subscribed") continue;
    const f = flagged.get(e);
    if (f?.unsub) unsubFlaggedStillSubscribed.push(e);
    else if (f?.bounced) bouncedFlaggedStillSubscribed.push(e);
  }
  // An address whose Planning Center people are all inactive: unsubscribe and archive any live row.
  const deactivated = [...members]
    .filter(([e, m]) => {
      if (m.status !== "subscribed" || synced.has(e) || movedFrom.has(e) || unsubFlaggedStillSubscribed.includes(e)) return false;
      const pids = emailPeople.get(e) ?? [];
      return pids.length > 0 && pids.every((id) => people.get(id)?.status !== "active");
    })
    .map(([e]) => e)
    .sort();
  const outside = [...members]
    .filter(([e, m]) => m.status === "subscribed" && !synced.has(e) && !movedFrom.has(e) && !unsubFlaggedStillSubscribed.includes(e) && !deactivated.includes(e))
    .map(([e]) => e)
    .sort();
  const outsideUnknown = outside.filter((e) => !flagged.has(e));

  // ---- report ---------------------------------------------------------------------------------------
  const statusCount: Record<string, number> = {};
  for (const m of members.values()) statusCount[m.status] = (statusCount[m.status] ?? 0) + 1;
  const tagAdd: Record<string, number> = {};
  const tagRem: Record<string, number> = {};
  for (const c of tagChanges) {
    for (const t of c.add) tagAdd[t] = (tagAdd[t] ?? 0) + 1;
    for (const t of c.remove) tagRem[t] = (tagRem[t] ?? 0) + 1;
  }
  const name = (pids: string[]) => pids.map((id) => personName(people.get(id)!)).join(", ");
  result.counts = {
    syncedAddresses: synced.size,
    mailchimpSubscribed: statusCount.subscribed ?? 0,
    mailchimpCleaned: statusCount.cleaned ?? 0,
    mailchimpUnsubscribed: statusCount.unsubscribed ?? 0,
    add: toAdd.length,
    nameUpdates: nameUpdates.length,
    idUpdates: idUpdates.length + otherIds.length,
    emailChanges: emailChanges.length,
    tagChanges: tagChanges.length,
    pullBack: pull.length,
    resubscribe: resub.length,
    unsubscribeInMailchimp: unsubFlaggedStillSubscribed.length,
    deactivatedToArchive: deactivated.length,
    archive: archiveOrphans.length + emailChanges.filter((c) => c.cleaned).length,
    newBounceNotes: notesNeeded.length,
    cleanedWorklist: cleanedRows.length,
  };
  L.push(`Planning Center: ${synced.size} addresses to sync. Skipped: ${JSON.stringify(skipped)}`);
  L.push(`Mailchimp now: ${JSON.stringify(statusCount)}`);
  L.push(`Push: add ${toAdd.length}, names ${nameUpdates.length}, ids ${idUpdates.length + otherIds.length}, email changes ${emailChanges.length}, tag changes ${tagChanges.length} (added ${JSON.stringify(tagAdd)}, removed ${JSON.stringify(tagRem)})`);
  if (missingTags.length) L.push(`Tags to create: ${missingTags.join(", ")}`);
  for (const c of emailChanges) L.push(`  email change ${c.old} -> ${c.new}${c.cleaned ? " (cleaned row: new contact, old archived)" : ""}`);
  for (const p of pull) L.push(`  pull back: ${p.email} unsubscribed ${p.date} -> tick Unsubscribed (${name(p.pids)})`);
  for (const r of resub) L.push(`  resubscribe request: ${r.email} (${name(r.pids)}) -> pending`);
  for (const e of unsubFlaggedStillSubscribed) L.push(`  unsubscribe in Mailchimp (flagged in Planning Center): ${e}`);
  for (const e of deactivated) L.push(`  unsubscribe and archive in Mailchimp (inactive in Planning Center): ${e}`);
  for (const e of archiveOrphans) L.push(`  archive orphan cleaned row: ${e}`);
  for (const c of cleanedRows) L.push(`  needs a new email: ${name(c.pids)} <${c.email}>`);

  const attention = result.attention;
  for (const [e, rows] of ambiguous) attention.push(`Planning Center id for ${e} is on several Mailchimp rows: ${rows.join(", ")}`);
  for (const [o, n, s] of blockedMoves) attention.push(`Email changed ${o} -> ${n} but the old row is ${s}; new address NOT added`);
  for (const [o, n] of moveConflicts) attention.push(`Email changed ${o} -> ${n} but the new address already has its own row`);
  for (const e of pullUnmatched) attention.push(`Unsubscribed in Mailchimp with no Planning Center person: ${e}`);
  for (const e of outsideUnknown) attention.push(`Subscribed in Mailchimp but not in Planning Center: ${e}`);
  for (const e of bouncedFlaggedStillSubscribed) attention.push(`Planning Center says Bounced but Mailchimp still subscribed: ${e}`);

  if (!apply) {
    result.summary = `Dry run: ${synced.size} addresses; would add ${toAdd.length}, change ${tagChanges.length} tag sets, ${emailChanges.length} email changes, ${pull.length} pull-backs, ${deactivated.length} deactivated.`;
    result.status = attention.length ? "warning" : "ok";
    return result;
  }

  // ---- apply -----------------------------------------------------------------------------------------
  const ids = (e: string) => [...synced.get(e)!.people].sort();
  const fix = (e: string) => mc.upsert(e, synced.get(e)!.fname, synced.get(e)!.lname, ids(e));
  const done: Record<string, number> = {};
  const count = (k: string) => (done[k] = (done[k] ?? 0) + 1);

  for (const t of missingTags) if (await attempt(result, `create tag ${t}`, () => mc.createTag(t))) count("tagsCreated");
  for (const e of toAdd) {
    await attempt(result, `add ${e}`, async () => {
      const st = await fix(e);
      if (st === "archived") attention.push(`${e} is archived in Mailchimp and was not re-added (unarchive it there if intended)`);
      else count("added");
    });
  }
  const fallbacks = new Set<string>();
  for (const c of emailChanges) {
    const rec = synced.get(c.new)!;
    if (c.cleaned) {
      // Mailchimp refuses to rename a cleaned contact: add the new address, archive the old row.
      const ok = await attempt(result, `replace cleaned ${c.old}`, async () => {
        await fix(c.new);
        await mc.setTags(c.new, rec.tags, []);
        await mc.archive(c.old);
      });
      if (ok) {
        fallbacks.add(c.new);
        count("emailChanged");
      }
    } else if (await attempt(result, `rename ${c.old}`, () => mc.changeEmail(c.old, c.new, rec.fname, rec.lname, ids(c.new)))) {
      count("emailChanged");
    }
  }
  const moved = new Set(emailChanges.map((c) => c.new));
  for (const e of new Set([...nameUpdates, ...idUpdates])) {
    if (moved.has(e)) continue;
    if (await attempt(result, `update ${e}`, () => fix(e))) count("updated");
  }
  for (const c of tagChanges) {
    if (fallbacks.has(c.email)) continue;
    if (await attempt(result, `tags ${c.email}`, () => mc.setTags(c.email, c.add, c.remove))) count("tagged");
  }
  for (const p of pull) {
    for (const pid of p.pids) {
      const ok = await attempt(result, `flag unsubscribed ${p.email}`, async () => {
        await pco.request("POST", `/people/${pid}/field_data`, {
          data: { type: "FieldDatum", attributes: { value: "Unsubscribed" }, relationships: datumRelationships(snap.unsubFieldId) },
        });
        if (p.date && snap.unsubOnFieldId && !hasField(people.get(pid)!, snap.unsubOnFieldId)) {
          await pco.request("POST", `/people/${pid}/field_data`, {
            data: { type: "FieldDatum", attributes: { value: p.date }, relationships: datumRelationships(snap.unsubOnFieldId) },
          });
        }
      });
      if (ok) count("pulledBack");
    }
  }
  for (const [e, i] of otherIds) if (await attempt(result, `store id ${e}`, () => mc.setPcoid(e, i))) count("idsStored");
  for (const e of archiveOrphans) if (await attempt(result, `archive ${e}`, () => mc.archive(e))) count("archived");
  for (const e of unsubFlaggedStillSubscribed) {
    if (await attempt(result, `unsubscribe ${e}`, () => mc.unsubscribe(e))) count("unsubscribedInMailchimp");
  }
  for (const e of deactivated) {
    const ok = await attempt(result, `deactivate ${e}`, async () => {
      await mc.unsubscribe(e);
      await mc.archive(e);
    });
    if (ok) count("deactivatedInMailchimp");
  }
  if (notesNeeded.length) {
    await attempt(result, "bounce notes", async () => {
      const cat = await noteCategoryId(pco);
      for (const n of notesNeeded) {
        await pco.request("POST", `/people/${n.pid}/notes`, {
          data: {
            type: "Note",
            attributes: {
              note: `Email address ${n.email} bounced (cleaned in Mailchimp); detected by the sync on ${sydneyDate(new Date())}. Needs a new address.`,
              note_category_id: Number(cat),
            },
          },
        });
        count("notes");
      }
    });
  }
  for (const r of resub) {
    const ok = await attempt(result, `resubscribe ${r.email}`, async () => {
      await mc.requestResubscribe(r.email);
      for (const pid of r.pids) {
        for (const d of people.get(pid)!.fieldData.get(snap.unsubOnFieldId!) ?? []) {
          await pco.request("DELETE", `/people/${pid}/field_data/${d.id}`);
        }
      }
    });
    if (ok) count("resubscribeRequests");
  }

  result.counts = { ...result.counts, ...Object.fromEntries(Object.entries(done).map(([k, v]) => [`done_${k}`, v])) };
  result.status = result.errors.length ? "error" : attention.length ? "warning" : "ok";
  result.summary =
    `Mailchimp sync: ${JSON.stringify(done)}; ${result.errors.length} errors, ${attention.length} to look at. ` +
    `Subscribed ${statusCount.subscribed ?? 0}, cleaned ${statusCount.cleaned ?? 0}, unsubscribed ${statusCount.unsubscribed ?? 0}.`;
  return result;
}

async function noteCategoryId(pco: Pco): Promise<string> {
  for (const c of await pco.all("/note_categories")) if (c.attributes.name === NOTE_CATEGORY) return c.id as string;
  const r: J = await pco.request("POST", "/note_categories", { data: { type: "NoteCategory", attributes: { name: NOTE_CATEGORY } } });
  return r.data.id as string;
}

async function bounceNoteExists(pco: Pco, pid: string, address: string): Promise<boolean> {
  for (const n of await pco.all(`/people/${pid}/notes`)) {
    if (String(n.attributes.note ?? "").toLowerCase().includes(address.toLowerCase())) return true;
  }
  return false;
}

export type { McMember };
