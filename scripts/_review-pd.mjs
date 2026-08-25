#!/usr/bin/env node
/**
 * Throwaway PD seat review — R. Sharma / pd@atlas.local.
 * Does not edit application source.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = process.env.ATLAS_URL || "http://127.0.0.1:8080";
const OUT = join(process.cwd(), "screenshots", "review", "pd");
mkdirSync(OUT, { recursive: true });

const USER = { email: "pd@atlas.local", password: "AtlasLocal-PD", seat: "Project Director" };

const ALLOWED = [
  ["/app", "command"],
  ["/app/portfolio", "portfolio"],
  ["/app/capital", "capital"],
  ["/app/phases", "phases"],
  ["/app/org", "org"],
  ["/app/approvals", "approvals"],
  ["/app/projects", "projects"],
  ["/app/documents", "documents"],
  ["/app/land", "land"],
  ["/app/commercial", "commercial"],
  ["/app/quotations", "quotations"],
  ["/app/site", "site"],
  ["/app/controls", "controls"],
  ["/app/changes", "changes"],
  ["/app/customers", "customers"],
  ["/app/crm", "crm"],
  ["/app/sales", "sales"],
  ["/app/sales/inventory", "sales-inventory"],
  ["/app/sales/channel", "sales-channel"],
  ["/app/sales/company", "sales-company"],
  ["/app/sales/pipeline", "sales-pipeline"],
  ["/app/sales/handover", "sales-handover"],
  ["/app/sales/analytics", "sales-analytics"],
  ["/app/sales/integrations", "sales-integrations"],
  ["/app/sales/whatsapp", "sales-whatsapp"],
  ["/app/sales/people", "sales-people"],
  ["/app/audit", "audit"],
  ["/app/assistant", "assistant"],
];

const FORBIDDEN_NAV = ["Test pack", "Tally", "Owner decisions"];
const FORBIDDEN_PATHS = [
  ["/app/finance", "finance-deeplink"],
  ["/app/decisions", "decisions-deeplink"],
  ["/app/testing", "testing-deeplink"],
];

const STORAGE_KEYS = [
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

const report = {
  seat: "Project Director",
  email: USER.email,
  at: new Date().toISOString(),
  home: null,
  nav: { desktop: [], mobile: [] },
  leaks: [],
  isolation: [],
  screens: [],
  actions: [],
  ux: [],
  console: [],
  pageErrors: [],
};

function logUx(screen, severity, issue) {
  report.ux.push({ screen, severity, issue });
}

async function clearStorage(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.evaluate((keys) => {
    for (const k of keys) localStorage.removeItem(k);
  }, STORAGE_KEYS);
}

async function login(page) {
  await clearStorage(page);
  await page.reload({ waitUntil: "networkidle", timeout: 30000 });
  await page.getByText("Local test accounts").waitFor({ timeout: 20000 });
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: USER.seat, exact: true }).click();
  await page.getByRole("button", { name: /enter local atlas/i }).click();
  await page.waitForURL(/\/app/, { timeout: 25000 });
  await page.getByRole("heading").first().waitFor({ timeout: 15000 });
}

async function shot(page, name, { fullPage = true } = {}) {
  const path = join(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage });
  return path;
}

async function firstViewportShot(page, name) {
  const path = join(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  return path;
}

async function collectPage(page, screen) {
  return page.evaluate((screenName) => {
    const h1 = document.querySelector("h1")?.textContent?.trim() ?? "";
    const desc = document.querySelector("h1 + p")?.textContent?.trim() ?? "";
    const buttons = [...document.querySelectorAll("button, [role='button'], a.inline-flex, a.flex")]
      .map((el) => (el.textContent || "").trim().replace(/\s+/g, " "))
      .filter(Boolean)
      .slice(0, 40);
    const overflow = document.documentElement.scrollWidth > window.innerWidth + 8;
    const jade = [...document.querySelectorAll("button")].filter((b) => {
      const bg = getComputedStyle(b).backgroundColor;
      return bg.includes("29, 79, 66") || bg.includes("45, 90") || /1d4f42/i.test(b.className);
    }).length;
    const text = document.body.innerText;
    const fold = text.slice(0, 1800);
    return {
      screen: screenName,
      h1,
      desc,
      buttons,
      overflow,
      jadePrimaryGuess: jade,
      fold,
      bodyLen: text.length,
      hasTallyAction: /Reconcile|Accept exception/i.test(text) && /Tally/i.test(text),
      hasRecordDecision: /Record decision|Reopen/i.test(text),
      hasRunCompanyDay: /Run the day|Company day/i.test(text) && /Twelve seats/i.test(text),
    };
  }, screen);
}

async function navLabels(page, mobile) {
  if (mobile) {
    const open = page.getByRole("button", { name: /open menu/i });
    if (await open.isVisible()) await open.click();
    await page.waitForTimeout(250);
    const labels = await page.locator(".fixed.inset-0 a, .fixed.inset-0 button").allTextContents();
    await page
      .locator(".fixed.inset-0")
      .first()
      .click({ position: { x: 280, y: 20 } })
      .catch(() => {});
    await page.keyboard.press("Escape").catch(() => {});
    return labels.map((t) => t.trim()).filter(Boolean);
  }
  return page
    .locator("aside nav a")
    .allTextContents()
    .then((xs) => xs.map((t) => t.trim()).filter(Boolean));
}

async function gotoPath(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(350);
}

async function walkScreens(page, prefix, viewport) {
  const rows = [];
  for (const [path, slug] of ALLOWED) {
    const t0 = Date.now();
    await gotoPath(page, path);
    const findMs = Date.now() - t0;
    const meta = await collectPage(page, slug);
    meta.path = path;
    meta.findMs = findMs;
    meta.viewport = viewport;
    if (meta.overflow) logUx(`${prefix}:${slug}`, "p2", "Horizontal overflow on this viewport.");
    if (!meta.h1) logUx(`${prefix}:${slug}`, "p3", "No visible h1.");
    if (findMs > 10000) logUx(`${prefix}:${slug}`, "p1", `Took ${findMs}ms to load.`);
    await shot(page, `${prefix}-${slug}`);
    if (
      slug === "command" ||
      slug === "phases" ||
      slug === "controls" ||
      slug === "changes" ||
      slug === "site" ||
      slug === "approvals"
    ) {
      await firstViewportShot(page, `${prefix}-${slug}-fold`);
    }
    rows.push(meta);
  }
  return rows;
}

async function isolationChecks(page) {
  await gotoPath(page, "/app/projects");
  const llp = await page.locator("main").innerText();
  report.isolation.push({
    entity: "Kanakpura Developers LLP (default)",
    hasKanakpura: /Kanakpura/i.test(llp),
    hasBaggad: /Baggad/i.test(llp),
    hasMansarovar: /Mansarovar/i.test(llp),
  });
  await shot(page, "desk-projects-llp");

  const entitySelect = page.locator("header select").first();
  const entityOptions = await entitySelect.locator("option").allTextContents();
  report.isolation.push({ entityOptions });
  const aravalli = entityOptions.find((o) => /Aravalli/i.test(o));
  const llpOpt = entityOptions.find((o) => /Kanakpura Developers/i.test(o));
  if (aravalli) await entitySelect.selectOption({ label: aravalli });
  await page.waitForTimeout(400);
  await gotoPath(page, "/app/projects");
  const homes = await page.locator("main").innerText();
  report.isolation.push({
    entity: "Aravalli Homes Pvt Ltd",
    hasKanakpura: /Kanakpura/i.test(homes),
    hasBaggad: /Baggad/i.test(homes),
    hasMansarovar: /Mansarovar/i.test(homes),
  });
  await shot(page, "desk-projects-aravalli");

  if (llpOpt) await entitySelect.selectOption({ label: llpOpt });
  await page.waitForTimeout(300);
}

async function realActions(page) {
  // Open a project
  await gotoPath(page, "/app/projects");
  await page.getByRole("link", { name: /Kanakpura Residences/i }).click();
  await page.waitForTimeout(400);
  const detail = await page.locator("main").innerText();
  report.actions.push({
    name: "open-project",
    url: page.url(),
    ok: /Kanakpura Residences/i.test(detail),
    hasDiaries: /Recent diaries|Tower A L12|snag/i.test(detail),
    hasChanges: /Open change items|Hollow tiles|VO-19|Beam-column/i.test(detail),
    hasPhaseSlip: /slip|behind|phase/i.test(detail),
  });
  await shot(page, "desk-project-kanakpura");

  // Raise NCR — header also has <select>, so scope to the form labels.
  await gotoPath(page, "/app/changes");
  const typeSelect = page
    .locator("label")
    .filter({ hasText: /^Type$/ })
    .locator("select");
  const titleInput = page
    .locator("label")
    .filter({ hasText: /^Title$/ })
    .locator("input");
  await typeSelect.selectOption("ncr");
  await titleInput.fill("PD review — podium waterproofing NCR (Tower A)");
  await page.getByRole("button", { name: /^Raise$/i }).click();
  await page.waitForTimeout(500);
  const afterNcr = await page.locator("main").innerText();
  report.actions.push({
    name: "raise-ncr",
    ok: /PD review — podium waterproofing NCR/i.test(afterNcr),
    toastish: afterNcr.includes("Raised") || /PD review/i.test(afterNcr),
  });
  await shot(page, "desk-changes-after-ncr");

  // Raise VO
  await typeSelect.selectOption("change");
  await titleInput.fill("VO-PD-01 Extra raft steel Tower B");
  await page.getByRole("button", { name: /^Raise$/i }).click();
  await page.waitForTimeout(500);
  report.actions.push({
    name: "raise-vo",
    ok: /VO-PD-01 Extra raft steel/i.test(await page.locator("main").innerText()),
  });

  // Approvals — VO waiting on PD
  await gotoPath(page, "/app/approvals");
  const appr = await page.locator("main").innerText();
  report.actions.push({
    name: "approvals-queue",
    seesVo19: /VO-19/i.test(appr),
    seesNewVo: /VO-PD-01/i.test(appr),
    canApprove: await page.getByRole("button", { name: /^Approve$/i }).count(),
    waitingOnPd: /Project Director/i.test(appr),
    waitingOnMd: /Managing Director/i.test(appr),
  });
  await shot(page, "desk-approvals-queue");
  const voCard = page
    .locator("div")
    .filter({ hasText: /VO-PD-01 Extra raft steel/i })
    .filter({ has: page.getByRole("button", { name: /^Approve$/i }) })
    .first();
  if (await voCard.count()) {
    await voCard.getByRole("button", { name: /^Approve$/i }).click();
    await page.waitForTimeout(400);
    report.actions.push({ name: "approve-own-vo", ok: true });
  } else {
    const firstApprove = page.getByRole("button", { name: /^Approve$/i }).first();
    if (await firstApprove.count()) {
      await firstApprove.click();
      await page.waitForTimeout(400);
      report.actions.push({ name: "approve-first-item", ok: true });
    }
  }
  await shot(page, "desk-approvals-after");

  // Site: fail pending inspection (raises NCR)
  await gotoPath(page, "/app/site");
  const failBtn = page.getByRole("button", { name: /^Fail$/i }).first();
  if (await failBtn.count()) {
    await failBtn.click();
    await page.waitForTimeout(400);
    report.actions.push({ name: "fail-inspection", ok: true });
  } else {
    report.actions.push({ name: "fail-inspection", ok: false, note: "No pending Fail button" });
  }
  await shot(page, "desk-site-after-fail");

  // Diary: try seal (PD should not steal the site diary)
  const labour = page.getByLabel(/labour/i);
  if (await labour.count()) {
    await page.getByLabel(/major work/i).fill("PD office review of Tower A L12 — not a site seal.");
    await page.getByRole("button", { name: /seal diary/i }).click();
    await page.waitForTimeout(500);
    const siteText = await page.locator("body").innerText();
    report.actions.push({
      name: "pd-seal-diary",
      ok: true,
      blocked: /already exists/i.test(siteText),
      sealed:
        /Diary sealed/i.test(siteText) ||
        /R\. Sharma/i.test(await page.locator("main").innerText()),
    });
  }
  await shot(page, "desk-site-diary");

  // Controls: issue material + approve variance
  await gotoPath(page, "/app/controls");
  const issue = page.getByRole("button", { name: /^Issue$/i }).first();
  if (await issue.count()) {
    await issue.click();
    await page.waitForTimeout(350);
    report.actions.push({ name: "issue-material", ok: true });
  }
  const qty = page.getByRole("button", { name: /approve quantity/i }).first();
  if (await qty.count()) {
    await qty.click();
    await page.waitForTimeout(350);
    report.actions.push({ name: "approve-qty-variance", ok: true });
  }
  await shot(page, "desk-controls-after");

  // Command after actions — did "today" update?
  await gotoPath(page, "/app");
  const cmd = await page.locator("main").innerText();
  report.actions.push({
    name: "command-after-actions",
    mentionsTodayDiary: /today|sealed|L12 slab/i.test(cmd),
    mentionsNewNcr: /podium waterproofing NCR|Open NCR/i.test(cmd),
    slippageWord: /slip|behind programme|late/i.test(cmd),
    blockedWord: /blocked|waiting/i.test(cmd),
    fold: cmd.slice(0, 1200),
  });
  await shot(page, "desk-command-after");
}

async function leakChecks(page) {
  const nav = await page.locator("aside nav").innerText();
  for (const label of FORBIDDEN_NAV) {
    const leaked = new RegExp(`\\b${label}\\b`, "i").test(nav);
    report.leaks.push({ kind: "nav", label, leaked });
  }

  for (const [path, slug] of FORBIDDEN_PATHS) {
    await gotoPath(page, path);
    const meta = await collectPage(page, slug);
    meta.path = path;
    await shot(page, `desk-${slug}`);
    report.leaks.push({
      kind: "deeplink",
      path,
      h1: meta.h1,
      hasTallyAction: meta.hasTallyAction,
      hasRecordDecision: meta.hasRecordDecision,
      hasRunCompanyDay: meta.hasRunCompanyDay,
      fold: meta.fold.slice(0, 800),
    });
  }
}

async function phasesAnswers(page) {
  await gotoPath(page, "/app/phases");
  const t = await page.locator("main").innerText();
  report.actions.push({
    name: "all-phases-content",
    looksLikeProductModules: /Identity & organization|Documents|Tally|Assistant/i.test(t),
    looksLikeConstructionPhases: /substructure|superstructure|finishes|MEP|handover tower/i.test(t),
    linksToTally: /Tally/i.test(t),
  });
}

async function commandFiveSecond(page) {
  await gotoPath(page, "/app");
  const t = await page.locator("main").innerText();
  const answers = {
    onTrack: /on track|needs a decision|elevated/i.test(t),
    phaseSlip: /% built|% of calendar|slip/i.test(t),
    blocked: /approvals waiting|open ncr|failed inspection/i.test(t),
    siteToday: /diary|today’s site|raised today|21 Aug|22 Aug|23 Aug/i.test(t),
    ncrCount: (t.match(/Open NCRs/i) && true) || /NCR/i.test(t),
  };
  report.actions.push({ name: "command-5s", answers, fold: t.slice(0, 1500) });
}

async function main() {
  const ping = await fetch(BASE, { signal: AbortSignal.timeout(4000) })
    .then((r) => r.ok)
    .catch(() => false);
  if (!ping) {
    console.error(JSON.stringify({ ok: false, error: `Atlas not running at ${BASE}` }));
    process.exit(2);
  }

  const browser = await chromium.launch({ headless: true });

  // Desktop
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    page.on("pageerror", (e) => report.pageErrors.push(`desk ${e.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") report.console.push(`desk ${msg.text()}`);
    });
    await login(page);
    report.home = page.url();
    await shot(page, "desk-login-home");
    report.nav.desktop = await navLabels(page, false);
    await commandFiveSecond(page);
    await phasesAnswers(page);
    const deskScreens = await walkScreens(page, "desk", "1280x800");
    report.screens.push(...deskScreens);
    await isolationChecks(page);
    await leakChecks(page);
    try {
      await realActions(page);
    } catch (err) {
      report.actions.push({ name: "realActions-failed", ok: false, error: String(err) });
      await shot(page, "desk-actions-error").catch(() => {});
    }
    await context.close();
  }

  // Mobile — fresh login, key screens + hamburger + overflow
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => report.pageErrors.push(`mob ${e.message}`));
    await login(page);
    report.nav.mobile = await navLabels(page, true);
    await shot(page, "mob-menu-open");
    // re-open menu for a clean shot
    const open = page.getByRole("button", { name: /open menu/i });
    if (await open.isVisible()) {
      await open.click();
      await page.waitForTimeout(250);
      await firstViewportShot(page, "mob-nav");
      await page.keyboard.press("Escape").catch(() => {});
      await page
        .locator("body")
        .click({ position: { x: 360, y: 20 } })
        .catch(() => {});
    }

    const mobileFocus = [
      ["/app", "command"],
      ["/app/phases", "phases"],
      ["/app/projects", "projects"],
      ["/app/approvals", "approvals"],
      ["/app/controls", "controls"],
      ["/app/changes", "changes"],
      ["/app/site", "site"],
      ["/app/capital", "capital"],
      ["/app/sales", "sales"],
    ];
    for (const [path, slug] of mobileFocus) {
      await gotoPath(page, path);
      const meta = await collectPage(page, `mob-${slug}`);
      meta.path = path;
      meta.viewport = "390x844";
      if (meta.overflow) logUx(`mob:${slug}`, "p2", "Horizontal overflow on mobile.");
      report.screens.push(meta);
      await shot(page, `mob-${slug}`);
      await firstViewportShot(page, `mob-${slug}-fold`);
    }

    // project detail on phone
    await gotoPath(page, "/app/projects");
    const link = page
      .getByRole("link", { name: /Kanakpura Residences|Mansarovar|Baggad/i })
      .first();
    if (await link.count()) {
      await link.click();
      await page.waitForTimeout(400);
      const meta = await collectPage(page, "mob-project-detail");
      if (meta.overflow)
        logUx("mob:project-detail", "p2", "Horizontal overflow on project detail.");
      await shot(page, "mob-project-detail");
    }
    await context.close();
  }

  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        ok: true,
        home: report.home,
        navCount: report.nav.desktop.length,
        leaks: report.leaks,
        isolation: report.isolation,
        actions: report.actions.map((a) => ({ name: a.name, ok: a.ok, ...a })),
        ux: report.ux,
        pageErrors: report.pageErrors,
        console: report.console.slice(0, 20),
        screens: report.screens.map((s) => ({
          path: s.path,
          h1: s.h1,
          overflow: s.overflow,
          findMs: s.findMs,
        })),
      },
      null,
      2,
    ),
  );
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
