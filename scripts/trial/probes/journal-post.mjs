/**
 * Controlled JE: posting off must refuse; validate catches unbalanced journals.
 *
 *   node scripts/trial/probes/journal-post.mjs
 */
const BASE = process.env.ATLAS_URL || "http://127.0.0.1:8080";

async function books(body) {
  const res = await fetch(`${BASE}/api/books`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

const unbalanced = await books({
  action: "validate",
  sourceId: "probe-unbal",
  company: "SATYAM BUILDCOM",
  postingDate: "2026-08-24",
  lines: [
    { account: "Construction Expenses - SBC", debit: 1000 },
    { account: "Cash - SBC", credit: 1 },
  ],
});
const balanced = await books({
  action: "validate",
  sourceId: "probe-bal",
  company: "SATYAM BUILDCOM",
  postingDate: "2026-08-24",
  lines: [
    { account: "Construction Expenses - SBC", debit: 1000 },
    { account: "Cash - SBC", credit: 1000 },
  ],
});
const posted = await books({
  action: "post",
  sourceId: "probe-post-off",
  company: "SATYAM BUILDCOM",
  postingDate: "2026-08-24",
  lines: [
    { account: "Construction Expenses - SBC", debit: 1000 },
    { account: "Cash - SBC", credit: 1000 },
  ],
});

const okUnbal = unbalanced.ok === false && /not balanced/i.test(unbalanced.detail ?? "");
const okBal = balanced.ok === true;
const okRefuse = posted.ok === false && /posting is off/i.test(posted.detail ?? "");
console.log(okUnbal ? "PASS" : "FAIL", "unbalanced", unbalanced.detail);
console.log(okBal ? "PASS" : "FAIL", "balanced validate", balanced.detail);
console.log(okRefuse ? "PASS" : "FAIL", "post refused while flag off", posted.detail);
if (!okUnbal || !okBal || !okRefuse) process.exitCode = 1;
