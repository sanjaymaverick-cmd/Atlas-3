# ERPNext Desk UX — DUKIA books (Finance + MD)

**Local only · not live.** Dry-run against ERPNext v16 at `D:\ERPNext` (site `frontend`, Desk `/desk`).  
**Date:** 2026-08-24. **Trial journals:** ATLAS-OPS run2 submitted (`ACC-JV-2026-00010`–`00021`).  
**Did not:** delete trial data · post elim JEs · change Atlas · create Desk users.

**Seats used:** Administrator / `admin` only. There is **no Finance user and no MD-restricted user** on this site. `admin@atlas.local` exists but holds every role (Accounts + Stock + Manufacturing + HR + Sales…). MD noise is inferred from Administrator’s module grid, not a second login.

**Screenshots:** `screenshots/review/erpnext-desk/`  
**ui-ux-pro-max:** product types _Financial Dashboard_, _Invoice & Billing_, _admin / multi-entity accounting_. Style suggestions (OLED dark, glassmorphism, gold/purple, GSAP, oversized type) are **rejected** — see §8.

Score in tables: **1** unusable without coaching · **2** works with high friction · **3** usable after one demo · **4** teachable in a 10-minute phone call.

---

## 1. Executive summary

- Desk after login is a **13-tile app launcher**. Accounting is one tile among Stock, Manufacturing, Quality, Selling, Subcontracting. On a phone the labels truncate (`Frappe Fr…`, `Manufact…`, `Subcontra…`). A books user cannot land on a journal in one glance.
- Journal Entry is **not** under Accounting. Accounting opens a **second flyout of 9 apps** (Invoicing, Payments, Financial Reports, Accounts Setup, Taxes, Banking, Budget, Share Management, Subscription). JE lives under **Payments**. Ctrl+K “Journal Entry” is fast **if** the user knows that English name. Search for “Inter Company Journal” returns **zero** hits.
- New JE **defaults Company to MOCK ATLAS3 LLP** (Global Defaults). The three trading LLPs have real money; the smoke company is empty. Trial Balance / General Ledger / Consolidated Statement all opened on MOCK and showed **₹0.00** while SATYAM BUILDCOM already has ₹5 Cr capital + IC loans. Silent wrong empty state — not “pick the LLP”.
- Submitted IC loan `ACC-JV-2026-00016` is readable as two lines (Due from SATYAM CONSTRUCTION / Cash) but **Entry Type = Journal Entry**, `inter_company_journal_entry_reference` is empty, and the human sentence in `user_remark` is **hidden**. Title `ATLAS-OPS ic-loan-sbc-scn-lender` is the only caption. ERPNext does **not** auto-eliminate IC balances; the Consolidated report here summed MOCK, not DUKIA GROUP, and would still be a raw sum even if pointed at the parent.
- The JE **Details** tab is already calmer than the 74-field doctype (v16 progressive disclosure works). Remaining pain is IA, default company, hidden remarks, 18 Entry Types, Payments-sidebar noise, and **no Finance/MD seats**. Phase 1 is Workspace + Customize Form + permissions — not a theme, not a React rewrite.

---

## 2. Time-to-task table

| Task                                       | Seconds / clicks                                                                   | Score   | Friction                                                                                                                                                                                                                                                                                          |
| ------------------------------------------ | ---------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login (Administrator)                      | ~5 s once the page is up; cold ~30 s                                               | 3       | Fine. **No Finance-like user exists** to log in as.                                                                                                                                                                                                                                               |
| First JE intent from Home (tiles)          | 3 hops: Accounting → Payments → Journal Entry (~8–20 s **if** they guess Payments) | **2**   | JE is not on the Accounting flyout. Flyout labels truncate (`Financial R…`, `Accounts S…`, `Share Mana…`). Literacy users look for “voucher / journal / books”, not Payments.                                                                                                                     |
| First JE via Ctrl+K                        | ~5 s, 1 search + Enter (List / New / Template all appear)                          | **3**   | Fast for someone who knows the English words “Journal Entry”. Searching “voucher” or “Inter Company Journal” fails.                                                                                                                                                                               |
| Switch Company SBC → SCN → MGB             | 1 field on JE / CoA toolbar. **No persistent navbar company chip.**                | **2**   | Default is MOCK. CoA control truncates to `MOCK ATLA…`. Reports do not scream which LLP you are on.                                                                                                                                                                                               |
| Open JE list + one ATLAS-OPS JE            | List ~4 s after Payments; open `00016` ~4 s                                        | **3**   | List titles are the ATLAS-OPS strings (good). Filter bar + onboarding widget eat the first paint. Drafts `00001`–`00009` + UX dry-run `00022` sit beside submitted rows.                                                                                                                          |
| Read remarks on `ACC-JV-2026-00016`        | 0 s for title; **remark never on Details**                                         | **2**   | Two lines + amounts are clear. Why-it-exists text is in hidden `user_remark`. More Info is empty-looking collapsed sections.                                                                                                                                                                      |
| Create draft two-line JE                   | Details tab: Company, Entry Type, Date, grid, Save                                 | **3**   | Form itself is teachable. Landmine is Company=MOCK. Grid shows Party Type / Party (unused for these JEs) and not Cost Center. Entry Type dropdown lists **18** kinds including Excise / Deferred / Asset Disposal.                                                                                |
| Wrong pattern: stock account on JE         | Instant refuse on **save** (leaf)                                                  | **2**   | Correct gate. Copy is jargon: _“Account: Stock In Hand - SBC can only be updated via Stock Transactions.”_ Group account `Stock Assets - SBC` **saves** as draft then fails on submit with a **different** sentence about group accounts. No “use Stock Entry instead”.                           |
| Chart of Accounts per company              | Direct URL / Accounts Setup. Toolbar company dropdown.                             | **3**   | Defaults to MOCK tree at ₹0. Switching is possible; not discoverable from Home.                                                                                                                                                                                                                   |
| General Ledger / Trial Balance per company | Sidebar Reports, then **must type Company**                                        | **1–2** | Both ran against MOCK (or empty) and showed ₹0 while sisters have postings. Filter strip: Finance Book, Currency, 5+ checkboxes, Cost Center, Project. No empty-state “choose SATYAM BUILDCOM”.                                                                                                   |
| Inter Company Journal Entry path           | Search = 0 results. Option exists only inside Entry Type.                          | **1**   | Trial IC loans were posted as ordinary Journal Entry and are **not linked**. Filtering list to “Inter Company Journal Entry” would hide the real loans.                                                                                                                                           |
| MD-like restricted view                    | **Not possible today**                                                             | **1**   | Administrator sees Stock, Manufacturing, Quality, Selling, Subcontracting, Assets, Buying, CRM-adjacent tiles. Role Profile `Accounts` exists (Accounts User + Accounts Manager) but is unused. Module Profiles: none. Blocked modules on Administrator: none. HR module is not installed (good). |
| Mobile (390×844) Home                      | Same 13 tiles, heavier truncation                                                  | **2**   | Search bar is usable. Accounting still 2nd-row. Unusable as a phone-first books desk; acceptable for a rare Ctrl+K.                                                                                                                                                                               |

---

## 3. Ranked UX leads

Every row answers: **can this be taught in 10 minutes on a phone call?**

| ID      | Problem                                                                              | Fix type                                                             | Effort | Impact | Notes / 10-min teach?                                                                                                                                                                                                                                                                      |
| ------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | ------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **U1**  | Home is 13 modules; JE is Accounting → Payments → Journal Entry                      | Workspace                                                            | **S**  | High   | Public Workspace **DUKIA Books** with ≤8 shortcuts; set as default for Finance + MD. Teach: “Ignore the blue tiles. Open DUKIA Books.”                                                                                                                                                     |
| **U2**  | Stock / Manufacturing / Quality / Selling / Subcontracting / Buying / Assets visible | Module hiding + Role Profile                                         | **S**  | High   | Finance: Role Profile `Accounts`. MD: Accounts User + report read. Block Stock, Manufacturing, Selling, Buying, CRM, Quality, Support, Website, Subcontracting, Projects. Teach: “You will only see books.”                                                                                |
| **U3**  | Default company = **MOCK ATLAS3 LLP**                                                | Property Setter / Global Defaults / User Permission                  | **S**  | High   | Set Finance default to SATYAM BUILDCOM; **do not** grant MOCK. User Permission Allow=Company for the three sisters. Teach: “If you see MOCK, stop.”                                                                                                                                        |
| **U4**  | `user_remark` hidden; title is `ATLAS-OPS ic-loan-…`                                 | Customize Form                                                       | **S**  | High   | Unhide **Title** + **User Remark**. Rename Remark → **Why (plain words)**. Make Why mandatory. Teach: “Always write why in one Hindi/English line.”                                                                                                                                        |
| **U5**  | Trial IC loans not typed/linked as Inter Company JE                                  | Training copy + Client Script (warn) + list filter                   | **S**  | High   | Do **not** rewrite posted JEs. Forward: JE Template “Loan to sister LLP” with voucher_type Inter Company Journal Entry. Teach: “Loans between LLPs use that template — two vouchers, one each side.”                                                                                       |
| **U6**  | TB / GL open on MOCK and show ₹0 with no warning                                     | Workspace shortcuts to saved reports + Client Script default company | **S**  | High   | Saved reports: TB-SBC, TB-SCN, TB-MGB. Empty ₹0 should read “This is MOCK / no company — pick an LLP”. Teach: “Trial Balance: pick the LLP first, then Refresh.”                                                                                                                           |
| **U7**  | Ctrl+K does not find “Inter Company”; 18 Entry Types                                 | Customize Form (options) + Workspace shortcut                        | **S**  | Med    | Hide unused voucher_type options (Excise, Deferred, Asset Disposal, Credit Card, Periodic Accounting, Exchange Reval…). Keep Journal Entry, Inter Company, Bank, Cash, Opening, Write Off. Teach: “Almost always Journal Entry. Sister loan = Inter Company.”                              |
| **U8**  | Payments sidebar: Payment Request / Order / Unreconcile / Repost ledgers             | Workspace (don’t use Payments as home)                               | **S**  | Med    | DUKIA Books shortcuts skip those. Optionally hide via Role Permission on doctypes Finance never uses. Teach: nothing — they never see the list.                                                                                                                                            |
| **U9**  | Accounting Onboarding widget (Sales Invoice, Sales Taxes) covers lists               | Workspace / skip onboarding                                          | **S**  | Med    | Skip All for these users (already 6/6 on Administrator after this dry-run). Wrong metaphor for three LLPs that do not invoice from Desk. Teach: click the X once.                                                                                                                          |
| **U10** | JE grid: Party columns on; Cost Center off; Bank Transaction button on IC loan       | Customize Form (grid)                                                | **S**  | Med    | List view of child: Account, Debit, Credit, Cost Center. Party only when account is receivable/payable (already ERPNext logic — keep field, not column). Hide Bank Transaction connection for this role if possible. Teach: “Account, left amount, right amount, two rows.”                |
| **U11** | Stock-on-JE error is not a human sentence; group vs leaf errors differ               | Client Script                                                        | **S**  | Med    | On account change: if account_type=Stock, msgprint _“This is an inventory account. Do not use it on a journal. Ask Stores / use a Stock Entry.”_ Group accounts: _“This is a folder, not a posting account. Pick a name without a folder icon.”_ Teach: that sentence **is** the training. |
| **U12** | IC due-from / due-to balances have no home                                           | Workspace shortcut to GL + CoA                                       | **S**  | High   | Shortcut **Sister loans (Due from / Due to)** → GL with account filter `Due %` per company, or CoA expanded to those leaves. Teach: “Due from = they owe us. Due to = we owe them. Must match the other LLP.”                                                                              |
| **U13** | CoA inherited self-dues (`Due from SATYAM BUILDCOM - SBC`)                           | Training copy (do not delete accounts this week)                     | **S**  | Low    | Nested group CoA copied Due-from-self onto each child. Confuses pickers. Later: mark unused / group. Teach: “Never pick Due from _this same_ LLP.”                                                                                                                                         |
| **U14** | Consolidated report ≠ group P&L after elim                                           | Training copy                                                        | **S**  | High   | Report is a **sum**. MOCK shown today. Even on DUKIA GROUP it will **not** wipe sister loans. Teach: “Partners get LLP pack. Group pack is a worksheet — not this button.”                                                                                                                 |
| **U15** | No Finance / MD Desk users                                                           | Role permissions                                                     | **S**  | High   | Create `finance@dukia.local` (Accounts Manager, three companies) and `md@dukia.local` (Accounts User, read reports, no submit if policy wants read-only). **No website users. No Atlas seats on ERPNext.** Teach: their own login, not Administrator.                                      |
| **U16** | List mixes Draft `00001`–`00009` with submitted `00010`–`00021`                      | List View settings (filter)                                          | **S**  | Med    | Default filter Status=Submitted. Do **not** delete the drafts (trial). Teach: “Grey Draft = not in the books. Only Submitted counts.”                                                                                                                                                      |
| **U17** | Financial Reports P&L chart empty; Payments dashboard is AR/AP ageing                | Workspace                                                            | **S**  | Med    | MD home = TB + P&L + BS shortcuts, not Payments dashboard. Fancy charts stay in Atlas CEO. Teach: “Numbers live in Trial Balance and P&L. Ignore the empty graph.”                                                                                                                         |
| **U18** | Truncated tile labels; no company chip on Home                                       | Light CSS theme app (optional, Phase 1.5)                            | **M**  | Low    | Only if Workspace isn’t enough. Increase tile label wrap; add a non-animated company name in navbar. **No motion.** 10-min teach still prefers Workspace over CSS.                                                                                                                         |
| **U19** | JE Templates unused                                                                  | Journal Entry Template (core)                                        | **S**  | Med    | Three templates: Partner capital, Site expense, Loan to sister. Teach: “New → From Template. Don’t hunt accounts.”                                                                                                                                                                         |
| **U20** | `title` hidden so list relies on series `ACC-JV-…` unless title_field still paints   | Customize Form                                                       | **S**  | Med    | Keep title in list (it already shows ATLAS-OPS strings). Rename to **Short name**. Client Script: default title from Why first 80 chars. Teach: “Short name = what you will recognise next month.”                                                                                         |

**Count:** 20 leads. **Phase 1 without a custom app:** U1–U12, U14–U17, U19–U20 (Workspace, Customize Form, Property Setter, Client Script, Role/Module, training copy).

---

## 4. Proposed Finance Workspace sitemap (max 8)

Public Workspace **`DUKIA Books`**. Default for Finance and MD. Do **not** clone Payments.

| #   | Shortcut            | Opens                                             | Who          |
| --- | ------------------- | ------------------------------------------------- | ------------ |
| 1   | **New voucher**     | Journal Entry / New                               | Finance      |
| 2   | **Vouchers**        | Journal Entry list (filter Submitted)             | Finance      |
| 3   | **Accounts (tree)** | Chart of Accounts                                 | Both         |
| 4   | **Ledger**          | General Ledger                                    | Both         |
| 5   | **Trial Balance**   | Trial Balance                                     | Both         |
| 6   | **Profit & Loss**   | Profit and Loss Statement                         | MD + Finance |
| 7   | **Balance Sheet**   | Balance Sheet                                     | MD + Finance |
| 8   | **Sister loans**    | GL or Account list filter `Due from%` / `Due to%` | Both         |

Out of this eight on purpose: Payment Entry, Sales Invoice, Stock, Consolidated Financial Statement (see U14), Banking/Plaid, Share Management, Subscription.

---

## 5. Journal Entry Customize Form list

v16 already splits **Details** / **More Info**. Apply this on doctype **Journal Entry** (and child **Journal Entry Account**) via Customize Form. Finance can do this tomorrow.

### 5.1 Show (Details) — keep mandatory

| Field           | Label now → proposed                    | Mandatory | Default                                    |
| --------------- | --------------------------------------- | --------- | ------------------------------------------ |
| `company`       | Company → **LLP**                       | Yes       | SATYAM BUILDCOM (never MOCK)               |
| `posting_date`  | Posting Date → **Date**                 | Yes       | today                                      |
| `voucher_type`  | Entry Type → **Kind** (trimmed options) | Yes       | Journal Entry                              |
| `accounts`      | Accounting Entries → **Lines**          | Yes       | two empty rows                             |
| `title`         | _(hidden)_ → **Short name**             | Yes       | from Why                                   |
| `user_remark`   | _(hidden)_ → **Why (plain words)**      | Yes       | —                                          |
| `naming_series` | Series                                  | Yes       | `ACC-JV-.YYYY.-` (read-only if one series) |

### 5.2 Hide on Details (leave in More Info or fully hidden)

Hide these for Accounts User / Manager. Do not delete.

**Always hide for DUKIA books users**

- `multi_currency`
- `apply_tds`, `tax_withholding_category`, `tax_withholding_group`, `ignore_tax_withholding_threshold`, `override_tax_withholding_entries`, `tax_withholding_entries`
- `for_all_stock_asset_accounts`, `stock_asset_account`, `periodic_entry_difference_account`, `get_balance_for_periodic_accounting`
- `write_off_based_on`, `write_off_amount`, `get_outstanding_invoices`
- `process_deferred_accounting`
- `letter_head`, `select_print_heading`
- `total_amount`, `total_amount_in_words`, `total_amount_currency`
- `payment_order`, `stock_entry`, `reversal_of`
- `is_system_generated`, `amended_from`
- `auto_repeat`
- `party_not_required`
- `mode_of_payment` (unless they start using Payment Entry later)
- `bill_no`, `bill_date`, `due_date` (vendor bills are not this desk’s job this phase)
- `pay_to_recd_from`
- `finance_book` (single book)
- `from_template` — **keep visible** if U19 templates are created; else hide

**Keep but not mandatory**

- `cheque_no` / `cheque_date` (already “Reference Number / Date”) — useful for bank
- `clearance_date` (read-only)
- `is_opening` — hide after opening is done
- `inter_company_journal_entry_reference` — **unhide** and rename **Linked voucher in the other LLP**
- `custom_remark` — set default checked so Why stays visible

### 5.3 Child table `Journal Entry Account` list columns

| Column                | Action                                            |
| --------------------- | ------------------------------------------------- |
| Account               | keep, mandatory                                   |
| Debit                 | keep                                              |
| Credit                | keep                                              |
| Cost Center           | **show** (P&L needs it; today it is off the grid) |
| Party Type            | hide from list (field stays)                      |
| Party                 | hide from list (field stays)                      |
| Bank Account          | hide                                              |
| Project               | hide until they post by project                   |
| Reference Type / Name | hide                                              |
| User Remark (row)     | hide; one Why on the parent is enough             |

### 5.4 Entry Type options to keep

Keep: Journal Entry · Inter Company Journal Entry · Bank Entry · Cash Entry · Opening Entry · Write Off Entry · Credit Note · Debit Note.  
Hide: Credit Card, Excise, Depreciation, Asset Disposal, Periodic Accounting, Exchange Rate Revaluation, Exchange Gain Or Loss, Deferred Revenue, Deferred Expense.

### 5.5 What not to do

Do not add extra sections, HTML banners, or a second “wizard” doctype. The Details tab is already the 10-minute form once MOCK and remarks are fixed.

---

## 6. IC loan findability

**What exists today**

| Pair                    | Amount     | Lender JE           | Borrower JE | Linked?                                                                              |
| ----------------------- | ---------- | ------------------- | ----------- | ------------------------------------------------------------------------------------ |
| BUILDCOM → CONSTRUCTION | ₹25,00,000 | `ACC-JV-2026-00016` | `00017`     | **No** (`inter_company_journal_entry_reference` empty; voucher_type = Journal Entry) |
| BUILDCOM → MGB          | ₹40,00,000 | `00018`             | `00019`     | No                                                                                   |
| CONSTRUCTION → MGB      | ₹15,00,000 | `00020`             | `00021`     | No                                                                                   |

Leaves `Due from {sister} - {ABBR}` / `Due to {sister} - {ABBR}` exist on each company **and** on DUKIA GROUP. Self-dues also exist (`Due from SATYAM BUILDCOM - SBC`).

**How Finance finds them now (bad)**

1. Know to open Journal Entry (not Inter Company).
2. Scan titles `ATLAS-OPS ic-loan-…`.
3. Or open CoA / TB for one LLP and hunt Due from / Due to.
4. Awesome Bar “Inter Company Journal” → **no results**.

**How MD / Finance should find them after Phase 1**

1. Workspace **Sister loans** → GL for `Due from%` on the current LLP.
2. Same GL on the other LLP: Due to must equal Due from.
3. List filter Kind = Inter Company **only after** new loans use that type. Do not filter the trial pair that way or they vanish.
4. Period-end: three-row paper (or Atlas group worksheet) — **not** ERPNext Consolidated Financial Statement. That report **sums**. It does **not** eliminate.

**Do not** post elim entries on the sisters to “make consolidation look right”.

---

## 7. Theme / branding

Desk v16 is already light, high-contrast, tabular rupees, one primary **Save** / **Add Journal Entry**. **Do not restyle.**

Optional only if scanability still fails after U1–U3:

- Light custom CSS app: wrap tile labels (no ellipsis), hide `.onboarding-widget`, slightly larger Company field.
- No decorative motion, no glass, no dark OLED, no gold/purple, no GSAP (ui-ux-pro-max _Financial Dashboard_ / _Fintech_ palettes — **reject**).
- Fancy charts stay in Atlas CEO. ERPNext P&L number card on Financial Reports was an empty “2026-2027” box — ignore it.

---

## 8. Non-goals and explicit rejects

| Reject                                                           | Why                                                                                 |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| React rewrite of Desk                                            | Forbidden. Frappe Desk is the product.                                              |
| Atlas clone of GL                                                | Atlas = ops. Books stay here.                                                       |
| Core ERPNext fork                                                | Feasible fixes only.                                                                |
| Site / website users on ERPNext                                  | Supervisors, channel, vendors stay in Atlas.                                        |
| Glassmorphism, OLED dark, gold/purple, Fira Code, oversized type | ui-ux-pro-max _Exaggerated Minimalism_ / _Fintech_ hits — wrong for a voucher desk. |
| Embedding Framer/Figma components                                | Hierarchy inspiration only (empty states, one primary).                             |
| Auto-elim of IC balances                                         | Core ERPNext does not do this. Do not pretend the Consolidated report does.         |
| Interactive CEO-style charts on Desk                             | Calm tables.                                                                        |
| Deleting trial JEs or drafts `00001`–`00009` / `00022`           | Dry-run constraint. Filter them.                                                    |
| Posting elim JEs onto SBC / SCN / MGB                            | Constraint.                                                                         |
| Making Desk a consumer app / Hindi-only UI                       | Rename a few labels; keep debit/credit. They can do Dr/Cr.                          |
| Changing Atlas code in this pass                                 | Out of scope.                                                                       |

---

## 9. Phase 1 desk-only checklist (1–2 days)

No custom app required for this list. Operator on Administrator.

```
[ ] Create Desk user finance@dukia.local — Role Profile Accounts
[ ] Create Desk user md@dukia.local — Accounts User, read reports; no Stock/HR/Mfg
[ ] User Permission: Company = SATYAM BUILDCOM, SATYAM CONSTRUCTION, MGB PRIME ESTATES LLP
    (repeat per user). Do not allow MOCK ATLAS3 LLP or DUKIA GROUP posting.
[ ] Block modules: Stock, Manufacturing, Selling, Buying, CRM, Quality, Support,
    Website, Subcontracting, Projects, Assets (keep Accounts + setup)
[ ] New public Workspace "DUKIA Books" with the 8 shortcuts in §4
[ ] Set that workspace as default for both users
[ ] Global Defaults: default_company = SATYAM BUILDCOM (or blank — never MOCK)
[ ] Customize Form → Journal Entry: hide list in §5.2; unhide title + user_remark;
    rename Why / LLP / Kind / Short name; trim Entry Type options
[ ] Customize Form → Journal Entry Account: list columns Account, Debit, Credit, Cost Center
[ ] Property Setter: user_remark.hidden = 0; title.hidden = 0; custom_remark default 1
[ ] Journal Entry list: default filter docstatus = Submitted; columns Title, Status, Company, Date, Total
[ ] JE Templates: Partner capital · Site expense · Loan to sister (Inter Company)
[ ] Client Script on Journal Entry: Stock account → human sentence (U11);
    default title from Why; warn if company == MOCK ATLAS3 LLP
[ ] Saved GL/TB reports per LLP + one "Due from/to" GL
[ ] Skip Accounting Onboarding for these users
[ ] Print one-page training card (§9.1). 10-minute call using that card.
[ ] Do not submit elim JEs. Do not delete ACC-JV-2026-00010–00021.
[ ] Leave drafts 00001–00009 and 00022 as Draft (filter them out).
```

### 9.1 10-minute phone-call card (plain words)

1. Open **DUKIA Books** (not the blue square grid).
2. **New voucher**. Check **LLP** — Buildcom / Construction / MGB. If it says MOCK, stop.
3. Two lines. Money left = money right. Save, then **Submit** (draft is not the books).
4. Write **Why** in normal words (“loan to Construction for Sunflower”).
5. Sister loan: template **Loan to sister**. Do it **twice** — once in each LLP. Due from here must equal Due to there.
6. Inventory / warehouse: **not** this screen.
7. Reports: Trial Balance → pick the same LLP → Refresh. ₹0 usually means wrong LLP.
8. Group total for R. Dukia is a **worksheet**, not the Consolidated button.

---

## 10. Open questions for owner

1. Should MD be **read-only** (no Submit on JE) or allowed to post?
2. Is MOCK ATLAS3 LLP still needed for Atlas smoke, or can Global Defaults leave it unused and hidden via User Permission?
3. Keep leftover Drafts `ACC-JV-2026-00001`–`00009` forever, or cancel them in a later operator pass (not delete)?
4. Should forward IC loans use ERPNext **Inter Company Journal Entry** (creates the other side) or stay two manual JEs + worksheet? Current trial used two manual ordinary JEs.
5. Hindi labels on Why / LLP / Kind — yes/no? (Recommend English + spoken Hindi on the call, not a bilingual Desk.)
6. Will Finance ever post **Payment Entry** / invoices in Desk, or is JE the only document for 90 days? (Decides whether to unhide Payment Entry.)
7. Who owns the group elim worksheet — P. Jain in Excel, or later a non-Atlas tool? Desk will not grow a consolidation UI in Phase 1.

---

## Appendix A — Dry-run evidence (textual wire notes)

**Home clutter:** 13 tiles. Accounting is 4th. Truncation on desktop and mobile. No company name. No Journal.

**Accounting flyout:** Invoicing · Payments · Financial Reports · Accounts Setup · Taxes · Banking · Budget · Share Management · Subscription. **No Journal Entry.**

**Payments home:** Dashboard of outgoing/incoming bills, AR/AP ageing, Bank Balance — empty/loading. Sidebar: Payment Entry, Journal Entry, Payment Request, Payment Order, Payment Reconciliation, Unreconcile Payment, Process Payment Reconciliation, Repost Accounting Ledger, Repost Payment Ledger. Onboarding “Create Sales Invoice”.

**JE `00016` Details:** Company SATYAM BUILDCOM · Kind Journal Entry · Date 25-08-2026 · Line1 Due from SATYAM CONSTRUCTION - SBC Dr ₹25,00,000 · Line2 Cash - SBC Cr ₹25,00,000. Header title ATLAS-OPS ic-loan-sbc-scn-lender. **Bank Transaction** control on an IC loan. Comments empty. Why-text not shown.

**New JE:** Company MOCK ATLAS3 LLP · Kind Journal Entry · one empty row · Party Type/Party columns · Reference Number/Date. Save primary. Quick Entry secondary.

**CoA:** Tree rooted at MOCK ATLAS3 LLP, all roots ₹0.00 Cr. Company control `MOCK ATLA…` top-right.

**Trial Balance:** Company MOCK, FY 2026-2027, seven checkboxes, Total row all ₹0.00. No “wrong company” message.

**General Ledger:** MOCK, 24-07-2026–24-08-2026 (misses 25-08-2026 trial posts even on the right company), Opening/Total/Closing ₹0.

**Consolidated Financial Statement:** Company MOCK ATLAS3 LLP, “Previous Financial Year is not closed”, Total Asset/Liability/Equity ₹0.00, Provisional P&L ₹0.00 red. Column header MOCK ATLAS3 LLP — **not** the three sisters.

**Stock refuse (API, not submitted):**  
`Account: Stock In Hand - SBC can only be updated via Stock Transactions`  
Group account draft `ACC-JV-2026-00022` (left Draft):  
`Account Stock Assets - SBC is a Group Account and group accounts cannot be used in transactions`

**Users:** Administrator, `admin@atlas.local` (all roles), Guest. Role Profiles: Inventory, Manufacturing, Accounts, Sales, Purchase. Module Profiles: none.

---

## Appendix B — ui-ux-pro-max mapping (feasible only)

| Guideline                     | Desk finding                                                                               | Feasible fix                       |
| ----------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------- |
| Progressive disclosure        | Details/More Info already there; 18 Entry Types and Payments sidebar still dump everything | Customize Form + Workspace         |
| Error clarity + recovery path | Stock message is cause without fix                                                         | Client Script sentence             |
| Empty states                  | ₹0 TB is a false empty                                                                     | Default company + saved reports    |
| Nav hierarchy / ≤5 top items  | 13 tiles + 9 accounting apps                                                               | DUKIA Books workspace (8)          |
| One primary CTA               | Add Journal Entry / Save are fine once on the form                                         | Don’t restyle                      |
| Don’t rely on jargon          | Journal Entry, voucher_type, Stock Transactions                                            | Rename Why/LLP/Kind; training card |
| Dense dashboard OK            | v16 tables are dense enough                                                                | No new charts                      |
| Contrast / tabular nums       | Pass                                                                                       | No theme                           |
| Glass / OLED / motion         | Suggested by product-type search                                                           | **Reject**                         |
