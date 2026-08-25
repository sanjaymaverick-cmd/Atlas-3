# MOCK ATLAS3 LLP — September 2026 (Q2 close)

**Sessions:** 4 (1, 10, 18, 30 Sep) · **Seat turns:** 15 · **Errors:** 0
**Audit depth at Q2 close:** 112 events · **Trial clock verified at** 2026-09-30

---

## Position at Q2 close

| Project           | Status       | Progress | Spent     |
| ----------------- | ------------ | -------- | --------- |
| KPR-01 Kanakpura  | construction | 42%      | ₹21.40 Cr |
| MSE-03 Mansarovar | handover     | 78%      | ₹29.80 Cr |
| BGH-02 Baggad     | planning     | 18%      | ₹8.10 Cr  |

**Funnel:** inquiry 4 · visit 1 · documentation 1 · lost 1
**Bookings:** 5 · **collected ₹1.78 Cr** · **Commissions:** 2, both `accrued`, none paid
**Approvals pending:** 7 · **Changes open:** 5

Monsoon cost a washout on 10 Sep (labour 46, work stopped 10:30) and PD raised a
+6 day slip on the Tower A L13 slab cycle. Tower A L13 poured 28 Sep regardless.
Mansarovar snags were swept ahead of December possession.

---

## Findings

### F5 — Overdue obligations never become overdue (P1, new — needs the clock to see)

At the 30 Sep close, with the trial clock correctly at `2026-09-30`:

```
OVERDUE  labour     due 2026-08-31  status=overdue  BOCW cess return
         rera       due 2026-09-15  status=open     Occupation certificate follow-up
         tax        due 2026-09-20  status=open     GST on advances
```

Obligation `status` is a **stored field that never recomputes against today**.
`BOCW cess` only reads overdue because it was seeded that way. Two genuinely
overdue statutory items — an OC follow-up 15 days past and **GST on advances 10
days past** — still present as `open`. Nothing turns amber, nothing reaches a
Command queue, nobody is told.

Same shape on the loan book: EMIs `e1` and `e3` fell due 5 Sep and still read
`due`, not overdue, at month end.

This is a compliance item that never raises its hand, and **it is invisible
without a moving clock** — which is precisely why the clock seam was worth
building. It could not have been found by a single-day run.

### F6 — Four-eyes export queue has no one working it (P2, new)

Two `Document export → Four-eyes approver` approvals have sat pending since 24
Aug. `exportGrants` is still empty, so the Document Controller could not consume
an export on 18 Sep — "no grant available".

`WAITING_ON_ROLES` maps `Four-eyes approver` to `owner` and `pm`, so the PD could
clear these. Nobody did, because nothing tells the PD they are the approver. The
queue simply accumulates. Process gap rather than a defect, but it means the
four-eyes export path has not completed end to end in five weeks of operation.

### F7 — Washout days are invisible upstream (P2, new)

The supervisor recorded the 10 Sep washout as 46 labour and a note. There is no
way to mark a day lost. Timeline risk does not move, so the slip only exists
because the PD happened to raise a change by hand. On a monsoon-exposed programme
that is the difference between a schedule that tracks reality and one that does not.

### F8 — CatBoost not exercised (blocked, not a defect)

Scoring on the 10 Sep portal ingest returned:

```
score=47 band=warm model=hybrid reasons=[Budget declared +6, Source 99acres +3, hybrid · calibrated warm]
```

`model=hybrid`, not native. The scoring service on `127.0.0.1:8091` is **down**,
so Atlas fell back exactly as documented. The fallback behaved correctly, but the
stated invariant — _CatBoost uses native `cat_features` only_ — is **untested**.
Start it with `npm run scoring` before the October sales push if that invariant
matters to the run.

---

## Gates that held this month

| Gate                                | Evidence                                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **OC/CC before possession**         | A-0802 (`oc=pending`) → "OC/CC must be received before possession."                                     |
| **Statutory filing needs evidence** | Empty ack → "Acknowledgement / challan number required." then accepted `RERA/JPR/QPR/2026-Q2/ACK-88214` |
| **Commission accrues only**         | Both commissions still `accrued` at quarter end                                                         |

The RERA evidence gate is worth calling out — it was item 14 on the last review's
list and it is implemented and working.

---

## ERPNext

Baseline moves to `scripts/trial/probes/erpnext-baseline.mjs` once `D:\ERPNext`
is up with company **MOCK ATLAS3 LLP**. Historic Tally XML remains at
`docs/trial/tally/baseline-2026-08-24.xml` as an archive, not a live backend.

**The company is empty** — no ledger masters, no vouchers. The mock books
described in the run brief are in `Atlas Mock LLP` (3 Journal vouchers), not in
`MOCK ATLAS3 LLP`. Finance therefore reconciled Atlas-side cases only; there is
nothing in Tally to match against.

This does not weaken the closing attestation — an empty baseline is the strongest
possible starting point. If the voucher count is still **0** on 31 Mar 2027, _Atlas
never posted_ is proven arithmetically.

If you want Finance to do real reconciliation work, MOCK ATLAS3 LLP needs masters
and opening balances loaded. Atlas must not create them — that would be Atlas
writing to the books.
