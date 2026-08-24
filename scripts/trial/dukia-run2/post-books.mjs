/**
 * Submit ATLAS-OPS Journal Entries on each sister + IC short-term unsecured loans.
 * Trial only. Never posts elim JEs. Retains all names for owner exploration.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ERP_CREATE_TIMEOUT_MS, ERP_SLOW_TIMEOUT_MS, erpnextFetch, loadDotEnv, readErpnextConfig } from "../../erpnext/lib.mjs";

loadDotEnv();
const cfg = readErpnextConfig();
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "docs", "trial", "dukia-run2");
mkdirSync(OUT, { recursive: true });

const MAIN = {
  "SATYAM BUILDCOM": "Main - SBC",
  "SATYAM CONSTRUCTION": "Main - SCN",
  "MGB PRIME ESTATES LLP": "Main - MGB",
};
const ABBR = {
  "SATYAM BUILDCOM": "SBC",
  "SATYAM CONSTRUCTION": "SCN",
  "MGB PRIME ESTATES LLP": "MGB",
};
const DATE = "2026-08-25";
const inventory = { baseline: {}, posted: [], icLoans: [], errors: [] };

async function countJe(company) {
  try {
    const r = await erpnextFetch(
      cfg,
      "/api/method/frappe.client.get_count",
      { method: "POST", body: JSON.stringify({ doctype: "Journal Entry", filters: { company } }) },
      ERP_SLOW_TIMEOUT_MS,
    );
    return Number(r.json?.message ?? 0);
  } catch {
    return null;
  }
}

async function submitJe({ sourceId, company, userRemark, lines }) {
  const title = `ATLAS-OPS ${sourceId}`;
  const remark = `ATLAS-OPS | DUKIA-RUN | ${company} | ${sourceId}${userRemark ? ` | ${userRemark}` : ""}`;
  const body = {
    doctype: "Journal Entry",
    voucher_type: "Journal Entry",
    company,
    posting_date: DATE,
    title,
    user_remark: remark,
    bill_no: sourceId,
    accounts: lines.map((ln) => {
      const debit = Number(ln.debit) || 0;
      const credit = Number(ln.credit) || 0;
      const row = {
        account: ln.account,
        debit_in_account_currency: debit,
        credit_in_account_currency: credit,
        debit,
        credit,
      };
      if (ln.costCenter) row.cost_center = ln.costCenter;
      return row;
    }),
  };
  const ins = await erpnextFetch(
    cfg,
    "/api/resource/Journal Entry",
    { method: "POST", body: JSON.stringify(body) },
    ERP_CREATE_TIMEOUT_MS,
  );
  const name = ins.json?.data?.name;
  if (!name) throw new Error("no JE name");
  const fresh = await erpnextFetch(
    cfg,
    `/api/resource/Journal Entry/${encodeURIComponent(name)}`,
    {},
    ERP_SLOW_TIMEOUT_MS,
  );
  const doc = fresh.json?.data ?? ins.json?.data;
  await erpnextFetch(
    cfg,
    "/api/method/frappe.client.submit",
    { method: "POST", body: JSON.stringify({ doc }) },
    ERP_CREATE_TIMEOUT_MS,
  );
  const row = { name, title, company, sourceId, remark, docstatus: 1 };
  inventory.posted.push(row);
  console.log("JE", name, company, sourceId);
  return row;
}

if (!cfg.configured) {
  console.error("ERPNext not configured");
  process.exit(1);
}

for (const company of Object.keys(ABBR)) {
  inventory.baseline[company] = await countJe(company);
}
console.log("baseline", inventory.baseline);

const capital = 5_00_00_000;
const opex = 1_25_000;
for (const company of Object.keys(ABBR)) {
  const a = ABBR[company];
  const cc = MAIN[company];
  try {
    await submitJe({
      sourceId: `dukia-run2-capital-${a}`,
      company,
      userRemark: "partner capital opening",
      lines: [
        { account: `Cash - ${a}`, debit: capital },
        { account: `Capital Stock - ${a}`, credit: capital },
      ],
    });
  } catch (err) {
    inventory.errors.push({ company, kind: "capital", error: err.message, body: err.body?.slice?.(0, 240) });
    console.log("FAIL capital", company, err.message, err.body?.slice?.(0, 200));
  }
  try {
    await submitJe({
      sourceId: `dukia-run2-opex-${a}`,
      company,
      userRemark: "site admin expenses",
      lines: [
        { account: `Administrative Expenses - ${a}`, debit: opex, costCenter: cc },
        { account: `Cash - ${a}`, credit: opex },
      ],
    });
  } catch (err) {
    inventory.errors.push({ company, kind: "opex", error: err.message, body: err.body?.slice?.(0, 240) });
    console.log("FAIL opex", company, err.message, err.body?.slice?.(0, 200));
  }
}

const loans = [
  { from: "SATYAM BUILDCOM", to: "SATYAM CONSTRUCTION", amount: 25_00_000, id: "ic-loan-sbc-scn" },
  { from: "SATYAM BUILDCOM", to: "MGB PRIME ESTATES LLP", amount: 40_00_000, id: "ic-loan-sbc-mgb" },
  { from: "SATYAM CONSTRUCTION", to: "MGB PRIME ESTATES LLP", amount: 15_00_000, id: "ic-loan-scn-mgb" },
];

for (const loan of loans) {
  const fa = ABBR[loan.from];
  const ta = ABBR[loan.to];
  const rec = { ...loan, lenderJe: null, borrowerJe: null };
  try {
    rec.lenderJe = await submitJe({
      sourceId: `${loan.id}-lender`,
      company: loan.from,
      userRemark: `short-term unsecured IC loan to ${loan.to}`,
      lines: [
        { account: `Due from ${loan.to} - ${fa}`, debit: loan.amount },
        { account: `Cash - ${fa}`, credit: loan.amount },
      ],
    });
    rec.borrowerJe = await submitJe({
      sourceId: `${loan.id}-borrower`,
      company: loan.to,
      userRemark: `short-term unsecured IC loan from ${loan.from}`,
      lines: [
        { account: `Cash - ${ta}`, debit: loan.amount },
        { account: `Due to ${loan.from} - ${ta}`, credit: loan.amount },
      ],
    });
  } catch (err) {
    inventory.errors.push({ kind: "ic-loan", id: loan.id, error: err.message, body: err.body?.slice?.(0, 300) });
    console.log("FAIL ic", loan.id, err.message, err.body?.slice?.(0, 240));
  }
  inventory.icLoans.push(rec);
}

writeFileSync(join(OUT, "books-inventory.json"), JSON.stringify(inventory, null, 2));
console.log("posted", inventory.posted.length, "errors", inventory.errors.length);
if (!inventory.posted.length) process.exitCode = 1;
