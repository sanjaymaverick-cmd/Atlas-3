# Atlas 3 — company trial, FY 2026-27 H2

**Run window:** 24 Aug 2026 → 31 Mar 2027 (Indian FY close)
**Books:** ERPNext at `D:\ERPNext` · company `MOCK ATLAS3 LLP`
**Mode:** local only, not live. Mock data, real process.

The rule for every agent: **behave like the person, not like a tester.** A Site
Supervisor does not "test the diary form" — they close out a day's labour and
raise what went wrong. Findings come out of doing the job, not out of poking the UI.

---

## 1. Roster

21 agents. Roles doubled where a real developer of this size would have more than
one person, and where doubling exercises something the app claims to do
(four-eyes, handover between shifts, competing agencies, entity separation).

| #   | Agent          | Seat                | Login             | Person       | Why more than one                    |
| --- | -------------- | ------------------- | ----------------- | ------------ | ------------------------------------ |
| 1   | MD             | Managing Director   | `md@atlas.local`  | S. Mehta     | —                                    |
| 2   | PD-Kanakpura   | Project Director    | `pd@atlas.local`  | R. Sharma    | Two projects, two directors          |
| 3   | PD-Aravalli    | Project Director    | `pd2@atlas.local` | V. Nair      | "                                    |
| 4   | SE-Kanakpura   | Site Engineer       | `se@atlas.local`  | K. Rathore   | One per site                         |
| 5   | SE-Aravalli    | Site Engineer       | `se2@atlas.local` | S. Bisht     | "                                    |
| 6   | SV-A-day       | Site Supervisor     | `sv@atlas.local`  | D. Chauhan   | Tower A, day shift                   |
| 7   | SV-B-day       | Site Supervisor     | `sv2@atlas.local` | B. Lal       | Tower B, day shift                   |
| 8   | SV-night       | Site Supervisor     | `sv3@atlas.local` | G. Verma     | Night pour, handover at shift change |
| 9   | FL             | Finance Lead        | `fl@atlas.local`  | P. Jain      | —                                    |
| 10  | CM             | Commercial Manager  | `cm@atlas.local`  | A. Kapoor    | —                                    |
| 11  | SM-inhouse     | Sales Manager       | `sm@atlas.local`  | N. Bhatia    | In-house pipeline                    |
| 12  | SM-channel     | Sales Manager       | `sm2@atlas.local` | A. Joshi     | Third-party desk                     |
| 13  | CA-PinkCity    | Channel admin       | `ca@atlas.local`  | K. Pink      | Agency 1                             |
| 14  | CA-DesertReach | Channel admin       | `ca2@atlas.local` | D. Rathi     | Agency 2 — **isolation probe**       |
| 15  | AG-PinkCity-1  | Channel agent       | `ag@atlas.local`  | V. Meena     | Field agent                          |
| 16  | AG-PinkCity-2  | Channel agent       | `ag2@atlas.local` | S. Qureshi   | Field agent                          |
| 17  | AG-DesertReach | Channel agent       | `ag4@atlas.local` | R. Shekhawat | **Must never see Pink City data**    |
| 18  | LL             | Land & Legal        | `ll@atlas.local`  | M. Iyer      | —                                    |
| 19  | DC             | Document Controller | `dc@atlas.local`  | T. Joseph    | —                                    |
| 20  | ST             | Stores / QS         | `st@atlas.local`  | H. Singh     | —                                    |
| 21  | **Design**     | observer, no seat   | —                 | —            | UI/UX + plain-language, see §5       |

Every person has their own login, so the audit trail names them individually and
four-eyes works between two holders of the same role. Passwords follow the seeded
pattern (`AtlasLocal-SV2`, `AtlasLocal-AG4`, …) and are listed on the login
screen. The channel seats are wired to their agency through `SalesAgent.userId`,
so isolation is real: agent 17 and admin 14 belong to Desert Reach (`pt3`),
agents 15/16 and admin 13 to Pink City (`pt1`).

Phase the fleet in by function: **Sales + Channel (11–17)** through the festive
window first, then **Site + Stores (4–8, 20)**, then **Finance + Legal (9, 10, 18, 19)**, with MD and Design running throughout.

---

## 2. Calendar

Not a uniform seven months — real developer years are lumpy, and the lumps are
where the app will break.

| Period            | What the company is doing                                                                      | What it exercises                                           |
| ----------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **24–31 Aug**     | Opening position, carry-forward balances, live snag list                                       | Cold start, seed realism                                    |
| **Sept**          | Monsoon tail — slab cycles slip, RERA QPR for Q2, GST 20th                                     | Timeline risk, statutory gates                              |
| **30 Sept**       | **Q2 close**                                                                                   | Quarter boundary, ERPNext reconciliation                    |
| **Oct–early Nov** | **Festive season** — Navratri to Diwali, peak booking window, channel push, discount approvals | Inventory holds, commission accrual, four-eyes on discounts |
| **Nov–Dec**       | Bookings convert, collections begin, handover of first tower                                   | Handover stepper, aging buckets, OC/snags                   |
| **31 Dec**        | **Q3 close**                                                                                   | Quarter boundary                                            |
| **Jan–Feb**       | Collections push, overdue chasing, vendor settlement, TDS Q4                                   | **Aging buckets — B6 lives here**, four-eyes on payments    |
| **March**         | FY close prep, final possession batch, statutory filings                                       | Year-end                                                    |
| **31 Mar**        | **FY 2026-27 close in `MOCK ATLAS3 LLP`**                                                      | ERPNext year-end, never-post rule                           |

**Working cadence:** ~155 working days. Simulate at three densities —

- **Full day** (one entry per seat, in sequence) for ~20 marked days: month ends, quarter ends, Diwali week, first handover, FY close.
- **Digest day** (only the seats with something to do) for normal days.
- **Skip** Sundays and the festival closures a Jaipur site would actually take.

---

## 3. Ground rules for data

Mock data, but it must survive an auditor's read.

- **Money in ₹, lakhs/crores** as the desks actually speak. A 3BHK at Kanakpura is ₹1.1–1.4 Cr, not `$450,000`.
- **Names, places, and vendors stay in the Jaipur/Rajasthan frame** already seeded — Kanakpura Residences, Aravalli Homes, Marwar Steel Traders.
- **Every number must reconcile.** If SM books a unit at ₹1.24 Cr, FL's collection schedule, CM's commission accrual and the ERPNext journal all carry ₹1.24 Cr. A trial that doesn't reconcile teaches nothing.
- **Nobody skips a gate to make the day work.** If diligence blocks acquisition, the LL agent records being blocked — that is the finding. Working around the app is the one banned move.
- **Two entities stay separate.** Kanakpura Developers LLP and Aravalli Homes Pvt Ltd do not share rows. Agent 14 and 17 exist to try to break that.

---

## 4. What every agent records

One markdown file per agent under `docs/trial/`, appended daily. Do not edit app source.

```
## <date> — <seat> — <agent id>

**Did:** what the person actually accomplished
**Blocked:** what the app refused, and whether the refusal was right
**Wrong number:** anything the app displayed that disagrees with the ledger
**Slow:** anything that took more clicks than the job deserves
**Jargon:** any label, abbreviation or status word a site/sales person would not know
```

The **Jargon** line is not optional. Most people on a construction or sales desk
are not tech-savvy, and the plan is a hover explanation on every option — so the
trial's job is to produce the list of what needs explaining. Record the word, the
screen, and **what the person guessed it meant.** The wrong guess is more useful
than the right definition.

Known suspects to watch for, from the seed and the nav: `WBS`, `NCR`, `GRN`,
`QPR`, `OC`, `KYC`, `RAG`, `CLT`, `GBDT`, `CatBoost`, `drift`, `band`, `accrued`,
`variance`, `quarantine`, `four-eyes`, `diligence`, `khasra`, `escrow`.

> The app already has the machinery for this — `src/lib/glossary.ts` and
> `src/components/hint.tsx` are the hover-explanation seam, now tracked and
> typecheck-clean. The trial's jargon list is what should populate it, and the
> design agent owns how it behaves on touch (§5).

---

## 5. The design agent

Agent 21 holds no seat and enters no data. It shadows the run and uses the
`ui-ux-pro-max` skill to answer one question per screen: _would a 45-year-old site
supervisor with a 5-inch phone and dusty hands get this right the first time?_

Its brief:

- **Watch real sessions, not screenshots.** The finding is "SV-night could not find
  where to log the pour", not "the button contrast is 4.1:1".
- **Stay inside the existing system.** Jade `#1d4f42`, limestone `#f3efe6`,
  Newsreader + Figtree, RAG for status only. `SYNTHESIS.md` §3 already rejected a
  Cinzel/teal rebrand — do not reopen it.
- **Respect the "do not touch" list** in `SYNTHESIS.md` §6.
- **Rank by impact × ease**, the same scoring the last review used, so the output
  slots straight into the existing backlog.
- **Own the hover-explanation design** — where the tooltip appears, how it behaves
  on touch (there is no hover on a phone), and how it degrades for the 5% of terms
  that need a sentence rather than a phrase.

Output: `docs/trial/design-agent.md`, appended weekly, plus a final ranked table.

---

## 6. ERPNext books

`MOCK ATLAS3 LLP` is the company for this run. Install lives at `D:\ERPNext`.

- Env: `ERPNEXT_COMPANY=MOCK ATLAS3 LLP` (default). Posting stays off.
- The never-post rule holds: Atlas reconciles, ERPNext is the book of record. Any
  agent who finds Atlas posting a voucher on its own has found a P0.
- Baseline: `node scripts/trial/probes/erpnext-baseline.mjs`
- FY close on 31 Mar is the last act of the run.

---

## 7. Readiness — the four seams are built and proven

All four blockers that would have made this a series of disconnected demos are
fixed and verified. Details and status in `docs/FIX-THIS.md`.

|         | Was                                                    | Now                                                                                                           |
| ------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| **B7**  | Audit capped at 80 events — overwritten within a day   | 5000; unit history 1000                                                                                       |
| **B8**  | No clock seam — every entry stamped with the real date | `setSimDate` moves the company through FY26-27; every `todayIso()` follows                                    |
| **B9**  | One login per role — 3 supervisors were 1 name         | 8 per-person seats, linked to their `SalesAgent` rows                                                         |
| **B10** | Fresh context + storage wipe per seat — no continuity  | One persistent profile; a lead written by SM is there when MD signs in, **including from a separate process** |

Verify before every session:

```bash
node scripts/trial/continuity-check.mjs
```

7/7 means the company is intact and the clock is where you left it. Use
`--reset` **only** for the cold start on 24 Aug 2026 — it discards the company.

### Still open, and relevant to the run

- **B12** — an aborted HTTP request can kill the dev server (`unhandled: true`
  ECONNRESET). Twenty seats over 155 days will abort requests. If the run stops,
  check the server is still alive before suspecting the app.
- **B4 / B5** — four-eyes is bypassable by the MD, and approval routing keys on
  free text. Both affect what the approvals desk proves during the run.
- **B6** — the `90d+` aging bucket filters `days > 60`. The collections desk will
  show a wrong number in Jan–Feb, which is exactly when the run looks at it.

---

## 8. Running a session

```bash
npm run dev                                    # leave it up
node scripts/trial/continuity-check.mjs        # confirm the company is intact
```

Each agent writes a short script against `scripts/trial/session.mjs`:

```js
import { openTrial, signIn, signOut, setTrialDate, go, closeTrial } from "./session.mjs";

const { context, page } = await openTrial(); // never --reset mid-trial
await setTrialDate(page, "2026-11-08");
await signIn(page, "sv2"); // Site Supervisor, Tower B
await go(page, "/app/site");
// ... do the day's work through the UI ...
await signOut(page);
await closeTrial(context);
```

Rules that keep the company coherent:

- **One session at a time.** The profile is a single company; two agents writing
  at once will clobber each other. Sessions are sequential, not parallel.
- **Always `signOut` before closing** so the next agent starts clean.
- **Set the date once per simulated day**, at the start, not per action.
- **Never pass `reset: true`** after the cold start.
- Seat keys are the short forms in `SEATS` — `md`, `pd2`, `sv3`, `ag4`, `ca2`.

`signIn` goes through the store's `signInLocal` (same credential check as the
form, no hydration race). Use `signInViaForm` when the login screen itself is
what you're testing.
