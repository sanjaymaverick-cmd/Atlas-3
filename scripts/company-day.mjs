#!/usr/bin/env node
/**
 * Company day 2: every Atlas seat, in-app invariants, ping trial Tally.
 * Atlas never posts vouchers. Not live.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { handleTallyAction } from "./tally-xml.mjs";

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

const SEAT_BUTTON = {
  "md@atlas.local": "Managing Director",
  "pd@atlas.local": "Project Director",
  "se@atlas.local": "Site Engineer",
  "sv@atlas.local": "Site Supervisor",
  "fl@atlas.local": "Finance Lead",
  "cm@atlas.local": "Commercial Manager",
  "sm@atlas.local": "Sales Manager",
  "ll@atlas.local": "Land & Legal",
  "dc@atlas.local": "Document Controller",
  "st@atlas.local": "Stores / QS",
  "ag@atlas.local": "Channel agent (Pink City)",
  "ca@atlas.local": "Pink City company admin",
};

const BASE = process.env.ATLAS_URL || "http://127.0.0.1:8080";
const OUT = join(process.cwd(), "screenshots", "company-day");
mkdirSync(OUT, { recursive: true });

const seats = USERS.filter((u) => u.id !== "u_test");

async function collectUx(page, seat, screen) {
  return page.evaluate(
    ({ seat, screen }) => {
      const notes = [];
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
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.evaluate(() => {
    for (const k of [
      "atlas3-company-day-v1",
      "atlas3-clt-v1",
      "atlas3-sales-v1",
      "atlas3-sales-v2",
      "atlas3-sales-v3",
      "atlas3-sales-v4",
      "atlas3-sales-v5",
      "atlas3-sales-v6",
      "atlas3-sales-v7",
      "atlas3-sales-v8",
      "atlas3-sales-v9",
      "atlas3-sales-v10",
      "atlas3-sales-v11",
    ]) {
      localStorage.removeItem(k);
    }
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("Local test accounts").waitFor({ timeout: 20000 });
  await page.waitForTimeout(800);
  const seat = SEAT_BUTTON[user.email];
  if (seat) await page.getByRole("button", { name: seat }).click();
  else {
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
  }
  await page.getByRole("button", { name: /enter local atlas/i }).click();
  await page.getByRole("button", { name: /end session/i }).waitFor({ timeout: 25000 });
}

async function main() {
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
  const report = { live: false, day: 2, at: new Date().toISOString(), seats: [], ux: [], tally: null, inApp: null };

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
      const tallyOk = user.role === "owner" || user.role === "accountant";
      const tallyLeak = !tallyOk && /\bTally\b/i.test(navText);
      let isolationOk = true;
      if (user.role === "channel" || user.role === "channel_admin") {
        const body = await page.locator("body").innerText();
        isolationOk = !/Desert Reach|L\. Bhati|Shekhawat/i.test(body);
        if (!isolationOk) {
          report.ux.push({
            seat: user.title,
            screen: path,
            severity: "p2",
            issue: "Pink City desk leaked Desert Reach.",
          });
        }
      }
      report.seats.push({
        email: user.email,
        role: user.role,
        title: user.title,
        path,
        expected,
        homeOk,
        tallyLeak,
        isolationOk,
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
      await page.goto(`${BASE}/app/testing`, { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: /run company day/i }).click();
      await page.getByText(/passed|failed/i).first().waitFor({ timeout: 90000 });
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
  const seatFails = report.seats.filter((s) => s.homeOk === false || s.tallyLeak || s.isolationOk === false || s.error);
  const tallyPosted = Array.isArray(report.tally?.posted) && report.tally.posted.length > 0;
  console.log(
    JSON.stringify(
      {
        ok: seatFails.length === 0 && report.tally?.ok && !tallyPosted,
        live: false,
        day: 2,
        seats: report.seats.length,
        uxNotes: report.ux.length,
        tally: { ok: report.tally?.ok, detail: report.tally?.detail, posted: report.tally?.posted?.length ?? 0 },
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
