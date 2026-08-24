# Atlas 3 — Screen-by-Screen UX Spec

**Status:** Local only · not live  
**Audience:** Build / UAT  
**Basis:** Cognitive load budget (~4 chunks), role-based surfaces, progressive disclosure, construction field constraints, high-stakes approval workflows

---

## 0. Global rules (every screen)

| Rule | Spec |
|------|------|
| **Cognitive budget** | One primary question per screen. Secondary data is collapsed or one click away. |
| **Recognition over recall** | Status, amount, owner, aging always visible on the decision card — never require memory of a previous page. |
| **Match the real world** | Labels: Purchase order, VO, Four-eyes, Diligence, RA — not internal codes alone. Codes may sit secondary in mono. |
| **Visibility of status** | Every material object shows: state chip + who waits + how long + amount (if money). |
| **Error prevention** | Invalid actions are disabled or refuse with one plain-language reason. Do not open a form that cannot succeed. |
| **Feedback** | Every Approve / Reject / Seal / Convert writes audit + on-screen confirmation (toast). |
| **Consistency** | Same status chip language as `src/lib/glossary.ts` + `status.tsx`, same card anatomy, same left nav. Vocabulary is plain English (24 Aug 2026 lock). |
| **Density** | Office screens may be dense and table-led. Site screens stay sparse, large targets, few fields. |
| **Role filter** | Nav and default home adapt to role. Never show company-accounts / ERPNext actions to Site Engineer. |

### Status chip vocabulary (lock this — plain English)

Short codes may appear in the hover (`Hint`), never as the only label. Full table: `DESIGN.md` and `src/components/status.tsx`.

| Value | Chip | Tone |
|-------|------|------|
| pending | Waiting | warn |
| review | Under check | warn |
| quarantine | Waiting for virus scan | danger |
| variance | Numbers do not match | warn |
| accrued | Earned, not paid | warn |
| approved / active / clear / filed / ready / won | as-is / glossary name | ok |
| rejected / lost / cancelled / flagged / overdue / fail | Stop or fix | danger |

### Card anatomy (decision unit)

```
[KIND · mono label]
Title (display font)
Meta: waitingOn · aging · amount
[Status chip]
[Primary action] [Secondary]
```

### Table anatomy (comparable rows)

Sortable columns; status last; primary action inline only when one clear next step exists.

---

## 1. Gate / Local login

**Primary question:** Who is testing, and is this still local?

| Element | Spec |
|---------|------|
| Badge | `LOCAL ONLY · NOT LIVE` always visible |
| Form | Email + password; Enter submits |
| Test roster | Clickable seats fill the form (no auto-login without password type for UAT discipline) |
| Copy | No production passkey language as if live |
| After success | Route by role (see §2) |

**Do not:** Hide that this is a test host.

---

## 2. Role-based home (first screen after login)

| Role | Default route | Why |
|------|---------------|-----|
| Managing Director / UAT owner | `/app/approvals` if pending > 0, else `/app` Command | Decision queue first |
| Project Director | `/app` Command | Cross-project risk |
| Site Engineer | `/app/site` | Today’s work |
| Finance Lead | `/app/finance` | Cases waiting |

Command remains reachable for all office roles via nav.

---

## 3. Command (`/app`)

**Primary question:** Are we okay, and what needs a human?

### Layout (top → bottom)

1. **Queue strip (Focus layer)** — count + deep link  
   - Approvals waiting  
   - Failed inspections / open NCRs  
   - Overdue statutory obligations  
   - Aging collections (optional)

2. **KPI row (max 4)** — one decision each  
   - Cash collected vs plan (or month collection)  
   - Open gates (approvals count)  
   - Quality (failed inspections)  
   - Timeline risk (projects behind)

3. **Project timeline** — bar per project; click → project detail  
4. **Risk / exception strip** — only items that need attention  
5. **Charts** — only if they change a decision (e.g. collection bars). No decorative charts.

### Role variants

- Engineer: suppress money KPIs; keep quality + site signals.  
- Finance: emphasize company-accounts open cases + collection.

### Anti-patterns

- More than 4 primary KPIs.  
- Charts without a next action.  
- Mixing “everything is fine” noise with exceptions.

---

## 4. Approvals (`/app/approvals`)

**Primary question:** What am I deciding, and do I have enough context to decide without leaving?

### Queue card must show

| Field | Required |
|-------|----------|
| Kind | Purchase order / Change / Document export / Commission / Payment |
| Title | Human title |
| Waiting on | Role or named seat |
| Aging | Days waiting |
| Amount | If money |
| **Context line** | Vendor name, project, or document class |
| Actions | Approve · Reject (role-gated) |

### Progressive disclosure

- Default: queue only.  
- Expand or “Open detail” for: linked vendor stage, quote summary (when Quotations exists), document classification, payment case note.  
- Closed items in a separate “Closed” section, collapsed by default.

### Rules

- Reject and Approve both require the action to land on audit chain.  
- View-only roles see cards without action buttons + one line: “View only for this role.”  
- Never approve from a card that lacks amount when kind is money.

### When Quotations ships

PO cards must show: `Selected quote · Vendor · ₹X · vs N other quotes` with link to comparison.

---

## 5. Commercial (`/app/commercial`)

**Primary question:** Can this vendor trade, and what orders are in flight?

### Sections (order)

1. **Invite vendor** — name, trade, city, GSTIN  
2. **Vendors** — stage chip + Advance + GSTIN if missing  
3. **Issue purchase order** — project, vendor (Active only succeed), title, amount  
4. **Orders & contracts** — table  

### Invariants (must stay visible in UI copy)

- No PO until vendor **Active**.  
- Advance to verified requires GSTIN.  
- Activate may route through Approvals.  
- Contract execute requires document evidence.

### Empty / error

Refuse with exact reason: *“Purchase orders cannot be issued until the vendor is Active.”*

---

## 6. Quotations (new — required for mental model)

**Route:** `/app/commercial` tab or `/app/quotations`  
**Primary question:** Which quote wins, and why is it safe to turn into a PO?

### Objects

| Object | Fields |
|--------|--------|
| **RFQ** | Project, package title, due date, status (open / awarded / cancelled) |
| **Quote** | RFQ, vendor, amount, validity, exclusions, status (submitted / selected / rejected) |

### Screens

**A. RFQ list**  
Table: package · project · quotes received · due · status · action “Compare”

**B. Compare (Focus layer)**  
Side-by-side or ranked table:

| Vendor | Amount | Validity | Exclusions | Stage | Select |

- One **Select** only.  
- Select does **not** create money movement; it marks quote selected and enables **Create PO from quote**.  
- Create PO pre-fills vendor + amount + title; still lands in Approvals.

**C. RFQ detail**  
History: who submitted, when, who selected, link to resulting PO.

### Rules

- Cannot select quote from non-Active vendor.  
- Cannot create PO without selected quote when RFQ is required for that package type (config later; default: optional for demo, required for lift/MEP packages in seed).  
- Approval card references RFQ id + selected vendor.

### Why this screen exists

Without it, Approvals shows PO-1042 with no path to “see quotations submitted” — pure extraneous cognitive load.

---

## 7. Site & quality (`/app/site`)

**Primary question:** What do I seal or pass/fail *today*?

### Field-first constraints

| Constraint | Spec |
|------------|------|
| Touch | Primary buttons full-width on mobile; min height ~44–48px |
| Fields | Diary: project, labour, weather, major work only on first screen |
| Offline intent | Copy may say “works when signal returns” (implement later); never assume always-online |
| One action | **Seal diary** is the hero; inspections secondary |

### Diary

- Idempotent: second seal same device/date refuses with clear reason.  
- Success: “Diary sealed for today” + audit.

### Inspections

- Schedule: template + location.  
- Pending: Pass / Fail only.  
- Fail → auto NCR in Change control; toast states that explicitly.

### Anti-patterns

- Dense office tables as the first thing a site engineer sees.  
- Multi-step wizards for a single daily diary.

---

## 8. Documents (`/app/documents`)

**Primary question:** Is this file safe to use, and who may take the original?

### List

- Title, kind, classification, revision, status chip.  
- Actions by state: Clear quarantine · Issue · Add revision · Request export.

### Preview

- Watermarked preview overlay (portal, high z-index).  
- Never present watermarked view as “original.”

### Export

- Request → Approvals (four-eyes) → single-use grant → consume.  
- UI must say “one download” when grant is live.

### Copy

- Quarantine reason visible.  
- Issued = usable on site; draft/quarantine = not.

---

## 9. Land & legal (`/app/land`)

**Primary question:** Can we acquire, and what statutory clock is ticking?

### Sections

1. Parcels (status: identified → diligence → acquired)  
2. Diligence checklist per parcel  
3. Obligations (RERA / labour / insurance / tax)  
4. EMI schedule (ops — not ERPNext)

### Gate

- Acquire disabled until all diligence **clear**.  
- Refuse reason: list open/flagged items.

### EMI

- Pay marks ops status only; no voucher language.

---

## 10. Controls (`/app/controls`)

**Primary question:** Can we issue this quantity without breaking the receipt ledger?

### Materials

- Received / issued / remaining on one row.  
- Issue refuses if qty > remaining; reason explicit.

### Quantities

- BIM vs site; variance chip; approve path for variance.

---

## 11. Change control (`/app/changes`)

**Primary question:** What is open, what is SLA-burning, what closes only after proof?

| Kind | Open actions | Close rule |
|------|--------------|------------|
| RFI | Respond | Response closes |
| NCR | Close after re-inspection | Block close without pass path |
| VO / Change | Raise → Approvals | Status follows approval |

SLA hours visible on RFI cards when set.

---

## 12. CRM (`/app/crm`)

**Primary question:** Who is in the funnel, and does conversion create a clean booking + commission?

### Pipeline cards

- Stage chip, unit interest, partner, Advance / Convert / Lost.

### Convert

- Creates booking + payment steps.  
- Active partner → commission **accrued** (not paid).  
- Toast: commission accrued; payment still needs approval.

### Partners & commission

- Invite / activate.  
- Accrued → Send for approval → Approvals.  
- Never a “Pay now” that posts to books.

---

## 13. Customers (`/app/customers`)

**Primary question:** Is this unit free, and is the collection plan honest?

### Booking card

- Unit, customer, collected/value, progress bar.  
- **Payment steps** listed under the bar (label · due · paid/amount).  
- Collect applies to next unpaid step.  
- Possession only when fully collected; refuse otherwise.  
- Cancel frees unit if not possessed.  
- Snags listed; close snag inline.

### Invariants in UI

- One active booking per unit.  
- Collection cannot exceed plan.

---

## 14. Company accounts (`/app/finance`)

**Primary question:** Which cases are open, and did a human accept the exception?

### Rules in chrome

- Banner or description: **Atlas never posts a voucher. ERPNext at D:\ERPNext remains the books. Posting is off by default.**
- Title: **Company accounts (ERPNext)**

### Cases

- Reconcile / Exception only.  
- Exception requires visible acceptance, not silent rewrite.

---

## 15. Organization (`/app/org`)

**Primary question:** Who are the people and entities, and where is local DR named?

### Blocks

- People (role, active seat marker)  
- Legal entities (GSTIN, project count)  
- **Local hosts** Aerovista / Acropolis — primary vs standby; Mark ready = local ops only  
- Latest audit (short)

---

## 16. Owner decisions (`/app/decisions`)

**Primary question:** What is still open policy?

- Recorded items show note; Reopen for owner only.  
- Open items require written note before Record.

---

## 17. Audit (`/app/audit`)

**Primary question:** What happened, in order?

- Chronological list: actor · action · entity · time.  
- No edit. Filter by project/entity later if needed.

---

## 18. Assistant (`/app/assistant`)

**Primary question:** Can I get a draft without the system acting?

- Level-2 drafts only after AI hosting decision recorded.  
- Explicit: never approve, pay, sign, or delete.  
- Fail-closed copy if hosting were reopened.

---

## 19. Test pack (`/app/testing`)

**Primary question:** What scripts prove invariants before go-live?

- Accounts table.  
- Numbered scripts (documents, land, PO gate, diary idempotency, CRM commission, etc.).  
- Phase coverage checklist.

---

## 20. Project detail (`/app/projects/$id`)

**Primary question:** One project’s health without leaving context.

- Header: name, entity, progress, sold.  
- Mini queues: open approvals, open NCRs, overdue obligations for this project.  
- Links into Documents / Site / Commercial scoped mentally (filters already global).

---

## Implementation priority (local)

| Priority | Work | UX gain |
|----------|------|---------|
| P0 | Quotations RFQ + compare + select → PO | Fixes “where are quotes?” |
| P0 | Role-based default home | Cuts extraneous nav |
| P1 | Approval cards: vendor + context line | Recognition over recall |
| P1 | Command queue strip first | 5-second “what needs me?” |
| P2 | Site mobile density pass | Field-first |
| P2 | Payment steps always under booking | Plan honesty |
| P3 | Global search (command palette) | Expert efficiency |

---

## CLT checklist (pass / fail per screen)

Pass = a first-time MD can answer the primary question in ~5–15s; ≤6 L1 chunks; RAG colour only; one primary action.

| Screen | Primary question | ≤6 L1 | Queue/exceptions first | One visual | Site 48px | Pass? |
|--------|------------------|-------|------------------------|------------|-----------|-------|
| Gate | Who is testing, still local? | yes | LOCAL badge | — | n/a | |
| Command | On track / what needs a decision? | yes | QueueStrip | Timeline only | n/a | |
| Approvals | Enough context to decide here? | yes | DecisionCards | — | n/a | |
| Quotations | Which quote wins, safe to PO? | yes | Compare table | — | n/a | |
| Commercial | Can this vendor trade? | yes | GateBanner | — | n/a | |
| Site | What do I seal or pass today? | yes | Diary hero | — | yes | |
| Documents | Safe to use / who takes original? | yes | Status + hold reason | — | n/a | |
| Customers | Unit free, collection honest? | yes | Next unpaid step | — | n/a | |
| CRM | Funnel + commission accrued only? | yes | Convert value | — | n/a | |
| Company accounts | Open cases; Atlas never posts? | yes | GateBanner | — | n/a | |
| Portfolio | Open items + health by project? | yes | Role queue | — | n/a | |
| Capital | Plan vs JTD vs remaining? | yes | Table | — | n/a | |
| Test pack | Scripts prove invariants? | yes | Numbered scripts | — | n/a | |


---

## Acceptance checks (UX, not just code)

1. MD can approve PO-1042 without opening Commercial — context enough on card (or one expand).  
2. Site engineer seals diary in ≤3 interactions after project chosen.  
3. Non-Active vendor PO attempt fails with readable reason.  
4. User looking for quotations has a labeled path under Commercial within one click of nav.  
5. Finance never sees a control that implies Atlas posted a voucher.  
6. Failed inspection toast mentions NCR created.  
7. Local-only badge visible on gate and shell.

---

*End of spec. Implement P0 Quotations next unless product order changes.*
