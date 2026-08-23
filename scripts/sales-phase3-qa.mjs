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
    localStorage.removeItem("atlas3-sales-v3");
    localStorage.removeItem("atlas3-sales-v4");
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
  await page.getByText("Templates, consent, quality").waitFor({ timeout: 10000 });
  const wa = await page.locator("body").innerText();
  if (!/site_visit_confirm/i.test(wa) || !/new_launch/i.test(wa)) errors.push("WhatsApp templates missing");
  await page.screenshot({ path: join(OUT, "whatsapp.png"), fullPage: true });

  await page.goto(`${BASE}/app/sales/people`, { waitUntil: "domcontentloaded" });
  await page.getByText("One person, every desk").waitFor({ timeout: 10000 });
  await page.screenshot({ path: join(OUT, "people.png"), fullPage: true });

  await page.getByRole("button", { name: /end session/i }).click();
  await page.waitForURL(/\/$/, { timeout: 15000 });

  await login(page, "ag@atlas.local", "AtlasLocal-AG");
  await page.goto(`${BASE}/app/sales/channel`, { waitUntil: "domcontentloaded" });
  await page.getByText("Daily report, then hold, then book").waitFor({ timeout: 10000 });
  const req = page.getByRole("button", { name: /request booking/i }).first();
  if (await req.count()) {
    await req.click();
    await page.waitForTimeout(400);
  } else errors.push("Request booking missing");
  await page.screenshot({ path: join(OUT, "hold-request.png"), fullPage: true });

  await browser.close();
  const report = { ok: errors.length === 0, errors };
  writeFileSync(join(OUT, "phase3-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
