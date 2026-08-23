# Atlas 3 — Design system

**Local only · not live.** Tokens and component rules for every screen.

## Tokens

| Token | Value | Use |
|-------|--------|-----|
| Ink | `#161412` | Text, sidebar |
| Limestone | `#f3efe6` | Page background |
| Surface | `#fbf8f2` | Cards |
| Jade | `#1d4f42` | **One** primary action per screen |
| Line | `#e2dbcf` | Soft borders |
| Chip | `#ece6d9` | Neutral fill |
| Ok | `#1d5c45` | RAG — on track |
| Watch | `#8a5a12` | RAG — needs a human |
| Danger | `#9f2d20` | RAG — stop / overdue |
| Display | Newsreader | Titles only |
| UI sans | Figtree ~14px | Body, tables, nav |

Do not introduce a new hue. Status colour is RAG only — never a decorative rainbow.

## Density

- **Office:** compact tables, dense cards, jade primary once per form.
- **Site:** single column, primary control ~48px, few fields.

## Components

| Component | Rule |
|-----------|------|
| `PageHeader` | One primary question in the title. Description is the 5-second frame. |
| `Kpi` | Value + vs target/prior (hint) + optional RAG tone on the **same** card. Max 6 on Command. |
| `DecisionCard` | Kind · title · waitingOn · age · amount · context. Approve/Reject inline. |
| `QueueStrip` | Counts + deep links. First thing on Command. |
| `Status` / StatusChip | Locked vocabulary (pending/approved/fail…). |
| `GateBanner` | Why this form cannot succeed, or the statutory constraint. |
| `EntityTable` | Comparable rows; status last; one inline next step. |

## Anti-patterns (do not)

- Equal-weight chart walls
- Value on one card, target on another
- More than one jade primary on a screen
- Tally actions on a Site seat
- Treating concept/land spend as committed capital
- Atlas posting Tally vouchers (books stay in Tally)
- Hiding **Local only** on a phone

## Cognitive load (CLT)

Working memory ~4 chunks. Primary view ≤ 5–7 KPIs/modules. Progressive disclosure: L1 status → L2 why → L3 tables. Exceptions beat decoration. 5-second test: on track / needs a decision?
