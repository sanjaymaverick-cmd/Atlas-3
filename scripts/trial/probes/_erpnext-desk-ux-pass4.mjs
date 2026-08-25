import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://127.0.0.1:8000";
const OUT = "D:/work Dir/Atlas 3/screenshots/review/erpnext-desk";
const log = [];
const say = (m, extra = {}) => {
  log.push({ m, ...extra });
  console.log(JSON.stringify({ m, ...extra }));
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input");
  await ((await page.$("#login_email")) || (await page.$('input[type="text"]'))).fill(
    "Administrator",
  );
  await ((await page.$("#login_password")) || (await page.$('input[type="password"]'))).fill(
    "admin",
  );
  await ((await page.$(".btn-login")) || (await page.$('button[type="submit"]'))).click();
  await page.waitForURL((u) => !String(u).includes("/login"), { timeout: 30000 });
  await page.waitForTimeout(1000);

  await page.goto(`${BASE}/desk/account/view/tree/Chart%20of%20Accounts`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: join(OUT, "60-coa.png") });

  // Company filter is a visible button "MOCK ATLA..." in the page head
  const btn = page
    .locator(".page-head")
    .getByRole("button")
    .filter({ hasText: /MOCK|SATYAM|MGB/ });
  say("coa-buttons", {
    count: await btn.count(),
    texts: await page.locator(".page-head button").allTextContents(),
  });
  if (await btn.count()) {
    await btn.first().click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT, "61-coa-company-menu.png") });
    await page
      .getByRole("menuitem", { name: "SATYAM BUILDCOM" })
      .click()
      .catch(async () => {
        await page.locator("text=SATYAM BUILDCOM").last().click({ force: true });
      });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: join(OUT, "62-coa-sbc.png") });
    say("coa-sbc", {
      snippet: (await page.evaluate(() => document.body.innerText)).slice(0, 1200),
    });

    const btn2 = page
      .locator(".page-head")
      .getByRole("button")
      .filter({ hasText: /MOCK|SATYAM|MGB/ });
    if (await btn2.count()) await btn2.first().click();
    await page.waitForTimeout(300);
    await page.locator("text=SATYAM CONSTRUCTION").last().click({ force: true });
    await page.waitForTimeout(2200);
    await page.screenshot({ path: join(OUT, "63-coa-scn.png") });
    say("coa-scn", { snippet: (await page.evaluate(() => document.body.innerText)).slice(0, 900) });

    const btn3 = page
      .locator(".page-head")
      .getByRole("button")
      .filter({ hasText: /MOCK|SATYAM|MGB/ });
    if (await btn3.count()) await btn3.first().click();
    await page.waitForTimeout(300);
    await page.locator("text=MGB PRIME ESTATES LLP").last().click({ force: true });
    await page.waitForTimeout(2200);
    await page.screenshot({ path: join(OUT, "64-coa-mgb.png") });
    say("coa-mgb", { snippet: (await page.evaluate(() => document.body.innerText)).slice(0, 900) });
  }

  await page.goto(`${BASE}/desk/query-report/Trial%20Balance`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: join(OUT, "65-tb.png") });
  say("tb", { snippet: (await page.evaluate(() => document.body.innerText)).slice(0, 1600) });

  await page.goto(`${BASE}/desk/query-report/General%20Ledger`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: join(OUT, "66-gl.png") });
  say("gl", { snippet: (await page.evaluate(() => document.body.innerText)).slice(0, 1600) });

  await page.goto(`${BASE}/desk/query-report/Consolidated%20Financial%20Statement`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: join(OUT, "67-consol.png") });
  say("consol", { snippet: (await page.evaluate(() => document.body.innerText)).slice(0, 1600) });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/desk`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(OUT, "68-mobile-home.png") });
  await page.getByText("Accounting", { exact: true }).first().click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(OUT, "69-mobile-flyout.png") });

  writeFileSync(join(OUT, "notes-pass4.json"), JSON.stringify(log, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e);
  writeFileSync(
    join(OUT, "notes-pass4.json"),
    JSON.stringify({ error: String(e.stack || e), log }, null, 2),
  );
  process.exit(1);
});
