## Sales Manager
Seat: N. Bhatia · `sm@atlas.local` · home `/app/sales`.
Evidence: live walk, `screenshots/review/sm/` + `walk.json`. Desert Reach **should** be visible to this in-house seat.

### Screens tested
| Screen | Rating | 10s find? | Notes |
|--------|--------|-----------|-------|
| Sales hub | Acceptable | Yes | Units/holds/hot/commission. Duplicate counts vs Command. |
| Command | Painful | Mixed | Sales queue (available, holds, hot, approvals) **plus** the generic exceptions (inspections, statutory, NCR). |
| Inventory | Painful | Slow | Table. Only row action = Dispute. No hold-from-here. `d-inventory.png`. |
| Channel desk | Acceptable | Yes | Hold/book path works. SM sees all firms. |
| Channel firm | Acceptable | Yes | All third-party agents. Desert Reach not named on this particular list filter for in-house (sees non-inHouse agents). |
| Pipeline | Painful | No | Stacked cards, CatBoost GateBanner, ~8 actions per lead. `d-pipeline.png`. |
| Handover | Painful | No | First screen = PAN/Aadhaar checkboxes. OC/snags below the fold / easy to miss. `d-handover.png`. |
| Analytics | Acceptable | Partial | Funnel bars + scorecards. Source conversion shows 0% with live leads (trust hit). Desert Reach listed — correct. `d-analytics.png`. |
| People 360 | Acceptable | Yes | Exists. |
| Inbound | Acceptable | Yes | Inbox, not live APIs — copy says so. |
| WhatsApp | Painful | Slow | Template wall. Thread exists. Too much Meta-policy prose above send. |
| CRM | Painful | n/a | Second pipeline (Advance/Convert/Lost) beside Sales pipeline. Duplicate desk. |
| Customers | Painful | Partial | Installment schedule is good; **Record possession** is the jade primary while the next unpaid is slab 12. |
| Approvals | Painful | Yes to see, no to act | Badge 5. Copy: “View only for this role.” `canAct` omits `sales` even though `canDecideApprovals` includes it. |
| Hidden finance/site/land | Easy | n/a | Nav-hidden. Deep-link `/app/finance` is a deny page (good). |

### Friction log (with severity)
- **P1 Pipeline is not a pipeline.** Scoring model picker + engineering GateBanner sit above ingest. Each lead has Assign, Advance, WhatsApp, Call, Brochure, budget field, Book unit, Lost, Nurture, WA consent. No columns, no “next action only”, no sort-by-score default beyond card order.
- **P1 CRM and Pipeline are two funnels.** Same leads can be advanced in both. SM will double-operate.
- **P1 Approvals: sales cannot act.** `src/routes/app/approvals.tsx` `canAct` = owner \| pm \| accountant. README says partner hold→booking waits in Approvals. Today’s seed queue is PO/VO/export/RA (correctly waiting on MD/PD/FL), but when a booking request lands, SM is still view-only.
- **P1 Inventory primary is Dispute.** Available units A-0802 / B-1104 have no Hold.
- **P1 Handover does not answer “can we give keys?”** Title promises OC, snags, possession, society; fold is KYC docs.
- **P2 Analytics “By source” 0% won** next to a funnel that has visits/negotiation — looks broken even if sample is small.
- **P2 Command still leads with programme/NCR** for a sales seat (walk.json textSample).
- **P2 WhatsApp / Inbound** are operator tools with owner-TODO banners that steal the first 5 seconds.
- **P3** Nav mixes Customers, CRM, Sales, Inventory, Channel desk, Channel firm, Pipeline, Handover, Analytics, Inbound, WhatsApp, Customer 360 — 12 sales-ish items.

Isolation: SM **correctly** sees Desert Reach on analytics (`R. Shekhawat · Desert Reach Channel`). No leak here — that is the in-house job.

### Data entry difficulty
Ingest lead: **~6 fields + Ingest & score** — Acceptable but the scoring chrome makes it feel like a lab.
Hold unit: **unit + customer + date + Place hold**, gated on daily report — Acceptable.
Book from hold: **value + Request booking** — Easy.
Advance lead: **1 click** among 8 twins — Painful (misclick risk).
Collect installment (Customers): **1 click** but jade is on Record possession — Painful.

### Data lookup difficulty
Hot leads: **< 3s** on hub.
“Who has not filed today?”: **Acceptable** on analytics scorecard (0 reports chips).
Stale hold: **no countdown**.
Snag blocking A-1204: **Painful** (handover IA).

### Top 5 concrete UI/UX recommendations
1. **Pipeline = columns (or a scored queue) + one primary.** Put Advance as the jade button; dump Call/Brochure/WA/Lost/Nurture into a `⋯` menu (`DropdownMenu` already in Radix set). Collapse scoring models behind “Scoring” disclosure. Default sort: hot → warm, then score.
2. **Deprecate CRM as a second funnel.** Keep CRM for partner KYC + commission send-for-approval only; remove Advance/Convert/Lost from `/app/crm` or deep-link those cards to Pipeline.
3. **Inventory row primary = Hold** (or “Open in channel desk”) for `available`; Dispute is overflow.
4. **Handover = horizontal stage strip** per unit (Docs → OC → Snags → Possession → Society → DLP) with the blocking item in jade. Booking docs are stage 0, not the page.
5. **Fix `canAct` to use `canDecideApprovals`**, and only enable Approve when `waitingOn` matches this seat (or kind is booking/commission).

### Must-fix before go-live
- One funnel, not CRM + Pipeline (P1).
- Pipeline action density (P1).
- Approvals action rights vs `canDecideApprovals` (P1, will bite the first partner booking).
- Handover first paint = blocking status, not KYC list (P1).
