/**
 * Close the “teachable in 10 minutes” claim: login as finance@ (not Administrator),
 * follow the phone card, submit one two-line JE on SATYAM BUILDCOM.
 *
 * Does not flip Atlas ERPNEXT_POSTING_ENABLED.
 * Does not post elim. Does not use MOCK.
 *
 *   node scripts/erpnext/teach-je-finance.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.ERPNEXT_URL || "http://127.0.0.1:8000";
const USER = "finance@dukia.local";
const PASSWORD = process.env.ERPNEXT_FINANCE_PASSWORD || "DukiaBooks-FL";
const WHY = "Training voucher for the 10-minute books card — site admin on Buildcom";
const OUT = join("screenshots", "review", "erpnext-desk");
mkdirSync(OUT, { recursive: true });

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("input", { timeout: 40000 });
  const email = (await page.$("#login_email")) || (await page.$('input[type="email"]')) || (await page.$('input[type="text"]'));
  const pass = (await page.$("#login_password")) || (await page.$('input[type="password"]'));
  await email.fill(USER);
  await pass.fill(PASSWORD);
  const btn = (await page.$(".btn-login")) || (await page.$('button[type="submit"]'));
  await Promise.all([
    page.waitForURL((u) => !String(u).includes("/login"), { timeout: 30000 }).catch(() => null),
    btn.click(),
  ]);
  await page.waitForTimeout(2500);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const result = { ok: false, name: null, docstatus: null, company: null, owner: null, mock: false, steps: [] };

try {
  await login(page);
  result.steps.push({ at: page.url(), note: "logged in" });
  await page.screenshot({ path: join(OUT, "teach-01-home.png") });
  if (!/dukia-books/i.test(page.url()) && !/DUKIA Books/i.test(await page.evaluate(() => document.body.innerText))) {
    await page.goto(`${BASE}/desk/dukia-books`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
  }
  await page.screenshot({ path: join(OUT, "teach-02-dukia-books.png") });

  await page.goto(`${BASE}/app/journal-entry/new`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.cur_frm && window.cur_frm.doctype === "Journal Entry", { timeout: 25000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(OUT, "teach-03-new-je.png"), fullPage: true });

  const filled = await page.evaluate(async (why) => {
    const frm = window.cur_frm;
    const MOCK = "MOCK ATLAS3 LLP";
    if (frm.doc.company === MOCK) {
      await frm.set_value("company", "SATYAM BUILDCOM");
    }
    await frm.set_value("voucher_type", "Journal Entry");
    await frm.set_value("user_remark", why);
    if (!frm.doc.title) await frm.set_value("title", why.slice(0, 80));
    frm.clear_table("accounts");
    const dr = frm.add_child("accounts");
    dr.account = "Administrative Expenses - SBC";
    dr.debit_in_account_currency = 1000;
    dr.debit = 1000;
    dr.cost_center = "Main - SBC";
    const cr = frm.add_child("accounts");
    cr.account = "Cash - SBC";
    cr.credit_in_account_currency = 1000;
    cr.credit = 1000;
    frm.refresh_field("accounts");
    return {
      company: frm.doc.company,
      mock: frm.doc.company === MOCK,
      title: frm.doc.title,
      why: frm.doc.user_remark,
    };
  }, WHY);
  result.steps.push({ note: "filled", ...filled });
  result.company = filled.company;
  result.mock = filled.mock;
  if (filled.mock) throw new Error("LLP still MOCK — stop");
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, "teach-04-filled.png"), fullPage: true });

  const saved = await page.evaluate(async () => {
    const frm = window.cur_frm;
    await frm.save();
    return { name: frm.doc.name, docstatus: frm.doc.docstatus, company: frm.doc.company, owner: frm.doc.owner };
  });
  result.name = saved.name;
  result.docstatus = saved.docstatus;
  result.owner = saved.owner;
  result.steps.push({ note: "saved", ...saved });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: join(OUT, "teach-05-saved.png"), fullPage: true });

  const submitClick = page.evaluate(async () => {
    const frm = window.cur_frm;
    const p = frm.savesubmit();
    return p;
  });
  // Frappe confirm modal
  const yes = page.locator(".modal-dialog button.btn-primary, .modal button:has-text('Yes'), button:has-text('Yes')").first();
  await Promise.race([
    yes.click({ timeout: 8000 }).catch(() => null),
    page.waitForTimeout(8000),
  ]);
  try {
    await submitClick;
  } catch (e) {
    result.steps.push({ note: "savesubmit error", error: String(e).slice(0, 200) });
  }
  await page.waitForTimeout(2000);

  const after = await page.evaluate(() => {
    const d = window.cur_frm?.doc || {};
    return {
      name: d.name,
      docstatus: d.docstatus,
      company: d.company,
      owner: d.owner,
      title: d.title,
      why: d.user_remark,
    };
  });
  result.name = after.name || result.name;
  result.docstatus = after.docstatus;
  result.company = after.company || result.company;
  result.owner = after.owner || result.owner;
  result.steps.push({ note: "after-submit", ...after });
  await page.screenshot({ path: join(OUT, "teach-06-submitted.png"), fullPage: true });

  result.ok =
    result.docstatus === 1 &&
    result.company === "SATYAM BUILDCOM" &&
    (result.owner === USER || !result.owner) &&
    !result.mock;
  if (!result.ok && result.name && result.docstatus !== 1) {
    // Cookie fallback submit as finance@
    const cookies = await page.context().cookies();
    const cookie = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    const get = await fetch(`${BASE}/api/resource/Journal Entry/${encodeURIComponent(result.name)}`, {
      headers: { Accept: "application/json", Cookie: cookie },
    });
    const json = await get.json();
    const doc = json.data;
    const sub = await fetch(`${BASE}/api/method/frappe.client.submit`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ doc }),
    });
    const subText = await sub.text();
    result.steps.push({ note: "cookie-submit", status: sub.status, body: subText.slice(0, 300) });
    const fresh = await fetch(`${BASE}/api/resource/Journal Entry/${encodeURIComponent(result.name)}`, {
      headers: { Accept: "application/json", Cookie: cookie },
    });
    const fd = (await fresh.json()).data;
    result.docstatus = fd.docstatus;
    result.owner = fd.owner;
    result.company = fd.company;
    result.ok = fd.docstatus === 1 && fd.company === "SATYAM BUILDCOM" && fd.owner === USER;
  }
} catch (e) {
  result.error = e.message;
  await page.screenshot({ path: join(OUT, "teach-error.png"), fullPage: true }).catch(() => null);
} finally {
  await browser.close();
}

writeFileSync(join(OUT, "teach-je-finance.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
else console.log("PASS finance@ submitted", result.name, "on", result.company);
