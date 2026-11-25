# Member self-service: signup details and "manage my details"

Status: **built in the working tree on 2026-11-25, not deployed.** See "What was built" at the end for where it differs from this design and what is still to do.

## Goal

1. Let people give optional extra details when they sign up (prefix, birthday, address, phone and so on).
2. Let people manage their own details later: prove they own an email address with a code, see their Planning Center record, and change it.
3. Replace the signed, readable confirmation link with server-held state, so no personal details travel in a URL.
4. Let people manage their **relationship with the church** in one place: create an account, subscribe to the newsletter, manage details, and (optionally) apply to become a member of the Society, or cancel that membership, with minimal friction.

### Friends and members

- **Friend** is the default. Anyone who signs up is a "Roseville New Church friend" / "friend of the Sydney Society" in Planning Center (exact label to confirm). Nothing to approve.
- **Member** is opt-in. The Society is a company limited by guarantee, so a member has voting rights at the AGM, can stand for the committee, and guarantees a small amount (**50 cents**, the registered "five shillings") if the Society is wound up. There is no fee and no financial requirement. Members also affirm the Society's statement of beliefs.
- The goal is that applying feels lightweight and never scary: plain-English consequences up front, one form, a decision from the committee, and an equally easy way out.

[Planning Center](https://www.planningcenter.com/) stays the **master record**. The website holds only short-lived working state, which deletes itself.

## What we already have (checked 2026-11-25)

The Supabase project (`supabase-rnc-web`) already behaves like a DynamoDB single table. See `docs/items-table.md`.

| Piece | State |
|---|---|
| Table | `public.items`, primary key `(pk, sk)`, a JSON `data` column, `entity_type`, `expires_at`, created/updated timestamps |
| Indexes | Three sparse GSIs (`gsi1`, `gsi2`, `gsi3`, each `pk` + `sk`) and a partial index on `expires_at` |
| Client | `src/lib/items-table/`: `get`, `put` (full replace), `query` with keyset pagination, `delete`, TTL on `put` |
| Rows today | 2 (both `user`, no TTL): app users and scopes. The old members rows were removed 2026-11-13 |
| GSI use today | gsi1 = email to user, gsi2 = list of users, gsi3 = Supabase auth id to user. **All three are taken** |

### TTL (expiry) is not built into Supabase, but we already have it

Supabase has no per-row TTL feature. The standard approach is `pg_cron` (a scheduler inside Postgres), and that is what this project uses:

- **Writes:** `put` takes a `ttl`, stored in `expires_at`.
- **Reads:** `get` and `query` hide rows past `expires_at` immediately, using the database clock. This is stricter than DynamoDB, where an expired item can linger until the sweeper runs.
- **Sweeper:** job `items-ttl-sweep` runs every 5 minutes and deletes up to 1,000 expired rows per run. Verified on production: the job is active, last ran at 01:00 UTC on 2026-11-25 with status `succeeded`, 26,421 runs so far.
- **Capacity:** 1,000 rows per 5 minutes is about 12,000 an hour. This design stays far below that.

One housekeeping gap: `pg_cron` keeps a row in `cron.job_run_details` for every run and never prunes it. At 288 runs a day that table grows without bound. Add a small daily job to delete runs older than 7 days (see Phase 0).

## Principles

- **Planning Center is the master.** Never copy a profile into Supabase. The most we hold is a Planning Center person ID in a session.
- **Transient by default.** Every row this feature writes has a TTL, except the audit trail (below).
- **No new GSIs.** Every access pattern below is a primary-key lookup or a `begins_with` query on one partition, so the three-GSI budget is not touched.
- **Don't put personal data in URLs.** Links carry only a random reference.
- **The browser never chooses which record to edit.** The Planning Center ID comes from the verified session.

## Data model

All rows live in `items`. Keys use the existing `key()` helper (`#` separator, emails trimmed and lower-cased).

| Entity | `pk` | `sk` | TTL | `data` |
|---|---|---|---|---|
| Pending signup | `SIGNUP#{id}` | `PENDING` | 7 days | email, first, last, lists, optional extra details, `secretHash`, `attempts` |
| Login challenge | `LOGIN#{email}` | `CHALLENGE` | 10 minutes | `codeHash`, `attempts`, `sentAt`, `ipHash` |
| Session | `SESSION#{sha256(token)}` | `SESSION` | 30 min sliding, 8 hours absolute | `pcoPersonId`, `email`, `createdAt`, `lastSeen` |
| Rate counter | `RATE#{kind}#{key}` | `{windowStart}` | window length + a few minutes | `count` |
| Audit event | `PERSON#{pcoPersonId}` | `AUDIT#{iso}#{rand}` | 2 years | fields changed (names only, not values), `via`, `ipHash` |
| Non-personal cache | `PCOMETA#fields` | `v1` | 1 hour | Planning Center custom-field and tab IDs |
| Membership application | `PERSON#{pcoPersonId}` | `MEMBERAPP#{iso}` | none while pending; 2 years after decision | status (`pending`, `approved`, `declined`, `withdrawn`), `submittedAt`, `consent` (wording version, ticked items, `ipHash`), `decidedBy`, `decidedAt`, `reason` |
| Membership change | `PERSON#{pcoPersonId}` | `MEMBERCHG#{iso}#{rand}` | 2 years (working log; the permanent record is the Planning Center note, see "Planning Center as the Roll Book") | `joined` or `resigned`, `effectiveDate`, `via`, `appId` |

Notes:

- **One live challenge per email.** A `put` on `LOGIN#{email}` replaces the previous code, so only the newest works. The `sentAt` field lets us throttle resends.
- **Opaque session tokens.** The cookie holds 32 random bytes. The database stores only the hash, so a leaked table can't be used to log in.
- **Audit by person.** `query` on `pk = PERSON#{id}` with `sk begins_with AUDIT#` lists a person's history. No index needed.
- **Caching:** only non-personal data is cached (Planning Center field IDs, which are slow to look up and rarely change). Personal profile data is fetched live on each page view. Volume is tiny, and a stale cache of someone's address is worse than a slow page.
- **Atomic counters need one small SQL function.** The client has `put` and `get` only, which is not atomic. Rate limiting needs an `items_incr(pk, sk, ttl)` upsert, added as a migration. This is the only schema change.

## Flows

### Signup (replaces the signed link)

1. Form: name, email, lists, plus an optional "More details" section (prefix, birthday, address, phone). Turnstile check as today.
2. Server writes `SIGNUP#{id}` and emails a link `/subscribe/confirm?s={id}.{secret}`. The page still shows a Confirm button, so mail scanners that prefetch links can't confirm for the person.
3. On Confirm: check the secret against `secretHash`, find or create the person in Planning Center, apply the lists and any extra details, delete the `SIGNUP#` row.
4. If the address is already in Planning Center, the response and email wording are the same. Nothing reveals whether the address exists.

### Manage my details

1. Person enters their email. Turnstile, then rate checks. The response is always "if that address is on file we've sent a code".
2. If a Planning Center person has that email, send a 6-digit code. Email only ever goes to the address on file.
3. They enter the code. We allow 5 wrong attempts and 10 minutes, and the code works once. On success, create a session and set the cookie.
4. Several people can share one email (couples, households). If so, show a "who are you?" list from Planning Center and let them pick. The picked ID goes into the session.
5. The profile page loads that person from Planning Center. They can edit the whitelisted fields (below) and mailing preferences.
6. Each save writes to Planning Center, then adds an `AUDIT#` row and a Planning Center note ("Updated via the website").

### Unsubscribe and preferences

Use the existing Planning Center rules from `docs/sync.md`: the Unsubscribed tick and the "Unsubscribed on" date, and the "Tags" checkboxes. The self-service page must not invent its own state. Changing email address requires a code sent to the **new** address before the change is applied.

### Apply to become a member

1. A logged-in person sees "Become a member" on their details page. It opens a page that explains, in plain English:
   - what membership is (a member of The Sydney Society of The New Church, a company limited by guarantee);
   - the guarantee: if the Society is wound up, a member may be asked to contribute up to 50 cents, and nothing else, and there are no fees or dues;
   - what they get: vote at the AGM, can be nominated for the committee;
   - the statement of beliefs they are affirming, shown in full;
   - that the committee decides, and that they can resign at any time.
2. They tick each acknowledgement separately (understand the guarantee, affirm the beliefs, agree to be on the register of members) and submit. We store the wording version and what they ticked.
3. The application is recorded as `MEMBERAPP#` (status `pending`) and the committee is emailed. **Planning Center is not changed yet.**
4. The committee decides at a meeting (see Constitution check): a member proposes, another seconds, a majority approves having regard to the Minister's advice. The Secretary records the decision on the site. Approval sets the membership field in Planning Center, writes a `MEMBERCHG#` row, and emails a welcome. A decline sends a kind, brief note.
5. Leaving (three options, all from the same page):
   - **Resign as a member, stay a friend.** Records a resignation request (`MEMBERCHG#`, type `request`) and emails the Secretary. The Committee resolves it at its next meeting and the Secretary records the date. On that decision the person becomes a friend in Planning Center automatically, and is told.
   - **Deactivate the account (as a friend).** Takes effect straight away: see "Deactivation" below.
   - **Deactivate the account (as a member).** Counts as a resignation request plus deactivation. The account is deactivated now; membership ends when the Committee resolves it, and the person is not made a friend because they've left.
   The person can withdraw a resignation request before the Committee resolves it.

**How the committee approves** (decision needed, see Open decisions). Options, lightest first:
- **Email with signed approve/decline links** to the committee address. Quick, but an email forwarded to the wrong person is a risk, so links need a login or short expiry.
- **A small admin page** behind a committee login (the app already has `user` rows and scopes). The page lists pending applications with Approve and Decline. Recommended.
- **Planning Center only**: the application creates a workflow card and the committee approves in Planning Center. Least to build, but forces committee members into Planning Center.

## Constitution check (read 2026-11-25)

Source: `SSNC constitution.pdf` in the SSNC OneDrive (Finance - Documents/SSNC 2026/Rachel Madjerac Visa/Society). It is the printed "Constitution and Rules" (Memorandum and Articles of Association) with the 2003 change to committee admission. **Checked 2026-11-25: byte-identical to the copy downloaded from the ACNC Charity Register (PDF created July 2013), so this is the governing document on the register.** Anything adopted since 2013 would not be in it, so confirm with the Secretary that there have been no later amendments.

**Becoming a member (Article 4)**
- A candidate must be **proposed by one member and seconded by another at a Committee meeting**, and is accepted by a **majority of the Committee, having regard to the advice of the Minister or Leader**. They then sign the Roll Book.
- A candidate must **avow belief in four things**: the Deity of the Lord Jesus Christ; the holiness of the Word; the necessity of shunning evils as sins against God; and leading a life of universal charity.
- A member of another New Church society can be admitted at any Committee meeting on a recommendation from that society's minister or leader, signed within six months.
- Members are limited to 100 for registration, but the Committee may register an increase (Articles 1 and 2).

**The belief statement.** There is no long creed to sign. The test is the four avowals above, verbatim. The page should quote them exactly and not paraphrase or add to them. The wider objects (Memorandum clause 3) are worship of the Lord Jesus Christ as Jehovah in His Divine Humanity, knowledge of the Scriptures, shunning evils, and circulating Swedenborg's works. They can appear as context.

**Rights (Articles 6, 7, 14).** Members vote at general meetings and use the libraries and rooms. The Committee is chosen at the AGM from members, so only members can stand. Proxies are allowed only for electing officers.

**Leaving (Article 5)**
- A member who does not give notice to the Secretary **three months before the AGM** is treated as continuing. The AGM is in November, so notice is due by August.
- A name may be struck off the roll after 12 months of absence, no subscription, or no contact with an officer.
- The Committee can call a Special General Meeting to decide whether to erase a member for wilful rule-breaking or conduct prejudicial to the Society. Questions are decided by majority (Article 14).

**Resignation rule the portal will follow (Article 5).** The portal lodges a **request**. The Committee resolves it at its next meeting. Article 5 says a member who does not give notice three months before the AGM is a continuing member, so a resolution that accepts a resignation sooner is the Committee using its discretion; the Secretary records the resolution date as the effective date, and the Roll Book and the website follow it. This avoids a computed date and any AGM config. Confirm with the Secretary that the Committee is comfortable accepting resignations at any meeting. If it would rather apply Article 5 strictly (effective at the AGM), the Secretary records that date instead. Consider amending Article 5 in the wider constitution review.

**Deactivation.** Planning Center has its own deactivate (the person's status goes from active to inactive), and the site uses it. The website never deletes the record. Deactivating:
1. sets the person **inactive** in Planning Center (the API write needs a quick spike before Phase 3, since the site only reads status today);
2. ticks **Unsubscribed** with today's date, as a belt and braces step (the existing Mailchimp rule then unsubscribes them even if something else goes wrong);
3. ends the login and open sessions, and adds a Planning Center note ("Deactivated via the website") and an `AUDIT#` row;
4. for a member, also lodges the resignation request above.

Inactive people can't log in. To come back, the person asks the Secretary (or signs up again) and an admin reactivates them in Planning Center. The syncs never resubscribe anyone, so a returning person confirms by email as they do today. A former member's record stays in Planning Center (inactive), which also keeps the register-of-members details the Society must retain. Erasing everything else is a manual request to the Secretary, and the page says so.

**What the syncs already do, and what must change** (checked in `src/lib/sync/`, 2026-11-25)
- **Mailchimp:** `mailchimp-sync.ts` already skips anyone whose status is not `active`, so an inactive person is never added or updated. **Gap:** someone who is already subscribed in Mailchimp is not removed. They only appear in the "outside" worklist for a human to look at. The Unsubscribed tick in step 2 covers deactivations made through the site, but not one made directly in Planning Center. **Change:** treat an inactive person who is still `subscribed` in Mailchimp (matched by `PCOID`, then email) as an unsubscribe, then archive the row, using the existing unsubscribe and archive calls (never a permanent delete). Show it in the dry-run report like the other actions.
- **PostGrid:** `postgrid.ts` already skips inactive people, and the sync deletes contacts that are no longer wanted. A household with other active, ticked people is still mailed, with the inactive person dropped from the name line. A household whose only ticked person is deactivated is deleted from the lists on the next run. No change needed, but add a test case for it.
- **Timing:** both jobs run daily, so a mailing could still go out up to a day after deactivation. For an immediate stop on the Mailchimp side, the site can also unsubscribe the person in Mailchimp at the moment they deactivate (optional, it needs the Mailchimp key in that route). Say "within a day" on the page unless that is added.
- **Reactivation:** the Mailchimp sync must not auto-resubscribe an archived or unsubscribed contact whose Planning Center status flips back to active. That is the current rule ("never resubscribes anyone"), so keep it and add a test.

**The guarantee (Memorandum clause 4).** Members contribute if the Society is wound up during their membership or within a year after, up to "five shillings", which is 50 cents. That matches the figure the page will state. Wording on the page: "up to 50 cents"; if the Committee prefers, quote the constitution's own words too.

**Where this differs from the design**
1. **Proposer and seconder.** A website form can't replace them. Show "proposed by" and "seconded by" fields filled in by the Secretary at the meeting, and the Secretary enters them in Planning Center (the Roll Book) at the same time.
2. **Committee decision.** An admin page with one approver does not match "majority of the Committee". The page should let the Secretary record the committee resolution (date, minute reference), not make the decision.
3. **Resignation is a request.** The portal lodges it and the Committee resolves it at its next meeting. The Secretary records the date.
4. **Roll Book.** Article 11 makes the Secretary responsible for the roll with names and addresses. The proposal is that **Planning Center becomes the Roll Book** (see below). The website and Supabase still must not become the register.
5. **Subscription.** Article 5 mentions failing to "subscribe", but no fee is defined. Confirm there is no subscription so the page can honestly say there are no fees.

## Planning Center as the Roll Book (proposal)

The aim is one source of truth that the Secretary can't let go out of date. Planning Center is already the contact master, so membership becomes fields on the person and not a separate document.

**What the Roll Book records (on each Planning Center person):**
- membership type (Friend or Member) and status (the existing membership type, to confirm);
- joining date and leaving date;
- proposer and seconder (names), the committee resolution date and minute reference;
- the date the person avowed the four beliefs and which wording version;
- the date a resignation was requested and the date the Committee resolved it.

Name and address already live on the person, which covers Article 11.

**How it stays trustworthy**
- **Only the site and a few named people write membership fields.** Restrict who can edit them in Planning Center to the Secretary and one backup (the Treasurer). Everyone else is read-only.
- **History as notes.** Each change adds a timestamped Planning Center note ("Admitted by committee resolution 2026-12-08, minute 4.2, proposed A, seconded B"). Field values alone don't keep history, so the note is the permanent record. The Supabase `MEMBERCHG#` rows are only a working log.
- **Dated snapshots outside Planning Center.** A scheduled job exports the register (name, address, joining and leaving dates, resolution reference) to the SSNC OneDrive each month and after each change. This guards against losing the Planning Center account and gives the Committee, auditor and ASIC a copy on request.
- **A saved report.** A Planning Center list or report that shows the current register and former members on demand, so a member's request to inspect the register can be answered quickly.
- **Former members stay.** Leaving sets leaving date and Friend or inactive; the record is not erased, which meets the retention requirement.

**What needs a formal step.** The constitution says the Secretary keeps "the roll book" and that candidates "sign" it. I read both as satisfiable electronically, but that is a legal reading, so:
1. Have the Committee pass a resolution that **Planning Center is the Society's Roll Book and register of members**, naming who may edit it.
2. Record it in the minutes and tell the auditor.
3. Ask the auditor or lawyer to confirm it meets the Corporations Act register requirements. Include in the constitution review a clause that says the roll may be kept electronically.

**Risks to manage**
- Planning Center is a third-party service, so keep the snapshots above and know who holds the account owner login.
- Edit rights are the main control. A wrong edit by a volunteer would alter the register, so keep the editor list short and review the notes.
- Planning Center "Unsubscribed" or "inactive" must never be used to mean "not a member". Membership has its own fields.

## Legal position in Australia (general knowledge, not verified)

My attempts to read the legislation failed, so treat these as points to check with the Society's lawyer or auditor. This is not legal advice.

- **Company law.** The Society has an ACN and is a company limited by guarantee, so the Corporations Act 2001 applies and the constitution binds members and the company. As I recall, a person becomes a member by agreeing to join and being entered on the register of members, and the register records names, addresses and joining and leaving dates, with former-member details kept for seven years. Check those sections (around ss 168, 169 and 231) before relying on them.
- **Charity law.** The Society is registered with the ACNC (advancing religion). The ACNC governance standards apply, and constitution changes need a special resolution and notices to ASIC and the ACNC. Check the exact deadlines.
- **Online process.** The Electronic Transactions Act 1999 generally allows applications and acknowledgements online. Keep the committee's resolution (in the minutes) and the Roll Book entry in Planning Center as the formal act.
- **Belief test.** Requiring avowal of the four beliefs is a normal condition for a religious body. The Committee should apply that test only. Refusing someone for sex, race, age, disability or similar needs exemption advice (Sex Discrimination Act s 37 and NSW Anti-Discrimination Act s 56 are the starting points).
- **Privacy.** A person's religious beliefs are "sensitive information" under the Privacy Act. Even if the Society is below the small-business threshold, treat the avowal and membership status as sensitive: explicit consent, minimum retention, no logging, no cache.
- **Modernising.** The 1893 notice rules (newspaper advertisement, posting in the Hall) and the 100-member cap are out of date. The constitution is already under review (see the treasurer role note). The ACNC publishes a template constitution for companies limited by guarantee. Pair this project with that review so the portal and the rules agree.

## Security checklist

- **Enumeration:** identical responses and timing whether or not the address exists.
- **Codes:** random 6 digits, stored as an HMAC (with a server secret), 5 attempts, 10 minutes, single use.
- **Rate limits:** about 5 codes per email per hour, about 20 per IP per hour, and Turnstile on every send.
- **Session cookie:** `__Host-` prefix, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`. Sensitive pages send `Cache-Control: no-store`.
- **CSRF:** check `Origin` on all POSTs, plus a per-session token on the edit form.
- **Field whitelist:** the server accepts only prefix, first and last name, birthday, address, phone and preferences. It ignores anything else in the request.
- **Own record only:** the Planning Center person ID always comes from the session.
- **Logs:** never log codes, tokens, or field values. Log hashed IPs and outcomes.
- **Planning Center token:** the site's token can write to everyone, so keep it server-side only and leave edits scoped by the rules above.

## Privacy

- Update `/privacy` to say which optional details we collect, why, that they are stored in Planning Center, and how long transient data lives.
- Birthday and address are clearly optional.
- Retention: pending signups 7 days, codes 10 minutes, sessions at most 8 hours, audit events 2 years (names of fields changed, never the values).
- Membership is the exception, and it lives in Planning Center: joining and leaving records are kept there for as long as the Society must keep its register of members (confirm period with the auditor). Supabase keeps applications and change rows for 2 years only, as a working log.
- Membership status and the beliefs acknowledgement are more sensitive than a mailing list. Privacy page should say so, and these rows are never put in the cache or in logs.
- Supabase backups may hold expired rows for a while. This is acceptable for hashed codes and short-lived signups, but worth stating if you ever collect more sensitive data.

## Phases

0. **Housekeeping:** add the `items_incr` function and a daily prune of `cron.job_run_details` (one migration). Also change the Mailchimp sync so an inactive person still subscribed is unsubscribed and archived, with tests for PostGrid and reactivation (this can ship on its own).
1. **Signup:** `SIGNUP#` rows, optional details, the new link. Delete the signed-token code (`signToken` and `readToken`) in rnc-web and `sc-www`. The encryption question goes away.
2. **Login:** code challenge and session, with a read-only "your details" page.
3. **Edit:** whitelisted writes to Planning Center, with the audit trail and household picker.
4. **Preferences:** mailing tags and unsubscribe through the existing Planning Center rules.
5. **Membership:** apply, committee approval, resign, welcome and notification emails, `MEMBERAPP#` and `MEMBERCHG#` rows, and the Planning Center membership field. Needs the committee decision below and the legal check first.

Each phase can ship by itself.

## Open decisions

- **Direct write or staged for approval?** Recommended: direct write, with a Planning Center note on each change.
- **Link or code for signup confirmation?** Recommended: keep the link, since the existing flow works. Use a code only for login.
- **Swedenborg Centre site (`sc-www`):** it shares the signup code today. Decide whether it uses the same Supabase project (shared tables, separate session cookies per domain) or its own.
- **Sensitive fields:** address and birthday may need an "are you sure" step, or admin review, if you want extra caution.
- **Committee approval method:** admin page behind a login (recommended), signed email links, or a Planning Center workflow.
- **Who records the decision:** the constitution requires a committee majority, so the site records it (Secretary only) and does not decide it.
- **Planning Center representation:** how friend and member are held today (a field, a tag, a list, or a membership type) and the exact labels. The site must use the existing mechanism and not invent one.
- **Account vs. Planning Center record:** "create an account" currently means a verified email plus a Planning Center record (passwordless, code by email). Confirm that is enough, or whether people expect a password.
- **Leaving (decided):** members lodge a resignation request, resolved at the next committee meeting, after which they become friends. Friends and members can also deactivate their account; for a member that includes resignation. Deactivation uses Planning Center's own inactive status. Still to confirm: that the Committee may accept resignations at any meeting, that the API can set inactive, and how long register details must be kept.
- **Existing members:** how current members get linked. Recommended: they log in with the email on file and see their membership as it already is, with no new application.
- **Statement of beliefs:** the exact wording and who owns changes to it (each change gets a new version, kept with every acknowledgement).

## Out of scope

Payments, event registration, a public member directory, and anything that stores the profile outside Planning Center.

## What was built (2026-11-25)

Code is in `src/lib/members/` (logic, with tests in `tests/`), `src/pages/account/` and `src/pages/api/account/` (member pages and API), `src/pages/admin/membership.astro` (committee recording) and the changed signup routes. Run the tests with `npm test`.

**Where it differs from the design above**
- **Membership rows:** applications and resignation requests share one row type, `PERSON#{id}` / `MEMBERREQ#{iso}#{rand}`, with the decision stored on the same row. There is no separate `MEMBERAPP#` or `MEMBERCHG#` row. Open requests are listed through **gsi2** under the partition `MEMBERQ#open` (the existing user list uses a different gsi2 partition), so no new index was needed. A decided request is kept 2 years; the Planning Center note is the permanent record.
- **Friend types:** the Planning Center membership types are `Member`, `Regular Attender`, `Society Friend` and `Swedenborg Centre Friend`. "Friend" means Society Friend (or Swedenborg Centre Friend for someone who only picks the Centre list). New signups are now created with that type, because the Mailchimp sync skips people with no membership type.
- **Resigning as a member:** recording it sets the person back to a friend type, even when their account is deactivated (inactive people are skipped by both syncs).
- **No `PCOMETA` cache row:** field ids are read once per request. Volume is tiny, so the cache wasn't worth a table row.
- **Title (prefix):** removed. Planning Center's API has no title field (writes to `name_prefix` are silently ignored, checked on a test person 2026-11-25), and no custom Title field exists. To bring it back, create a "Title" dropdown custom field in Planning Center with the allowed titles and the site can read and write that.
- **Phone:** Planning Center refuses a separate country code and works the country out from the number. The form has a country dropdown (Australia first, then NZ, UK, US, Canada, then all countries) and a number. Australian numbers are written in national form ("0412 345 678") like the existing records; other countries are written in international form ("+64 21 123 4567"). Anything typed with `+` or `00` is read as international. Uses `libphonenumber-js` (as the Crewmojo site does); see `src/lib/phone.ts`.
- **Address search:** typing in "Find your address" suggests addresses through Google Places (Places API (New)): `src/lib/address.ts`, `/api/address/complete` (public, rate limited per IP, called from our server so the key stays secret). Picking one fills the fields locked; "Edit address manually" unlocks them. It needs `GOOGLE_PLACES_API_KEY`: a Google Cloud API key restricted to "Places API (New)" (setup steps are in the commit message and this note: create a project, link billing, enable Places API (New), create the key, restrict it to that API, set a daily quota and a budget alert, then add the key in Vercel). With no key the form shows plain address fields. Locally, with no key, two fake suggestions are used. The privacy page says what is sent to Google (only the address text typed).
- **Deactivate:** not a tab; a small link at the bottom of the details page opens the deactivate page.
- **Local runs:** outside production the member pages use an in-memory store and a demo person, so nothing real is read or written. `SIGNUP_LIVE=1` switches both to the real thing.
- **Not built:** changing an email address from the details page (the page says to contact the office), clearing a phone number or address, and the monthly register export to OneDrive (an admin CSV download of current members is there instead).

**Linked from the menu (2026-11-25).** The top menu has a **Log in** button (to `/login`, the one sign-in for members, friends and administrators) in the place the external Swedenborg Centre link used to be; it gives way to the account menu once someone is signed in. The About menu is a drop-down: About the church (`/about`), Governance and membership (`/about/governance`, a plain-words summary of the constitution) and Swedenborg Centre (`/about/swedenborg-centre`, with the link out to swedenborg.com.au, so visitors aren't taken off the site from the menu). The signup form always has the optional extra details and always uses the stored flow.

While testing, a test application, approval or deactivation changes your real Planning Center record, and applications email the church office unless `MEMBERSHIP_NOTIFY_TO` is set to your own address.

**Before it goes live**
1. Push the migration `supabase/migrations/20261125000000_items_incr_and_cron_prune.sql` (`npm run db:push`). Signup and sign-in rate limiting need `items_incr`.
2. Optionally set `MEMBERSHIP_NOTIFY_TO` in Vercel Production (defaults to the church office address). Everything else uses settings that already exist, including `SIGNUP_SECRET`.
3. Done 2026-11-25: the six Roll Book fields (Membership joined and left as dates; Committee resolution, Proposed by, Seconded by and Belief avowal as text) are in a "Roll Book" tab in Planning Center, created by hand because the API refuses to create custom fields. Checked with a write, overwrite and read-back on a temporary person (deleted). Planning Center shows dates in the organisation's format (dd/mm/yyyy).
4. Done 2026-11-25 on a temporary test person (deleted): the API accepts `status` (inactive and active), `membership` and `birthdate`, and phone numbers and addresses as described above. It does not accept a title.
5. Remove the legacy signed-link code in `src/lib/signup/index.ts` (and in `sc-www`) once links emailed before the change have expired (7 days after deploy).

## How every endpoint is protected

`tests/route-protection.test.ts` holds the table: every API route is listed with the protection it relies on, the test checks the file really has it, and a new route that isn't listed fails the test.

| Kind | Routes | Protection |
|---|---|---|
| Anonymous submissions | contact, subscribe, give, `/api/account/login`, `/api/auth/login`, both `verify` steps, `/api/subscribe/confirm`, `/api/address/session` | A passed **Turnstile** check, checked on the server before any work (the widgets only switch the button on). Most also have per-IP limits |
| Signed-in members | save, prefs, membership, deactivate, who, logout | A live session and a matching CSRF token |
| Administrators | `/admin/*`, `/api/admin/*` | The middleware needs an admin session (our emailed-code sign-in) and re-reads the user's scopes on every request |
| Address lookup | `/api/address/complete` | A signed 30-minute cookie earned with a Turnstile check, per-IP limits, and a daily cap across everyone |
| Cron | `/api/cron/*` | `Authorization: Bearer CRON_SECRET` |
| Nothing to protect | whoami, auth logout, event calendar files | Read-only, or only ends the caller's own session |

Also on for every POST: Astro's cross-site form check (`security.checkOrigin`, written into `astro.config.mjs`), so a form posted from another site is refused with 403. Without Turnstile keys in production every one of these fails closed.

**One sign-in code.** The same emailed code opens a member session (if an active person has the address) and an admin session (if the address has an admin scope). `/account` and `/login` both use it; administrators who come in at `/login` land in the admin area. Signed-in people get an account menu (people icon) in the top bar, with "Your account", "Admin" for administrators, and "Sign out".
