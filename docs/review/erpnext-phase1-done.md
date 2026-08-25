# ERPNext Desk Phase 1 — done notes

**Local only · not live.** Applied 2026-08-24 against site `frontend` at `D:\ERPNext`.

## Log

```
[x] Module Profile DUKIA Books (blocked Stock/Mfg/Selling/Buying/CRM/Quality/Support/Website/Subcontracting/Projects/Assets)
[x] User finance@dukia.local — updated
[x] Finance roles = Accounts User + Accounts Manager
[x] User md@dukia.local (Auditor — no JE submit) — updated
[x] MD roles = Auditor (read-only books)
[x] User Permission finance@dukia.local → SATYAM BUILDCOM
[x] User Permission finance@dukia.local → SATYAM CONSTRUCTION
[x] User Permission finance@dukia.local → MGB PRIME ESTATES LLP
[x] User Permission md@dukia.local → SATYAM BUILDCOM
[x] User Permission md@dukia.local → SATYAM CONSTRUCTION
[x] User Permission md@dukia.local → MGB PRIME ESTATES LLP
[x] Workspace "DUKIA Books" with 8 shortcuts
[x] Default workspace for finance@dukia.local
[x] Default workspace for md@dukia.local
[x] Global Defaults company = SATYAM BUILDCOM (never MOCK)
[x] JE label company → LLP
[x] JE label posting_date → Date
[x] JE label voucher_type → Kind
[x] JE label accounts → Lines
[x] JE label title → Short name
[x] JE label user_remark → Why (plain words)
[x] JE label inter_company_journal_entry_reference → Linked voucher in the other LLP
[x] JE unhide title
[x] JE unhide user_remark
[x] JE unhide inter_company_journal_entry_reference
[x] JE unhide from_template
[x] JE mandatory title
[x] JE mandatory user_remark
[x] JE mandatory company
[x] JE Kind options trimmed
[x] custom_remark default checked
[x] Short name sits after Why on Details
[x] JE hide noise fields (28)
[x] JE lines columns: Account, Debit, Credit, Cost Center
[x] Client Script JE Form (MOCK warn, stock sentence, group folder, MD read-only, title from Why)
[x] Client Script JE List (default Submitted; hide onboarding widget)
[x] Template Partner capital · SBC
[x] Template Site expense · SBC
[x] Template Loan to sister · SBC
[x] Template Partner capital · SCN
[x] Template Site expense · SCN
[x] Template Loan to sister · SCN
[x] Template Partner capital · MGB
[x] Template Site expense · MGB
[x] Template Loan to sister · MGB
[x] Saved report TB-SBC
[x] Saved report TB-SCN
[x] Saved report TB-MGB
[x] Trial JEs 00010 and 00021 still present (no delete, no elim)
```

## Logins (local)

| Seat    | User                  | Password        | Notes                                    |
| ------- | --------------------- | --------------- | ---------------------------------------- |
| Finance | `finance@dukia.local` | `DukiaBooks-FL` | Role Profile Accounts. Submits JEs.      |
| MD      | `md@dukia.local`      | `DukiaBooks-MD` | Auditor — report read, **no JE submit**. |

User Permission Allow=Company: SATYAM BUILDCOM, SATYAM CONSTRUCTION, MGB PRIME ESTATES LLP. **Not** MOCK ATLAS3 LLP. **Not** DUKIA GROUP posting.

## Left on purpose

- Trial JEs `ACC-JV-2026-00010`–`00021` kept.
- Drafts `00001`–`00009` and `00022` kept; list defaults to Submitted.
- Run2 IC loans stay ordinary Journal Entry (linked by remark). Forward loans: Inter Company kind.
- `ERPNEXT_POSTING_ENABLED` remains false on Atlas.
- No elim JEs. No site ERPNext users. No Desk theme.

Training card: [`docs/finance/DUKIA-BOOKS-10MIN.md`](../finance/DUKIA-BOOKS-10MIN.md).

## Verified (not Administrator)

- Login as `finance@dukia.local` lands on `/desk/dukia-books`.
- Login as `md@dukia.local` lands on `/desk/dukia-books`.
- New JE as finance@: LLP defaults to SATYAM BUILDCOM (never MOCK). Why (plain words) is on Details and mandatory.
- Short name is mandatory; Client Script copies Why → Short name (core layout still parks the field on More Info).
- Trial Balance for SATYAM BUILDCOM is non-zero (Cash ₹5 Cr, Due from CONSTRUCTION ₹25 L, Due from MGB ₹40 L).
- MOCK company: Client Script msgprint + **validate throw** (cannot Save/Submit as MOCK).
- Stock account on JE: human sentence, account cleared.
- Trial `ACC-JV-2026-00010`–`00021` still present. No elim JEs added.
- **Teachable live JE as finance@:** `ACC-JV-2026-00023` · SATYAM BUILDCOM · ₹1,000 Admin expenses / Cash · owner `finance@dukia.local` · submitted. Screenshots `teach-04-filled.png`, `teach-05-saved.png`.
- Drafts `00001`–`00009` / `00022` left Draft (cancel would require submit; that would double-post run2 amounts / fail on stock).

Re-verify: `node scripts/erpnext/verify-desk-phase1.mjs`. Teach: `node scripts/erpnext/teach-je-finance.mjs`.
