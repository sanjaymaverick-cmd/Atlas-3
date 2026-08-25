/**
 * Login as finance@ and md@ (not Administrator) and check DUKIA Books.
 *
 *   node scripts/erpnext/verify-desk-phase1.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.ERPNEXT_URL || "http://127.0.0.1:8000";
const OUT = join("screenshots", "review", "erpnext-desk");
mkdirSync(OUT, { recursive: true });
const FINANCE = {
  user: "finance@dukia.local",
  password: process.env.ERPNEXT_FINANCE_PASSWORD || "DukiaBooks-FL",
};
const MD = { user: "md@dukia.local", password: process.env.ERPNEXT_MD_PASSWORD || "DukiaBooks-MD" };

async function login(page, { user, password }) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input", { timeout: 20000 });
  const email =
    (await page.$("#login_email")) ||
    (await page.$('input[type="email"]')) ||
    (await page.$('input[type="text"]'));
  const pass = (await page.$("#login_password")) || (await page.$('input[type="password"]'));
  await email.fill(user);
  await pass.fill(password);
  const btn = (await page.$(".btn-login")) || (await page.$('button[type="submit"]'));
  await Promise.all([
    page.waitForURL((u) => !String(u).includes("/login"), { timeout: 30000 }).catch(() => null),
    btn.click(),
  ]);
  await page.waitForTimeout(2500);
}

async function bodyText(page) {
  return page.evaluate(() => (document.body?.innerText || "").replace(/\s+/g, " "));
}

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const seat of [FINANCE, MD]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await login(page, seat);
    await page.screenshot({ path: join(OUT, `phase1-${seat.user.split("@")[0]}-home.png`) });
    const text = await bodyText(page);
    const url = page.url();
    const books =
      /DUKIA Books/i.test(text) || /dukia-books/i.test(url) || /New voucher/i.test(text);
    const zoo = /Subcontract/i.test(text) && /Manufactur/i.test(text) && /Quality/i.test(text);
    let je = {};
    if (seat.user.startsWith("finance")) {
      await page.goto(`${BASE}/app/journal-entry/new`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2500);
      await page.screenshot({ path: join(OUT, "phase1-finance-new-je.png"), fullPage: true });
      const jeText = await bodyText(page);
      je = {
        llpLabel: /\bLLP\b/.test(jeText),
        why: /Why \(plain words\)/i.test(jeText),
        shortName: /Short name/i.test(jeText),
        mockCompany: /MOCK ATLAS3/i.test(jeText),
        buildcom: /SATYAM BUILDCOM/i.test(jeText),
      };
    }
    results.push({
      user: seat.user,
      url,
      dukiaBooks: books,
      thirteenTileZoo: zoo,
      je,
    });
    console.log(JSON.stringify(results.at(-1)));
    await page.close();
  }
} finally {
  await browser.close();
}

const ok = results.every((r) => r.dukiaBooks) && results.every((r) => !r.thirteenTileZoo);
if (!ok) process.exitCode = 1;
console.log(ok ? "PASS finance@ and md@ land on DUKIA Books" : "FAIL desk verify");
