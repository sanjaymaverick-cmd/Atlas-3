## Channel Admin
Seat: K. Pink · Pink City company admin · `ca@atlas.local` · home `/app/sales/company`.
Evidence: live walk, `screenshots/review/ca/report.json` + leak-*.png, d-company.png, d-channel-desk.png.

### Screens tested
| Screen | Rating | 10s find? | Notes |
|--------|--------|-----------|-------|
| Channel firm | Easy | Yes (256ms) | Title “Pink City Channel”. 3 agents, 14 calls, 1 live hold, ₹2.1 L accrued. Invite agent. **No Desert Reach.** |
| Channel desk | Easy | Yes | Own holds (S-12 · R. Soni). No C-512 / L. Bhati / Shekhawat / Mansar note. |
| Inventory | Acceptable | Yes | S-12 held visible; C-512 not listed. |
| Sales hub | Acceptable | Yes | Scoped to Pink City. |
| WhatsApp | Painful | Slow | Full template registry. CA is not a Meta admin. |
| Command | Painful | Mixed | Channel KPIs (holds, reports, available, hot) **plus** developer exceptions (inspection, statutory, NCR, 4 approvals). |
| All phases / Projects | Painful | n/a | Budget/spend on Projects; Phases is a backdoor. |
| Audit | Acceptable | Yes | Session sign-in + global events (site diary, PO) — noisy but append-only. |
| Deep-link Pipeline/Handover/Analytics | Easy | n/a | Redirect to Channel desk (good). |
| Deep-link People | Painful | — | `deny-people` stayed on `/app/sales/people` then bounced in capture; treat as **inconsistent guard**. |
| Deep-link Finance | Easy | n/a | Deny copy, no Reconcile. |
| Deep-link CRM | **Broken** | — | Full in-house CRM. **Desert Reach Channel** named with GSTIN. `leak-crm.png`. |
| Deep-link Org / Customers / Land / Documents / Site / Commercial | **Broken** | — | Nav-hide only. CA can invite vendors, submit PO, mark land filed, seal diary. |

### Friction log (with severity)
- **P0 Isolation leak via unguarded routes.** Intended sales surfaces (company, channel, inventory, hub) are clean. `/app/crm` shows Desert Reach Channel (Jaipur · 2% · 08AADCD3300F1Z1) and lets CA Capture lead / Convert / Invite partner / Activate Agarwal. `/app/customers` shows V. Agarwal collections. `/app/land` shows Khasra 214/2. `/app/commercial` shows Issue purchase order. `/app/org` lists every internal seat including UAT tester.
- **P0 All phases is a directory of leaks.** Each phase card is a `<Link to={p.path}>` with no role check (`src/routes/app/phases.tsx`).
- **P1 Command is a developer dashboard wearing channel KPIs.** “1 failed inspection · 1 statutory overdue · 4 approvals · oldest 6d” is not Pink City’s queue. Approvals is not in CA nav, so the chip is a dead end (or another leak if they guess the URL).
- **P1 Channel firm Invite does not create a login** (copy is honest) but the form is the first thing on the home — roster compliance (“who filed today?”) is below. K. Pink shows 0 calls until they file on Channel desk.
- **P2 Two jade primaries** on Channel desk (File daily report + Request booking) plus Invite agent on Company — DESIGN.md one primary.
- **P2 Entity switcher** on a third-party seat. Switching Aravalli vs LLP changes Projects list (budget leakage) while company desk stays Pink City. Confusing scope model.
- **P2 Mobile nav** concatenates items in one capture (`CommandAll phases…`) — drawer is a long list, no “today” bottom bar.

Isolation that **works** (do not “fix”):
- Channel desk live holds = Pink City only (S-12 · R. Soni).
- No Mansar C-stack note, no C-512, no Shekhawat, no L. Bhati on company/channel/inventory.
- Entity switch does not pull Desert Reach onto the company roster.

### Data entry difficulty
Invite agent: **name + phone + Invite** — Easy.
File daily report as CA for an agent: **7 fields** — Painful for an admin who wants “mark filed for V. Meena”.
Place hold: **unit + customer + until** after report — Acceptable.
Suspend agent: **1 click** — Easy.

### Data lookup difficulty
“Did my agents file today?”: **Acceptable** on desk (0 today until filed), not on Company home (calls are lifetime).
“Who is holding what?”: **Easy** on Channel desk.
“How is Desert Reach doing?”: **must be impossible**. Today it is possible via CRM. Broken.

### Top 5 concrete UI/UX recommendations
1. **RoleGate every route** (not just `NAV.filter`). Third-party → allowlist: `/app`, `/app/sales`, `/app/sales/inventory`, `/app/sales/channel`, `/app/sales/company`, `/app/sales/whatsapp`, `/app/audit`. Redirect others to Channel firm. Same gate on `PHASES` links.
2. **Company home = compliance, not invite.** KPI “Filed today 0/3” as the jade problem. Invite behind a disclosure.
3. **Hide entity/project selects for channel seats** or lock them; they are developer scope and leak budget via Projects.
4. **CA Command = firm queue only** (unfiled agents, live holds, hot leads). Strip inspections/NCR/statutory/approvals.
5. **WhatsApp for CA:** threads for *this firm’s* leads only; hide template-governance wall.

### Must-fix before go-live
- **P0 route guards** (CRM Desert Reach is the exhibit).
- **P0 All phases backdoor.**
- Command chips that point at nav-hidden modules.
- Confirm People deep-link actually redirects (capture was inconsistent).
