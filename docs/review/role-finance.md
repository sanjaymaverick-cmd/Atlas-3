## Finance / Commercial
Seats: P. Jain `fl@atlas.local` (home `/app/finance`) and A. Kapoor `cm@atlas.local` (home `/app/commercial`).
Evidence: `screenshots/review/finance/report.json` + FL/CM screenshots. FL runner threw after the first batch (`list.push is not a function`); CM screens still captured (commercial, quotations, mobile menu, finance deeplink).

### Screens tested
#### Finance Lead
| Screen | Rating | 10s find? | Notes |
|--------|--------|-----------|-------|
| Tally | Easy | 11ms | “ERP invoice missing in Tally — PO-1018 RA-06”. Never-posts copy. Reconcile / Accept exception. Entity switch LLP → Aravalli swaps in receipt C-304. |
| Command | Painful | 246ms for Tally chip | Duplicate queue+KPI. Tally cases chip is right; Collections ₹1.03 Cr is right; then Quality/NCR again. `fl-desktop-command.png`. |
| Capital | Easy | Yes | “Committed total (ex-concept)”. Baggad concept labelled. |
| Customers | Painful | 17ms to find V. Agarwal | Next unpaid highlighted. **No aging buckets.** Jade = Record possession × N, not Collect. `fl-desktop-customers.png`. |
| Approvals | Acceptable | 40ms RA-07 | FL can act. RA waits on Finance Lead. **PO waiting on MD is also actionable** (`canApprove: 4`) — four-eyes leak. |
| Commercial / Quotations | Acceptable | Yes | Visible to accountant. GSTIN prompt, compare quotes. |
| Sales analytics | Acceptable | 868ms | Commission accrued. |
| Inventory deep-link | — | — | Not in nav; capture empty. |
| Mobile Tally | Painful | — | 2743 B empty shot; menu exists. |

#### Commercial Manager
| Screen | Rating | 10s find? | Notes |
|--------|--------|-----------|-------|
| Commercial | Acceptable | Yes | Invite vendor, Submit PO, orders table. Lift package in review. |
| Quotations | Acceptable | Yes | RFQ → compare → select. Primary-heavy. |
| Command / Phases / Projects | Painful | — | Generic office Command. |
| Tally deep-link | Easy (denied) | — | Deny page, no Reconcile. |
| Capital / Customers deep-link | Painful | — | Unguarded (CM screenshots of those deeplinks exist). |
| Mobile commercial | Acceptable | — | Menu captured. |

### Friction log (with severity)
- **P1 Approvals four-eyes.** Finance Lead can Approve a PO that `waitingOn` is Managing Director (`report.json`: `poWaitingOnMdAlsoActionable: true`). `canAct` is role-wide, not waitingOn-wide.
- **P1 Customers is not a collections desk.** No 0–30 / 31–60 / 90+ bucket. Collect next installment is outline; Record possession is jade on a booking whose next line is “On slab 12”. Two jade Record possession buttons on one page (DESIGN.md: one primary).
- **P1 Command duplicate + wrong emphasis after reconcile.** Tally cases KPI went 1→0 on LLP after Reconcile; Open gates still 4. Fine, but Quality/NCR still outrank unmatched receipts.
- **P2 Tally toast.** `toastMentionsNoVoucher: false` on Reconcile in the runner — the click handler in source **does** mention “Tally remains the books”. Verify the toast actually fires (sonner).
- **P2 Commercial Invite vendor sits above the PO table** — same “create first” bias as Channel Invite agent.
- **P2 CM can open Capital/Customers by URL** (screenshots exist). Nav-hide only.
- **P2 Land EMI “Mark paid in ops”** is on Land, which FL can see. `emiPayVisible: 0` in one scan — may have been below fold. Ops vs Tally split is easy to violate if the button is jade.
- **P3** FL Command Tally = 0 after reconcile while header still useful — good.

Never-posts language on Tally itself is **Easy / do not touch**.

### Data entry difficulty
Reconcile / Accept exception: **1 click** — Easy.
Collect next installment: **1 click** — Easy once you ignore the wrong primary.
Submit PO: **project + vendor + title + amount** — Acceptable.
Compare quotes: **Acceptable** (dedicated screen).
Invite vendor: **Easy**, too prominent.

### Data lookup difficulty
Open Tally exception: **Easy**.
RA-07 in Approvals: **Easy**.
Unpaid slab 12 for V. Agarwal: **Easy** (row highlight).
“Who is 60 days overdue across the book?”: **Broken** (no aging).
Concept vs committed: **Easy** on Capital.

### Top 5 concrete UI/UX recommendations
1. **Approvals: enable Approve only if `waitingOn` matches this seat** (or kind in a finance set for FL). Stop FL from clearing MD’s PO.
2. **Customers: one jade = Collect next unpaid.** Record possession / Cancel = outline. Add a 3-chip aging strip (counts only) linking to filtered cards — still this module.
3. **FL Command:** Tally open cases + unmatched receipts + oldest RA. Drop duplicate Quality/NCR (they belong on PD).
4. **RoleGate for CM** — allowlist commercial, quotations, projects, phases, audit, assistant, command. Deny capital/customers/finance mutations.
5. **Commercial home = open POs / RFQs in review**, Invite vendor behind disclosure.

### Must-fix before go-live
- waitingOn vs canAct (P1 four-eyes).
- Collections aging + wrong jade on possession (P1).
- CM deep-link mutations (P1 if Capital/Customers are writable).
- Keep Atlas off Tally vouchers (already true — regression-test the toast).
