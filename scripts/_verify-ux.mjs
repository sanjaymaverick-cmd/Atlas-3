#!/usr/bin/env node
import { chromium } from "playwright";

const BASE = process.env.ATLAS_URL || "http://127.0.0.1:8080";

async function login(page, seat) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith("atlas3-")) localStorage.removeItem(k);
    }
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("Local test accounts").waitFor({ timeout: 20000 });
  await page.getByRole("button", { name: seat }).click();
  await page.getByRole("button", { name: /enter local atlas/i }).click();
  await page
    .getByRole("button", { name: /end session/i })
    .first()
    .waitFor({ timeout: 25000 });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const findings = [];
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await login(page, "Pink City company admin");
  await page.goto(`${BASE}/app/crm`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  const crmUrl = page.url();
  const crmText = await page.locator("body").innerText();
  if (crmUrl.includes("/crm") || /Desert Reach/i.test(crmText)) {
    findings.push({ sev: "p0", issue: `CA still sees CRM/Desert Reach at ${crmUrl}` });
  } else {
    findings.push({ sev: "ok", issue: `CA CRM blocked → ${crmUrl}` });
  }

  await page
    .getByRole("button", { name: /end session/i })
    .first()
    .click();
  await login(page, "Finance Lead");
  await page.goto(`${BASE}/app/approvals`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  const appr = await page.locator("body").innerText();
  if (
    /PO-1042[\s\S]{0,400}Approve/i.test(appr) &&
    !/PO-1042[\s\S]{0,500}Waiting on Managing Director/i.test(appr)
  ) {
    findings.push({ sev: "p1", issue: "FL can still approve MD PO" });
  } else {
    findings.push({
      sev: "ok",
      issue: "FL cannot approve MD-waiting PO (waitingOn copy or no Approve)",
    });
  }

  await page
    .getByRole("button", { name: /end session/i })
    .first()
    .click();
  await login(page, "Managing Director");
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  const cmd = await page.locator("body").innerText();
  const openGates = (cmd.match(/Open gates/gi) || []).length;
  const approvalsWaiting = (cmd.match(/Approvals waiting/gi) || []).length;
  if (openGates && approvalsWaiting)
    findings.push({ sev: "p2", issue: "Command still duplicates Open gates + Approvals waiting" });
  else findings.push({ sev: "ok", issue: "Command no longer dual-counts Open gates" });
  if (/Ctrl\/⌘ K/i.test(cmd) || /Ctrl/i.test(cmd))
    findings.push({ sev: "ok", issue: "Command palette hint present" });

  await page
    .getByRole("button", { name: /end session/i })
    .first()
    .click();
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await login(mobile, "Channel agent (Pink City)");
  const head = await mobile.locator("header").first().innerText();
  if (!/Local only/i.test(head))
    findings.push({ sev: "p1", issue: `Agent header missing Local only: ${head.slice(0, 80)}` });
  else findings.push({ sev: "ok", issue: "Agent header shows Local only" });
  const desk = await mobile.locator("body").innerText();
  if (/Cancellations/i.test(desk) && !/More fields/i.test(desk)) {
    findings.push({ sev: "p2", issue: "Agent daily report still shows all 7 fields" });
  } else {
    findings.push({ sev: "ok", issue: "Agent report is compact (More fields or already filed)" });
  }
  if (await mobile.getByRole("link", { name: "Desk" }).count())
    findings.push({ sev: "ok", issue: "Bottom nav Desk present" });
  else findings.push({ sev: "p2", issue: "Bottom nav missing on agent phone" });

  await mobile.goto(`${BASE}/app/land`, { waitUntil: "networkidle" });
  await mobile.waitForTimeout(1500);
  if (mobile.url().includes("/land")) findings.push({ sev: "p0", issue: "Agent can open Land" });
  else findings.push({ sev: "ok", issue: `Agent Land blocked → ${mobile.url()}` });

  console.log(JSON.stringify({ findings }, null, 2));
  const bad = findings.filter((f) => f.sev === "p0" || f.sev === "p1");
  await browser.close();
  process.exit(bad.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
