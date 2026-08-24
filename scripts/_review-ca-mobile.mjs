#!/usr/bin/env node
/** Recapture mobile + Aravalli project shots for CA review. */
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = process.env.ATLAS_URL || "http://127.0.0.1:8080";
const OUT = join(process.cwd(), "screenshots", "review", "ca");

async function login(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.evaluate(() => {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
    for (const k of keys) if (k && k.startsWith("atlas3")) localStorage.removeItem(k);
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("Local test accounts").waitFor({ timeout: 20000 });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "Pink City company admin" }).click();
  await page.getByRole("button", { name: /enter local atlas/i }).click();
  await page.getByRole("button", { name: /end session/i }).waitFor({ timeout: 25000 });
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  const desk = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const dpage = await desk.newPage();
  await login(dpage);
  await dpage.goto(`${BASE}/app/projects`, { waitUntil: "domcontentloaded" });
  await dpage.locator("h1").waitFor();
  await dpage.locator("header select").first().selectOption({ label: "Aravalli Homes Pvt Ltd" });
  await dpage.waitForTimeout(600);
  await dpage.screenshot({ path: join(OUT, "d-projects-aravalli.png"), fullPage: true });
  const projText = await dpage.locator("main").innerText();
  console.log("projects-aravalli", { bytesHint: projText.slice(0, 200), hasMansar: /Mansarovar/.test(projText) });
  await desk.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mpage = await mobile.newPage();
  await login(mpage);
  for (const [path, name] of [
    ["/app/sales/company", "m-company"],
    ["/app/sales/channel", "m-channel"],
    ["/app/sales/inventory", "m-inventory"],
    ["/app/sales", "m-sales"],
    ["/app", "m-command"],
    ["/app/sales/whatsapp", "m-whatsapp"],
  ]) {
    await mpage.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
    await mpage.locator("h1").first().waitFor({ timeout: 10000 });
    await mpage.waitForTimeout(400);
    await mpage.screenshot({ path: join(OUT, `${name}.png`) });
    const t = await mpage.locator("h1").innerText();
    const overflow = await mpage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 8);
    console.log(name, t, "overflow", overflow);
  }
  await mpage.getByRole("button", { name: /open menu/i }).click();
  await mpage.waitForTimeout(300);
  await mpage.screenshot({ path: join(OUT, "m-nav.png") });
  await mobile.close();
  await browser.close();
  console.log("ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
