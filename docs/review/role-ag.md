## Channel Agent
Seat: V. Meena · Pink City · `ag@atlas.local` · home `/app/sales/channel`.
Evidence: mobile-first live walk (390×844), `screenshots/review/ag/` + `report.json`. Taps timed.

### Screens tested
| Screen | Rating | 10s find? | Notes |
|--------|--------|-----------|-------|
| Channel desk (phone) | Painful | Title yes; hold no | 7-field daily report before hold. File daily report is full-width jade (good). Place hold is outline. Request booking is a second jade. `m01-channel-desk.png`. |
| Hold flow | Acceptable once report filed | — | Hold refused until report (`m02-hold-refused.png`). Then 4 taps to place (`m04-hold-placed.png`). Toast “Unit locked on hold.” |
| Inventory (phone) | Painful | No | No tower filter. Table min-width 640px — horizontal hunt for Tower A. 2 taps to open (hamburger + Inventory). |
| Sales hub | Acceptable | Partial | Blank/failed later mobile shots (2743 B); desktop hub is scoped. |
| WhatsApp | Painful | Slow | Leave inventory to share a unit. |
| Command | Painful | Wrong data | Programme / inspections / NCR / statutory still on the canvas for a field agent. |
| All phases | **Broken** | — | Live links into CRM/Land/Site/Documents/Org/Changes. CRM names **Desert Reach**. |
| Projects | Painful | — | Budget ₹48 Cr / spent ₹21.4 Cr shown to a channel agent. |
| Audit | Acceptable | — | |
| Company / Pipeline / Handover / People / Analytics | Easy (redirect) | — | Sales routes redirect to Channel desk. Finance is a deny page (no post). |
| Hamburger | Painful | — | Top-left 44×44, opposite right thumb. 8 destinations + End session. No seat name. `m05-hamburger.png`. |

### Friction log (with severity)
- **P0 CRM leak via All phases / typed URL.** `/app/crm` renders Desert Reach. Same class of bug as Channel Admin. Intended desk is clean (no Mansar note, no C-512, no Shekhawat).
- **P1 Daily report is 7 fields** (Calls, Visits, Leads, Holds, Bookings, Cancellations, Notes). DESIGN.md Site density: few fields, ~48px primary. Best-case 1 tap if defaults kept; realistic cabin use is 5 taps / 879ms after landing (`report.json` taps).
- **P1 Header eats the job.** Entity select 102px “Kanakpur”, project 102px “All projec”, LOCAL chip (not “Local only” — DESIGN.md forbids hiding that on a phone). Sticky header 69px covers CTAs.
- **P1 Inventory cannot answer “west stack Tower A”. ** No tower/floor chips. No share-to-WhatsApp.
- **P1 Hold expiry is a date** (`until 2026-08-28`), not hours left.
- **P1 Hamburger vs thumb.** Top-left; End session only lives there (desktop footer is hidden < lg).
- **P2 Two/three jade buttons** on one long page (File report, Request booking, later WhatsApp send).
- **P2 No “my holds only”** — firm holds would mix (S. Qureshi).
- **P2 Command / Projects / Phases** are developer furniture on a field seat.

Isolation that **works**: live holds on Channel desk = Pink City (S-12 · R. Soni; later A-0802 walk-in). Available units do not include C-512. Sales child routes redirect.

### Data entry difficulty
File today’s report: **Painful** (7 fields) / **Easy** if defaults are honest.
Place hold: **4 taps** after report (unit, customer, date default, Place hold) — Acceptable.
Request booking: **value + jade** — Easy, but competes with File report.
Find Tower A available: **Painful** (no filter, wide table).

### Data lookup difficulty
My live hold: **Easy** (on the same long page, below the fold on 390px — must scroll past 7 fields).
Hold hours remaining: **Broken** (date only).
Other firm’s Mansar stack: **must be invisible** — true on desk, false on CRM.

### Top 5 concrete UI/UX recommendations
1. **Channel desk as a 3-step wizard, one jade at a time:** (1) File report — 3 fields (calls, visits, notes) with the rest in “More”; (2) Hold — unit picker + customer; (3) Live holds. Use existing `Card` + `Button` h-12. Do not add a new module.
2. **Phone chrome for `channel`:** drop entity/project selects; keep “Local only” in full; move nav to a **bottom bar of 4**: Desk, Units, WhatsApp, More. Hamburger is a fallback. `vaul` is already a dependency if you want a sheet for More.
3. **Inventory = tower chips + available/held.** CSS grid of unit codes (A-0802) coloured by Status. Hold is the row action. WhatsApp share uses the existing send path with the unit prefilled.
4. **Hold card: “Expires in 5d”** (tabular) + RAG at <24h.
5. **RoleGate + Phases allowlist** identical to Channel Admin. Hide Projects budget or hide Projects entirely for `channel`.

### Must-fix before go-live
- P0 CRM/Phases leak (Desert Reach).
- P1 mobile header (entity selects + Local only).
- P1 7-field report vs site density.
- P1 inventory has no tower find and no share.
