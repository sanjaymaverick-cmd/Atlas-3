## Project Director

Seat: R. Sharma · `pd@atlas.local` · home `/app`.
Evidence: live walk, `screenshots/review/pd/report.json` + screens (login home, projects LLP/Aravalli, project detail, phases fold, mobile menu). Many later desktop PNGs are 4719-byte empties (runner flake after first batch); ratings for those screens also use source + MD/SM captures of the same routes.

### Screens tested

| Screen                        | Rating                | 10s find? | Notes                                                                                           |
| ----------------------------- | --------------------- | --------- | ----------------------------------------------------------------------------------------------- |
| Command                       | Painful               | Slow      | Same duplicate queue/KPI/exceptions as MD. PD job is slippage, not four restated counts.        |
| All phases                    | Broken (for this job) | No        | Module catalog (“Eleven operating modules”), not programme vs baseline. `desk-phases-fold.png`. |
| Projects                      | Acceptable            | Yes       | LLP shows Kanakpura only; Aravalli shows Baggad + Mansarovar. Codes visible.                    |
| Project detail                | Acceptable            | Yes       | Dossier exists. No “what slipped this week” on the card.                                        |
| Site & quality                | Easy (as a viewer)    | Yes       | Diary + Pass/Fail are clear. PD does not need to seal, but can.                                 |
| Controls                      | Acceptable            | Partial   | Budget vs committed bars. Materials issue/receive is Stores work on this seat.                  |
| Change control                | Acceptable            | ~0.5–1.5s | NCRs visible; Raise is tiny (44×65). Fail-inspection NCR appears.                               |
| Approvals                     | Acceptable            | Yes       | PD can act (`canAct` includes `pm`). VO-19 waits on Project Director.                           |
| Portfolio / Capital           | Acceptable            | Yes       | Concept flag present.                                                                           |
| Sales cluster                 | Painful               | n/a       | Full sales nav (pipeline, handover, WhatsApp…) for a PD. Noise.                                 |
| Tally / Decisions / Test pack | Easy (hidden)         | n/a       | Not in nav. Deep-links captured; Tally actions not offered.                                     |
| Mobile                        | Painful               | Hard      | 25+ items in hamburger; entity/project truncate.                                                |

### Friction log (with severity)

- **P1 All phases is the wrong object.** A PD asking “which phase is slipping?” gets Phase 1 Identity, Phase 9 Tally, Phase 11 Assistant. Programme lives on Command’s thin “42% built · 75% of calendar” bar, which is easy to miss.
- **P1 Command is not a PD desk.** Failed inspections and NCRs are right, but they compete with Collections ₹ and Tally-less exceptions. No labour, no diary-today, no VO aging as first-class.
- **P2 Nav dump.** PD sees almost every sales child route. `report.json` nav length = 27 labels including “Approvals5” (badge concatenated — a11y smell).
- **P2 Change Raise control is 65px wide** on a 44px height — easy to miss next to “Close after re-inspection”.
- **P2 Project filter vs entity.** Isolation of legal entities works (good). There is no “all entities” for a PD who runs both companies in one morning — they must flip the header select.
- **P3** Deep-link `/app/finance` does not expose Reconcile (good). Deep-link `/app/decisions` should stay closed; capture was empty so treat as **verify**, not proven leak.

### Data entry difficulty

Raise NCR/RFI: **Type + Project + Raise** — Acceptable if you find the button.
Approve VO: **1 click** on Approvals — Easy.
Seal diary (if PD covers): same as engineer, **few fields** — Easy, but it is not the PD job.

### Data lookup difficulty

Kanakpura vs Baggad after entity switch: **< 1s** (`isolation` in report.json).
Open NCR: **< 2s** on Change control.
“Is Tower A L12 pour still pending?”: **Acceptable** on Site.
“Are we 8 points behind calendar?”: **hidden** inside a timeline bar, not a RAG sentence.

### Top 5 concrete UI/UX recommendations

1. **Retarget All phases for office seats that build** — or hide it from PD and put a real programme strip (phase name, % built, % calendar, RAG) on Command / project detail. Do not invent a new module; reuse `ProjectTimeline` as the primary, not a side card.
2. **PD Command variant:** Failed inspections, Open NCRs, oldest VO, today’s diaries. Drop Collections as the lead KPI (keep it one click in Owners Hub).
3. **Trim sales children from PD nav.** Keep Sales hub + Handover (snags block possession). Hide Pipeline / WhatsApp / Inbound / People unless opened from Sales hub.
4. **Make Raise the one jade control** on Change control; move Close/Respond to outline.
5. **Header entity switch:** show both legal entities’ exception counts in a 2-line chip so the PD knows the other company is on fire before flipping.

### Must-fix before go-live

- Stop calling a product sitemap “All phases” for this seat (P1 IA).
- Command variant so quality/NCR/VO beat cash (P1).
- Verify `/app/decisions` and `/app/testing` deep-links are denied, not just hidden in nav.
