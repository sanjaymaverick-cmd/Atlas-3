/**
 * Pass 2: click through Accounting, dismiss onboarding, open real JE/list/reports.
 * Does not delete trial data. Does not post elim JEs.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://127.0.0.1:8000";
const OUT = "D:/work Dir/Atlas 3/screenshots/review/erpnext-desk";
mkdirSync(OUT, { recursive: true });
const log = [];
const say = (m, extra = {}) => {
  const row = { m, ...extra };
  log.push(row);
  console.log(JSON.stringify(row));
};

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input", { timeout: 20000 });
  const email = (await page.$("#login_email")) || (await page.$('input[type="text"]'));
  const pass = (await page.$("#login_password")) || (await page.$('input[type="password"]'));
  await email.fill("Administrator");
  await pass.fill("admin");
  const btn = (await page.$(".btn-login")) || (await page.$('button[type="submit"]'));
  await btn.click();
  await page.waitForURL((u) => !String(u).includes("/login"), { timeout: 30000 });
  await page.waitForTimeout(2000);
}

async function dismissOnboarding(page) {
  const skip = page.getByText("Skip All", { exact: false });
  if (await skip.count()) {
    await skip
      .first()
      .click({ timeout: 2000 })
      .catch(() => {});
    await page.waitForTimeout(400);
  }
  const close = page.locator(
    '.onboarding-widget button, [aria-label="Close"], .onboarding-widget .close, button:has-text("×")',
  );
  if (await close.count()) {
    await close
      .first()
      .click({ timeout: 1500 })
      .catch(() => {});
  }
  await page.evaluate(() => {
    document
      .querySelectorAll(".onboarding-widget, .widget.onboarding-widget, [class*='onboarding']")
      .forEach((n) => {
        if (n.innerText && n.innerText.includes("Getting Started")) n.remove();
      });
  });
}

async function shot(page, name) {
  await page.screenshot({ path: join(OUT, name) });
  say("shot", { name, url: page.url() });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(25000);
  await login(page);
  await page.goto(`${BASE}/desk`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  // Time-to-JE via Accounting tile (literacy path — no jargon search)
  const t0 = Date.now();
  await page.getByText("Accounting", { exact: true }).first().click();
  await page.waitForTimeout(2000);
  await dismissOnboarding(page);
  await shot(page, "20-accounting-home.png");
  const accountingMs = Date.now() - t0;

  // Click Journal Entry in sidebar
  const tJe = Date.now();
  const jeLink = page.getByRole("link", { name: "Journal Entry" }).first();
  if (await jeLink.count()) await jeLink.click();
  else await page.getByText("Journal Entry", { exact: true }).first().click();
  await page.waitForTimeout(3000);
  await dismissOnboarding(page);
  await shot(page, "21-je-list.png");
  const listText = await page.evaluate(() => document.body.innerText);
  say("je-list", {
    ms: Date.now() - tJe,
    accountingMs,
    hasAtlas: /ATLAS-OPS|ACC-JV-2026/.test(listText),
    snippet: listText.slice(0, 1800),
  });

  // Open submitted IC loan
  await page.goto(`${BASE}/desk/journal-entry/ACC-JV-2026-00016`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(4000);
  await dismissOnboarding(page);
  await shot(page, "22-je-00016.png");
  await page.evaluate(() => window.scrollTo(0, 800));
  await page.waitForTimeout(400);
  await shot(page, "22b-je-00016-lower.png");
  const jeText = await page.evaluate(() => document.body.innerText);
  say("je-00016", {
    hasDueFrom: /Due from SATYAM CONSTRUCTION/.test(jeText),
    hasRemark: /ATLAS-OPS|short-term unsecured/.test(jeText),
    hasTitle: /ic-loan-sbc-scn-lender/.test(jeText),
    hasMoreInfo: /More Info/.test(jeText),
    snippet: jeText.slice(0, 2200),
  });

  // More Info tab
  const more = page.getByText("More Info", { exact: true });
  if (await more.count()) {
    await more.first().click();
    await page.waitForTimeout(800);
    await shot(page, "23-je-more-info.png");
    say("more-info", { text: (await page.evaluate(() => document.body.innerText)).slice(0, 1500) });
  }

  // New JE, switch company field, two lines
  await page.goto(`${BASE}/desk/journal-entry/new`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  await dismissOnboarding(page);
  await shot(page, "24-je-new.png");
  // click company control
  const companyInput = page
    .locator('[data-fieldname="company"] input, .frappe-control[data-fieldname="company"] input')
    .first();
  if (await companyInput.count()) {
    await companyInput.click();
    await companyInput.fill("");
    await companyInput.type("SATYAM BUILDCOM", { delay: 30 });
    await page.waitForTimeout(600);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(800);
  }
  await shot(page, "25-je-company-buildcom.png");
  say("new-je-company", {
    text: (await page.evaluate(() => document.body.innerText)).slice(0, 1200),
  });

  // Chart of Accounts — switch company in tree toolbar
  await page.goto(`${BASE}/desk/account/view/tree/Chart%20of%20Accounts`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(3500);
  await dismissOnboarding(page);
  await shot(page, "26-coa-default.png");
  const _coDrop = page.locator(
    "button:has-text('MOCK'), .btn:has-text('MOCK'), [data-fieldname='company']",
  );
  if (await page.getByText("MOCK ATLA", { exact: false }).count()) {
    await page.getByText("MOCK ATLA", { exact: false }).first().click();
    await page.waitForTimeout(500);
    const scn = page.getByText("SATYAM CONSTRUCTION", { exact: true });
    if (await scn.count()) await scn.last().click();
    await page.waitForTimeout(2500);
  }
  await shot(page, "27-coa-construction.png");
  say("coa", { text: (await page.evaluate(() => document.body.innerText)).slice(0, 1600) });

  // Trial Balance — wait longer for filters
  await page.goto(`${BASE}/desk/query-report/Trial%20Balance`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);
  await dismissOnboarding(page);
  await shot(page, "28-trial-balance.png");
  say("tb", { text: (await page.evaluate(() => document.body.innerText)).slice(0, 1600) });

  await page.goto(`${BASE}/desk/query-report/General%20Ledger`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);
  await dismissOnboarding(page);
  await shot(page, "29-gl.png");
  say("gl", { text: (await page.evaluate(() => document.body.innerText)).slice(0, 1600) });

  // IC: open Entry Type on new JE
  await page.goto(`${BASE}/desk/journal-entry/new`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await dismissOnboarding(page);
  const vt = page.locator(
    '[data-fieldname="voucher_type"] input, [data-fieldname="voucher_type"] .control-input',
  );
  if (await vt.count()) {
    await vt.first().click();
    await page.waitForTimeout(500);
    await shot(page, "30-entry-type-dropdown.png");
  }
  say("entry-type", { text: (await page.evaluate(() => document.body.innerText)).slice(0, 1800) });

  // User menu
  await page
    .locator("text=Administrator")
    .first()
    .click()
    .catch(() => {});
  await page.waitForTimeout(600);
  await shot(page, "31-user-menu.png");

  // Mobile home
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/desk`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await shot(page, "32-mobile-home.png");
  await page
    .getByText("Accounting", { exact: true })
    .first()
    .click()
    .catch(() => {});
  await page.waitForTimeout(2000);
  await shot(page, "33-mobile-accounting.png");

  writeFileSync(join(OUT, "notes-pass2.json"), JSON.stringify(log, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e);
  writeFileSync(join(OUT, "notes-pass2.json"), JSON.stringify({ error: String(e), log }, null, 2));
  process.exit(1);
});
