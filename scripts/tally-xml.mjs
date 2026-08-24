/**
 * RETIRED — Tally XML is not the books backend.
 * Books of record: ERPNext at D:\ERPNext via src/lib/erpnext and /api/books.
 * This file is kept so old FY scripts do not 404; runtime no longer imports it.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";

export const TALLY_URL = process.env.TALLY_URL || "http://127.0.0.1:9000";
export const MOCK_COMPANY = process.env.TALLY_COMPANY || "Atlas Mock LLP";

const TALLY_EXE_CANDIDATES = [
  "C:\\Tally.ERP9\\tally.exe",
  "C:\\Program Files\\Tally.ERP9\\tally.exe",
  "C:\\Program Files (x86)\\Tally.ERP9\\tally.exe",
  "C:\\Program Files\\TallyPrime\\tally.exe",
  "C:\\Program Files\\TallyPrime\\TallyPrime.exe",
  "C:\\Program Files (x86)\\TallyPrime\\tally.exe",
];

export function findTallyExe() {
  return TALLY_EXE_CANDIDATES.find((p) => existsSync(p)) ?? null;
}

export function tallyIniPath() {
  const exe = findTallyExe();
  if (!exe) return null;
  const dir = exe.replace(/[^\\/]+$/, "");
  const ini = join(dir, "tally.ini");
  return existsSync(ini) ? ini : join(dir, "Tally.ini");
}

/** Turn on Tally acting as XML server on port 9000 if the INI is writable. */
export function ensureTallyServerIni() {
  const ini = tallyIniPath();
  if (!ini || !existsSync(ini)) {
    return { ok: false, detail: "tally.ini not found" };
  }
  let text = readFileSync(ini, "utf8");
  const original = text;
  if (/Tally is acting as\s*=/i.test(text)) {
    text = text.replace(/Tally is acting as\s*=.*/i, "Tally is acting as=Server");
  } else {
    text += "\r\nTally is acting as=Server\r\n";
  }
  if (/^\s*Port\s*=/im.test(text)) {
    text = text.replace(/^\s*Port\s*=.*/im, "Port=9000");
  } else {
    text += "Port=9000\r\n";
  }
  if (text !== original) {
    try {
      writeFileSync(ini, text);
    } catch (err) {
      return { ok: false, detail: `Could not write tally.ini: ${err?.message || err}` };
    }
  }
  return { ok: true, detail: ini };
}

export function launchTally() {
  const exe = findTallyExe();
  if (!exe) return { ok: false, detail: "TallyPrime.exe not found" };
  spawn(exe, [], { detached: true, stdio: "ignore" }).unref();
  return { ok: true, detail: exe };
}

export async function tallyPost(xml) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(TALLY_URL, {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=utf-8" },
      body: xml,
      signal: ctrl.signal,
    });
    const text = await res.text();
    const created = /<CREATED>(\d+)<\/CREATED>/i.exec(text) || /CREATED\s*=\s*"?(\d+)/i.exec(text);
    const errors = /<ERRORS>(\d+)<\/ERRORS>/i.exec(text) || /ERRORS\s*=\s*"?(\d+)/i.exec(text);
    const exceptions = /<EXCEPTIONS>(\d+)<\/EXCEPTIONS>/i.exec(text) || /EXCEPTIONS\s*=\s*"?(\d+)/i.exec(text);
    const lineError = /<LINEERROR>([^<]+)<\/LINEERROR>/i.exec(text);
    const createdN = Number(created?.[1] ?? 0);
    return {
      ok:
        res.ok &&
        createdN > 0 &&
        !(Number(errors?.[1] ?? 0) > 0) &&
        !(Number(exceptions?.[1] ?? 0) > 0) &&
        !lineError,
      status: res.status,
      created: createdN,
      errors: Number(errors?.[1] ?? 0),
      text,
      detail: lineError?.[1] || (res.ok ? "ok" : `HTTP ${res.status}`),
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      created: 0,
      errors: 1,
      text: "",
      detail: err?.name === "AbortError" ? "Tally XML port 9000 did not answer" : String(err?.message || err),
    };
  } finally {
    clearTimeout(t);
  }
}

function envelope(inner) {
  return `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Import</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>All Masters</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <IMPORTDUPS>@@DUPCOMBINE</IMPORTDUPS>
        <SVCURRENTCOMPANY>${escapeXml(MOCK_COMPANY)}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
    </DESC>
    <DATA>
      ${inner}
    </DATA>
  </BODY>
</ENVELOPE>`;
}

export function escapeXml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function createCompanyXml() {
  return `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Import</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>All Masters</ID>
  </HEADER>
  <BODY>
    <DESC></DESC>
    <DATA>
      <TALLYMESSAGE xmlns:UDF="TallyUDF">
        <COMPANY NAME="${escapeXml(MOCK_COMPANY)}" ACTION="Create">
          <NAME>${escapeXml(MOCK_COMPANY)}</NAME>
          <MAILINGNAME>${escapeXml(MOCK_COMPANY)}</MAILINGNAME>
          <COUNTRYNAME>India</COUNTRYNAME>
          <STATENAME>Rajasthan</STATENAME>
          <PINCODE>302001</PINCODE>
          <STARTINGFROM>20260401</STARTINGFROM>
          <COMPANYEMAIL>mock@atlas.local</COMPANYEMAIL>
          <ISSECURITYON>No</ISSECURITYON>
        </COMPANY>
      </TALLYMESSAGE>
    </DATA>
  </BODY>
</ENVELOPE>`;
}

export function listCompaniesXml() {
  return `<?xml version="1.0"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>List of Companies</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;
}

export function ledgerXml(name, parent) {
  return envelope(`<TALLYMESSAGE xmlns:UDF="TallyUDF">
        <LEDGER NAME="${escapeXml(name)}" ACTION="Create">
          <NAME>${escapeXml(name)}</NAME>
          <PARENT>${escapeXml(parent)}</PARENT>
          <ISBILLWISEON>No</ISBILLWISEON>
        </LEDGER>
      </TALLYMESSAGE>`);
}

export function voucherXml({ date, type, narration, debit, credit, amount }) {
  const ymd = (date || "2026-08-01").replaceAll("-", "");
  const amt = Number(amount) || 0;
  const amtStr = amt.toFixed(2);
  return `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Import</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>Vouchers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${escapeXml(MOCK_COMPANY)}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
    </DESC>
    <DATA>
      <TALLYMESSAGE xmlns:UDF="TallyUDF">
        <VOUCHER VCHTYPE="${escapeXml(type)}" ACTION="Create">
          <DATE>${ymd}</DATE>
          <EFFECTIVEDATE>${ymd}</EFFECTIVEDATE>
          <NARRATION>${escapeXml(narration)}</NARRATION>
          <VOUCHERTYPENAME>${escapeXml(type)}</VOUCHERTYPENAME>
          <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>${escapeXml(debit)}</LEDGERNAME>
            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
            <AMOUNT>-${amtStr}</AMOUNT>
          </ALLLEDGERENTRIES.LIST>
          <ALLLEDGERENTRIES.LIST>
            <LEDGERNAME>${escapeXml(credit)}</LEDGERNAME>
            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
            <AMOUNT>${amtStr}</AMOUNT>
          </ALLLEDGERENTRIES.LIST>
        </VOUCHER>
      </TALLYMESSAGE>
    </DATA>
  </BODY>
</ENVELOPE>`;
}

const LEDGERS = [
  ["Atlas Cash", "Cash-in-Hand"],
  ["Atlas Bank", "Bank Accounts"],
  ["Kanakpura Collections", "Sundry Debtors"],
  ["Shakti Earthworks", "Sundry Creditors"],
  ["Pink City Electricals", "Sundry Creditors"],
  ["Partner Commission", "Indirect Expenses"],
  ["Land Advance", "Current Assets"],
];

export async function pingTally() {
  const r = await tallyPost(listCompaniesXml());
  return r;
}

export async function bootstrapLedgers() {
  const results = [];
  for (const [name, parent] of LEDGERS) {
    results.push({ name, ...(await tallyPost(ledgerXml(name, parent))) });
  }
  return results;
}

export async function postMockVoucher(input) {
  const body = {
    date: input.date,
    type: input.type || "Journal",
    narration: input.narration || "Atlas mock voucher — trial Tally, not live",
    debit: input.debit || "Atlas Cash",
    credit: input.credit || "Kanakpura Collections",
    amount: input.amount || 1000,
  };
  return tallyPost(voucherXml(body));
}

export async function handleTallyAction(payload) {
  const action = payload?.action || "ping";
  if (action === "ping") {
    const r = await pingTally();
    return { action, company: MOCK_COMPANY, live: false, ...r };
  }
  if (action === "bootstrap") {
    const ping = await pingTally();
    if (!ping.status) return { action, live: false, ok: false, detail: ping.detail, company: MOCK_COMPANY };
    const ledgers = await bootstrapLedgers();
    return { action, live: false, ok: ledgers.some((l) => l.ok || /already/i.test(l.detail + l.text)), company: MOCK_COMPANY, ledgers, ping };
  }
  if (action === "voucher") {
    const r = await postMockVoucher(payload);
    return { action, live: false, company: MOCK_COMPANY, voucher: payload, ...r };
  }
  if (action === "company-day") {
    const ping = await pingTally();
    const open = Boolean(ping.status);
    const listed = new RegExp(MOCK_COMPANY.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(ping.text || "");
    return {
      action,
      live: false,
      ok: open && (listed || (ping.text || "").length > 80),
      company: MOCK_COMPANY,
      posted: [],
      ping,
      detail: !open
        ? ping.detail
        : listed || (ping.text || "").length > 80
          ? `${MOCK_COMPANY} is open with prior-run books. Atlas did not post.`
          : `Tally answered but ${MOCK_COMPANY} was not in the company list.`,
    };
  }
  return { ok: false, detail: "Unknown tally action", live: false };
}
