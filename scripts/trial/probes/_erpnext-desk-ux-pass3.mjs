/**
 * Pass 3: Accounting flyout → Payments → JE list/form, CoA company switch, reports.
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
  await ((await page.$("#login_email")) || (await page.$('input[type="text"]'))).fill(
    "Administrator",
  );
  await ((await page.$("#login_password")) || (await page.$('input[type="password"]'))).fill(
    "admin",
  );
  await ((await page.$(".btn-login")) || (await page.$('button[type="submit"]'))).click();
  await page.waitForURL((u) => !String(u).includes("/login"), { timeout: 30000 });
  await page.waitForTimeout(1500);
}

async function dismiss(page) {
  const skip = page.getByText("Skip All");
  if (await skip.count())
    await skip
      .first()
      .click({ timeout: 1500 })
      .catch(() => {});
  await page.evaluate(() => {
    document.querySelectorAll("div").forEach((n) => {
      if (
        n.innerText &&
        n.innerText.includes("Accounting Onboarding") &&
        n.innerText.includes("Skip All")
      ) {
        n.style.display = "none";
      }
    });
  });
}

async function shot(page, name) {
  await page.screenshot({ path: join(OUT, name) });
  say("shot", { name, url: page.url() });
}

async function waitText(page, re, ms = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const t = await page.evaluate(() => document.body.innerText);
    if (re.test(t)) return t;
    await page.waitForTimeout(400);
  }
  return page.evaluate(() => document.body.innerText);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(20000);
  await login(page);
  await page.goto(`${BASE}/desk`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);

  const t0 = Date.now();
  await page.getByText("Accounting", { exact: true }).first().click();
  await page.waitForTimeout(800);
  await shot(page, "20-accounting-flyout.png");
  await page.getByText("Payments", { exact: true }).first().click();
  await page.waitForTimeout(2500);
  await dismiss(page);
  await shot(page, "40-payments-home.png");
  const afterPayments = Date.now() - t0;
  say("payments-home", {
    ms: afterPayments,
    snippet: (await page.evaluate(() => document.body.innerText)).slice(0, 1200),
  });

  const tJe = Date.now();
  await page
    .locator("span, a, div")
    .filter({ hasText: /^Journal Entry$/ })
    .first()
    .click({ timeout: 8000 })
    .catch(async () => {
      await page.goto(`${BASE}/desk/journal-entry`, { waitUntil: "domcontentloaded" });
    });
  await page.waitForTimeout(3500);
  await dismiss(page);
  await shot(page, "41-je-list.png");
  const listText = await waitText(page, /ACC-JV-2026|ATLAS-OPS|Add Journal Entry|New/, 8000);
  say("je-list", {
    ms: Date.now() - tJe,
    totalFromHome: Date.now() - t0,
    snippet: listText.slice(0, 2500),
  });

  // Filter / open known JE
  await page
    .goto(`${BASE}/desk/journal-entry/ACC-JV-2026-00016`, { waitUntil: "networkidle" })
    .catch(() =>
      page.goto(`${BASE}/desk/journal-entry/ACC-JV-2026-00016`, { waitUntil: "domcontentloaded" }),
    );
  await page.waitForTimeout(5000);
  await dismiss(page);
  await shot(page, "42-je-00016.png");
  const jeText = await page.evaluate(() => document.body.innerText);
  say("je-00016", {
    hasDueFrom: /Due from SATYAM CONSTRUCTION/.test(jeText),
    hasCash: /Cash - SBC/.test(jeText),
    hasRemark: /ATLAS-OPS|short-term unsecured|User Remark|Remark/.test(jeText),
    hasTitle: /ic-loan-sbc-scn-lender/.test(jeText),
    hasCompany: /SATYAM BUILDCOM/.test(jeText),
    snippet: jeText.slice(0, 2800),
  });

  const more = page
    .getByRole("tab", { name: /More Info/i })
    .or(page.getByText("More Info", { exact: true }));
  if (await more.count()) {
    await more.first().click();
    await page.waitForTimeout(700);
    await shot(page, "43-je-more-info.png");
    say("more-info", {
      snippet: (await page.evaluate(() => document.body.innerText)).slice(0, 1800),
    });
  }

  // New JE
  await page.goto(`${BASE}/desk/journal-entry/new`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  await dismiss(page);
  await shot(page, "44-je-new.png");
  const details = await page.evaluate(() => document.body.innerText);
  say("je-new", { defaultMock: /MOCK ATLAS3 LLP/.test(details), snippet: details.slice(0, 1800) });

  // CoA switch SATYAM BUILDCOM then CONSTRUCTION then MGB
  await page.goto(`${BASE}/desk/account/view/tree/Chart%20of%20Accounts`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(3500);
  await dismiss(page);
  await shot(page, "45-coa-mock.png");
  for (const [co, file] of [
    ["SATYAM BUILDCOM", "46-coa-sbc.png"],
    ["SATYAM CONSTRUCTION", "47-coa-scn.png"],
    ["MGB PRIME ESTATES LLP", "48-coa-mgb.png"],
  ]) {
    const t = Date.now();
    const trigger = page
      .locator("header, .page-head, .layout-main")
      .getByText(/MOCK ATLA|SATYAM|MGB PRIME/)
      .first();
    if (await trigger.count()) await trigger.click();
    else {
      // toolbar company select near top-right
      await page
        .locator(".page-head button, .page-head .btn")
        .first()
        .click()
        .catch(() => {});
    }
    await page.waitForTimeout(400);
    const opt = page.getByRole("option", { name: co }).or(page.getByText(co, { exact: true }));
    if (await opt.count()) await opt.last().click();
    await page.waitForTimeout(2200);
    await shot(page, file);
    const body = await page.evaluate(() => document.body.innerText);
    say("coa-switch", {
      co,
      ms: Date.now() - t,
      hasDue: /Due from/.test(body),
      snippet: body.slice(0, 900),
    });
  }

  // GL + TB via Financial Reports tile path
  await page.goto(`${BASE}/desk`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await page.getByText("Accounting", { exact: true }).first().click();
  await page.waitForTimeout(600);
  await page
    .getByText(/Financial R/)
    .first()
    .click();
  await page.waitForTimeout(2500);
  await dismiss(page);
  await shot(page, "49-financial-reports.png");
  await page.getByText("Trial Balance", { exact: true }).first().click();
  await page.waitForTimeout(5000);
  await dismiss(page);
  await shot(page, "50-trial-balance.png");
  say("tb", { snippet: (await page.evaluate(() => document.body.innerText)).slice(0, 1800) });

  await page
    .getByText("General Ledger", { exact: true })
    .first()
    .click()
    .catch(async () => {
      await page.goto(`${BASE}/desk/query-report/General%20Ledger`, {
        waitUntil: "domcontentloaded",
      });
    });
  await page.waitForTimeout(5000);
  await dismiss(page);
  await shot(page, "51-gl.png");
  say("gl", { snippet: (await page.evaluate(() => document.body.innerText)).slice(0, 1800) });

  // Entry type list via keyboard on new JE
  await page.goto(`${BASE}/desk/journal-entry/new`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await dismiss(page);
  await page
    .locator('[data-fieldname="voucher_type"]')
    .click()
    .catch(() => {});
  await page.waitForTimeout(400);
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(300);
  await shot(page, "52-entry-type.png");
  say("entry-type", {
    snippet: (await page.evaluate(() => document.body.innerText)).slice(0, 1500),
  });

  // Mobile
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/desk`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await shot(page, "53-mobile-home.png");
  await page.getByText("Accounting", { exact: true }).first().click();
  await page.waitForTimeout(800);
  await shot(page, "54-mobile-accounting-flyout.png");

  writeFileSync(join(OUT, "notes-pass3.json"), JSON.stringify(log, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e);
  writeFileSync(
    join(OUT, "notes-pass3.json"),
    JSON.stringify({ error: String(e.stack || e), log }, null, 2),
  );
  process.exit(1);
});
