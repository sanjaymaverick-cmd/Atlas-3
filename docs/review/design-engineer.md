# Design Engineer — Atlas-3

Tokens stay **DESIGN.md**: ink / limestone / jade / RAG / Newsreader+Figtree. ui-ux-pro-max suggested Cinzel + teal — **reject**. This is polish inside the current system, not a rebrand.

Stack: React 19, TanStack Router, Tailwind v4, existing Radix set, `cmdk`, `vaul`, `recharts`, `sonner`, `lucide-react`. Prefer **zero new dependencies**.

---

## 1. CEO / MD command dashboard

### 1.1 One layer of counts, not three

- **Problem:** MD Command (`md/02-command-llp.png`, FL Command) repeats Approvals/Quality as QueueStrip + KPI row + Exceptions. Tester: role-md P1, role-finance P1. Violates UX spec §3 (max 4 KPIs) and DESIGN.md “exceptions beat decoration”.
- **Pattern:** Keep `QueueStrip` as the only count row. One money KPI (`Collections`). Exceptions become `Link` rows using `DecisionCard` for the oldest gate. Linear list fallback (ui-ux-pro-max: never rely on color alone).
- **Difficulty:** Easy
- **New deps:** No

### 1.2 Sidebar grouping + ⌘K

- **Problem:** MD/PD nav is 27–30 items; badge concatenates as “Approvals5”. Skip-link / 100-tab issue (ux-guidelines: Skip Links, Medium).
- **Pattern:** Five groups (Today, Capital, Build, Sell, Books) with “More” collapse. **cmdk is already installed** — wire `CommandDialog` (shadcn Command, https://designrevision.com/components/command) to jump to a project, approval, or unit. Nested pages: “Approvals → PO-1042”.
- **Difficulty:** Medium
- **New deps:** No (`cmdk` present; add `src/components/ui/command.tsx` if missing)

### 1.3 Oldest-gate as the hero, not a chip

- **Problem:** “oldest 6d” is a hint on a KPI, not a decision.
- **Pattern:** Reuse `DecisionCard` at the top of Command when `pending[0]` exists. Motion: 150–300ms CSS on the aging number (`tw-animate-css` already in package.json). No GSAP.
- **Difficulty:** Easy
- **New deps:** No

---

## 2. Sales pipeline & score visibility

### 2.1 Columns or a scored queue — not 8 buttons

- **Problem:** `sm/d-pipeline.png` — CatBoost banner + model picker + 8 equal actions. role-sm P1.
- **Pattern:** **Do not add @dnd-kit this week.** Use a CSS grid of stage columns (`inquiry … negotiation`) with existing `Card` + `advanceLead` on drop-or-click. janhesters/shadcn-kanban-board is the a11y reference if you later add DnD (zero extra deps, keyboard). Until then: **hot-first list**, one jade **Advance**, `DropdownMenu` for Lost/Nurture/WA/Call/Brochure (Radix dropdown already in package.json).
- **Chart:** Analytics funnel stays Recharts bars; add conversion **% as text** per stage (charts.csv Funnel: explicit %; current “By source 0%” is a trust bug — fix the calc or hide 0% when won=0 and live>0).
- **Difficulty:** Medium (columns Easy if no drag)
- **New deps:** No now; `@dnd-kit/core` only if drag is demanded (Hard + a11y work)

### 2.2 Kill the duplicate CRM funnel

- **Problem:** `/app/crm` Advance/Convert/Lost duplicates Pipeline; also the Pink City leak surface.
- **Pattern:** CRM = partner KYC + commission “Send for approval” only. Leads render as links to `/app/sales/pipeline?lead=`.
- **Difficulty:** Easy
- **New deps:** No

### 2.3 Score as a bullet, not a lab

- **Problem:** Scoring chrome is the first thing SM sees.
- **Pattern:** `GateBanner` collapsed by default. Score 78 · hot sits on the card (already there). Model switch lives under “Scoring” disclosure.
- **Difficulty:** Easy
- **New deps:** No

---

## 3. Channel agent mobile speed

### 3.1 Three-step desk, one jade

- **Problem:** `ag/m01-channel-desk.png` — 7 fields then hold then booking; two jades. role-ag P1. ux: Touch Target 44px (Pass), progressive disclosure (Don’t overwhelm upfront).
- **Pattern:** Copy **Site diary anatomy** (`se-desk-site-home.png`): one card, few fields, `h-12` primary. Step 1: calls / visits / notes (rest in “More”). Step 2: unit + customer. Step 3: live holds with **Expires in 5d**. `inputMode="numeric"` on counts.
- **Difficulty:** Easy
- **New deps:** No

### 3.2 Phone chrome

- **Problem:** Entity/project selects 102px truncate; LOCAL not “Local only”; hamburger top-left; End session only in drawer. DESIGN.md forbids hiding Local only on a phone. ux: bottom nav ≤5, right-thumb.
- **Pattern:** For `channel` / `channel_admin`: **no entity selects**. Full “Local only” chip. Bottom nav 4: Desk · Units · Chat · More. More uses **vaul Drawer** (already a dependency). End session in More and as a header text button.
- **Difficulty:** Medium
- **New deps:** No (`vaul` present)

### 3.3 Unit find without 3D

- **Problem:** Inventory table min-width 640px, primary = Dispute, no Tower A filter. role-ag / role-sm P1.
- **Pattern:** **2D stack plan**, not Three.js. Tower tabs (A/B/C) + floor rows + unit cells coloured with existing `Status`. Click available → hold sheet. This is how every Indian sales desk already thinks (stack). Housiq-style unit list is a fallback table, not the default on phone.
- **3D:** Only if a tower exceeds ~80 units and the stack becomes unreadable. Then `@react-three/fiber` is Hard + new deps + vanity risk. **No this sprint.**
- **Difficulty:** Medium (2D CSS grid)
- **New deps:** No

---

## 4. Handover / snag status

### 4.1 Stage strip, blocking item first

- **Problem:** `sm/d-handover.png` first paint is KYC checkboxes. Title promises OC/snags/possession/society.
- **Pattern:** Horizontal stepper per unit (Docs → OC → Snags → Possession → Society → DLP). Blocking stage in jade/warn. Booking docs are stage 0. Same `Status` chips. Magic UI / Aceternity tickers: **do not use** (decorative).
- **Difficulty:** Medium
- **New deps:** No

### 4.2 Snags on Site

- **Problem:** role-site P1 — engineers own snags in life; route is sales-only.
- **Pattern:** Section on `/app/site`: open snags for scoped projects, 48px Close. Calls existing `closeSnag`. Sales handover still has the stage strip.
- **Difficulty:** Easy
- **New deps:** No

---

## 5. Design system upgrades (still jade / limestone)

Add to DESIGN.md / components — do not add hues.

| Upgrade                                              | Why                        | Difficulty | Deps                |
| ---------------------------------------------------- | -------------------------- | ---------- | ------------------- |
| `RoleGate` route wrapper                             | Nav hide ≠ auth. P0 leaks. | Easy       | No                  |
| `waitingOn` on `DecisionCard` actions                | FL can pass MD’s PO.       | Easy       | No                  |
| Nav groups + badge as a child, not concatenated text | “Approvals5”               | Easy       | No                  |
| Bottom nav primitive (4 slots)                       | Channel + Site phones      | Medium     | No (vaul)           |
| `Command` palette                                    | MD 30-link sidebar         | Medium     | cmdk exists         |
| Stack-plan unit grid                                 | Inventory                  | Medium     | No                  |
| `Stepper` (handover/channel wizard)                  | Stage clarity              | Easy       | No                  |
| File input + “hash-only demo” GateBanner             | Docs/Land attach           | Medium     | No (no new storage) |
| Aging chips (0–30 / 31–60 / 90+)                     | Customers                  | Easy       | No                  |
| Empty state for entity switch                        | Stores TMT “vanishes”      | Easy       | `Empty` exists      |

**Do not add:** GSAP, Lottie, Rive, Three, Aceternity background beams, Magic UI marquee, new fonts, teal palette.

Motion (high-signal only, CSS 150–300ms, respect `prefers-reduced-motion`):

- Queue count change
- Hold lock (status chip available → held)
- Snag close (row collapse)
- Oldest-gate aging pulse at >5d (warn token, not animation spam)

ui-ux-pro-max GSAP page-transition overlays: **reject** (slow ERP, no route theatre).

---

## 6. Motion spec

| Event             | Motion                                    | Why                                       |
| ----------------- | ----------------------------------------- | ----------------------------------------- |
| Approval resolved | Card fades 200ms, queue decrements        | MD sees the inbox shrink                  |
| Unit hold         | Status chip swap, no page reload          | Agent confirmation (toast already exists) |
| Diary sealed      | Primary button → “Sealed” muted           | Already toast; keep                       |
| KPI number        | tabular-nums, optional CSS count — **no** | Numbers are small; skip count-up          |

---

## 7. 3D: no

A stack plan reduces load; a GLB tower does not. No R3F until inventory > ~80 units/tower **and** 2D stack fails UAT. Sims-like builders are the wrong metaphor (vanity).

---

## 8. Do not touch

- Site diary layout (one primary, 48px Seal, Pass/Fail)
- Gate / local login roster + “Local only · not live”
- Status chip vocabulary and RAG
- Newsreader + Figtree + jade `#1d4f42`
- Channel isolation **on** `/app/sales/channel`, `/company`, `/inventory`
- Tally “never posts vouchers” GateBanner
- `DecisionCard` anatomy
- Acquisition blocked until diligence
- Watermarked document preview
- Over-issue material refuse
- Entity switcher behaviour for in-house seats (it correctly scopes)

---

## Highest-leverage recs (summary)

1. RoleGate + Phases allowlist (P0 isolation)
2. waitingOn-scoped Approve
3. Command: delete duplicate KPIs
4. Pipeline: one primary + ⋯ menu
5. CRM: stop being a second funnel (also closes leak surface)
6. Channel phone: wizard + bottom nav + hide entity selects
7. Inventory: 2D stack, Hold not Dispute
8. Handover stepper + snags on Site
9. Customers: Collect as jade + aging chips
10. MD nav groups + cmdk
11. Legal Command = statutory; Stores Command = materials
12. File attach honesty on Docs/Land
13. CSS motion only on status change
14. No 3D, no new palette, no GSAP
