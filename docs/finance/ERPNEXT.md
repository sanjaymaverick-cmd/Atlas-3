# Atlas 3 — ERPNext books (Option B)

**Local only · not live.** Atlas is operations. ERPNext is books of record.

| | |
|---|---|
| Upstream | https://github.com/frappe/erpnext |
| Install | **`D:\ERPNext` only** |
| Company | **MOCK ATLAS3 LLP** (smoke) · DUKIA sisters: SATYAM BUILDCOM, SATYAM CONSTRUCTION, MGB PRIME ESTATES LLP |
| Link | REST (`ERPNEXT_URL` + API key/secret) |
| Posting | **Off** (`ERPNEXT_POSTING_ENABLED=false`) |

Atlas never vendors ERPNext. Do not clone frappe/erpnext into the Atlas tree. Do not rebuild Atlas on Frappe.

## Why a sibling

Tally was the previous books seam (XML on :9000). The locked architecture is **API integration**: Atlas keeps sales, site, channel, inventory, scoring. ERPNext holds GL / journals. If ERPNext is down or env is unset, Atlas still boots (same posture as CatBoost falling back to hybrid).

## Ports

| Process | Port |
|---------|------|
| Atlas | 8080 |
| CatBoost | 8091 |
| ERPNext | **8000** (override with `ERPNEXT_URL`) |

## Install

Windows steps: [`scripts/erpnext/install-notes.windows.md`](../../scripts/erpnext/install-notes.windows.md).

Short version:

1. Clone **frappe_docker** (or bench) into `D:\ERPNext`, not into Atlas.
2. Install the **erpnext** app from https://github.com/frappe/erpnext.
3. Create company **MOCK ATLAS3 LLP** (smoke). Then run `npm run books:companies` for the three DUKIA sisters.
4. Generate API key/secret for an integration user.
5. Set Atlas env (never `VITE_` — secrets stay server-side):

```
ERPNEXT_URL=http://127.0.0.1:8000
ERPNEXT_API_KEY=
ERPNEXT_API_SECRET=
ERPNEXT_COMPANY=MOCK ATLAS3 LLP
ERPNEXT_POSTING_ENABLED=false
```

Template: `scripts/erpnext/.env.example`. Copy to `scripts/erpnext/.env` (gitignored) or export in the shell before `npm run dev`.

## Multi-company (DUKIA)

Each legal entity that needs **its own books** is a separate **Company** in ERPNext. Names must match Atlas character-for-character.

| ERPNext Company | Role | Atlas project | Abbr |
|-----------------|------|---------------|------|
| **DUKIA GROUP** (optional) | Group only · Is Group · no day-to-day posts | Portfolio label | DG |
| **SATYAM BUILDCOM** | Transaction company | Aerovista | SBC |
| **SATYAM CONSTRUCTION** | Transaction company | Sunflower | SCN |
| **MGB PRIME ESTATES LLP** | Transaction company | Acropolis | MGB |
| **MOCK ATLAS3 LLP** | Demo / smoke only | Tests | MA3 |

**Rule:** Create a Company when the entity has separate books / GST / partners. Use cost centres (Aerovista under SATYAM BUILDCOM) only when it is the **same** legal entity.

```
DUKIA GROUP          ← Is Group = Yes (optional holding)
├── SATYAM BUILDCOM
├── SATYAM CONSTRUCTION
└── MGB PRIME ESTATES LLP
```

Sisters can also sit as **parallel** companies with no parent; parent mainly helps consolidation and shared COA copy.

### Nested chart of accounts (inheritance)

When a trading company is created **with Parent Company = DUKIA GROUP**, ERPNext copies the parent chart onto the child. Children **cannot add a new account** until that account exists on **DUKIA GROUP**.

Practical rule for DUKIA:

1. Add **Due from {sister}** and **Due to {sister}** on **DUKIA GROUP** first.
2. Child companies inherit leaves such as `Due from SATYAM CONSTRUCTION - SBC`.
3. Self-dues (`Due from SATYAM BUILDCOM - SBC` on BUILDCOM) can appear from that copy. Do not pick Due from *this same* LLP. Do not delete those leaves this week.

Atlas never invents CoA rows. Operator creates Due from / Due to on the group; children inherit.

### Journal submit (timestamp)

Insert the Journal Entry, **GET the draft by name**, then `frappe.client.submit` with the **full doc** (including `accounts`). Submitting `{ doctype, name }` only causes a timestamp mismatch and leaves an orphan draft. `sourceId` remains the idempotency key. Title / remark stay `ATLAS-OPS {sourceId}`.

Drafts `ACC-JV-2026-00001`–`00009` from the first run2 attempt are retained. Do not delete them. List default is Submitted only.

### Create (operator — Atlas does not invent companies)

Atlas **does not** create ERPNext companies at runtime. You create them **once** in the desk at `D:\ERPNext` (Accounting → Company → New). An optional operator helper (`npm run books:companies`) can do the same REST insert if the desk is slow; it is not an Atlas product path and it never posts a journal.

| Field | Value |
|-------|--------|
| Company Name | exact Atlas string |
| Abbr | SBC / SCN / MGB / MA3 / DG |
| Country | India |
| Default Currency | INR |
| Parent Company | DUKIA GROUP if using a group |
| Is Group | only on DUKIA GROUP |
| Chart of Accounts | first: Standard; next: Based on Existing Company |

Health already checks `Company/{name}`. `/api/books` `{ "action": "companies" }` lists present/missing. Finance shows the same roster.

### Per-company defaults (after create)

For **each** trading company:

| Setting | Why |
|---------|-----|
| Default Cash / Bank | Collections, JE lines (`Cash - SBC`) |
| Receivable / Payable | Party control accounts |
| Stock accounts | Only if you stock-account materials |
| Stock Received But Not Billed | Perpetual inventory |
| Round-off / write-off | JE remainder |
| Default Cost Center | **Main - ABBR** (leaf). `{Company} - ABBR` is the group — do not post to it. Project CC (Aerovista - SBC) is same legal entity. |
| JE submit | Draft is not the ledger. Atlas calls `frappe.client.submit`. |
| Fiscal Year | India Apr–Mar; 2024-04-01 … 2029-03-31 |
| GSTIN / tax templates | India compliance when live — Atlas GSTINs are on the spec rows |

Finance posts JE with **leaf account names that exist on that company’s CoA** (`Cash - SBC`, `Administrative Expenses - SBC`, `Capital Stock - SBC`). There is no `Construction Expenses - SBC` on the Standard chart.

Do **not** post from Atlas until `ERPNEXT_POSTING_ENABLED=true`. Group company is not used on a Journal Entry (not on the allowlist).

### Users and permissions (ERPNext desk)

| Who | ERPNext User Permission |
|-----|-------------------------|
| MD / Directors | All three companies (or unrestricted) |
| Finance (shared) | All three — or per-entity finance users |
| Project-only staff | Usually **no** ERPNext login; Atlas only |

**User Permissions → Allow = Company → For Value = SATYAM BUILDCOM** (repeat for each company the user may see). Without this, users can see every company’s documents.

API user for Atlas (`ERPNEXT_API_KEY` / secret) needs permission to **read Company**, **read Account / Cost Center**, and **create/submit Journal Entry** for all three companies (when posting is on).

### Atlas wiring

| Piece | Behaviour |
|-------|-----------|
| `ERPNEXT_COMPANY` | Default smoke company (`MOCK ATLAS3 LLP`) |
| Post payload `company` | Must be an allowlisted **trading** company, not DUKIA GROUP |
| Project → company | Aerovista → SATYAM BUILDCOM, Sunflower → SATYAM CONSTRUCTION, Acropolis → MGB PRIME ESTATES LLP |
| Finance | Pick company; leaf CoA + Main - ABBR from that company |
| Health | Loops DUKIA sisters; reports present/missing |

### Forward IC loans (do not mix patterns)

| When | Kind | Link |
|------|------|------|
| Run2 already posted (`ACC-JV-2026-00016`–`00021`) | Ordinary **Journal Entry** | Remark only (`ATLAS-OPS`). Leave as-is. |
| **New** sister loans from this week on | **Inter Company Journal Entry** | Fill **Linked voucher in the other LLP**. Both sides submitted. |

Do **not** rewrite run2 rows. Do **not** post elim JEs on SATYAM BUILDCOM, SATYAM CONSTRUCTION, or MGB PRIME ESTATES LLP. Group pack is a worksheet — not Consolidated Financial Statement. Full process: [`CONSOLIDATION.md`](./CONSOLIDATION.md).

### Intercompany elimination (group pack)

ERPNext records IC JE pairs on **each** Company. Automatic elimination is **not** complete in core ERPNext. Match due-from/due-to (and IC P&L) at period-end, then eliminate on the **group** worksheet only — never reverse operating IC entries on the legal entities unless correcting an error.

Process, pairs, and close checklist: [`CONSOLIDATION.md`](./CONSOLIDATION.md). Atlas CEO shows three LLPs side by side (ops). That sum is **not** group P&L after elim. Go-live leftovers (WhatsApp, ads, pay, e-sign, stock GRN, Postgres, BIM): [`../GO-LIVE.md`](../GO-LIVE.md).

### What multi-company does **not** mean

| Myth | Reality |
|------|---------|
| One shared GL for all sisters | **Separate** CoA and GL per Company |
| Group company posts sales | Group is structure only; posts on child companies |
| Atlas entity switch creates ERPNext company | Manual desk setup (or operator helper once) |
| Consolidation = live single books | Report over children; each books stays separate |

### Operator checklist

```
[ ] ERPNext up on :8000 (D:\ERPNext)
[ ] Create DUKIA GROUP (Is Group) — optional
[ ] Create SATYAM BUILDCOM (INR, India, CoA from template or parent)
[ ] Create SATYAM CONSTRUCTION (CoA based on BUILDCOM)
[ ] Create MGB PRIME ESTATES LLP (same)
[ ] Confirm names match Atlas allowlist exactly
[ ] Set Main cost centre + bank/cash + capital accounts per company
[ ] Fiscal year open for posting dates you will use
[ ] API user can access all three companies
[ ] Atlas: ERPNEXT_* env set; posting still false
[ ] Smoke: /api/books health — DUKIA sisters present
[ ] Optional: one test JE per company with flag on
```

## Phases

**Phase 1 (this cutover)** — read / reconcile / health / “Atlas posted nothing”.  
**Phase 2 (controlled post)** — Finance desk only. Typed `AtlasJournalPost` (`src/lib/erpnext/journal-post.ts`). Default **off**.

### Controlled Journal Entry (Finance button)

Atlas never auto-posts from land, booking, PO, or CEO. Posting is an explicit Finance action.

Payload (`AtlasJournalPost`):

| Field | Rule |
|-------|------|
| `sourceId` | Required. Idempotency key. Title becomes `ATLAS-OPS {sourceId}`. |
| `company` | Allowlist: MOCK ATLAS3 LLP, SATYAM BUILDCOM, SATYAM CONSTRUCTION, MGB PRIME ESTATES LLP |
| `postingDate` | `YYYY-MM-DD` |
| `lines` | ≥2. Each line amount > 0. Debit XOR credit. Totals balanced. Rounded to 2 decimals (INR). Posted as `debit_in_account_currency` / `credit_in_account_currency`. |

`Check journal` → `action: validate` (works even when posting is off).  
`Post to ERPNext` → `action: post`. Refuses while `ERPNEXT_POSTING_ENABLED` is false. When the flag is on and ERPNext is down, Atlas returns a **mock** `MOCK-JE-{sourceId}` so the path can be proven without a live desk. Same `sourceId` returns the existing JE name.

ERPNext: leaf accounts, cost centre on P&L, party on AR/AP, open fiscal period. Atlas **submits** the JE (`frappe.client.submit`) so GL posts. A draft alone is not the ledger.

```
POST /api/books
{ "action": "post", "sourceId": "ops-1", "company": "SATYAM BUILDCOM", "postingDate": "2026-08-24",
  "lines": [ { "account": "Administrative Expenses - SBC", "debit": 1000, "costCenter": "Main - SBC" },
             { "account": "Cash - SBC", "credit": 1000 } ] }
```

## Verify from Atlas

```bat
cd "D:\work Dir\Atlas 3"
npm run dev
node scripts\erpnext\smoke.mjs
```

Or POST `http://127.0.0.1:8080/api/books` with `{ "action": "health" }`.

| Atlas response | Meaning |
|----------------|---------|
| `books backend not configured` | Env unset — Atlas is fine |
| ERPNext HTTP / timeout | Unreachable — Atlas is fine, posting still off |
| `MOCK ATLAS3 LLP reachable · DUKIA sisters present` | Three trading companies exist |
| `missing SATYAM BUILDCOM, …` | Run `npm run books:companies` |

Finance desk title: **Company accounts (ERPNext)**. Site seats never see it.

## Trial attestation

`scripts/trial/probes/erpnext-baseline.mjs` reads journal rows. Atlas-originated posts would be tagged `ATLAS-OPS`. Count must stay 0 while posting is off.

## Tally

The Tally XML transport (`/api/tally`, `scripts/tally-xml.mjs` as a live backend) is retired. `/api/tally` returns 410 and points at `/api/books`.
