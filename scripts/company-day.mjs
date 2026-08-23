#!/usr/bin/env node
/**
 * Company day: log in as every Atlas seat, scan UX, run the in-app day,
 * and ask trial Tally to take mock vouchers. Not live.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { handleTallyAction, findTallyExe, launchTally } from "./tally-xml.mjs";

const ROLE_HOME = {
  owner: "/app/approvals",
  pm: "/app",
  engineer: "/app/site",
  supervisor: "/app/site",
  accountant: "/app/finance",
  commercial: "/app/commercial",
  sales: "/app/sales",
  legal: "/app/land",
  docs: "/app/documents",
  stores: "/app/controls",
  channel: "/app/sales/channel",
  channel_admin: "/app/sales/company",
};

const USERS = [
  { id: "u_owner", role: "owner", title: "Managing Director", email: "md@atlas.local", password: "AtlasLocal-MD" },
  { id: "u_pm", role: "pm", title: "Project Director", email: "pd@atlas.local", password: "AtlasLocal-PD" },
  { id: "u_eng", role: "engineer", title: "Site Engineer", email: "se@atlas.local", password: "AtlasLocal-SE" },
  { id: "u_sup", role: "supervisor", title: "Site Supervisor", email: "sv@atlas.local", password: "AtlasLocal-SV" },
  { id: "u_acc", role: "accountant", title: "Finance Lead", email: "fl@atlas.local", password: "AtlasLocal-FL" },
  { id: "u_com", role: "commercial", title: "Commercial Manager", email: "cm@atlas.local", password: "AtlasLocal-CM" },
  { id: "u_sales", role: "sales", title: "Sales Manager", email: "sm@atlas.local", password: "AtlasLocal-SM" },
  { id: "u_legal", role: "legal", title: "Land & Legal", email: "ll@atlas.local", password: "AtlasLocal-LL" },
  { id: "u_docs", role: "docs", title: "Document Controller", email: "dc@atlas.local", password: "AtlasLocal-DC" },
  { id: "u_stores", role: "stores", title: "Stores / QS", email: "st@atlas.local", password: "AtlasLocal-ST" },
  { id: "u_ch", role: "channel", title: "Channel agent (Pink City)", email: "ag@atlas.local", password: "AtlasLocal-AG" },
  { id: "u_ca", role: "channel_admin", title: "Pink City company admin", email: "ca@atlas.local", password: "AtlasLocal-CA" },
];

const BASE = process.env.ATLAS_URL || "http://127.0.0.1:8080";
const OUT = join(process.cwd(), "screenshots", "company-day");
mkdirSync(OUT, { recursive: true });

const seats = USERS.filter((u) => u.id !== "u_test");

async function collectUx(page, seat, screen) {
  return page.evaluate(
    ({ seat, screen }) => {
      const notes = [];
      const nodes = document.querySelectorAll("button, a, [role='button']");
      for (const el of nodes) {
        const r = el.getBoundingClientRect();
        if (r.height > 0 && r.height < 36 && r.width > 8) {
          notes.push({
            seat,
            screen,
            severity: "p2",
            issue: `Small target ${Math.round(r.height)}px: ${(el.textContent || "").trim().slice(0, 48)}`,
          });
        }
      }
      if (document.documentElement.scrollWidth > window.innerWidth + 8) {
        notes.push({ seat, screen, severity: "p2", issue: "Horizontal overflow on this viewport." });
      }
      const title = document.querySelector("h1, [class*='font-display']");
      if (!title) notes.push({ seat, screen, severity: "p3", issue: "No visible page title." });
      return notes;
    },
    { seat, screen },
  );
}

async function login(page, user) {
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
  await page.evaluate(() => {
    localStorage.removeItem("atlas3-company-day-v1");
    localStorage.removeItem("atlas3-clt-v1");
    localStorage.removeItem("atlas3-sales-v1");
    localStorage.removeItem("atlas3-sales-v2");
    localStorage.removeItem("atlas3-sales-v3");
    localStorage.removeItem("atlas3-sales-v4");
    localStorage.removeItem("atlas3-sales-v5");
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.locator("input").nth(0).fill(user.email);
  await page.locator("input[type='password']").fill(user.password);
  await page.getByRole("button", { name: /enter local atlas/i }).click();
  await page.waitForURL(/\/app/, { timeout: 15000 });
}

async function main() {
  const tallyExe = findTallyExe();
  if (tallyExe) launchTally();

  let serverOk = false;
  try {
    const r = await fetch(BASE, { signal: AbortSignal.timeout(3000) });
    serverOk = r.ok || r.status === 200;
  } catch {
    serverOk = false;
  }
  if (!serverOk) {
    console.error(JSON.stringify({ ok: false, error: `Atlas is not running at ${BASE}. Start it with npm run dev.` }));
    process.exit(2);
  }

  const browser = await chromium.launch({ headless: true });
  const report = { live: false, at: new Date().toISOString(), seats: [], ux: [], tally: null, inApp: null };

  for (const user of seats) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on("pageerror", (e) => consoleErrors.push(e.message));
    try {
      await login(page, user);
      const path = new URL(page.url()).pathname;
      const expected = ROLE_HOME[user.role] || "/app";
      const homeOk = path === expected || path.startsWith(expected);
      await page.screenshot({ path: join(OUT, `${user.role}.png`), fullPage: true });
      const ux = await collectUx(page, user.title, path);
      report.ux.push(...ux);
      const navText = await page.locator("aside nav").innerText().catch(() => "");
      const tallyHidden = user.role === "engineer" || user.role === "supervisor" || user.role === "stores";
      const tallyLeak = tallyHidden && /\bTally\b/i.test(navText);
      report.seats.push({
        email: user.email,
        role: user.role,
        title: user.title,
        path,
        expected,
        homeOk,
        tallyLeak,
        consoleErrors,
      });
    } catch (err) {
      report.seats.push({
        email: user.email,
        role: user.role,
        title: user.title,
        ok: false,
        error: String(err?.message || err),
      });
    } finally {
      await context.close();
    }
  }

  const md = seats.find((u) => u.role === "owner");
  if (md) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    try {
      await login(page, md);
      await page.goto(`${BASE}/app/testing`, { waitUntil: "networkidle" });
      await page.getByRole("button", { name: /run company day/i }).click();
      await page.getByText(/passed|failed/i).first().waitFor({ timeout: 60000 });
      await page.screenshot({ path: join(OUT, "company-day-report.png"), fullPage: true });
      report.inApp = await page.locator("body").innerText();
    } catch (err) {
      report.inApp = { error: String(err?.message || err) };
    } finally {
      await context.close();
    }
  }

  await browser.close();

  report.tally = await handleTallyAction({ action: "company-day" });

  const outJson = join(OUT, "report.json");
  writeFileSync(outJson, JSON.stringify(report, null, 2));
  const seatFails = report.seats.filter((s) => s.homeOk === false || s.tallyLeak || s.error);
  console.log(
    JSON.stringify(
      {
        ok: seatFails.length === 0,
        live: false,
        seats: report.seats.length,
        uxNotes: report.ux.length,
        tally: { ok: report.tally?.ok, detail: report.tally?.detail },
        report: outJson,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
