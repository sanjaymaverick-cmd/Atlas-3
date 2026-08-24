#!/usr/bin/env node
/** Local Sales module QA — not live. */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = process.env.ATLAS_URL || "http://127.0.0.1:8080";
const OUT = join(process.cwd(), "screenshots", "sales");
mkdirSync(OUT, { recursive: true });

async function login(page, email, password) {
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith("atlas3-sales-")) localStorage.removeItem(k);
    }
    localStorage.removeItem("atlas3-company-day-v1");
    localStorage.removeItem("atlas3-clt-v1");
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.locator("input").nth(0).fill(email);
  await page.locator("input[type='password']").fill(password);
  await page.getByRole("button", { name: /enter local atlas/i }).click();
  await page.waitForURL(/\/app/, { timeout: 20000 });
}

async function shot(page, name) {
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
}

const errors = [];
const log = [];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (err) => errors.push(String(err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await login(page, "sm@atlas.local", "AtlasLocal-SM");
  log.push(`sales home ${page.url()}`);
  if (!page.url().includes("/app/sales")) errors.push(`sales did not land on /app/sales, got ${page.url()}`);
  await page.waitForTimeout(400);
  const salesText = await page.locator("body").innerText();
  if (!/Third-party now/i.test(salesText)) errors.push("Sales hub missing title");
  await shot(page, "sales-hub");

  for (const [path, name, needle] of [
    ["/app/sales/inventory", "inventory", "source of truth"],
    ["/app/sales/pipeline", "pipeline", "Lead → visit"],
    ["/app/sales/handover", "handover", "OC, snags"],
    ["/app/sales/analytics", "analytics", "one funnel"],
    ["/app/sales/channel", "channel-sales", "Daily report"],
  ]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
    const t = await page.locator("body").innerText();
    if (!new RegExp(needle, "i").test(t)) errors.push(`${path} missing "${needle}"`);
    await shot(page, name);
  }

  await page.goto(`${BASE}/app/sales/pipeline`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  await page.locator("label").filter({ hasText: /^Name$/ }).locator("input").fill("QA Ingest");
  await page.locator("label").filter({ hasText: /^Phone$/ }).locator("input").fill("99xxxx8801");
  await page.getByRole("button", { name: /ingest & score/i }).click();
  await page.waitForTimeout(500);
  const pipe = await page.locator("body").innerText();
  if (!/QA Ingest/i.test(pipe)) errors.push("Ingested lead not visible");
  await shot(page, "pipeline-ingested");

  await page.getByRole("button", { name: /end session/i }).click();
  await page.waitForURL(/\/$/, { timeout: 15000 });

  await login(page, "ag@atlas.local", "AtlasLocal-AG");
  log.push(`channel home ${page.url()}`);
  if (!page.url().includes("/app/sales/channel")) errors.push(`channel did not land on channel desk, got ${page.url()}`);
  await page.waitForTimeout(400);
  const ch = await page.locator("body").innerText();
  if (/L\. Bhati/i.test(ch)) errors.push("Channel desk leaked Desert Reach hold");
  if (!/R\. Soni/i.test(ch)) errors.push("Pink City hold Soni missing (check entity scope)");
  await shot(page, "channel-desk");

  await page.getByRole("button", { name: /file daily report/i }).click();
  await page.waitForTimeout(400);
  await page.getByLabel("Customer").fill("QA Hold");
  await page.getByRole("button", { name: /place hold/i }).click();
  await page.waitForTimeout(600);
  const afterHold = await page.locator("body").innerText();
  if (!/QA Hold/i.test(afterHold) && !/locked on hold/i.test(afterHold) && !/hold refused/i.test(afterHold)) {
    errors.push("Hold action produced no visible result");
  }
  await shot(page, "channel-hold");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/app/sales/channel`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  await shot(page, "channel-mobile");

  await browser.close();
  const report = { ok: errors.length === 0, errors, log };
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
