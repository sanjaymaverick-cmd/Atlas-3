#!/usr/bin/env node
/**
 * Throwaway MD (S. Mehta) UX review walk. Does not edit application source.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = process.env.ATLAS_URL || "http://127.0.0.1:8080";
const OUT = join(process.cwd(), "screenshots", "review", "md");
mkdirSync(OUT, { recursive: true });

const USER = {
  email: "md@atlas.local",
  password: "AtlasLocal-MD",
  seat: "Managing Director",
};

const ROUTES = [
  { slug: "command", path: "/app", deep: true },
  { slug: "portfolio", path: "/app/portfolio", deep: true },
  { slug: "capital", path: "/app/capital", deep: true },
  { slug: "phases", path: "/app/phases" },
  { slug: "testing", path: "/app/testing" },
  { slug: "org", path: "/app/org" },
  { slug: "approvals", path: "/app/approvals", deep: true },
  { slug: "projects", path: "/app/projects" },
  { slug: "documents", path: "/app/documents" },
  { slug: "land", path: "/app/land" },
  { slug: "commercial", path: "/app/commercial" },
  { slug: "quotations", path: "/app/quotations" },
  { slug: "site", path: "/app/site" },
  { slug: "controls", path: "/app/controls" },
  { slug: "changes", path: "/app/changes" },
  { slug: "customers", path: "/app/customers" },
  { slug: "crm", path: "/app/crm" },
  { slug: "sales", path: "/app/sales" },
  { slug: "sales-inventory", path: "/app/sales/inventory" },
  { slug: "sales-channel", path: "/app/sales/channel" },
  { slug: "sales-company", path: "/app/sales/company" },
  { slug: "sales-pipeline", path: "/app/sales/pipeline" },
  { slug: "sales-handover", path: "/app/sales/handover" },
  { slug: "sales-analytics", path: "/app/sales/analytics", deep: true },
  { slug: "sales-integrations", path: "/app/sales/integrations" },
  { slug: "sales-whatsapp", path: "/app/sales/whatsapp" },
  { slug: "sales-people", path: "/app/sales/people" },
  { slug: "finance", path: "/app/finance", deep: true },
  { slug: "decisions", path: "/app/decisions", deep: true },
  { slug: "audit", path: "/app/audit" },
  { slug: "assistant", path: "/app/assistant" },
];

const LS_KEYS = [
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
];

function shot(name) {
  return join(OUT, `${name}.png`);
}

async function login(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.evaluate((keys) => {
    for (const k of keys) localStorage.removeItem(k);
  }, LS_KEYS);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("Local test accounts").waitFor({ timeout: 20000 });
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: USER.seat }).click();
  await page.getByRole("button", { name: /enter local atlas/i }).click();
  await page.locator("header select").first().waitFor({ timeout: 25000 });
}

async function probe(page, extra = {}) {
  return page.evaluate((extraIn) => {
    const notes = [];
    const overflow = document.documentElement.scrollWidth > window.innerWidth + 8;
    if (overflow) notes.push("Horizontal overflow");
    const h1 = document.querySelector("h1")?.textContent?.trim() ?? "";
    const kicker = document.querySelector("header p, main header p")?.textContent?.trim() ?? "";
    const desc = document.querySelector("main header p.mt-1, main header p.text-sm")?.textContent?.trim() ?? "";
    const nav = Array.from(document.querySelectorAll("aside nav a")).map((a) => a.textContent.replace(/\s+/g, " ").trim());
    const headerSelects = Array.from(document.querySelectorAll("header select")).map((s) => {
      const el = s;
      const opt = el.selectedOptions?.[0];
      return { label: opt?.textContent?.trim() ?? "", value: el.value };
    });
    const localBadge = document.querySelector("header")?.innerText ?? "";
    const jade = Array.from(document.querySelectorAll("button, a, [role='button']")).filter((el) => {
      const bg = getComputedStyle(el).backgroundColor;
      return bg === "rgb(29, 79, 66)" || bg === "rgba(29, 79, 66, 1)";
    }).map((el) => el.textContent.replace(/\s+/g, " ").trim()).filter(Boolean);
    const titles = Array.from(document.querySelectorAll("h1, h2")).map((el) => el.textContent.replace(/\s+/g, " ").trim());
    const kpis = Array.from(document.querySelectorAll("main [class*='font-display']")).slice(0, 12).map((el) => {
      const card = el.closest("[class*='p-4'], [class*='p-5']");
      const label = card?.querySelector("p")?.textContent?.trim() ?? "";
      return { label, value: el.textContent.replace(/\s+/g, " ").trim() };
    });
    const body = document.body.innerText;
    const find = (re) => re.test(body);
    return {
      path: location.pathname,
      viewport: { w: window.innerWidth, h: window.innerHeight },
      overflow,
      h1,
      kicker,
      desc,
      navCount: nav.length,
      nav,
      headerSelects,
      localBadge: /local only/i.test(localBadge) ? "Local only" : /local/i.test(localBadge) ? "Local (abbrev)" : "missing",
      jadeCount: jade.length,
      jade,
      titles,
      kpis,
      notes,
      hasPinkCity: find(/Pink City/i),
      hasDesertReach: find(/Desert Reach/i),
      hasShekhawat: find(/Shekhawat/i),
      hasBhati: find(/L\. Bhati/i),
      hasSoni: find(/R\. Soni/i),
      hasConcept: find(/Concept/i),
      hasTally: find(/Tally/i),
      hasCash: find(/cash|collection|receivable/i),
      bodySnippet: body.slice(0, 1800),
      ...extraIn,
    };
  }, extra);
}

async function shotPage(page, name, fullPage = true) {
  await page.waitForTimeout(250);
  await page.screenshot({ path: shot(name), fullPage });
}

async function gotoApp(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(500);
}

async function main() {
  let serverOk = false;
  try {
    const r = await fetch(BASE, { signal: AbortSignal.timeout(4000) });
    serverOk = r.ok || r.status === 200;
  } catch {
    serverOk = false;
  }
  if (!serverOk) {
    console.error(JSON.stringify({ ok: false, error: `Atlas is not running at ${BASE}` }));
    process.exit(2);
  }

  const browser = await chromium.launch({ headless: true });
  const report = {
    at: new Date().toISOString(),
    seat: USER.seat,
    email: USER.email,
    screens: [],
    actions: [],
    isolation: {},
    entitySwitch: {},
    mobile: [],
    consoleErrors: [],
    pageErrors: [],
  };

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") report.consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => report.pageErrors.push(e.message));

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.getByText("Local test accounts").waitFor({ timeout: 20000 });
  await shotPage(page, "00-login", true);

  const t0 = Date.now();
  await login(page);
  report.actions.push({ action: "login", ms: Date.now() - t0, landed: new URL(page.url()).pathname });
  await shotPage(page, "01-landing-after-login", true);

  const findCashStart = Date.now();
  await gotoApp(page, "/app");
  const commandProbe = await probe(page);
  report.actions.push({
    action: "find-cash-on-command",
    ms: Date.now() - findCashStart,
    found: commandProbe.hasCash,
    h1: commandProbe.h1,
  });
  await shotPage(page, "02-command-llp", true);

  for (const r of ROUTES) {
    await gotoApp(page, r.path);
    const p = await probe(page, { slug: r.slug, deep: Boolean(r.deep) });
    report.screens.push(p);
    await shotPage(page, `desk-${r.slug}`, Boolean(r.deep) || r.slug === "projects" || r.slug === "crm" || r.slug === "sales-channel");
  }

  await gotoApp(page, "/app/projects");
  const projectLink = page.locator("a[href*='/app/projects/']").first();
  const projectHref = await projectLink.getAttribute("href");
  await projectLink.click();
  await page.waitForTimeout(500);
  report.actions.push({ action: "open-project", href: projectHref, path: new URL(page.url()).pathname });
  report.screens.push(await probe(page, { slug: "project-detail", deep: true }));
  await shotPage(page, "desk-project-detail", true);

  await gotoApp(page, "/app/approvals");
  const pendingBefore = await page.locator("button", { hasText: "Approve" }).count();
  if (pendingBefore > 0) {
    await page.getByRole("button", { name: "Approve" }).first().click();
    await page.waitForTimeout(400);
  }
  const rejectCount = await page.getByRole("button", { name: "Reject" }).count();
  if (rejectCount > 0) {
    await page.getByRole("button", { name: "Reject" }).first().click();
    await page.waitForTimeout(400);
  }
  await shotPage(page, "desk-approvals-after-act", true);
  const afterAct = await probe(page, { slug: "approvals-after-act" });
  report.actions.push({
    action: "approve-and-reject",
    pendingApproveButtonsBefore: pendingBefore,
    remainingReject: await page.getByRole("button", { name: "Reject" }).count(),
    remainingApprove: await page.getByRole("button", { name: "Approve" }).count(),
    closedVisible: /Closed/i.test(afterAct.bodySnippet),
  });
  report.screens.push(afterAct);

  await gotoApp(page, "/app");
  const beforeEntity = await probe(page, { slug: "command-before-switch" });
  const entitySelect = page.locator("header select").first();
  const options = await entitySelect.locator("option").allTextContents();
  await entitySelect.selectOption("le_homes");
  await page.waitForTimeout(600);
  const afterHomes = await probe(page, { slug: "command-homes" });
  await shotPage(page, "02b-command-homes", true);
  report.entitySwitch = {
    options,
    llp: { path: beforeEntity.path, kpis: beforeEntity.kpis, snippet: beforeEntity.bodySnippet.slice(0, 900), hasPink: beforeEntity.hasPinkCity, hasDesert: beforeEntity.hasDesertReach },
    homes: { path: afterHomes.path, kpis: afterHomes.kpis, snippet: afterHomes.bodySnippet.slice(0, 900), hasPink: afterHomes.hasPinkCity, hasDesert: afterHomes.hasDesertReach },
    numbersChanged: JSON.stringify(beforeEntity.kpis) !== JSON.stringify(afterHomes.kpis),
  };

  await gotoApp(page, "/app/capital");
  report.screens.push(await probe(page, { slug: "capital-homes" }));
  await shotPage(page, "desk-capital-homes", true);

  await gotoApp(page, "/app/approvals");
  report.screens.push(await probe(page, { slug: "approvals-homes" }));
  await shotPage(page, "desk-approvals-homes", true);

  await gotoApp(page, "/app/sales/channel");
  const channelHomes = await probe(page, { slug: "channel-homes" });
  report.isolation.channelHomes = {
    hasPinkCity: channelHomes.hasPinkCity,
    hasDesertReach: channelHomes.hasDesertReach,
    hasBhati: channelHomes.hasBhati,
    hasSoni: channelHomes.hasSoni,
    hasShekhawat: channelHomes.hasShekhawat,
    snippet: channelHomes.bodySnippet.slice(0, 1200),
  };
  await shotPage(page, "desk-channel-homes", true);

  await gotoApp(page, "/app/crm");
  const crmHomes = await probe(page, { slug: "crm-homes" });
  report.isolation.crmHomes = {
    hasPinkCity: crmHomes.hasPinkCity,
    hasDesertReach: crmHomes.hasDesertReach,
    snippet: crmHomes.bodySnippet.slice(0, 1000),
  };
  await shotPage(page, "desk-crm-homes", true);

  await gotoApp(page, "/app/sales/company");
  const firmHomes = await probe(page, { slug: "company-homes" });
  report.isolation.company = {
    h1: firmHomes.h1,
    hasPinkCity: firmHomes.hasPinkCity,
    hasDesertReach: firmHomes.hasDesertReach,
    hasShekhawat: firmHomes.hasShekhawat,
    snippet: firmHomes.bodySnippet.slice(0, 1200),
  };
  await shotPage(page, "desk-company-homes", true);

  await gotoApp(page, "/app/sales/analytics");
  const analyticsHomes = await probe(page, { slug: "analytics-homes" });
  report.isolation.analyticsHomes = {
    hasPinkCity: analyticsHomes.hasPinkCity,
    hasDesertReach: analyticsHomes.hasDesertReach,
    snippet: analyticsHomes.bodySnippet.slice(0, 1000),
  };
  await shotPage(page, "desk-analytics-homes", true);

  await entitySelect.selectOption("le_llp");
  await page.waitForTimeout(500);
  await gotoApp(page, "/app/sales/channel");
  const channelLlp = await probe(page, { slug: "channel-llp" });
  report.isolation.channelLlp = {
    hasPinkCity: channelLlp.hasPinkCity,
    hasDesertReach: channelLlp.hasDesertReach,
    hasBhati: channelLlp.hasBhati,
    hasSoni: channelLlp.hasSoni,
    snippet: channelLlp.bodySnippet.slice(0, 1000),
  };
  await shotPage(page, "desk-channel-llp", true);

  await gotoApp(page, "/app/crm");
  const crmLlp = await probe(page, { slug: "crm-llp" });
  report.isolation.crmLlp = {
    hasPinkCity: crmLlp.hasPinkCity,
    hasDesertReach: crmLlp.hasDesertReach,
    snippet: crmLlp.bodySnippet.slice(0, 1000),
  };

  await gotoApp(page, "/app/decisions");
  const reopen = page.getByRole("button", { name: /reopen/i }).first();
  if (await reopen.count()) {
    await reopen.click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder(/your decision/i).first().fill("Keep self-hosted open-weight. No commercial API.");
    await page.getByRole("button", { name: /record decision/i }).click();
    await page.waitForTimeout(400);
    report.actions.push({ action: "reopen-and-record-decision", ok: true });
  } else {
    report.actions.push({ action: "reopen-and-record-decision", ok: false, reason: "no reopen button" });
  }
  await shotPage(page, "desk-decisions-after-record", true);

  await gotoApp(page, "/app/finance");
  const recon = page.getByRole("button", { name: /reconcile/i }).first();
  if (await recon.count()) {
    await recon.click();
    await page.waitForTimeout(300);
    report.actions.push({ action: "tally-reconcile", ok: true });
  }
  await shotPage(page, "desk-finance-after-recon", true);

  await gotoApp(page, "/app/projects");
  const newBtn = page.getByRole("button", { name: /new project/i });
  if (await newBtn.count()) {
    await newBtn.click();
    await page.waitForTimeout(200);
    await shotPage(page, "desk-projects-new-form", false);
    report.actions.push({ action: "open-new-project-form", fields: await page.locator("form, .grid").first().innerText().catch(() => "open") });
  }

  await context.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mpage = await mobile.newPage();
  mpage.on("pageerror", (e) => report.pageErrors.push(`mobile: ${e.message}`));
  await login(mpage);
  await shotPage(mpage, "m-01-landing", true);
  const mobileScreens = [
    ["/app", "m-02-command"],
    ["/app/portfolio", "m-03-portfolio"],
    ["/app/capital", "m-04-capital"],
    ["/app/approvals", "m-05-approvals"],
    ["/app/decisions", "m-06-decisions"],
    ["/app/sales/analytics", "m-07-analytics"],
    ["/app/finance", "m-08-finance"],
    ["/app/sales/channel", "m-09-channel"],
    ["/app/projects", "m-10-projects"],
    ["/app/crm", "m-11-crm"],
  ];
  for (const [path, name] of mobileScreens) {
    await gotoApp(mpage, path);
    const p = await probe(mpage, { slug: name, mobile: true });
    report.mobile.push(p);
    await shotPage(mpage, name, true);
  }
  await mpage.locator('button[aria-label="Open menu"]').click();
  await mpage.waitForTimeout(300);
  const menu = await mpage.evaluate(() => {
    const drawer = document.querySelector(".fixed.inset-0, [class*='w-64']");
    const links = Array.from(document.querySelectorAll(".fixed a, .fixed button")).map((el) =>
      el.textContent.replace(/\s+/g, " ").trim(),
    );
    return {
      linkCount: links.length,
      links,
      drawerScroll: drawer ? drawer.scrollHeight > drawer.clientHeight : null,
      localInDrawer: /local/i.test(document.body.innerText),
    };
  });
  report.mobileNav = menu;
  await shotPage(mpage, "m-12-nav-open", false);

  report.mobileLocalChip = await mpage.locator("header.sticky, .sticky.top-0").first().innerText();

  await mobile.close();
  await browser.close();

  const outJson = join(OUT, "_notes.json");
  writeFileSync(outJson, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: true, screens: report.screens.length, mobile: report.mobile.length, out: OUT }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
