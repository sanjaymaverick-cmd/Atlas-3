## Land & Legal / Docs
Seats: M. Iyer `ll@atlas.local` (home `/app/land`) and T. Joseph `dc@atlas.local` (home `/app/documents`).
Evidence: `screenshots/review/legal/report.json` + land-home, leak-land, documents-home. Mobile login crashed (`End session` timeout) — same chrome bug as site.

### Screens tested
#### Land & Legal
| Screen | Rating | 10s find? | Notes |
|--------|--------|-----------|-------|
| Land & legal | Acceptable | Title/overdue/RERA **5–9ms** | Parcel card + diligence + EMI ops + statutory list. BOCW `fail`. Acquire blocked with a real reason. `ll-desktop-land-home.png`. |
| Add parcel / add obligation | **Broken** | — | `landHasAddParcel: false`, `landHasAddObligation: false`. |
| Mark filed | Painful | — | 1 click, **no challan/evidence attach**. |
| Search khasra | Painful | encumbrance 10s miss as a field name | No search. Encumbrance exists as a diligence row, not a filter. |
| Command | Painful | 596ms | Generic office (collections, inspections, spend). `commandHasStatutory: false`. |
| Documents | Painful | Drawing R4 **not found in 10s** for LL | DC finds R4 in 9ms — LL’s default filter/scope hid it. |
| Approvals deep-link | **Broken** | — | Queue renders, “View only for this role.” Unguarded. |
| Finance deep-link | Easy | — | Denied, no Reconcile. |
| Preview | Easy | — | Watermark + stamp + timer. Do not touch. |

#### Document Controller
| Screen | Rating | 10s find? | Notes |
|--------|--------|-----------|-------|
| Documents | Acceptable | 9ms | Register, statutory filter, quarantine “Clear scan”, new revision, request original, export grant. |
| File upload | **Broken** | — | `registerHasFileInput: false`. Metadata-only. |
| Expiry reminder | Painful | — | `hasExpiry: false`. |
| Land deep-link | **Broken** | — | Full register. **DC clicked Mark filed and it stuck.** `dcFiledObligation: true`. |
| Command | Painful | — | Approvals + Site chips, no statutory. |
| Finance deep-link | Easy | — | Denied. |

### Friction log (with severity)
- **P0 DC mutates Land** via `/app/land` (nav hide only). Mark filed accepted.
- **P1 Legal cannot add a parcel or a statutory obligation.** Demo data only. Go-live blocker for a land desk.
- **P1 Mark filed has no evidence.** A BOCW cess return with `fail` becomes `filed` with zero challan.
- **P1 Register file is metadata-only.** Preview works on seeded hashes; a real drawing cannot be attached.
- **P1 Command ignores statutory overdue for Legal** (`commandHasStatutory: false`) while showing Collections.
- **P1 LL Approvals deep-link** shows vendor activation waiting on MD.
- **P2 No khasra/RERA search.**
- **P2 Drawing R4 find fails for Legal** (10s) — filter/IA, not missing data (DC sees it).
- **P2 Mobile session chrome** (End session in drawer) crashed the phone pass.
- **P3** Finance deny page copy says “site seats” even for Docs — sloppy but safe.

What works:
- Acquisition blocked until diligence clear (toast proven).
- Entity switch LLP → Homes brings Baggad parcel, hides Kanakpura GA as appropriate.
- Watermarked preview, four-eyes original request, quarantine scan.
- RERA number visible in < 1s on Land.

### Data entry difficulty
Mark filed: **1 click, too easy** (no attach) — Painful.
Clear / Flag diligence: **1 click** — Easy.
Complete acquisition: **blocked until clear** — Easy (correct).
Register file: **fields without a file** — Broken.
New revision: **Acceptable** as metadata.

### Data lookup difficulty
Overdue BOCW: **Easy**.
RERA RAJ/P/2024/1288: **Easy**.
Encumbrance as a named filter: **Painful**.
Drawing revision R4 for Legal: **Painful**; for DC: **Easy**.

### Top 5 concrete UI/UX recommendations
1. **RoleGate Land to legal/owner/pm/accountant**; Docs cannot GET or mutate. Redirect DC to Documents.
2. **Mark filed opens a 2-field sheet** (acknowledgement no. + optional file). Reuse Documents’ revision model; do not invent DMS.
3. **Add parcel / add obligation** as the single jade on empty or via a disclosure on Land — same `Card` pattern as Invite vendor, but not above the overdue list. Overdue list stays first.
4. **Legal Command = statutory overdue + open diligence + EMI ops due this month.** Hide Collections/Quality.
5. **Documents register: actual `<input type="file">`** or a honest “local demo — hash only” GateBanner so UAT does not think files are stored.

### Must-fix before go-live
- P0 DC land mutation.
- P1 no-add land register (cannot operate).
- P1 filed-without-evidence.
- P1 metadata-only register if go-live expects files (if local-demo-only, banner it).
