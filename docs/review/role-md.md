## Managing Director
Seat: S. Mehta · `md@atlas.local` · home `/app/approvals` when pending > 0, else `/app`.
Evidence: live walk 2026-08-23, `screenshots/review/md/` (Command, Owners Hub, Capital, Approvals, Decisions, Sales, Tally).

### Screens tested
| Screen | Rating | 10s find? | Notes |
|--------|--------|-----------|-------|
| Command | Painful | Yes for the question, no for the answer | Queue + 4 KPIs + Exceptions repeat the same four numbers. Sidebar is ~30 items and clips (Site & quality is last visible item). |
| Owners Hub | Acceptable | Yes | Open items + project health with concept flag. Thin vs Command. |
| Capital | Acceptable | Yes | Concept land labelled “not committed”. Entity switch changes rows. |
| Approvals | Easy | Yes (~1s) | DecisionCard anatomy is correct (kind, waitingOn, aging, amount, context). MD can Approve/Reject. Badge `5` on nav. |
| Owner decisions | Acceptable | Yes | Record path works. Dense and long. |
| Projects / project detail | Acceptable | Yes | Entity scope works (LLP = Kanakpura only). |
| Sales hub / analytics | Acceptable | Partial | Funnel and scorecards exist; Command does not surface sales heat. |
| Inventory | Painful | Slow | Spreadsheet. Primary row action is Dispute. |
| Pipeline | Painful | Slow | Card dump, not a board. Scoring chrome above the work. |
| Handover | Painful | No | First paint is booking-doc checkboxes, not OC → snags → possession. |
| Tally | Easy | Yes | “Never posts vouchers” is unmistakable. Reconcile works. |
| All phases | Painful | n/a | Product catalog of 11 modules, not a programme. |
| Site / Controls / Land / Docs / CRM | Acceptable–Painful | Mixed | Visible because MD sees everything; none are the MD job. |
| Test pack | Easy | Yes | Correctly MD-only. |
| Mobile Command | Painful | Hard | Hamburger + truncated entity/project; nav is a novel. |

### Friction log (with severity)
- **P1 Command duplicates itself.** Queue strip (Approvals 4, Failed inspections 1, Open NCRs 1, Tally 1) is restated as KPIs (Collections, Open gates 4, Quality 1, Spent 45%) and again as Exceptions. Spec: max 4 KPIs, exceptions beat decoration. `02-command-llp.png`.
- **P1 Nav is a filing cabinet.** 30 links. Cognitive budget is ~4 chunks. MD cannot reach WhatsApp / People / Decisions without scrolling the sidebar. Sales cluster and construction cluster compete.
- **P1 No “what do I decide in the next 10 minutes?”** Approvals is the real MD home (and the router already sends MD there when pending > 0), but Command is the louder screen and does not deep-link the oldest item (6d) as a card.
- **P2 Collections ₹1.03 Cr vs still ₹50.7 L** is the best number on Command, then drowned.
- **P2 All phases** is an internal module map with live links. An MD does not need Phase 1–11 as IA.
- **P2 Inventory / pipeline / handover** are in-house sales tools with the wrong primary action for an owner glance.
- **P3** Some Playwright captures of later MD screens are empty (4719-byte PNGs) — capture flake, not a blank app. `02-command-llp.png` is the trustworthy Command shot.

### Data entry difficulty
Approvals: **1 click** Approve/Reject once the card is on screen — Easy.
Owner decisions: **few fields + Record** — Acceptable.
Tally Reconcile: **1 click** with the right toast — Easy.
MD should almost never type. The pain is finding the decision, not entering it.

### Data lookup difficulty
Cash vs plan, oldest gate, failed inspection: **< 3s if you ignore the duplicates**.
“Which channel firm is dead this week?”: **> 10s** — buried in Sales analytics scorecard (V. Meena 14 calls vs K. Pink 0 / S. Qureshi 0 / Desert Reach Shekhawat 9).
“Which unit is stuck in snags?”: **Painful** — Handover does not lead with stage.

Isolation: MD **should** see Pink City and Desert Reach. Analytics scorecard correctly lists R. Shekhawat · Desert Reach. Entity switch LLP ↔ Aravalli Homes actually changes projects and Tally cases. No false isolation bug for this seat.

### Top 5 concrete UI/UX recommendations
1. **Collapse Command to one layer.** Keep QueueStrip as the only count row. Delete the four duplicate KPIs (Open gates = Approvals waiting; Quality = Failed inspections). Keep Collections as the single money KPI. Make each Exception a `Link` to the object, not a sentence.
2. **Group the MD sidebar into 5 sections** (Today / Capital / Build / Sell / Books) with the rest behind a “More” disclosure. Default land remains Approvals when pending > 0.
3. **Oldest-gate card on Command** — reuse `DecisionCard` for the 6-day PO, not a count chip.
4. **Sales glance on Command** — one line: “2 hot · 0 holds · Pink City 14 calls / Desert Reach 9 / two agents at 0”. Link to analytics.
5. **Do not put scoring-model chrome** (CatBoost / XGBoost) on any MD-facing surface. That stays on Pipeline, collapsed.

### Must-fix before go-live
- Command cognitive load (duplicate KPI/queue/exceptions) — P1 polish, not a data bug.
- Nav grouping so Approvals, Capital, Tally, Decisions are reachable without scrolling past Site & quality.
- Confirm entity switch remains the legal-entity scope (it does today — do not “fix” it into a global mash).
- No Tally post language anywhere an MD can click (currently clean).
