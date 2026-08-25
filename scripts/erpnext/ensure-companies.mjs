#!/usr/bin/env node
/**
 * Operator helper — not an Atlas product path.
 * Canonical create is Accounting → Company in the D:\ERPNext desk.
 * This script can insert the same names over REST if the desk is slow.
 * Never posts a voucher. Atlas does not call this at runtime.
 *
 *   node scripts/erpnext/ensure-companies.mjs
 */
import {
  COMPANY_SPECS,
  FISCAL_YEARS,
  PROJECT_COST_CENTERS,
  TRADING_COMPANIES,
} from "./companies.mjs";
import {
  ERP_CREATE_TIMEOUT_MS,
  ERP_SLOW_TIMEOUT_MS,
  erpnextFetch,
  loadDotEnv,
  readErpnextConfig,
} from "./lib.mjs";

loadDotEnv();
const cfg = readErpnextConfig();
const dry = process.argv.includes("--dry");

function fail(msg) {
  console.error(msg);
  process.exitCode = 1;
}

async function listCompanies() {
  const params = new URLSearchParams({
    fields: JSON.stringify([
      "name",
      "abbr",
      "is_group",
      "parent_company",
      "default_currency",
      "country",
    ]),
    limit_page_length: "50",
  });
  const r = await erpnextFetch(cfg, `/api/resource/Company?${params}`, {}, ERP_SLOW_TIMEOUT_MS);
  return r.json?.data ?? [];
}

async function getCompany(name) {
  try {
    const r = await erpnextFetch(
      cfg,
      `/api/resource/Company/${encodeURIComponent(name)}`,
      {},
      ERP_SLOW_TIMEOUT_MS,
    );
    return r.json?.data ?? null;
  } catch {
    return null;
  }
}

function payloadFor(spec, existingNames) {
  const body = {
    doctype: "Company",
    company_name: spec.name,
    abbr: spec.abbr,
    default_currency: "INR",
    country: "India",
    is_group: spec.isGroup ? 1 : 0,
    tax_id: spec.gstin || undefined,
  };
  const parentOk = spec.parent && existingNames.has(spec.parent);
  if (parentOk) {
    body.parent_company = spec.parent;
    body.create_chart_of_accounts_based_on = "Existing Company";
    body.existing_company = spec.parent;
  } else if (existingNames.has("MOCK ATLAS3 LLP") && spec.role !== "mock") {
    body.create_chart_of_accounts_based_on = "Existing Company";
    body.existing_company = "MOCK ATLAS3 LLP";
  } else {
    body.create_chart_of_accounts_based_on = "Standard Template";
    body.chart_of_accounts = "Standard";
  }
  return body;
}

async function createCompany(spec, existingNames) {
  const body = payloadFor(spec, existingNames);
  console.log("create  :", spec.name, dry ? "(dry)" : `abbr ${spec.abbr}`);
  if (dry) return { name: spec.name, dry: true };
  try {
    const r = await erpnextFetch(
      cfg,
      "/api/resource/Company",
      { method: "POST", body: JSON.stringify(body) },
      ERP_CREATE_TIMEOUT_MS,
    );
    return r.json?.data ?? { name: spec.name };
  } catch (err) {
    const again = await getCompany(spec.name);
    if (again) {
      console.log("create  :", spec.name, "appeared after timeout — treating as created");
      return again;
    }
    throw err;
  }
}

async function ensureCostCenter(company, leafName) {
  const parent = `${company} - ${COMPANY_SPECS.find((c) => c.name === company)?.abbr ?? ""}`.trim();
  const full = `${leafName} - ${COMPANY_SPECS.find((c) => c.name === company)?.abbr ?? ""}`.trim();
  const params = new URLSearchParams({
    fields: JSON.stringify(["name", "is_group"]),
    filters: JSON.stringify([
      ["company", "=", company],
      ["name", "=", full],
    ]),
    limit_page_length: "1",
  });
  const r = await erpnextFetch(cfg, `/api/resource/Cost Center?${params}`, {}, ERP_SLOW_TIMEOUT_MS);
  if (r.json?.data?.length) return { name: full, existed: true };
  if (dry) return { name: full, dry: true };
  try {
    await erpnextFetch(
      cfg,
      "/api/resource/Cost Center",
      {
        method: "POST",
        body: JSON.stringify({
          doctype: "Cost Center",
          cost_center_name: leafName,
          company,
          parent_cost_center: parent,
          is_group: 0,
        }),
      },
      ERP_SLOW_TIMEOUT_MS,
    );
    return { name: full, existed: false };
  } catch (err) {
    return { name: full, error: err.body || err.message };
  }
}

async function ensureFiscalYears(companyNames) {
  const params = new URLSearchParams({
    fields: JSON.stringify(["name", "year_start_date", "year_end_date"]),
    limit_page_length: "20",
  });
  const r = await erpnextFetch(cfg, `/api/resource/Fiscal Year?${params}`, {}, ERP_SLOW_TIMEOUT_MS);
  const have = new Set((r.json?.data ?? []).map((row) => row.name));
  const notes = [];
  for (const fy of FISCAL_YEARS) {
    if (have.has(fy.year)) {
      notes.push(`${fy.year} exists`);
      continue;
    }
    if (dry) {
      notes.push(`${fy.year} would create`);
      continue;
    }
    try {
      await erpnextFetch(
        cfg,
        "/api/resource/Fiscal Year",
        {
          method: "POST",
          body: JSON.stringify({
            doctype: "Fiscal Year",
            ...fy,
            companies: companyNames.map((company) => ({ company })),
          }),
        },
        ERP_SLOW_TIMEOUT_MS,
      );
      notes.push(`${fy.year} created`);
    } catch (err) {
      notes.push(`${fy.year} ${err.status === 409 ? "exists" : err.message}`);
    }
  }
  return notes;
}

if (!cfg.configured) {
  fail("books backend not configured — set ERPNEXT_URL + API key/secret in scripts/erpnext/.env");
  console.log("ERPNext stays at D:\\ERPNext. Atlas still boots without companies.");
  process.exit();
}

try {
  await erpnextFetch(cfg, "/api/method/frappe.ping", {}, ERP_SLOW_TIMEOUT_MS);
} catch (err) {
  fail(
    `ERPNext unreachable (${err.message}). Docker is at D:\\ERPNext\\frappe_docker (pwd.yml, port 8000).`,
  );
  process.exit();
}

const existing = await listCompanies();
const names = new Set(existing.map((row) => row.name));
console.log("erpnext : reachable");
console.log("have    :", [...names].join(", ") || "(none)");
console.log("posting :", cfg.postingEnabled, "(this script never posts)");
console.log("");

const created = [];
for (const spec of COMPANY_SPECS) {
  if (names.has(spec.name)) {
    console.log("skip    :", spec.name, "already present");
    continue;
  }
  try {
    await createCompany(spec, names);
    names.add(spec.name);
    created.push(spec.name);
  } catch (err) {
    fail(`FAIL create ${spec.name}: ${err.message} ${err.body ?? ""}`);
  }
}

const ccNotes = [];
for (const cc of PROJECT_COST_CENTERS) {
  if (!names.has(cc.company)) continue;
  const row = await ensureCostCenter(cc.company, cc.name);
  ccNotes.push(
    row.error ? `${cc.name}: ${row.error}` : `${row.name}${row.existed ? " exists" : ""}`,
  );
}

const fyNotes = await ensureFiscalYears([...names]);

console.log("");
const after = await listCompanies();
for (const spec of COMPANY_SPECS) {
  const hit = after.find((row) => row.name === spec.name);
  const tag = hit ? "OK" : "MISSING";
  console.log(
    `${tag.padEnd(8)} ${spec.name.padEnd(28)} abbr=${(hit?.abbr ?? spec.abbr).padEnd(4)} ${
      spec.role
    }${spec.project ? ` · ${spec.project}` : ""}`,
  );
}

console.log("");
console.log("cost cc :", ccNotes.join(" · ") || "none");
console.log("fiscal  :", fyNotes.join(" · "));
console.log("created :", created.length ? created.join(", ") : "(none this run)");

const missingTrading = TRADING_COMPANIES.filter((n) => !after.some((row) => row.name === n));
if (missingTrading.length) {
  fail(`DUKIA sisters still missing: ${missingTrading.join(", ")}`);
} else {
  console.log("dukia   : three trading companies present. MOCK kept for smoke. Posting still off.");
}
