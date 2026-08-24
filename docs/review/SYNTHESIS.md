# Atlas-3 UX review — master synthesis

Local demo, TanStack Start + Zustand. Walked live seats on 2026-08-23. **No rebuild.** Sources: `docs/review/role-*.md`, `design-engineer.md`, `screenshots/review/**`.

Testers ran Playwright against `http://127.0.0.1:8080` with the real passwords. Subagents died before writing markdown; this synthesis is built from their screenshots + JSON plus a second source pass. Empty 2743/4719-byte PNGs are capture flake, not blank UI.

---

## 1. Role-by-role severity matrix

Ratings: **E** Easy · **A** Acceptable · **P** Painful · **B** Broken. Worst cell in the row drives go-live risk.

| Seat | Command | Core desk | Nav / IA | Isolation | Mobile | Worst P0/P1 |
|------|---------|-----------|----------|-----------|--------|-------------|
| **MD** | P | A (Approvals) | P (30 links) | A (should see all) | P | Duplicate Command; nav scroll |
| **PD** | P | A (Projects/Changes) | B (“All phases” = sitemap) | A (entity switch works) | P | Programme not findable |
| **SM** | P | P (Pipeline/Handover) | P (12 sales items + CRM twin) | A (Desert Reach **should** show) | P | Two funnels; 8 actions/lead; approvals `canAct` omits sales |
| **Channel Admin** | P | E (Company/Desk) | B (Phases backdoor) | **B** | P | **CRM shows Desert Reach** |
| **Channel Agent** | P | P (7-field report) | B (Phases + Projects ₹) | **B** | **P** | Same CRM leak; phone chrome |
| **SE / SV** | P | **E** (Site diary) | P (Land chip) | A | P | Snags on sales route; Command→Land |
| **Finance Lead** | P | E (Tally) | A | A | P | Approve MD’s PO; no collections aging |
| **Commercial** | P | A | B (unguarded capital/customers) | A | A | Deep-link mutations |
| **Land & Legal** | P | A (Land cards) | P | B (Approvals URL) | P | Cannot add parcel; filed w/o evidence |
| **Docs** | P | A (register) | B | **B** | P | **Mutates Land via URL**; no file input |
| **Stores / QS** | P | P/B (Issue qty) | B | B (Commercial URL) | A targets | Issue doesn’t apply; Command is engineer’s |

**Isolation headline:** Pink City **does not** see Desert Reach on Channel desk / Company / Inventory. Pink City **does** see Desert Reach on `/app/crm` (and walks there from All phases). That is the only P0 data leak testers proved.

**Permission headline:** Nav filter ≠ route guard. Sales child routes often `Navigate` away (good). CRM, Org, Land, Documents, Site, Commercial, Customers, Changes, Approvals mostly do not.

---

## 2. Top 15 UI/UX changes (impact × ease)

Ranked for a team that is **almost finished**. Impact 1–5, ease 1–5 (5 = easy). Score = impact × ease.

| # | Change | Impact | Ease | Score | Fixes |
|---|--------|--------|------|-------|-------|
| 1 | **`RoleGate` on every `/app/*` route** + Phases links use the same allowlist | 5 | 5 | 25 | CA/AG CRM leak; DC land mutate; Stores PO mutate |
| 2 | **Approve only if `waitingOn` matches seat** (`canDecideApprovals` ∧ waitingOn) | 5 | 5 | 25 | FL four-eyes; SM view-only vs sales bookings |
| 3 | **Command: drop duplicate KPI row** (keep QueueStrip + one money KPI + linked exceptions) | 4 | 5 | 20 | MD/PD/FL/SM cognitive load |
| 4 | **CRM stops being a second pipeline** (KYC + commission only) | 4 | 5 | 20 | SM double-entry; shrinks leak surface |
| 5 | **Pipeline: one jade Advance + `⋯` menu**; collapse CatBoost chrome | 4 | 4 | 16 | SM P1 |
| 6 | **Channel phone: 3-step desk, hide entity selects, “Local only” full text** | 5 | 3 | 15 | AG P1 |
| 7 | **Inventory primary = Hold**; tower chips / 2D stack; Dispute in overflow | 4 | 3 | 12 | SM/AG |
| 8 | **Handover horizontal stepper**; booking docs = stage 0 | 4 | 3 | 12 | SM/MD |
| 9 | **Open snags section on Site** (`closeSnag` already exists) | 4 | 5 | 20 | SE/SV gap |
| 10 | **Customers: Collect = jade; aging chips 0–30/60/90** | 4 | 4 | 16 | FL |
| 11 | **MD/PD nav groups (Today/Build/Sell/Books) + cmdk** | 3 | 3 | 9 | MD/PD |
| 12 | **Seat-specific Command queues** (Legal=statutory, Stores=materials, Channel=unfiled/holds, Site=no Land link) | 4 | 3 | 12 | 6 seats |
| 13 | **Fix Stores Issue qty update** + per-line qty | 4 | 4 | 16 | Stores Broken |
| 14 | **Land: Mark filed requires acknowledgement**; add parcel/obligation disclosure | 4 | 3 | 12 | Legal P1 |
| 15 | **Docs: file input or honest “hash-only demo” banner** | 3 | 4 | 12 | DC P1 |

Items 1, 2, 3, 4, 9, 13 are **this week**. 6–8, 10–12, 14 are a focused sprint. 15 depends on whether UAT expects real files.

---

## 3. Design system upgrades

From `design-engineer.md`. Stay on jade/limestone. **Reject** ui-ux-pro-max Cinzel/teal rebrand.

| Add | Purpose |
|-----|---------|
| `RoleGate` | Route-level allowlist |
| waitingOn-aware `DecisionCard` actions | Four-eyes |
| Nav groups + badge as sibling | “Approvals5” |
| Bottom nav (4 slots) + vaul More | Channel/Site phones |
| shadcn `Command` on existing `cmdk` | MD jump-to |
| Stack-plan unit grid | Inventory find |
| `Stepper` | Handover + channel wizard |
| Aging chips | Collections |
| File field + demo GateBanner | Docs/Land |

**Not added:** GSAP, Lottie, Rive, Three.js, Aceternity beams, new fonts, @dnd-kit (unless UAT demands drag).

Motion: 150–300ms CSS on hold lock, approval resolve, snag close. `prefers-reduced-motion`. No route overlays.

3D: **No.** 2D stack plan first.

---

## 4. Quick wins (this week)

1. RoleGate + lock `PHASES` links to `NAV_ROLES` (P0).
2. `canAct = canDecideApprovals(role) && waitingOnMatches(user, approval)` (P1).
3. Delete Command’s second KPI row where it duplicates QueueStrip (P1 polish).
4. Strip Advance/Convert/Lost from CRM (P1 + leak shrink).
5. Pipeline card: hide 7 actions in `DropdownMenu`; Advance stays.
6. Inventory: rename/relocate Dispute; Hold for `available`.
7. Site: render open snags; remove Land from site Command queue.
8. Stores: fix Issue mutation; one qty input per line; GateBanner “quantities, not GRNs”.
9. Header: `Local only` untruncated on `sm:hidden`; End session visible without opening the drawer.
10. Customers: swap jade to Collect next installment.

---

## 5. Larger redesigns (one sprint each)

**Sprint A — Field phones (Channel + Site)**  
Bottom nav, channel 3-step wizard (3 fields), hide entity/project for `channel*`, hold expiry countdown, tower chips.

**Sprint B — Sell**  
Stage columns for Pipeline (click-to-advance, no drag required), 2D stack plan, handover stepper, analytics conversion % honesty.

**Sprint C — Owner Command**  
Grouped nav, cmdk, oldest-gate `DecisionCard` on Command, sales one-liner (hot / dead agents), All phases either hidden for PD or replaced by `ProjectTimeline` as the page.

**Sprint D — Books & land**  
Collections aging, Land add+evidence, Docs file or banner, Stores read-only PO strip (no Invite vendor).

Do **not** schedule a visual rewrite, a 3D tower, or a new CRM.

---

## 6. Do not touch

These already work; rewriting them is a regression:

- **Site diary** — one jade Seal, 48px, Pass/Fail, fail→NCR
- **Local login** — seat chips, passwords on-host, Local only badge
- **Status / RAG vocabulary** and `DecisionCard` anatomy
- **Jade + limestone + Newsreader/Figtree**
- **Channel isolation on Channel desk, Company, Inventory** (Pink City ≠ Desert Reach there)
- **Tally never-posts** copy and the deny page for non-finance seats
- **Acquisition blocked until diligence** (toast proven)
- **Watermarked preview, quarantine scan, four-eyes original**
- **Over-issue material refuse**
- **Entity switcher for in-house seats** (LLP vs Aravalli actually changes rows)
- **Sales redirects** on pipeline/handover/analytics for third-party (keep; extend to CRM)

---

## How to read the seat files

| File | Seat |
|------|------|
| `role-md.md` | Managing Director |
| `role-pd.md` | Project Director |
| `role-sm.md` | Sales Manager |
| `role-ca.md` | Channel Admin |
| `role-ag.md` | Channel Agent |
| `role-site.md` | Site Engineer / Supervisor |
| `role-finance.md` | Finance Lead / Commercial |
| `role-legal.md` | Land & Legal / Docs |
| `role-stores.md` | Stores / QS |
| `design-engineer.md` | Patterns, libs, difficulty, deps |

Go-live is blocked on **RoleGate (P0 leak)** and **waitingOn-scoped approvals (P1 four-eyes)**. Everything else is clarity on a product that already has the right objects.
