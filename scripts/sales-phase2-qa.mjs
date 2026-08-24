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

  await login(page, "ca@atlas.local", "AtlasLocal-CA");
  if (!page.url().includes("/app/sales/company")) errors.push(`admin home ${page.url()}`);
  await page.waitForTimeout(600);
  const firm = await page.locator("body").innerText();
  if (!/Pink City/i.test(firm)) errors.push("Company admin missing Pink City");
  if (/Shekhawat|Desert Reach/i.test(firm)) errors.push("Company admin leaked other firm");
  await page.screenshot({ path: join(OUT, "company-admin.png"), fullPage: true });

  await page.goto(`${BASE}/app/sales/channel`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  const desk = await page.locator("body").innerText();
  if (/L\. Bhati/i.test(desk)) errors.push("Admin channel desk leaked Desert hold");
  await page.screenshot({ path: join(OUT, "company-admin-desk.png"), fullPage: true });

  await page.getByRole("button", { name: /end session/i }).click();
  await page.waitForURL(/\/$/, { timeout: 15000 });

  await login(page, "sm@atlas.local", "AtlasLocal-SM");
  await page.goto(`${BASE}/app/sales/pipeline`, { waitUntil: "domcontentloaded" });
  await page.getByText("New → visit → book").waitFor({ timeout: 10000 });
  const pipe = await page.locator("body").innerText();
  if (!/Assign agent/i.test(pipe)) errors.push("Pipeline missing assign control");
  if (!/P\. Gupta/i.test(pipe)) errors.push("Unassigned lead P. Gupta missing");
  const assign = page.getByLabel("Assign P. Gupta");
  if (await assign.count()) {
    await assign.selectOption("ag5");
    await page.waitForTimeout(400);
    const after = await page.locator("body").innerText();
    if (!/A\. Joshi/i.test(after)) errors.push("Assign did not stamp A. Joshi");
  } else errors.push("Assign P. Gupta control missing");
  await page.getByRole("button", { name: /catboost/i }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, "pipeline-assign.png"), fullPage: true });

  await page.goto(`${BASE}/app/sales/people`, { waitUntil: "domcontentloaded" });
  await page.getByText("One person, every desk").waitFor({ timeout: 10000 });
  const people = await page.locator("body").innerText();
  if (!/V\. Agarwal/i.test(people)) errors.push("People missing customer master V. Agarwal");
  if (!/M\. Saxena/i.test(people)) errors.push("People missing pipeline customer M. Saxena");
  await page.getByText("V. Agarwal").first().click();
  await page.waitForTimeout(300);
  const open360 = await page.locator("body").innerText();
  if (!/Master/i.test(open360)) errors.push("Customer 360 did not open from master");
  await page.screenshot({ path: join(OUT, "people-master.png"), fullPage: true });

  await page.goto(`${BASE}/app/sales/integrations`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  const inbox = await page.locator("body").innerText();
  if (!/WhatsApp/i.test(inbox) || !/99acres/i.test(inbox)) errors.push("Inbound missing connectors");
  const apply = page.getByRole("button", { name: /^Apply$/ }).first();
  if (await apply.count()) await apply.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, "integrations.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/app/sales/integrations`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, "integrations-mobile.png"), fullPage: true });

  await browser.close();
  const report = { ok: errors.length === 0, errors };
  writeFileSync(join(OUT, "phase2-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
