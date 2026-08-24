# Consolidating intercompany balances (DUKIA)

**Local only · not live.** Entity books stay in ERPNext per Company. Atlas does not eliminate, and does not post group JEs onto the sisters.

Goal: show the **group** as one economic unit. Balances that only exist **between** sisters must be removed so assets, liabilities, income, and expense are not double-counted.

## Why eliminate

| In each sister’s books | If you only add them up |
|------------------------|-------------------------|
| A: Due from B = ₹10 L | Group assets +₹10 L |
| B: Due to A = ₹10 L | Group liabilities +₹10 L |

That ₹10 L is **internal**. On a true group balance sheet, both should **net to zero**. Same idea for IC revenue vs IC expense, and IC loans.

Entity books **keep** the balances (legal reality). Consolidation **eliminates** them for **group reporting only**.

## What ERPNext does today

| Capability | Status |
|------------|--------|
| Separate Company ledgers | Yes |
| Inter Company JE / invoices (record both sides) | Yes |
| Consolidated Financial Statement (aggregate by parent tree) | Yes — sums subsidiaries |
| Automatic intercompany elimination | **Weak / largely manual** |
| Full IAS-style auto-elim + NCI + multi-rate FX | Not complete core product |

ERPNext helps you **post and link** IC activity. **Group elimination** is still a finance process (worksheet, consolidation JE, or external tool).

## What to eliminate (DUKIA)

| Type | Eliminate |
|------|-----------|
| IC receivables / payables | Due from X vs Due to X (must match) |
| IC loans | Loan asset in one vs liability in other |
| IC revenue / expense | Management fee income vs fee expense between sisters |
| Unrealised profit in stock | Rare for these packages |
| IC dividends | If used |

Partners still get **legal-entity** reports (no elim). MD / group pack gets **consolidated** view (with elim).

## Practical process

**1. Clean IC accounts**  
Dedicated due-from / due-to (and IC income/expense) per sister — no mixing with third-party debtors. Atlas names them as `Due from SATYAM CONSTRUCTION - SBC` (see `src/lib/erpnext/consolidation.ts`). Create those leaves in the ERPNext CoA; Atlas does not invent them.

**2. Period-end reconcile**  
Pairs: BUILDCOM↔CONSTRUCTION, BUILDCOM↔MGB, CONSTRUCTION↔MGB.

```
Company A: balance of "Due from B"
Company B: balance of "Due to A"
→ Must equal (same currency, same cut-off)
```

Differences = timing, missing second JE, or error — fix **entity** books first.

**3. Aggregate**  
Consolidated BS/P&L for the three companies (parent group if configured), or export trial balances and sum by mapped account.

**4. Elimination entries (consolidation layer only)**  
Do **not** reverse the operating IC JEs on the legal entities (unless correcting a mistake).

```
Dr  Due to Satyam Buildcom (group)
Cr  Due from Satyam Construction (group)
   (matched IC payable/receivable)

Dr  IC management fee income
Cr  IC management fee expense
   (matched IC P&L)
```

After elim, group BS/P&L should show **only external** parties and income.

**5. Document**  
Elim schedule: pair, amount, period, who approved — audit trail for partners/MD.

### Worked mini-example

| Entity | Account | Balance |
|--------|---------|---------|
| BUILDCOM | Due from CONSTRUCTION | Dr 5,00,000 |
| CONSTRUCTION | Due to BUILDCOM | Cr 5,00,000 |

**Standalone:** both correct.  
**Sum without elim:** assets and liabilities each +5 L too high.  
**Elim:** offset the two → group net zero for that pair.

## Atlas role

| Layer | Owns |
|-------|------|
| Ops (bookings, site, channel) | Atlas |
| Entity GL (including IC JE pair) | ERPNext per Company |
| Group consolidation + elim | Finance process on ERPNext reports / Excel / later tool — **not** Atlas CEO pulse |

CEO can show **three entity KPIs side by side**. A raw sum of Atlas tiles is **ops**, not group P&L after elim.

Finance has a **group worksheet**: enter due-from / due-to per pair. Matched amounts produce offsetting Dr/Cr lines you can copy. **Atlas does not post those lines** onto SATYAM BUILDCOM, SATYAM CONSTRUCTION, or MGB.

## Close checklist

```
[ ] All IC JE pairs submitted on both companies
[ ] Due-from / due-to matched per sister pair
[ ] IC income/expense matched if any
[ ] Entity trial balances locked
[ ] Aggregate consolidated numbers
[ ] Post elim worksheet (or consol JEs)
[ ] Group BS/P&L for MD / silent partners
[ ] Keep entity packs for statutory / partners per LLP
```

## Bottom line

Match IC due-from/due-to (and IC P&L) across sisters, then **eliminate** them on the **group** pack. ERPNext records both sides well; **automatic elimination is not fully built-in**. For DUKIA: clean IC accounts + monthly pair reconciliation. Full auto-elim is optional later — not a blocker for entity books or Atlas ops.
