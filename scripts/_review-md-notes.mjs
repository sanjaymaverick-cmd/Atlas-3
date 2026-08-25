#!/usr/bin/env node
/** Fast MD probe — no screenshots. Completes the notes dump. */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = process.env.ATLAS_URL || "http://127.0.0.1:8080";
const OUT = join(process.cwd(), "screenshots", "review", "md");
mkdirSync(OUT, { recursive: true });

const LS_KEYS = ["atlas3-company-day-v1", "atlas3-clt-v1", "atlas3-sales-v10"];

const ROUTES = [
  "/app",
  "/app/portfolio",
  "/app/capital",
  "/app/phases",
  "/app/testing",
  "/app/org",
  "/app/approvals",
  "/app/projects",
  "/app/documents",
  "/app/land",
  "/app/commercial",
  "/app/quotations",
  "/app/site",
  "/app/controls",
  "/app/changes",
  "/app/customers",
  "/app/crm",
  "/app/sales",
  "/app/sales/inventory",
  "/app/sales/channel",
  "/app/sales/company",
  "/app/sales/pipeline",
  "/app/sales/handover",
  "/app/sales/analytics",
  "/app/sales/integrations",
  "/app/sales/whatsapp",
  "/app/sales/people",
  "/app/finance",
  "/app/decisions",
  "/app/audit",
  "/app/assistant",
];

async function login(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.evaluate((keys) => {
    for (const k of keys) localStorage.removeItem(k);
  }, LS_KEYS);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByText("Local test accounts").waitFor({ timeout: 20000 });
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Managing Director" }).click();
  await page.getByRole("button", { name: /enter local atlas/i }).click();
  await page.locator("header select").first().waitFor({ timeout: 25000 });
}

async function probe(page) {
  return page.evaluate(() => {
    const overflow = document.documentElement.scrollWidth > window.innerWidth + 8;
    const h1 = document.querySelector("h1")?.textContent?.trim() ?? "";
    const nav = Array.from(document.querySelectorAll("aside nav a")).map((a) =>
      a.textContent.replace(/\s+/g, " ").trim(),
    );
    const headerSelects = Array.from(
      document.querySelectorAll(".sticky select, header.sticky select"),
    ).map((s) => {
      const el = s;
      return { label: el.selectedOptions?.[0]?.textContent?.trim() ?? "", value: el.value };
    });
    const jade = Array.from(document.querySelectorAll("button, a"))
      .filter((el) => {
        const bg = getComputedStyle(el).backgroundColor;
        return bg === "rgb(29, 79, 66)";
      })
      .map((el) => el.textContent.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    const sticky = document.querySelector(".sticky.top-0")?.innerText ?? "";
    const body = document.body.innerText;
    const find = (re) => re.test(body);
    return {
      path: location.pathname,
      overflow,
      h1,
      navCount: nav.length,
      nav,
      headerSelects,
      localBadge: /local only/i.test(sticky)
        ? "Local only · not live"
        : /local/i.test(sticky)
          ? "Local (abbrev)"
          : "missing",
      jadeCount: jade.length,
      jade,
      titles: Array.from(document.querySelectorAll("h1, h2")).map((el) =>
        el.textContent.replace(/\s+/g, " ").trim(),
      ),
      hasPinkCity: find(/Pink City/i),
      hasDesertReach: find(/Desert Reach/i),
      hasShekhawat: find(/Shekhawat/i),
      hasBhati: find(/L\. Bhati/i),
      hasSoni: find(/R\. Soni/i),
      hasConcept: find(/Concept/i),
      hasTally: find(/Tally/i),
      hasCash: find(/cash|collection|receivable/i),
      approve: (body.match(/Approve/g) || []).length,
      reject: (body.match(/Reject/g) || []).length,
      body: body.slice(0, 2200),
    };
  });
}

async function go(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(280);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const report = {
    at: new Date().toISOString(),
    screens: [],
    actions: [],
    isolation: {},
    entitySwitch: {},
    mobile: [],
    errors: [],
  };
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  page.on("pageerror", (e) => report.errors.push(e.message));

  const t0 = Date.now();
  await login(page);
  report.actions.push({
    action: "login",
    ms: Date.now() - t0,
    landed: new URL(page.url()).pathname,
  });

  for (const path of ROUTES) {
    await go(page, path);
    report.screens.push(await probe(page));
  }

  await go(page, "/app/projects");
  await page.locator("a[href*='/app/projects/']").first().click();
  await page.waitForTimeout(300);
  report.screens.push({ ...(await probe(page)), slug: "project-detail" });

  await go(page, "/app/approvals");
  const approveBtn = page.getByRole("button", { name: "Approve" });
  const before = await approveBtn.count();
  if (before) {
    await approveBtn.first().click();
    await page.waitForTimeout(250);
  }
  const rejectBtn = page.getByRole("button", { name: "Reject" });
  if (await rejectBtn.count()) {
    await rejectBtn.first().click();
    await page.waitForTimeout(250);
  }
  report.actions.push({
    action: "approve-reject",
    before,
    remainingApprove: await approveBtn.count(),
    remainingReject: await rejectBtn.count(),
    after: await probe(page),
  });

  await go(page, "/app");
  const llp = await probe(page);
  await page.locator("header select, .sticky select").first().selectOption("le_homes");
  await page.waitForTimeout(400);
  const homes = await probe(page);
  report.entitySwitch = {
    llpKpis: llp.body.slice(0, 700),
    homesKpis: homes.body.slice(0, 700),
    llpSelects: llp.headerSelects,
    homesSelects: homes.headerSelects,
    changed: llp.body !== homes.body,
  };

  await go(page, "/app/sales/channel");
  report.isolation.channelHomes = await probe(page);
  await go(page, "/app/crm");
  report.isolation.crmHomes = await probe(page);
  await go(page, "/app/sales/company");
  report.isolation.company = await probe(page);
  await go(page, "/app/sales/analytics");
  report.isolation.analyticsHomes = await probe(page);
  await go(page, "/app/capital");
  report.isolation.capitalHomes = await probe(page);
  await go(page, "/app/approvals");
  report.isolation.approvalsHomes = await probe(page);
  await go(page, "/app/finance");
  report.isolation.financeHomes = await probe(page);

  await page.locator("header select, .sticky select").first().selectOption("le_llp");
  await page.waitForTimeout(300);
  await go(page, "/app/sales/channel");
  report.isolation.channelLlp = await probe(page);
  await go(page, "/app/crm");
  report.isolation.crmLlp = await probe(page);

  await go(page, "/app/decisions");
  const reopen = page.getByRole("button", { name: /reopen/i });
  if (await reopen.count()) {
    await reopen.first().click();
    await page
      .getByPlaceholder(/your decision/i)
      .first()
      .fill("Keep self-hosted. No commercial API.");
    await page.getByRole("button", { name: /record decision/i }).click();
    report.actions.push({ action: "record-decision", ok: true });
  }
  await go(page, "/app/finance");
  const recon = page.getByRole("button", { name: /reconcile/i });
  if (await recon.count()) {
    await recon.first().click();
    report.actions.push({ action: "tally-reconcile", ok: true });
  }

  await context.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mpage = await mobile.newPage();
  await login(mpage);
  for (const path of [
    "/app",
    "/app/portfolio",
    "/app/capital",
    "/app/approvals",
    "/app/decisions",
    "/app/sales/analytics",
    "/app/finance",
    "/app/sales/channel",
    "/app/projects",
    "/app/crm",
  ]) {
    await go(mpage, path);
    report.mobile.push(await probe(mpage));
  }
  await mpage.locator('button[aria-label="Open menu"]').click();
  await mpage.waitForTimeout(200);
  report.mobileNav = await mpage.evaluate(() => {
    const links = Array.from(document.querySelectorAll(".fixed a, .fixed button")).map((el) =>
      el.textContent.replace(/\s+/g, " ").trim(),
    );
    return {
      linkCount: links.length,
      links,
      overflow: document.documentElement.scrollWidth > window.innerWidth + 8,
    };
  });
  report.mobileLocalChip = await mpage.locator(".sticky.top-0").first().innerText();
  await mobile.close();
  await browser.close();

  writeFileSync(join(OUT, "_notes.json"), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        ok: true,
        screens: report.screens.length,
        landed: report.actions[0],
        entityChanged: report.entitySwitch.changed,
        channelHomes: {
          pink: report.isolation.channelHomes.hasPinkCity,
          desert: report.isolation.channelHomes.hasDesertReach,
          bhati: report.isolation.channelHomes.hasBhati,
          soni: report.isolation.channelHomes.hasSoni,
        },
        channelLlp: {
          pink: report.isolation.channelLlp.hasPinkCity,
          desert: report.isolation.channelLlp.hasDesertReach,
        },
        company: {
          pink: report.isolation.company.hasPinkCity,
          desert: report.isolation.company.hasDesertReach,
          h1: report.isolation.company.h1,
        },
        mobileOverflow: report.mobile.filter((m) => m.overflow).map((m) => m.path),
        jade: report.screens.map((s) => [s.path, s.jadeCount, s.jade.slice(0, 4)]),
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
