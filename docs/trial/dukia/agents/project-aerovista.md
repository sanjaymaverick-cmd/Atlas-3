# project-aerovista.md

SATYAM BUILDCOM · AV-01 `p_av` · `lp_av` Muhana Mandi khasra 41/2 · RERA RAJ/P/2024/2144 · SBI  
PD R. Sharma · SE K. Rathore · SV D. Chauhan · Sales A. Joshi · Channel V. Meena (Aadhaar Prime 3.0% only)  
**P0:** isolation vs Square and Yard / SBG — units, leads, rates, diaries must not leak.  
Full-days owned: **2024-06-03 · 2024-06-17 · 2024-07-15 · 2024-09-02 · 2024-10-01 · 2025-06-02 · 2026-11-02**.

## 2024-06-03 — Project Director — R. Sharma — SATYAM BUILDCOM / Aerovista
### Work completed
- AV-01 planning, 119 units (AVA 26 × 2BHK, AVB 93 × 3BHK). Land `lp_av` diligence; acquire refused. No diary.
### Challenges faced
- PD home is the group queue. No land-gate banner on the project card.
### UI / UX difficulties
- Looked for “my project / programme”. Land papers sit on Legal’s desk. P2
### Missing fields / missing features
- Diligence checklist not on PD. No construction-start date on the project.
### Blockers & refusals
- Site work blocked until land is acquired. Correct.
### Data / numbers
- 3600 sq yd · budget ₹98 Cr · spent 0 · loan 0 · possession brief Nov 2026.
### Jargon
- Diligence | Land papers | I say title checks / CLU
### Handoffs
- Legal M. Iyer: five items open. Finance P. Jain: 60/40 SBI picture (document, not voucher).
### Severity tags (required)
- P2 PD cannot see land gate on project card
- P3 nav is Land papers not Acquisition

## 2024-06-17 — Project Director — R. Sharma — SATYAM BUILDCOM / Aerovista
### Work completed
- Parcel `lp_av` **acquired**. Still planning. No RFQ, no diary.
### Challenges faced
- Land closed with no ₹ consideration. Cannot brief land cost to site.
### UI / UX difficulties
- Home did not flag “land closed today”. Had to open Land papers.
### Missing fields / missing features
- Sale deed number / consideration ₹ after acquire. P1
### Blockers & refusals
- none on PD desk. Acquire succeeded after Legal cleared all five.
### Data / numbers
- Loan still 0 (SBI is construction finance). 119 units available.
### Jargon
- none today
### Handoffs
- Legal: RERA 2024-07-15. Commercial: RFQ after RERA. SE/SV: no diary until 2024-10-01.
### Severity tags (required)
- P1 no sale deed / land ₹ after acquire

## 2024-07-15 — Project Director — R. Sharma — SATYAM BUILDCOM / Aerovista
### Work completed
- RERA RAJ/P/2024/2144 filed with challan (Legal). SBI 60/40 sanction note as a document (Finance) — not a loan master.
### Challenges faced
- PD has no “registration live” flag. RERA lives on the parcel / Legal desk.
### UI / UX difficulties
- Project card still says planning; RERA number is easy to miss.
### Missing fields / missing features
- Bank sanction object (amount, split, letter no.). P1
### Blockers & refusals
- Vendors invited until KYC (group 2024-07-22/23). PO must wait. Correct.
### Data / numbers
- RERA RAJ/P/2024/2144 · SBI 60% / partners+advances 40%.
### Jargon
- Challan | I say acknowledgement / filing receipt
### Handoffs
- Commercial A. Kapoor: structure RFQ 2024-09-02 after vendors active. Finance: do not post ERPNext.
### Severity tags (required)
- P1 no bank-sanction / funding master
- P2 RERA not on PD project card

## 2024-09-02 — Project Director — R. Sharma — SATYAM BUILDCOM / Aerovista
### Work completed
- Structure / civil RFQ opened for Aerovista (Commercial). PD did not raise a second RFQ.
### Challenges faced
- RFQ is Commercial’s desk. PD cannot see package coverage vs programme.
### UI / UX difficulties
- No Gantt. Construction start is a calendar fact (2024-10-01), not a field.
### Missing fields / missing features
- Package vs tower. Quote/PO dates not on the project.
### Blockers & refusals
- Quotes 2024-09-16, PO 2024-09-23 + MD. Do not PO if vendor still invited.
### Data / numbers
- Package Structure / civil, required. Construction 2024-10-01 → 2026-10-31.
### Jargon
- RFQ | I say tender / enquiry
### Handoffs
- SE K. Rathore / SV D. Chauhan: first diary 2024-10-01. Stores H. Singh: TMT on Wednesdays after start.
### Severity tags (required)
- P2 no programme on PD desk
- P3 RFQ not visible as a project milestone

## 2024-10-01 — Site Supervisor — D. Chauhan — SATYAM BUILDCOM / Aerovista
### Work completed
- Construction **starts**. First diary: Clear · labour ~60 · structure · TMT against receipts · no incident (`svav-2024-10-01`). SE K. Rathore on site. Not Wednesday — no stores tick. PD R. Sharma confirmed start.
### Challenges faced
- Diary is a daily form through 2026-10-31. No copy-forward from yesterday.
### UI / UX difficulties
- Supervisor desk is the diary. Shared company file: do not type another project’s name.
### Missing fields / missing features
- Construction-start / finish vs first/last diary. Labour is a number, not trade-wise.
### Blockers & refusals
- none if land acquired, RERA filed, civil PO in train. Stop if diary refuses a date before start.
### Data / numbers
- Diary each workday 2024-10-01 → 2026-10-31 (skip Jaipur Sundays). Material `m_av_tmt` Wed only.
### Jargon
- Diary | I say DPR / daily progress
### Handoffs
- Stores: first TMT Wednesday after start. Sales: no launch until 2025-06-02. Channel still dark.
### Severity tags (required)
- P2 no construction-start field
- P3 labour not split by trade

## 2025-06-02 — Sales — A. Joshi — SATYAM BUILDCOM / Aerovista
### Work completed
- Launch. Walk-in lead AVA-0101 · budget ₹50 L. Channel V. Meena (Aadhaar Prime `ag_ap1`) on the floor. Monday: no `_bookNextAvailable`, no channel daily (those are Wednesday).
### Challenges faced
- 119 units. Launch does not shout “Aerovista only / Aadhaar Prime only”.
### UI / UX difficulties
- Group inventory can list sister projects. Must filter AV-01. Other brokers on this desk = leak.
### Missing fields / missing features
- Launch-day flag. Exclusive channel lock to Aadhaar Prime (3.0% never 2.5% / 4.0%).
### Blockers & refusals
- Refuse Square and Yard or SBG on `p_av`. **P0** if rates, units, leads, or diaries leak. V. Meena must not see Sunflower or Acropolis.
### Data / numbers
- Aadhaar Prime 3.0% · AVA ₹45 L · AVB ₹1 Cr · possession from 2026-11-02 · GSTIN 08AAAAP1111A1Z1.
### Jargon
- Walk-in | site visit · Channel daily | field report · Isolation | my company only
### Handoffs
- V. Meena: Wed reports (8/1/1) until possession. Never hand a lead to R. Shekhawat or P. Rathi. Construction to 2026-10-31.
### Severity tags (required)
- **P0 broker isolation vs Square and Yard / SBG**
- P2 no launch-day / exclusive-channel lock

## 2026-11-02 — Sales — A. Joshi — SATYAM BUILDCOM / Aerovista
### Work completed
- Possession window. OC + collect + possess where ready (`_preparePossession` on `p_av`). Diaries stopped 2026-10-31. PD / SE K. Rathore / SV D. Chauhan on site for handover, not new pours.
### Challenges faced
- Handover UI leads with PAN/Aadhaar KYC; OC and snags sit below the fold.
### UI / UX difficulties
- Easy to miss OC before offering keys. P2
### Missing fields / missing features
- Possession-ready vs booked-but-snagged. No bulk OC for a tower.
### Blockers & refusals
- Do not possess without OC / collections. Channel daily stops (day is not before possessionFrom). Correct.
### Data / numbers
- Project brief possession 2026-11-30; window from **2026-11-02**. 119 units to close.
### Jargon
- Possession / OC | handover / occupancy certificate · Collect | outstanding / demand
### Handoffs
- Legal: RERA QPR on quarter-ends. Finance: commissions Aadhaar Prime only. MD: group close is 2028-12-31, not this project’s last day.
### Severity tags (required)
- P2 handover chrome buries OC
- **P0** no Square and Yard / SBG commissions on Aerovista units
