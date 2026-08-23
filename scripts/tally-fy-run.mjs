#!/usr/bin/env node
/**
 * Mock company year: post Atlas operations into trial Tally from
 * 1 Apr 2026 through 31 Mar 2027. Not live. Empty educational books only.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  MOCK_COMPANY,
  bootstrapLedgers,
  handleTallyAction,
  launchTally,
  pingTally,
  postMockVoucher,
} from "./tally-xml.mjs";

const START = "2026-04-01";
const END = "2027-03-31";

function monthsInFy() {
  const out = [];
  let y = 2026;
  let m = 4;
  while (y < 2027 || (y === 2027 && m <= 3)) {
    const mm = String(m).padStart(2, "0");
    const day = y === 2027 && m === 3 ? "31" : "01";
    out.push({
      y,
      m,
      label: `${y}-${mm}`,
      receiptDate: `${y}-${mm}-01`,
      paymentDate: `${y}-${mm}-01`,
      journalDate: `${y}-${mm}-${day}`,
    });
    m += 1;
    if (m === 13) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

function rupees(monthIndex) {
  const growth = 1 + monthIndex * 0.03;
  return {
    receipt: Math.round(845000 * growth),
    payment: Math.round(1840000 * growth),
    commission: Math.round(211250 * (monthIndex % 3 === 2 ? 1 : 0.35)),
    emi: 2150000,
  };
}

async function waitForTally(tries = 12) {
  for (let i = 0; i < tries; i++) {
    const p = await pingTally();
    if (p.status) return p;
    launchTally();
    await new Promise((r) => setTimeout(r, 4000));
  }
  return pingTally();
}

const months = monthsInFy();
const ping = await waitForTally();
if (!ping.status) {
  console.error(JSON.stringify({ ok: false, live: false, detail: ping.detail, company: MOCK_COMPANY }, null, 2));
  process.exit(2);
}

await bootstrapLedgers();

const posted = [];
let i = 0;
for (const month of months) {
  const amt = rupees(i);
  const jobs = [
    {
      date: month.receiptDate,
      type: "Receipt",
      amount: amt.receipt,
      debit: "Atlas Cash",
      credit: "Kanakpura Collections",
      narration: `FY mock · ${month.label} collections (Kanakpura)`,
    },
    {
      date: month.paymentDate,
      type: "Payment",
      amount: amt.payment,
      debit: "Shakti Earthworks",
      credit: "Atlas Bank",
      narration: `FY mock · ${month.label} contractor RA`,
    },
  ];
  if (month.m === 3 || month.m === 6 || month.m === 9 || month.m === 12) {
    jobs.push({
      date: month.journalDate,
      type: "Journal",
      amount: amt.commission,
      debit: "Partner Commission",
      credit: "Atlas Bank",
      narration: `FY mock · ${month.label} partner commission accrual`,
    });
  }
  if (month.m !== 8 || month.y !== 2026) {
    jobs.push({
      date: month.journalDate,
      type: "Journal",
      amount: amt.emi,
      debit: "Land Advance",
      credit: "Atlas Bank",
      narration: `FY mock · ${month.label} land EMI (ops mock)`,
    });
  }
  for (const job of jobs) {
    const r = await postMockVoucher(job);
    posted.push({ month: month.label, ...job, ok: r.ok, created: r.created, detail: r.detail });
  }
  i += 1;
}

const accepted = posted.filter((p) => p.ok).length;
const failed = posted.filter((p) => !p.ok);
const report = {
  live: false,
  company: MOCK_COMPANY,
  from: START,
  to: END,
  months: months.length,
  attempted: posted.length,
  accepted,
  failed: failed.length,
  ok: accepted > 0,
  detail: `${accepted}/${posted.length} mock vouchers posted into ${MOCK_COMPANY} through 31 Mar 2027`,
  firstFail: failed[0]?.detail,
  byMonth: months.map((m) => ({
    month: m.label,
    ok: posted.filter((p) => p.month === m.label && p.ok).length,
    fail: posted.filter((p) => p.month === m.label && !p.ok).length,
  })),
};

const out = join(process.cwd(), "screenshots", "company-day", "fy-2026-27.json");
writeFileSync(out, JSON.stringify({ ...report, posted }, null, 2));
console.log(JSON.stringify({ ...report, report: out }, null, 2));
if (!report.ok) process.exitCode = 2;
