## Site Engineer / Supervisor

Seats: K. Rathore `se@atlas.local` (home `/app/site`, Documents in nav) and D. Chauhan `sv@atlas.local` (home `/app/site`, Documents **hidden**).
Evidence: `screenshots/review/site/` + `report.json`. Desktop diary/inspection paths succeeded; entity-select and mobile-login later crashed the runner (`End session` not visible at 390px — real chrome issue).

### Screens tested

| Screen           | SE        | SV        | Rating            | Notes                                                                                                                                                 |
| ---------------- | --------- | --------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Site & quality   | Yes       | Yes       | **Easy**          | Gold standard. Seal diary 48×934. Pass/Fail 48px. 4 diary fields. `se-desk-site-home.png`. Find diary 10–15ms.                                        |
| Inspections      | Yes       | Yes       | Easy              | Fail toast + NCR side-effect. Schedule works.                                                                                                         |
| Change control   | Yes       | Yes       | Acceptable        | Seed NCR + fail-raised NCR visible. Close after re-inspection 36px height (under 44 on phone).                                                        |
| Controls         | Yes       | Yes       | Acceptable        | Visible; it is Stores’ job.                                                                                                                           |
| Documents        | Yes       | Hidden    | Acceptable / Easy | Correct SE vs SV split.                                                                                                                               |
| Command          | Yes       | Yes       | Painful           | Site variant KPIs exist in source; capture of command PNG was empty. Queue in source links Statutory → `/app/land` which **neither seat has in nav**. |
| Handover / snags | No nav    | No nav    | Painful (gap)     | `/app/sales/handover` is sales-only. Real snags are a site job. Do not invent a module — expose a site-facing list of open snags on Site or Changes.  |
| Finance / Sales  | No        | No        | Easy if gated     | Tally not in nav (`tallyInNav: false`). Deep-link must stay a deny page.                                                                              |
| Mobile Site      | Attempted | Attempted | Painful           | Login/session chrome: End session only in drawer.                                                                                                     |

### Friction log (with severity)

- **P1 Command statutory chip is a trap.** Source queue for `siteDesk` includes `{ to: "/app/land", label: "Statutory open" }`. Engineer/supervisor/stores cannot nav to Land. Same pattern as Stores findings.
- **P1 Snags live on a sales route.** Handover close-snag is a text row + button for SM. Site cannot see or close them from Site & quality. UX spec: site screens own field work.
- **P2 Idempotent diary is unexplained in UI.** `diaryIdempotentHint: false` — copy in PageHeader is for builders (“idempotent per device and date”), not for K. Rathore at 38°C.
- **P2 Change control Close is 36px tall** — fails site density.
- **P2 Mobile End session** buried — testers timed out waiting for it. Cabin reality: accidental double-login, no obvious way out without opening the drawer.
- **P2 Engineer vs supervisor** is almost the same product. Documents-only difference is correct; otherwise SV sees the same diary form (good) and the same Command (not stores-like, ok).
- **P3** Runner P0s in `report.json` are Playwright `selectOption` on the **header** entity `<select>` (options not matching) and mobile End session — test bugs plus a real header-select fragility, not a white screen.

What works (do not restyle):

- One jade **Seal diary**.
- Large Pass/Fail.
- Failed inspection → NCR.
- SV does not get Documents.
- No Tally in nav.

### Data entry difficulty

Seal diary: **Project, labour, weather, work → Seal** — Easy. Best screen in Atlas.
Pass/Fail: **1 tap** — Easy.
Schedule inspection: **template + location + Schedule** — Acceptable.
Raise NCR: **type + project + title + Raise** — Acceptable; Raise button is easy to miss.

### Data lookup difficulty

Today’s work: **Easy** (home is the form).
Last diary: **Easy**.
Open NCR: **Acceptable** (other nav item).
Snag on A-1204 kitchen hob: **Broken for this seat** (sales handover).
Statutory BOCW: **linked from Command, not reachable**.

### Top 5 concrete UI/UX recommendations

1. **Keep Site & quality chrome.** Rewrite PageHeader description to “One diary per phone per day. Seal once.” Drop “idempotent”.
2. **Open snags on Site** — filter `snags` where status=open for the scoped project. Reuse `Status` + a 48px “Close after photo” outline that calls existing `closeSnag`. That is a section, not a new module.
3. **Fix Command links** to only target routes in `NAV_ROLES` for this seat. Statutory → hide, or point at a read-only obligation list if you ever add one to Site. Do not send SE to Land.
4. **Close/Respond at h-11** on Change control. Raise = the one jade.
5. **Mobile: End session in the sticky header** (icon + label) and a 4-item bottom bar (Diary, Inspections, Changes, More).

### Must-fix before go-live

- Command must not deep-link Land for site seats (P1).
- Site must see open snags that block possession (P1 gap on an existing object).
- Diary copy in the field (P2).
- Confirm finance deep-link remains a non-posting deny page.
