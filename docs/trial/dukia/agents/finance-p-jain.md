# finance-p-jain.md

## 2024-06-03 — Finance Lead — P. Jain — SATYAM BUILDCOM / Aerovista

### Work completed
- Recorded funding picture (ops document, not a voucher): `d_b49h1p31` Funding picture — Aerovista land equity + construction 60% SBI / 40% partner+advances (quarantine) 
- Land will be partner capital. Construction later: 60% SBI, 40% partners + booking advances.
- Did not post to ERPNext (posting off).

### Challenges faced
- Company accounts desk still talks in Atlas match-cases. There is no "loan sanction" object. I used a document. P1

### UI / UX difficulties
- Company accounts (ERPNext) health is a sentence on the finance desk. If Docker is down it says not configured — that is honest.
- No 60/40 funding slider or bank name field. P1

### Missing fields / missing features
- Bank (SBI / AU), sanction letter number, land vs construction split.
- ERPNext company SATYAM BUILDCOM may not exist yet if only MOCK ATLAS3 LLP was created.

### Blockers & refusals
- Posting refused by policy (ERPNEXT_POSTING_ENABLED=false). Correct.

### Data / numbers
- No ₹ on the parcel yet. I could not enter land consideration.

### Jargon
- Company accounts | Finance | Fine. ERPNext is the word I use for books.

### Handoffs
- Land & Legal to clear five diligence items before I can treat land as acquired capital.

### Severity tags (required)
- P1 no loan/funding master; no land consideration
- P2 document used as a stand-in for a sanction letter

## 2024-06-17 — Finance Lead — P. Jain — SATYAM BUILDCOM / Aerovista

### Work completed
- Partner-capital land payment recorded as ops document (not posted): d_wwwtu8v8:Partner capital — Aerovista land (ops record, not ERPNext voucher):quarantine
- ERPNext posting still off. Atlas posted nothing.

### Challenges faced
- Cannot post a payment entry to SATYAM BUILDCOM in ERPNext from Atlas. Correct by policy.

### UI / UX difficulties
- Same as 3 Jun — document used as a cash voucher stand-in.

### Missing fields / missing features
- Payment entry, bank, amount on land.

### Blockers & refusals
- Posting off. Correct.

### Data / numbers
- Amount not entered (no field).

### Jargon
- none

### Handoffs
- ERPNext company SATYAM BUILDCOM must exist for later P&L. Operator to create if missing.

### Severity tags (required)
- P1 no amount on partner-capital record
