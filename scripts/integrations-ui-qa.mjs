#!/usr/bin/env node
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.ATLAS_URL || "http://127.0.0.1:8080";
const OUT = join(process.cwd(), "screenshots", "sales");
mkdirSync(OUT, { recursive: true });
const errors = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.evaluate(() => {
  for (const k of Object.keys(localStorage)) if (k.startsWith("atlas3-")) localStorage.removeItem(k);
});
await page.reload({ waitUntil: "networkidle" });
await page.getByText("Local test accounts").waitFor({ timeout: 20000 });
await page.waitForTimeout(600);
await page.getByRole("button", { name: "Sales Manager" }).click();
await page.getByRole("button", { name: /enter local atlas/i }).click();
await page.getByRole("button", { name: /end session/i }).waitFor({ timeout: 25000 });
await page.goto(`${BASE}/app/sales/integrations`, { waitUntil: "domcontentloaded" });
await page.getByText("Live portal webhooks").waitFor({ timeout: 10000 });
const t = await page.locator("body").innerText();
if (!/Live webhook ready/i.test(t)) errors.push("missing live badge");
if (!/Account Manager pack/i.test(t)) errors.push("missing AM pack");
if (!/Email fallback/i.test(t)) errors.push("missing email fallback");
if (!/Designed only/i.test(t)) errors.push("missing designed-only");
if (!/atlas-local-ingest-2026/.test(t)) errors.push("secret not shown");
if (!/\/api\/ingest\/99acres/.test(t)) errors.push("99acres URL missing");
await page.getByRole("button", { name: /send sample/i }).first().click();
await page.waitForTimeout(1500);
await page.screenshot({ path: join(OUT, "integrations-live.png"), fullPage: true });
await browser.close();
const report = { ok: errors.length === 0, errors };
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
