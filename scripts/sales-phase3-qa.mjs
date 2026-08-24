#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = process.env.ATLAS_URL || "http://127.0.0.1:8080";
const OUT = join(process.cwd(), "screenshots", "sales");
mkdirSync(OUT, { recursive: true });
const errors = [];

const SEAT = {
  "ca@atlas.local": "Pink City company admin",
  "sm@atlas.local": "Sales Manager",
  "ag@atlas.local": "Channel agent (Pink City)",
};

async function login(page, email, password) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith("atlas3-sales-")) localStorage.removeItem(k);
    }
    localStorage.removeItem("atlas3-clt-v1");
    localStorage.removeItem("atlas3-company-day-v1");
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("Local test accounts").waitFor({ timeout: 20000 });
  await page.waitForTimeout(800);
  const seat = SEAT[email];
  if (seat) await page.getByRole("button", { name: seat }).click();
  else {
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
  }
  await page.getByRole("button", { name: /enter local atlas/i }).click();
  await page.getByRole("button", { name: /end session/i }).waitFor({ timeout: 25000 });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (err) => errors.push(String(err)));

  await login(page, "sm@atlas.local", "AtlasLocal-SM");

  await page.goto(`${BASE}/app/sales/analytics`, { waitUntil: "domcontentloaded" });
  await page.getByText("Commission payouts").waitFor({ timeout: 10000 });
  const analytics = await page.locator("body").innerText();
  if (!/Model monitor/i.test(analytics)) errors.push("Analytics missing model monitor");
  if (!/Never pays|never post/i.test(analytics)) errors.push("Payouts missing never-pay copy");
  const pay = page.getByRole("button", { name: /send for approval/i }).first();
  if (await pay.count()) {
    await pay.click();
    await page.waitForTimeout(400);
    const afterPay = await page.locator("body").innerText();
    if (!/Waiting in Approvals/i.test(afterPay)) errors.push("Commission did not move to Approvals");
  } else errors.push("Send for approval missing on accrued commission");
  await page.screenshot({ path: join(OUT, "analytics-monitor.png"), fullPage: true });

  await page.goto(`${BASE}/app/sales/pipeline`, { waitUntil: "domcontentloaded" });
  await page.getByText("New → visit → book").waitFor({ timeout: 10000 });
  const gupta = page.locator("[data-lead-id]").filter({ hasText: "P. Gupta" });
  if (await gupta.count()) {
    await gupta.getByRole("button", { name: /book unit/i }).click();
    await page.waitForTimeout(500);
  } else errors.push("P. Gupta book control missing");
  await page.goto(`${BASE}/app/sales/handover`, { waitUntil: "domcontentloaded" });
  await page.getByText("OC, snags, possession, society").waitFor({ timeout: 10000 });
  const ho = await page.locator("body").innerText();
  if (!/A-0101/i.test(ho)) errors.push("Convert did not open handover for A-0101");
  await page.screenshot({ path: join(OUT, "handover-convert.png"), fullPage: true });

  await page.goto(`${BASE}/app/sales/whatsapp`, { waitUntil: "domcontentloaded" });
  await page.getByText("Templates, thread, automation").waitFor({ timeout: 10000 });
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
