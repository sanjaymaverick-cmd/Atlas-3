# MOCK ATLAS3 LLP — Week 1 (24–28 Aug 2026)

**Operating company:** MOCK ATLAS3 LLP · **Books:** ERPNext at D:\ERPNext — *configure when ready*
**Days run:** 5 · **Seat turns:** 29 · **Errors:** 0 · **Audit events:** 76 across 13 named people

Portfolio: KPR-01 Kanakpura (construction 42%) · MSE-03 Mansarovar (handover 78%) · BGH-02 Baggad (planning 18%).

---

## The week as a company

Kanakpura ran a full slab cycle. Tower B raft steel finished Tuesday, pre-pour
checklist Wednesday, **320 cum poured Thursday 06:00–14:20** with cube samples,
curing Friday. Tower A reached L13 columns at 80%. Labour 138–168/day. One
near-miss Wednesday (loose scaffold plank, Tower A L11) corrected same shift.

Commercially, Baggad's boundary-wall RFQ went out Monday with a 7 Sep due date and
Marwar Steel quoted ₹48.5 L on Tuesday, excluding gate automation.

On the sales side the week produced a **complete channel cycle**: Pink City filed
daily reports Mon and Tue, held a west-stack unit for R. Malhotra on Tuesday,
converted it to a booking at **₹1.18 Cr** on Friday, which raised an approval
`Hold booking → Sales Manager / MD` that the MD cleared the same day. Commission
accrued against it and **was not paid**. In-house, a walk-in (A. Sethi, ₹1.26 Cr)
was logged Monday and had a site visit scheduled for Friday.

Finance collected ₹5 L against an existing booking. Land cleared the
Conversion/CLU flag once the order came in.

---

## Invariants — all held

| Invariant | Result | Evidence |
|-----------|--------|----------|
| **Unit lock is strict** | ✅ | `un1` booked → "Unit A-1204 is booked — hold refused." · `un10` held → "Unit S-12 is held — hold refused." |
| **Commission accrues, never self-pays** | ✅ | Payout requested Friday; both commissions still `accrued` |
| **Pink City ≠ Desert Reach** | ✅ | 0 leaks across 12 seat/route UI checks; `/app/crm` redirects |
| **Over-issue refused** | ✅ | 9999t probe → "Cannot issue more than accepted receipts." |
| **Acquisition blocked until diligence** | ✅ | Refused Thu — correctly, `Title search — 30 year` is still `open` |
| **Vendor cannot skip KYC** | ✅ | "Vendor can only be activated from the approval stage." |
| **Daily report gates a hold** | ✅ | "File today's daily report before placing a hold." |

Seven gates, seven correct refusals. Nothing was worked around to complete a day.

---

## Findings

### F1 — Four-eyes bypass (P1, carried from day 1)

MD approved a Change **waiting on the Project Director**, `pending → approved`, no
refusal. `FIX-THIS.md` B4. Needs a product decision: scope the MD, or retire the
four-eyes claim.

Note the contrast — on Thursday the MD correctly ran into the *vendor* KYC gate.
So gates the MD shouldn't cross do exist; the approval seat just isn't one of them.

### F2 — Near-miss has nowhere to go (P2, new)

The Wednesday near-miss went into the diary's `safety` free-text because there is
no field for it. It does not surface as an exception, does not raise an NCR, and
will not appear on any Command queue. On a real site a near-miss is the leading
indicator you most want visible — this one is invisible the moment the diary is
filed.

### F3 — `result: "pending"` reads as a result (P3, new)

Scheduled inspections carry `result: "pending"` rather than an empty result, so
"has this been inspected yet" and "what was the outcome" share one field. Cosmetic
in the app, but it cost the harness a day — Thursday reported "none open" when
three inspections were in fact awaiting sign-off.

*(This was my script's wrong predicate, not an Atlas defect — recording it because
the same conflation will bite a report writer later.)*

### F4 — Jargon log (running)

| Term | Seat | What the person expected |
|------|------|--------------------------|
| "Waiting for a yes" | MD | Replaced *Approvals* — loses the word they'd search for |
| GRN, QS | Stores | "gate entry" and "measurement" |
| Band | Channel agent | Reads hot/warm/cold; "band" itself means nothing |
| Quarantine | Doc Controller | Read as "legally held", not "virus scan" |
| Accrued | MD | "Earned, not paid" is the right gloss — the word alone isn't |

---

## Blocked — Tally still not on the run company

Re-checked after the company was reported open. Tally has **`Atlas Mock LLP`**
loaded, not `MOCK ATLAS3 LLP`:

```
LOADED IN TALLY: COMPANY NAME="Atlas Mock LLP"    (3 Journal vouchers, FY 20260401–20270331)
```

`MOCK ATLAS3 LLP` exists on disk — it appears in the plain company list — but is
not loaded, which is why every date-scoped export answers `Bad variables!`.

**No baseline taken.** Baselining `Atlas Mock LLP` would attest against yesterday's
books and prove nothing about this run.

To fix: in Tally, **F1 → Select Company → MOCK ATLAS3 LLP** (and close
`Atlas Mock LLP` if only one should be loaded). Then
`node scripts/trial/probes/tally-baseline.mjs` takes ~2 seconds.

Everything else in the run is unaffected — this blocks only the Tally-side
reconcile and the closing "Atlas posted no voucher" attestation.
