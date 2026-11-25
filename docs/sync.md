# Planning Center syncs (Mailchimp and PostGrid)

Planning Center is the master for contacts. Two jobs push from it, daily, from the site:

| Job id | What | Cron (UTC) |
|---|---|---|
| `mailchimp_sync` | Planning Center -> Mailchimp church audience | 17:00 (about 4am Sydney) |
| `postgrid_sync` | Planning Center -> PostGrid contacts and mailing lists (nothing is mailed) | 17:30 |
| `pco_backup` | Planning Center People data zipped (JSON files + people.csv) and emailed to `BACKUP_EMAIL_TO` through Postmark; medical notes are left out | 17:00 on the 1st of each month |

Code: `src/lib/sync/` (TypeScript port of `~/dev/ssnc.mailchimp-sync/pco_to_mailchimp.py` and
`pco_to_postgrid.py`). Entry points: `src/pages/api/cron/[job].ts` (Vercel Cron), the admin page
`/admin/actions` (Run now / Dry run), and `scripts/run-sync.ts` (local).

## Rules (short)

- Mailchimp: active people with a membership type and a usable email, not ticked Unsubscribed or Bounced.
  Matched by the `PCOID` merge field then email, so an email change renames the Mailchimp row.
  Tags: `type:<membership type>` (from `GET /membership_types`) and `tag:Society News`,
  `tag:Swedenborg Centre News`, `tag:Candela` (from "Communication preferences"; add one in `TAG_MAP`).
  Unsubscribes in Mailchimp are pulled back (Unsubscribed flag + "Unsubscribed on"). Untick Unsubscribed but keep
  the date = resubscribe request (Mailchimp `pending`, confirmation email); the sync then removes the date. When someone
  resubscribes on the website (the member page or the signup form) the site does this step itself at once: it asks
  Mailchimp for the confirmation email if the contact is unsubscribed there, then removes the date. If Mailchimp can't be
  reached it leaves the date for the nightly sync. Cleaned (bounced) rows are a worklist and
  a profile note; a changed address adds the new row and archives the old cleaned one. Never permanently deletes.
- Deactivated people (Planning Center status inactive, e.g. after "Deactivate my account" on the site): never added.
  If one is still subscribed in Mailchimp, the sync unsubscribes then archives them (reversible, never a permanent
  delete). The sync never resubscribes anyone, so a reactivated person confirms by email as before.
- PostGrid: one contact per household when anyone is ticked "Society news (printed)" or "Candela (printed)";
  name line has no titles; one mailing list per run per hub (AU, GB, CA, US & Intl.). State lives in the items
  table (`SYNC#postgrid` / `STATE#live`).

## Environment (Vercel Production)

| Variable | Used for |
|---|---|
| `PLANNING_CENTER_PAT`, `PLANNING_CENTER_PAT_SECRET` | Planning Center API |
| `MAILCHIMP_API_KEY`, `MAILCHIMP_AUDIENCE_ID` | church Mailchimp audience |
| `POSTGRID_PRINT_MAIL_API_KEY` | PostGrid Print & Mail (live key) |
| `BACKUP_EMAIL_TO` | where the monthly Planning Center backup is emailed (the job fails loudly if unset) |
| `CRON_SECRET` | Vercel sends it as `Authorization: Bearer ...`; the cron route rejects anything else |
| `POSTMARK_SERVER_TOKEN`, `ALERT_EMAIL_FROM`, `ALERT_EMAIL_TO` | failure and "needs a look" emails (optional until Postmark is set up) |
| `POSTMARK_MESSAGE_STREAM` | optional, default `outbound` |
| `TEAMS_ALERT_WEBHOOK` | the Teams Workflows webhook for the private Website alerts team. New subscribers and problems post there, and so does each member-area action, Secretary decision and sign-in (name and what they did, never an email, phone, address or changed value; `src/lib/notify`). Live only |
| `GA4_API_SECRET` | optional: GA4 Measurement Protocol secret. Production only; sends `rnc_*` events (e.g. `rnc_membership_applied`) with no name and a throwaway client id, because the account pages are deliberately not tagged |
| `HEALTHCHECK_URL_MAILCHIMP_SYNC`, `HEALTHCHECK_URL_POSTGRID_SYNC` | optional dead-man's-switch ping (Healthchecks.io style); alerts if a run never happens |

The sync keys are Production only on purpose: a preview deployment must not be able to run a real sync.

## Alerting

Vercel logs each cron run (Project -> Logs, filter `requestPath:/api/cron`) but never retries a failed run and
has no alert for it on the Hobby plan. So the job reports itself:

- structured JSON line in the runtime logs for every run;
- the last result (status, summary, anything needing attention, errors) on `/admin/actions`;
- email through Postmark when a run fails, when the list of things needing attention changes, and when it recovers
  (not every day for an unchanged list);
- optional healthcheck ping, so a day where Vercel never invoked the job is noticed.

A cron run returns HTTP 500 when the sync fails, so it also shows as failed in Vercel's cron log.

## Plan limits (SSNC Vercel team is on Hobby)

Hobby crons run once a day at any point in the scheduled hour, and function time is capped by `maxDuration`
(set to 300s in `astro.config.mjs`). Delivery is best effort with no retry, so the jobs are idempotent: a missed
run is caught up by the next one. Pro would allow per-minute schedules and Vercel's own alerting.

## Running locally

```
node --import tsx --env-file=.env.local --env-file=../ssnc.mailchimp-sync/.env scripts/run-sync.ts mailchimp_sync
node --import tsx --env-file=.env.local --env-file=../ssnc.mailchimp-sync/.env scripts/run-sync.ts postgrid_sync --apply
```

Dry run unless `--apply`. `scripts/seed-postgrid-state.ts` copies the PostGrid state from the Python tool (done once).
