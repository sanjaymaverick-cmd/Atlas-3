# Fix this — Atlas 3 blocker list

Running list. Blockers are things that stop a build, a run, or a go-live decision.
Add to it as the company run turns up more.

**Thirteen fixed** (B1–B13 except the two product _decisions_ that stay
recorded rather than flipped). **B3, B5, B11 fixed in the ERPNext books
cutover.** **B4 recorded** in `docs/decisions/four-eyes.md` — default
behaviour unchanged.

Status key: **OPEN** · **IN PROGRESS** · **FIXED** (add the commit) · **WONTFIX** (add why)

---

## B1 — Typecheck fails: duplicate keys in the glossary alias map

**Status:** FIXED — 24 Aug 2026. Removed the three redundant `ALIAS` entries. `npm run typecheck` passes.
**Found:** 24 Aug 2026, code review
**Where:** `src/lib/glossary.ts:247, 250, 265`
**Gate broken:** `npm run typecheck` (AGENTS.md quality bar)

```
src/lib/glossary.ts(247,3): error TS1117: An object literal cannot have multiple properties with the same name.
src/lib/glossary.ts(250,3): error TS1117: ...
src/lib/glossary.ts(265,3): error TS1117: ...
```

`ALIAS` declares `"land papers"` twice (245 and 250); `home` and
`"site questions and quality"` each collide with an earlier entry. All three
duplicates map to the same value, so runtime behaviour is unaffected — but
`TS1117` is a hard error and typecheck is red.

**Fix:** delete the three redundant entries. No logic change.

---

## B2 — A tracked file imports two untracked files

**Status:** FIXED — 24 Aug 2026. `glossary.ts` and `hint.tsx` are now tracked (staged, not committed).
**Found:** 24 Aug 2026, code review
**Where:** `src/components/status.tsx` → `src/lib/glossary.ts`, `src/components/hint.tsx`

`status.tsx` is tracked and modified. `glossary.ts` and `hint.tsx` are untracked.
Commit or stash `status.tsx` on its own and the build breaks on a missing module.
A fresh clone of this branch cannot build at all.

**Fix:** track both files, or revert the `status.tsx` import. Decide first whether
the plain-English glossary is staying — see B3.

---

## B3 — Status vocabulary changed without updating the docs

**Status:** FIXED — 24 Aug 2026. `DESIGN.md` and `docs/Atlas-3-UX-Spec.md` now lock the plain-English chip table. Glossary is the runtime source.
**Found:** 24 Aug 2026, code review
**Where:** `src/components/status.tsx`, `src/lib/glossary.ts`, `src/routes/app/index.tsx`, `src/components/layout/nav.ts`

`DESIGN.md` calls the status vocabulary locked; `docs/Atlas-3-UX-Spec.md` §1 says
"same status chip language forever"; `docs/review/SYNTHESIS.md` §6 lists it under
"do not touch". The working tree changes it anyway:

- `pending` → "Waiting", `review` → "Under check", `quarantine` → "Virus scan",
  `variance` → "Numbers do not match", `accrued` → "Earned, not paid"
- RAG labels removed from Command entirely
- `Tally` → "Company accounts" in the nav

The plain-English direction is right for non-technical site and channel seats.
The problem is that three documents now contradict the app.

**Fix:** decide, then make it deliberate — if the vocabulary is changing, update
`DESIGN.md` and the UX spec in the same commit.

---

## B4 — Four-eyes approval is bypassable by the MD

**Status:** RECORDED — 24 Aug 2026. `docs/decisions/four-eyes.md`. Default still lets the MD act. `VITE_MD_BYPASS_FOUR_EYES=false` scopes the MD like every other seat. Do not flip the default silently.
**Found:** 24 Aug 2026, code review
**Where:** `src/lib/roles.ts:119`

```ts
export function canActOnApproval(role, waitingOn, kind = "") {
  if (!role || !canDecideApprovals(role)) return false;
  if (role === "owner") return true;          // blanket exemption
```

The comment says "MD can always act", so this is deliberate — but it contradicts
`SYNTHESIS.md` §4.2 (`canAct = canDecideApprovals(role) && waitingOnMatches(...)`)
and defeats the four-eyes rule §6 lists as already working. An MD can approve a
`Four-eyes approver` item that the MD raised.

**Fix:** either scope the MD like every other seat, or retire the spec line so it
stops looking unimplemented.

---

## B5 — Approval routing keys on free text and fails silently

**Status:** FIXED — 24 Aug 2026. `WaitingOn` union in `src/lib/waiting-on.ts`; `WAITING_ON_ROLES satisfies Record<WaitingOn, …>`. `"Sales Manager / MD"` is a real key. Unmapped = compile error. Regex fallback removed.
**Found:** 24 Aug 2026, code review
**Where:** `src/lib/roles.ts:110`, `src/lib/store.ts:1431`

`WAITING_ON_ROLES` is keyed on display strings. `store.ts` emits
`waitingOn: "Sales Manager / MD"`, which is not a key — it only passes via the
fallback regex `/book|commission|hold|partner/i`. Any new `waitingOn` string that
nobody remembers to add to the map degrades quietly to owner-only. No error, no
warning, just an approval nobody but the MD can action.

**Fix:** key the map on a union type so an unmapped value is a compile error.

---

## B6 — Collections aging: the `90d+` bucket is wrong

**Status:** FIXED — 24 Aug 2026. `90d+` is `days > 90`; added `61–90d`; one
`daysOverdue()` pass honours the trial clock.
**Found:** 24 Aug 2026, code review
**Where:** `src/routes/app/customers.tsx`

The bucket labelled `90d+` filters on `days > 60`. Invoices between 61 and 90 days
old are counted as 90-plus, so the oldest aging band overstates. This is a wrong
number on a finance desk, not a cosmetic slip.

**Fix applied:** filter on `days > 90`, add a `61–90d` chip so that band is not
dropped, and compute overdue days once through `daysOverdue()` (trial clock).

---

## B7 — Audit trail is capped at 80 events

**Status:** FIXED — 24 Aug 2026. Audit cap 80 → 5000; unit `history` 200 → 1000. Journal left at 200.
**Found:** 24 Aug 2026, company-run readiness check
**Where:** `src/lib/store.ts:528`

```ts
set({ audit: [event, ...get().audit].slice(0, 80) });
```

Every mutation writes an audit event and the list is truncated to 80. A single
busy day will overwrite most of it; a seven-month run overwrites it many times
over. The audit trail is the evidence a company run exists to produce, and it
cannot survive the run that produces it.

Related caps: unit status `history` at 200 (`store.ts:398`), portal journal at 200
(`portal-journal.ts:45`).

**Fix:** raise or remove the cap before the trial starts, or accept that the audit
desk shows only a rolling window and record findings outside the app.

---

## B8 — No clock seam: the app cannot be moved through time

**Status:** FIXED — 24 Aug 2026. `registerClock` / `now()` seam in `utils.ts`; store field `simDate` + `setSimDate`. Verified by `scripts/trial/continuity-check.mjs`.
**Found:** 24 Aug 2026, company-run readiness check
**Where:** `src/lib/utils.ts:38` (`todayIso`, 44 call sites), `src/lib/store.ts:528` (`new Date()`)

`todayIso()` returns the real system date. There is no override — no env var, no
store field, no injection point. A trial dated 24 Aug 2026 → 31 Mar 2027 will stamp
every entry with the real day it was made, so ageing, overdue logic, aging buckets,
quarter boundaries and FY close cannot be exercised at all.

Forms that take an explicit date (site diary, vouchers) can be back- or
forward-dated by hand; everything derived from "today" cannot.

**Fix:** a single `now()` seam in `utils.ts` that reads an overridable store field,
with all 44 call sites routed through it. This is the one change that decides
whether the trial tests time-based behaviour or only same-day behaviour.

---

## B9 — One login per role: multiple people on a seat are indistinguishable

**Status:** FIXED — 24 Aug 2026. Eight per-person seats added to `USERS`, linked to `SalesAgent` rows so channel scoping still works.
**Found:** 24 Aug 2026, company-run readiness check
**Where:** `src/lib/seed.ts` — `USERS`

`USERS` holds exactly one account per seat. Three supervisors would all sign in as
`sv@atlas.local` and appear as "D. Chauhan" in every audit line, every diary entry,
and every approval. You cannot tell them apart, cannot review one person's work,
and cannot test the four-eyes rule between two holders of the same role — which is
precisely the rule B4 already weakens.

**Fix:** add seeded users per person for the roles being doubled up, keeping one
`Role` each. No role-model change needed — only more rows in `USERS`.

---

## B10 — `company-day.mjs` cannot run a continuous company

**Status:** FIXED — 24 Aug 2026. New `scripts/trial/session.mjs` keeps one persistent Chromium profile; continuity proven across separate processes.
**Found:** 24 Aug 2026, company-run readiness check
**Where:** `scripts/company-day.mjs:78` and `:130`

The Playwright harness opens `browser.newContext()` per seat and wipes every
`atlas3-sales-v*` key from `localStorage` on each login. Both mean each seat starts
from seed with no memory of what the previous seat did. A lead the Sales Manager
creates does not exist when the MD signs in to approve it.

The in-app path is the one that works: `signOut` only clears `user`
(`store.ts`), so business data survives a seat switch inside one context — which is
how `src/lib/company-day.ts` drives its 69 checks.

**Fix:** for the trial, drive seat switching inside a single browser context and
stop clearing storage between seats. Keep the wipe only for the run's cold start.

---

## B11 — Persist-key cleanup list is hand-maintained

**Status:** FIXED — 24 Aug 2026. `scripts/atlas-persist.mjs` and QA logins clear by `atlas3-sales-` prefix.
**Found:** 24 Aug 2026, code review
**Where:** `scripts/company-day.mjs:89`

The harness clears stale Zustand keys from a hardcoded array; this branch had to
append `v10` and `v11`. Miss the edit on the next bump and the run silently starts
against stale state from a previous version — which presents as a data bug, not a
harness bug, and will waste a day of the trial.

**Fix:** match on the `atlas3-sales-` prefix instead of enumerating versions.

---

## Lower priority — carried from review, not blockers

| #   | Item                                                                            | Where                                                   |
| --- | ------------------------------------------------------------------------------- | ------------------------------------------------------- |
| L1  | `eslint .` OOMs on the 226 KB of untracked `_review-*.mjs` scratch scripts      | `scripts/`                                              |
| L2  | Dead state: `obsOpen`, `setConvertValue`                                        | `index.tsx:67`, `sales.pipeline.tsx:61`                 |
| L3  | Multiple jade primaries on Inventory and Pipeline; none at all on Land          | `sales.inventory.tsx`, `sales.pipeline.tsx`, `land.tsx` |
| L4  | Mobile header does not wrap at 390px — both selects collapse to slivers         | `app-shell.tsx`                                         |
| L5  | Command lost the Open gates / Quality / Timeline risk KPIs the UX spec requires | `index.tsx`                                             |
| L6  | Books deny page — `NAV_ROLES.finance` equals `canSeeBooks`                      | `finance.tsx`                                           |
| L7  | Cross-screen handoff via bare `sessionStorage["atlas-hold-unit"]`               | `sales.inventory.tsx` ↔ `sales.channel.tsx`             |
| L8  | `to={x as "/app"}` casts defeat the typed router's dead-link check              | `index.tsx`, `phases.tsx`                               |
| L9  | Role branching repeated at five sites; `BOTTOM_NAV` already shows the fix       | `index.tsx`, `app-shell.tsx`                            |
| L10 | Shared qty input between Receive and Issue on the stores desk                   | `controls.tsx`                                          |
| L11 | `sha256demo` is a 32-bit FNV mix, not SHA-256 — name invites a wrong assumption | `hash.ts:1`                                             |
| L12 | Ingest `config` / `journal` / `ack` routes skip `verifyIngestAuth`              | `portal-http.ts:94, 112, 116`                           |
| L13 | Hardcoded `DEFAULT_INGEST_SECRET` fallback                                      | `portal-secret.ts:4`                                    |
| L14 | Channel isolation is presentational — full dataset sits in every client store   | `sales-scope.ts:13`                                     |

---

## B12 — An aborted HTTP request can kill the dev server

**Status:** FIXED — 24 Aug 2026. `scripts/abort-guard.mjs` installed at Vite
config load; socket `clientError` / connection errors swallowed when they are
abort noise; ingest and Tally body reads no longer write to a dead socket.
**Found:** 24 Aug 2026, while bringing the trial harness up
**Where:** dev server (Vite + nitro), seen during dependency optimisation

A client that opens a connection and drops it before the response completes
raises `Error: aborted … code: 'ECONNRESET', unhandled: true` and takes the whole
process down. Reproduced by polling the server with `curl --max-time` during
startup; the process exited and every subsequent request was refused.

Matters for the trial: 20 seats reconnecting across 155 simulated days will abort
requests occasionally, and each abort is a dead server and a lost day.

**Fix applied:** process-level `unhandledRejection` / `uncaughtException` guard
that swallows abort noise only; real errors still exit. HTTP `clientError` and
per-socket `error` listeners destroy the socket and return.

---

## B13 — A browser profile inside the repo kills the dev server

**Status:** FIXED — 24 Aug 2026. Trial profile moved to the OS temp dir.
**Found:** 24 Aug 2026, while bringing the trial harness up
**Where:** Vite file watcher vs `.trial-profile/Default/Network/Cookies`

Vite watches the project root. Chromium holds an exclusive lock on its `Cookies`
file, so the watcher throws `EBUSY: resource busy or locked` and the dev server
dies. Any long-lived browser profile under the repo will do this.

**Fix applied:** `scripts/trial/session.mjs` defaults `PROFILE` to
`os.tmpdir()/atlas3-trial-profile`, outside the watched tree.

---

## This pass (dukia/company-run) — closed

| Item                                                                                                                                              | Status                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Vendor activation card → Active → quote → PO                                                                                                      | FIXED — probe `scripts/trial/probes/sprint-a.mjs`      |
| Land consideration ₹ + sale deed                                                                                                                  | FIXED                                                  |
| Book-next by BHK / prefix fallback                                                                                                                | FIXED                                                  |
| Directors ≠ MD                                                                                                                                    | FIXED                                                  |
| Funding / loan sanction master (SBI/AU 60/40, dates)                                                                                              | FIXED — seed `DUKIA_FUNDING`; Finance CRUD             |
| Entity persist + wrong-company block on acquire/RFQ/booking/PO                                                                                    | FIXED                                                  |
| Channel selectors scoped (leads, units, holds, diaries/reports)                                                                                   | FIXED — `scripts/trial/probes/isolation-selectors.mjs` |
| CEO pulse `/app/ceo` (KPIs, risk, five-bullet brief)                                                                                              | FIXED                                                  |
| Paper quotation on RFQ (source + file metadata)                                                                                                   | FIXED                                                  |
| Drawing register `/app/drawings` (PDF v1, hidden from channel)                                                                                    | FIXED                                                  |
| P2 UX batch (project card, RERA target vs filed, handover OC, launch lock, pack-complete, virus-scan wording, Approvals / Land & acquisition nav) | FIXED                                                  |

**Still recorded, not flipped:** ERPNext posting default off. Commission accrues only. Full dataset still sits in the client store (L14 architecture); selectors and exclusive-channel lock are the operational filter. L14 is mitigated, not deleted.

**Out of scope this pass:** 2024–2028 re-run, DWG/IFC viewer, enabling posting by default.

## Follow-on (CEO + controlled JE)

| Item                                                                                                      | Status                       |
| --------------------------------------------------------------------------------------------------------- | ---------------------------- |
| CEO analytics (funnel, in-house vs channel, BHK), weeks-to-sellout, MD strip, risk severity + entity risk | FIXED                        |
| Channel blocked from `/app/ceo`                                                                           | FIXED                        |
| Typed `AtlasJournalPost` + Finance explicit post; flag default off; mock when ERPNext down                | FIXED                        |
| Paper quote + drawing register                                                                            | FIXED earlier on this branch |
