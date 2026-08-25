# Blockers — DUKIA run2 (P0/P1 only)

No P0 books corruption. Isolation hits: 0.

## P1

- Nested CoA: child companies cannot add accounts until they exist on **DUKIA GROUP**. Operator created Due from/Due to on the group; children inherited `Due from X - SBC/SCN/MGB`.
- Journal submit must GET the draft then `frappe.client.submit` with the full doc (timestamp mismatch if you submit `{doctype,name}` only). Drafts ACC-JV-2026-00001–00009 retained from the first attempt.
- Dense catalog used **one pinned day (2026-08-25)** covering every seat’s must-do once — not 90 empty calendar days.

No P0.
