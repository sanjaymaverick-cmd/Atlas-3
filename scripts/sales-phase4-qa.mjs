#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = process.env.ATLAS_URL || "http://127.0.0.1:8080";
const OUT = join(process.cwd(), "screenshots", "sales");
mkdirSync(OUT, { recursive: true });
const errors = [];

async function login(page, email, password) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith("atlas3-sales-")) localStorage.removeItem(k);
    }
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /enter local atlas/i }).waitFor({ timeout: 20000 });
  await page.getByText("Local test accounts").waitFor({ timeout: 20000 });
  await page.waitForTimeout(1200);
  await page.locator("input").nth(0).fill(email);
  await page.locator("input[type='password']").fill(password);
  await page.getByRole("button", { name: /enter local atlas/i }).click();
  await page.waitForURL(/\/app/, { timeout: 20000 });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (err) => errors.push(String(err)));

  await login(page, "sm@atlas.local", "AtlasLocal-SM");
  await page.goto(`${BASE}/app/sales/whatsapp`, { waitUntil: "domcontentloaded" });
  await page.getByText("Templates, thread, automation").waitFor({ timeout: 10000 });
  const body = await page.locator("body").innerText();
  if (!/Thread/i.test(body) || !/Yes, Sunday/i.test(body))
    errors.push("WhatsApp thread missing seed inbound");
  await page.getByRole("button", { name: /receive reply/i }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, "whatsapp-thread.png"), fullPage: true });

  await page.getByRole("button", { name: /end session/i }).click();
  await page.waitForURL(/\/$/, { timeout: 15000 });

  await login(page, "ag@atlas.local", "AtlasLocal-AG");
  await page.goto(`${BASE}/app/sales/inventory`, { waitUntil: "domcontentloaded" });
  await page.getByText("Available to hold").waitFor({ timeout: 10000 });
  const inv = await page.locator("body").innerText();
  if (/Dispute/i.test(inv)) errors.push("Channel inventory still has Dispute");
  if (!/A-0802|A-0101|S-12/i.test(inv)) errors.push("Channel inventory missing units");
  await page.screenshot({ path: join(OUT, "channel-inventory.png"), fullPage: true });

  await page.goto(`${BASE}/app/sales/company`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  if (page.url().includes("/company")) errors.push("Agent should not open company roster");

  await browser.close();
  const report = { ok: errors.length === 0, errors };
  writeFileSync(join(OUT, "phase4-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
