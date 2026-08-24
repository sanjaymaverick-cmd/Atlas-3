# DUKIA Books — 10-minute phone card

**Local Desk only.** Finance and MD log in as themselves — not Administrator. Atlas stays ops. ERPNext stays books.

1. Open **DUKIA Books** (not the blue square grid).
2. **New voucher**. Check **LLP** — Buildcom / Construction / MGB. If it says MOCK, stop.
3. Two lines. Money left = money right. Save, then **Submit** (draft is not the books).
4. Write **Why** in normal words (“loan to Construction for Sunflower”). **Short name** fills from Why (it is mandatory — Save will ask if Why is empty).
5. Sister loan: template **Loan to sister**. Do it **twice** — once in each LLP. Due from here must equal Due to there. New loans use Inter Company kind; run2 vouchers 00016–00021 stay ordinary linked-by-remark pairs.
6. Inventory / warehouse: **not** this screen. A stock account will say: “Inventory account — do not use on journal; use Stock Entry / ask Stores.”
7. Reports: Trial Balance → pick the same LLP → Refresh. ₹0 usually means wrong LLP.
8. Group total for R. Dukia is a **worksheet**, not the Consolidated button.

MD login is read-only (no Submit). Finance submits. Site, channel, and vendors do not get ERPNext logins.

**Worked example (finance@, not Administrator):** `ACC-JV-2026-00023` on SATYAM BUILDCOM — ₹1,000 Administrative Expenses / Cash. Why: “Training voucher for the 10-minute books card — site admin on Buildcom.” Submitted. Not MOCK. Not an elim.
