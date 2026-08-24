# DUKIA GROUP run2 — STATUS

**Clock:** 2026-08-25 (dense catalog, not 90 empty days)  
**Branch:** dukia/erpnext-companies  
**Books:** ERPNext at D:\ERPNext. Posting was on for this trial, then set back to false.  
**Elim JEs on entity books:** 0

## Success criteria

| Gate | Result |
|------|--------|
| Every seat has at least one active day log | PASS — 30 seats under agents/ |
| Must-do catalog attempted | PASS — land x3, vendor Active x3, PO x3, diaries x3, stores, bookings x6, channel isolation, CEO |
| At least one PO after Active | PASS — po_cj4qijse, po_iijof7w0, po_1f5q7xh6 |
| At least one submitted ATLAS-OPS JE per sister | PASS — capital + opex on SBC/SCN/MGB |
| At least 3 IC loan pairs both sides | PASS — 25L SBC to SCN, 40L SBC to MGB, 15L SCN to MGB |
| Zero elim JEs on entity books | PASS |
| Channel isolation incidents | 0 |
| Close inventory | close-inventory.json |
| UX scores | ux-scores.csv |

## IC loans (short-term unsecured)

| Pair | Amount | Lender JE | Borrower JE |
|------|--------|-----------|-------------|
| BUILDCOM to CONSTRUCTION | Rs 25,00,000 | ACC-JV-2026-00016 | ACC-JV-2026-00017 |
| BUILDCOM to MGB | Rs 40,00,000 | ACC-JV-2026-00018 | ACC-JV-2026-00019 |
| CONSTRUCTION to MGB | Rs 15,00,000 | ACC-JV-2026-00020 | ACC-JV-2026-00021 |

## Operating JEs

Capital Rs 5 Cr + admin opex Rs 1,25,000 on each sister: ACC-JV-2026-00010 through ACC-JV-2026-00015 (submitted).

Drafts ACC-JV-2026-00001 through 00009 were a timestamp-mismatch retry; they are **retained** (not deleted).

## CEO

Three LLP cards present. Copy states group is not P&L after IC elim.

## Literacy

RFQ to PO scored 2 (too many screens). Land/RERA scored 2. Channel daily report scored 1. Supervisor diaries scored 1.

## Fix pass (2026-08-24) — literacy + Desk Phase 1

**What changed**

- Atlas commercial: RFQ → attach paper/WhatsApp quote → pick Active quote → raise PO (≤4 steps). Gate copy: *Cannot raise PO — vendor not Active. Open Approvals.*
- Atlas sales: book-next from the filtered free-unit list (BHK chips). Prefix typing is not the primary path. Exhausted-band prefix fallback kept.
- Atlas land: consideration ₹ → sale deed → RERA challan required before filed.
- Supervisor diary: labour-by-trade chips with Hindi secondary labels. Stores still Receive / Issue.
- CEO: three LLP cards; inventory funnel (available/held/booked/possessed) + velocity + collections/aging from ops data; “books in ERPNext”; no after-elim claim.
- Journal client: GET draft then `frappe.client.submit` with the **full doc**. Nested CoA rule documented. `ERPNEXT_POSTING_ENABLED` still false.
- ERPNext Desk: `finance@dukia.local` + `md@dukia.local`; workspace **DUKIA Books**; MOCK not default; JE Why / Short name / LLP labels. Operator checklist: `docs/review/erpnext-phase1-done.md`.
- Teachable JE: `finance@` submitted `ACC-JV-2026-00023` on SATYAM BUILDCOM (₹1,000 site admin). 10-minute card: `docs/finance/DUKIA-BOOKS-10MIN.md`.
- Forward IC rule: new loans = Inter Company kind; run2 `00016`–`00021` left ordinary. See `docs/finance/ERPNEXT.md` and `CONSOLIDATION.md`.

**Left on purpose**

- Trial JEs `ACC-JV-2026-00010`–`00021` kept. No elim JEs on entity books.
- Drafts `00001`–`00009` and `00022` **not cancelled**. Cancel in ERPNext needs Submit first; those drafts are the failed timestamp-mismatch copies of the same capital/opex/IC already posted as `00010`–`00021`, plus a stock-account dry-run (`00022`) that must not submit. List default remains Submitted.
- Run2 IC loans stay ordinary Journal Entry, linked by remark only. Forward loans use Inter Company kind.
- Four-eyes MD bypass **kept** for this local trial (flip before live). Posting default **off**. MD Desk **read-only**. L14 stays selector-scoped until real brokers (`docs/decisions/owner-calls.md`).
- No site / channel / vendor ERPNext logins. No React rewrite of Desk.

## Non-goals respected

No statutory audit pack. No auto-elim posted. No live WhatsApp/pay/e-sign. No site ERPNext logins. No Frappe rewrite.
