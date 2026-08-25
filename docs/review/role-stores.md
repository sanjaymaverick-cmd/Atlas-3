## Stores / QS

Seat: H. Singh · `st@atlas.local` · home `/app/controls`.
Evidence: live walk, `screenshots/review/stores/findings.json` + controls/issue/receive/overissue/command/deeplink shots.

### Screens tested

| Screen                            | Rating                              | 10s find?                       | Notes                                                                                                                         |
| --------------------------------- | ----------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Controls                          | Painful                             | Materials **7ms**; GRN **miss** | TMT / OPC / waterproof present. Issued/received visible. No GRN, challan, vendor, PO, wastage, BOQ, remaining-on-hand.        |
| Receive / Issue                   | Painful / Broken                    | —                               | Shared qty field. **Issue 10 TMT did not bump 61→71.** Over-issue correctly refused. Receive works as a qty bump, not a GRN.  |
| Approve quantity                  | Easy                                | 7ms                             | Tower B raft variance + Approve quantity.                                                                                     |
| Command                           | Painful                             | 5ms to the wrong answer         | Engineer desk: Failed inspections, Open NCRs, Statutory. Links to `/app/changes` and `/app/land` — **neither in Stores nav**. |
| Site                              | Painful                             | 3ms                             | Stores can Seal diary and Pass/Fail. Wrong primary job.                                                                       |
| Projects / detail                 | Painful                             | 6ms                             | No materials on the dossier.                                                                                                  |
| Commercial / Quotations deep-link | **Broken** (unguarded)              | —                               | Full Invite vendor + Submit PO + RFQ. This is the PO/BOQ view QS needs, hidden from nav and writable.                         |
| Finance deep-link                 | Easy                                | —                               | Deny page.                                                                                                                    |
| Audit                             | Painful                             | —                               | Expected stores actions not obvious.                                                                                          |
| Mobile Controls                   | Acceptable targets / Painful chrome | —                               | Issue 44px. Header still entity+project. 2743 B empties on some mobile shots; `21-mobile-nav.png` is real.                    |

### Friction log (with severity)

- **P1 Issue did not update issued qty** (findings: Broken). Over-issue gate works — the happy path is what failed.
- **P1 Receive is not a GRN.** No vendor, PO, challan, date, remaining stock. QS cannot answer “what is on site?” beyond a running total.
- **P1 Command is the engineer’s desk.** Open NCRs → Changes (no nav). Statutory → Land (no nav). No pending variance / receipts KPI.
- **P1 Multiple jade actions** (3 Receive, 3 Issue, 1 Approve) and one shared qty box — DESIGN.md one primary; easy to issue against the wrong line.
- **P1 QS cannot see POs from nav** but can mutate Commercial/Quotations by URL.
- **P1 Stores can seal today’s diary** — supervisor work.
- **P2 Entity switch** to Aravalli hides Kanakpura TMT with no empty-state (“no materials for this entity”).
- **P2 Project dossier** has diaries/bookings, not materials.
- **P3** Local chip shortens to Local — allowed.

### Data entry difficulty

Approve quantity: **1 click** — Easy.
Issue: **qty + Issue** — should be Easy; **Broken** when the number does not move.
Receive: **1 click** — Acceptable as a stub, Painful as GRN.
Over-issue: **Easy** (explicit refuse).

### Data lookup difficulty

What materials exist: **Easy**.
GRN / challan: **Broken**.
BOQ vs measured: **Painful** (variance card exists; no BOQ link).
PO for the lift package: **only via leaked Commercial**.

### Top 5 concrete UI/UX recommendations

1. **Fix Issue state update** (P1 bug). Then **per-line qty input** (stop sharing one box). Receive/Issue outline; Approve quantity the jade when a variance is waiting.
2. **Stores Command:** pending quantity approvals, materials with issued≈received (stock-out risk), failed receipts. Remove Land/Changes chips or RoleGate those routes and add Changes to Stores nav if NCR consumption is in-scope.
3. **Do not let Stores seal diary.** Read-only recent diaries; keep Pass/Fail off this seat (or behind a disclosure).
4. **If QS must see POs, put a read-only “Orders for this project” section on Controls** that lists existing POs — do not open Invite vendor. Alternatively add Commercial to `NAV_ROLES` for stores as view-only and RoleGate mutations.
5. **Empty state on entity switch** (“No material lines for Aravalli Homes”) so TMT disappearance is not read as a stock-out.

### Must-fix before go-live

- Issue qty not applied (Broken).
- Command links to nav-hidden Land/Changes (P1).
- Unguarded Commercial/Quotations mutations (P1).
- Shared qty + many jade buttons (P1 usability).
- Honest GRN is a sprint, not a week — if local demo, GateBanner: “Receipts are quantities, not GRNs.”
