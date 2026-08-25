/**
 * Nested CoA: add Due from / Due to on root DUKIA GROUP so children inherit.
 * Does not create companies. Never posts a journal.
 */
import { TRADING_COMPANIES } from "../../erpnext/companies.mjs";
import {
  ERP_CREATE_TIMEOUT_MS,
  ERP_SLOW_TIMEOUT_MS,
  erpnextFetch,
  loadDotEnv,
  readErpnextConfig,
} from "../../erpnext/lib.mjs";

loadDotEnv();
const cfg = readErpnextConfig();
const GROUP = "DUKIA GROUP";
const GABBR = "DG";

async function findAccount(name) {
  try {
    const r = await erpnextFetch(
      cfg,
      `/api/resource/Account/${encodeURIComponent(name)}`,
      {},
      ERP_SLOW_TIMEOUT_MS,
    );
    return r.json?.data ?? null;
  } catch {
    return null;
  }
}

async function parent(candidates) {
  for (const name of candidates) {
    if (await findAccount(name)) return name;
  }
  return null;
}

async function ensureLeaf(accountName, parentAccount) {
  const full = `${accountName} - ${GABBR}`;
  if (await findAccount(full)) {
    console.log("skip", full);
    return full;
  }
  await erpnextFetch(
    cfg,
    "/api/resource/Account",
    {
      method: "POST",
      body: JSON.stringify({
        doctype: "Account",
        account_name: accountName,
        parent_account: parentAccount,
        company: GROUP,
        is_group: 0,
      }),
    },
    ERP_CREATE_TIMEOUT_MS,
  );
  console.log("create", full);
  return full;
}

if (!cfg.configured) {
  console.error("ERPNext not configured");
  process.exit(1);
}

const assetParent = await parent([
  `Loans and Advances (Assets) - ${GABBR}`,
  `Current Assets - ${GABBR}`,
  `Application of Funds (Assets) - ${GABBR}`,
]);
const liabParent = await parent([
  `Loans (Liabilities) - ${GABBR}`,
  `Current Liabilities - ${GABBR}`,
  `Source of Funds (Liabilities) - ${GABBR}`,
]);
if (!assetParent || !liabParent) {
  console.error("FAIL group parents", { assetParent, liabParent });
  process.exit(1);
}
console.log("group parents", assetParent, liabParent);

for (const company of TRADING_COMPANIES) {
  await ensureLeaf(`Due from ${company}`, assetParent);
  await ensureLeaf(`Due to ${company}`, liabParent);
}

const abbr = {
  "SATYAM BUILDCOM": "SBC",
  "SATYAM CONSTRUCTION": "SCN",
  "MGB PRIME ESTATES LLP": "MGB",
};
let childOk = 0;
for (const company of TRADING_COMPANIES) {
  const a = abbr[company];
  for (const other of TRADING_COMPANIES) {
    const from = await findAccount(`Due from ${other} - ${a}`);
    const to = await findAccount(`Due to ${other} - ${a}`);
    if (from) childOk += 1;
    if (to) childOk += 1;
    console.log(
      company,
      `Due from ${other}`,
      from ? "yes" : "no",
      `Due to ${other}`,
      to ? "yes" : "no",
    );
  }
}
console.log("child IC leaves found", childOk);
