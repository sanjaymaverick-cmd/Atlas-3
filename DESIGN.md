# Atlas 3 — Design system

**Local only · not live.** Tokens and component rules for every screen.

## Tokens

| Token     | Value         | Use                               |
| --------- | ------------- | --------------------------------- |
| Ink       | `#161412`     | Text, sidebar                     |
| Limestone | `#f3efe6`     | Page background                   |
| Surface   | `#fbf8f2`     | Cards                             |
| Jade      | `#1d4f42`     | **One** primary action per screen |
| Line      | `#e2dbcf`     | Soft borders                      |
| Chip      | `#ece6d9`     | Neutral fill                      |
| Ok        | `#1d5c45`     | RAG — on track                    |
| Watch     | `#8a5a12`     | RAG — needs a human               |
| Danger    | `#9f2d20`     | RAG — stop / overdue              |
| Display   | Newsreader    | Titles only                       |
| UI sans   | Figtree ~14px | Body, tables, nav                 |

Do not introduce a new hue. Status colour is RAG only — never a decorative rainbow.

### Status chip language (locked 24 Aug 2026)

Site staff do not all know the short codes. The chip shows the easy-English name; the old short form (RFI, NCR, VO, OC, Tally) lives in the hover only.

| Value       | Chip                                | Tone   |
| ----------- | ----------------------------------- | ------ |
| pending     | Waiting                             | warn   |
| review      | Under check                         | warn   |
| quarantine  | Virus scan / Waiting for virus scan | danger |
| variance    | Numbers do not match                | warn   |
| accrued     | Earned, not paid                    | warn   |
| rfi         | Question to design                  | warn   |
| ncr         | Failed work                         | danger |
| change / vo | Paid extra work                     | warn   |
| held        | On hold                             | warn   |
| snagging    | Fixing defects                      | warn   |
| society     | With society                        | ok     |
| defect      | Defect period                       | warn   |

Command no longer shows a separate RAG KPI row. Queue + exceptions are the signal. Do not revert chips to codes without updating this table, `docs/Atlas-3-UX-Spec.md`, and the glossary in the same change.

## Density

- **Office:** compact tables, dense cards, jade primary once per form.
- **Site:** single column, primary control ~48px, few fields.

## Components

| Component             | Rule                                                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------------------------- |
| `PageHeader`          | One primary question in the title. Description is the 5-second frame.                                           |
| `Kpi`                 | Value + vs target/prior (hint) + optional RAG tone on the **same** card. Max 6 on Command.                      |
| `DecisionCard`        | Kind · title · waitingOn · age · amount · context. Approve/Reject inline.                                       |
| `QueueStrip`          | Counts + deep links. First thing on Command.                                                                    |
| `Status` / StatusChip | Locked vocabulary in `src/lib/glossary.ts` + `status.tsx` (plain English on the chip, short form in the hover). |
| `GateBanner`          | Why this form cannot succeed, or the statutory constraint.                                                      |
| `EntityTable`         | Comparable rows; status last; one inline next step.                                                             |

## Anti-patterns (do not)

- Equal-weight chart walls
- Value on one card, target on another
- More than one jade primary on a screen
- Company-accounts / ERPNext actions on a Site seat
- Treating concept/land spend as committed capital
- Atlas posting ERPNext vouchers (books stay in ERPNext at D:\ERPNext; posting off by default)
- Hiding **Local only** on a phone

## Cognitive load (CLT)

Working memory ~4 chunks. Primary view ≤ 5–7 KPIs/modules. Progressive disclosure: L1 status → L2 why → L3 tables. Exceptions beat decoration. 5-second test: on track / needs a decision?
