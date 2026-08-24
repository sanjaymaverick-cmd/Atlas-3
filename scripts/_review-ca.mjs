#!/usr/bin/env node
/**
 * Channel company admin (ca@atlas.local) UX review.
 * Isolated Playwright context. Does not edit application source.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = process.env.ATLAS_URL || "http://127.0.0.1:8080";
const OUT = join(process.cwd(), "screenshots", "review", "ca");
mkdirSync(OUT, { recursive: true });

const LEAK =
  /Desert Reach|L\. Bhati|R\. Shekhawat|Shekhawat|C-512|Mansar C stack|pt3\b|08AADCD3300F1Z1/i;
const SHOULD = {
  agents: /V\. Meena|S\. Qureshi|K\. Pink/,
  hold: /S-12|R\. Soni/,
  firm: /Pink City/,
};

const ALLOWED = [
  ["/app", "command", /Are we on track|Available units|Your holds/i],
  ["/app/phases", "phases", /All phases/i],
  ["/app/projects", "projects", /Projects/i],
  ["/app/sales", "sales-hub", /Sales command|Channel desk|Pink City/i],
  ["/app/sales/inventory", "inventory", /Available to hold|Inventory/i],
  ["/app/sales/channel", "channel-desk", /Daily report|Hold a unit|Live holds/i],
  ["/app/sales/company", "company", /Pink City Channel|Invite agent/i],
  ["/app/sales/whatsapp", "whatsapp", /WhatsApp|Templates/i],
  ["/app/audit", "audit", /Audit trail/i],
];

const FORBIDDEN = [
  ["/app/sales/pipeline", "deny-pipeline"],
  ["/app/sales/handover", "deny-handover"],
  ["/app/sales/people", "deny-people"],
  ["/app/sales/analytics", "deny-analytics"],
  ["/app/finance", "deny-finance"],
];

const SIDE_DOORS = [
  ["/app/crm", "leak-crm"],
  ["/app/org", "leak-org"],
  ["/app/customers", "leak-customers"],
  ["/app/land", "leak-land"],
  ["/app/documents", "leak-documents"],
  ["/app/site", "leak-site"],
  ["/app/commercial", "leak-commercial"],
];

function leakHits(text) {
  const hits = [];
  const checks = [
    ["Desert Reach", /Desert Reach/i],
    ["L. Bhati", /L\. Bhati/i],
    ["R. Shekhawat / Shekhawat", /Shekhawat/i],
    ["C-512", /C-512/i],
    ["Mansar C stack note", /Mansar C stack/i],
    ["Desert GSTIN", /08AADCD3300F1Z1/i],
  ];
  for (const [label, re] of checks) {
    if (re.test(text)) hits.push(label);
  }
  return hits;
}

async function login(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.evaluate(() => {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
    for (const k of keys) {
      if (k && k.startsWith("atlas3")) localStorage.removeItem(k);
    }
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("Local test accounts").waitFor({ timeout: 20000 });
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "Pink City company admin" }).click();
  await page.getByRole("button", { name: /enter local atlas/i }).click();
  await page.getByRole("button", { name: /end session/i }).waitFor({ timeout: 25000 });
}

async function shot(page, name) {
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
}

async function snapshot(page, screen) {
  const started = Date.now();
  await page.waitForTimeout(250);
  const findMs = Date.now() - started;
  const url = page.url();
  const path = new URL(url).pathname;
  const title = await page.locator("h1").first().innerText().catch(() => "");
  const body = await page.locator("main").innerText().catch(() => "");
  const nav = await page.locator("aside nav").innerText().catch(() => "");
  const header = await page.locator("header").innerText().catch(() => "");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 8,
  );
  const jade = await page.locator("main button").evaluateAll((btns) => {
    const isJade = (el) => {
      const s = getComputedStyle(el);
      const bg = s.backgroundColor;
      return bg.includes("29, 79, 66") || bg.includes("31, 79") || /1d4f42/i.test(bg);
    };
    return btns.filter((b) => isJade(b) && b.offsetParent).length;
  });
  return {
    screen,
    path,
    url,
    title,
    findMs,
    overflow,
    jadePrimaries: jade,
    leak: leakHits(`${body}\n${nav}\n${header}`),
    hasMeena: /V\. Meena/.test(body),
    hasQureshi: /S\. Qureshi/.test(body),
    hasPink: /K\. Pink/.test(body),
    hasSoni: /R\. Soni/.test(body),
    hasS12: /S-12/.test(body),
    hasC512: /C-512/.test(body),
    hasDesert: /Desert Reach/.test(body),
    hasMansarNote: /Mansar C stack/.test(body),
    hasShekhawat: /Shekhawat/.test(body),
    hasBhati: /L\. Bhati/.test(body),
    bodyPreview: body.slice(0, 1800),
    nav: nav.split("\n").map((s) => s.trim()).filter(Boolean),
  };
}

async function gotoWait(page, path) {
  const t0 = Date.now();
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(450);
  return Date.now() - t0;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const report = {
    role: "channel_admin",
    email: "ca@atlas.local",
    at: new Date().toISOString(),
    screens: [],
    actions: [],
    isolation: [],
    consoleErrors: [],
    pageErrors: [],
  };

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  page.on("pageerror", (e) => report.pageErrors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") report.consoleErrors.push(msg.text());
  });

  await login(page);
  const homePath = new URL(page.url()).pathname;
  report.actions.push({ name: "login-home", path: homePath, expected: "/app/sales/company" });
  await shot(page, "00-home-company");
  const homeSnap = await snapshot(page, "home");
  report.screens.push(homeSnap);

  const navText = await page.locator("aside nav").innerText();
  report.navDesktop = navText.split("\n").map((s) => s.trim()).filter(Boolean);
  const unexpectedNav = ["Pipeline", "Handover", "Customer 360", "Sales analytics", "Inbound", "Tally", "Approvals", "CRM", "Customers"];
  report.navLeaks = unexpectedNav.filter((n) => navText.includes(n));

  for (const [path, name, needle] of ALLOWED) {
    const ms = await gotoWait(page, path);
    const snap = await snapshot(page, name);
    snap.navMs = ms;
    snap.needle = needle.test(`${snap.title}\n${snap.bodyPreview}`);
    await shot(page, `d-${name}`);
    report.screens.push(snap);
    if (snap.leak.length) {
      report.isolation.push({ severity: "p0", screen: path, hits: snap.leak });
    }
  }

  // Entity / project dropdowns
  await gotoWait(page, "/app/sales/company");
  const entitySelect = page.locator("header select").first();
  const projectSelect = page.locator("header select").nth(1);
  const entityOptions = await entitySelect.locator("option").allInnerTexts();
  const projectOptions = await projectSelect.locator("option").allInnerTexts();
  report.header = { entityOptions, projectOptions };
  await entitySelect.selectOption({ label: "Aravalli Homes Pvt Ltd" });
  await page.waitForTimeout(400);
  await shot(page, "d-company-aravalli");
  const afterEntityCompany = await snapshot(page, "company-after-entity");
  report.screens.push(afterEntityCompany);
  if (afterEntityCompany.leak.length) {
    report.isolation.push({
      severity: "p0",
      screen: "/app/sales/company after entity switch",
      hits: afterEntityCompany.leak,
    });
  }

  await gotoWait(page, "/app/sales/channel");
  const afterEntityChannel = await snapshot(page, "channel-after-entity");
  report.screens.push(afterEntityChannel);
  await shot(page, "d-channel-aravalli");
  if (afterEntityChannel.leak.length) {
    report.isolation.push({
      severity: "p0",
      screen: "/app/sales/channel after entity switch",
      hits: afterEntityChannel.leak,
    });
  }
  const holdsText = await page.locator("main").innerText();
  report.actions.push({
    name: "channel-holds-after-entity",
    hasSoni: /R\. Soni/.test(holdsText),
    hasBhati: /L\. Bhati/.test(holdsText),
    hasC512: /C-512/.test(holdsText),
  });

  await gotoWait(page, "/app");
  await shot(page, "d-command-aravalli");
  const cmdAravalli = await snapshot(page, "command-aravalli");
  report.screens.push(cmdAravalli);

  await gotoWait(page, "/app/projects");
  await shot(page, "d-projects-aravalli");
  const projAravalli = await snapshot(page, "projects-aravalli");
  report.screens.push(projAravalli);
  report.actions.push({
    name: "projects-aravalli-financials",
    showsMansarovar: /Mansarovar/.test(projAravalli.bodyPreview),
    showsBudget: /Budget|₹/.test(projAravalli.bodyPreview),
  });

  await entitySelect.selectOption({ label: "Kanakpura Developers LLP" });
  await page.waitForTimeout(300);

  // Forbidden deep links
  for (const [path, name] of FORBIDDEN) {
    await gotoWait(page, path);
    const snap = await snapshot(page, name);
    await shot(page, name);
    const blocked =
      snap.path !== path ||
      /does not post books|View only is not offered/i.test(snap.bodyPreview);
    snap.blocked = blocked || snap.path !== path;
    snap.requested = path;
    report.screens.push(snap);
    if (snap.leak.length) {
      report.isolation.push({ severity: "p0", screen: path, hits: snap.leak, blocked: snap.blocked });
    } else {
      report.isolation.push({
        severity: snap.path === path && !blocked ? "p1" : "info",
        screen: path,
        landed: snap.path,
        blocked: snap.blocked,
      });
    }
  }

  // Side-door pages reachable from All phases / typed URL
  for (const [path, name] of SIDE_DOORS) {
    await gotoWait(page, path);
    const snap = await snapshot(page, name);
    await shot(page, name);
    snap.requested = path;
    snap.stayed = snap.path === path;
    report.screens.push(snap);
    if (snap.stayed) {
      report.isolation.push({
        severity: snap.leak.length ? "p0" : "p1",
        screen: path,
        issue: snap.leak.length
          ? `Side door rendered and leaked: ${snap.leak.join(", ")}`
          : "Side door rendered (no Desert Reach strings, but unguarded developer desk)",
        hits: snap.leak,
      });
    }
  }

  // Phases click-through to CRM
  await gotoWait(page, "/app/phases");
  await page.getByText("Customers & CRM").click();
  await page.waitForTimeout(500);
  await shot(page, "leak-phases-crm");
  const phasesCrm = await snapshot(page, "phases-crm");
  report.screens.push(phasesCrm);
  report.isolation.push({
    severity: phasesCrm.leak.length ? "p0" : "p1",
    screen: "phases → Customers & CRM",
    landed: phasesCrm.path,
    hits: phasesCrm.leak,
  });

  // Real actions on channel desk + company
  await gotoWait(page, "/app/sales/company");
  await page.getByLabel("Agent name").fill("T. Review");
  await page.getByLabel("Phone").fill("90xxxx0199");
  await page.getByRole("button", { name: /invite agent/i }).click();
  await page.waitForTimeout(600);
  await shot(page, "d-company-invite");
  const afterInvite = await page.locator("main").innerText();
  report.actions.push({
    name: "invite-agent",
    visible: /T\. Review/.test(afterInvite),
    toastish: /invited|required/i.test(afterInvite),
  });

  await gotoWait(page, "/app/sales/channel");
  const agentSelect = page.locator("select").filter({ hasText: "K. Pink" }).first();
  const agentOptions = await page
    .locator("label")
    .filter({ hasText: /^Agent$/ })
    .locator("..")
    .locator("select option")
    .allInnerTexts()
    .catch(() => []);
  report.actions.push({ name: "channel-agent-options", agentOptions });

  // File daily report for K. Pink (default)
  await page.getByRole("button", { name: /file daily report/i }).click();
  await page.waitForTimeout(700);
  const afterFile = await page.locator("body").innerText();
  report.actions.push({
    name: "file-daily-report",
    toast: /Daily report filed|already filed/i.test(afterFile),
    bannerGone: !/Mandatory daily activity report/i.test(afterFile),
  });
  await shot(page, "d-channel-filed");

  // Place hold
  const customerInput = page.getByLabel("Customer");
  await customerInput.fill("Q. Pinkhold");
  await page.getByRole("button", { name: /place hold/i }).click();
  await page.waitForTimeout(800);
  const afterHold = await page.locator("main").innerText();
  report.actions.push({
    name: "place-hold",
    visible: /Q\. Pinkhold/.test(afterHold),
    refused: /File today’s daily report|refused/i.test(afterHold),
    liveHolds: /Q\. Pinkhold|R\. Soni/.test(afterHold),
  });
  await shot(page, "d-channel-hold");

  // Recent reports: notes visible?
  report.actions.push({
    name: "report-notes-visible",
    towerANote: /Tower A west stack/.test(afterHold),
    mansarNote: /Mansar C stack/.test(afterHold),
    reportsShowNotes: /west stack|Mansar C/.test(afterHold),
  });

  // Inventory search / C-512
  await gotoWait(page, "/app/sales/inventory");
  const inv = await page.locator("main").innerText();
  report.actions.push({
    name: "inventory-scan",
    hasC512: /C-512/.test(inv),
    hasS12: /S-12/.test(inv),
    hasAvailable: /A-0802|B-1104|P-204/.test(inv),
    searchField: (await page.locator("main input").count()) > 0,
  });
  await shot(page, "d-inventory-after-hold");

  // WhatsApp: lead list + log
  await gotoWait(page, "/app/sales/whatsapp");
  const wa = await page.locator("main").innerText();
  const waLeads = await page.locator("select option").allInnerTexts().catch(() => []);
  report.actions.push({
    name: "whatsapp",
    leads: waLeads,
    hasSaxena: /M\. Saxena/.test(wa),
    marketing: /channel_broadcast|new_launch/.test(wa),
    logUnscoped: /Log/.test(wa),
  });
  await shot(page, "d-whatsapp-leads");

  // Sales hub first-screen question
  await gotoWait(page, "/app/sales");
  await shot(page, "d-sales-hub-after");
  const hub = await snapshot(page, "sales-hub-after");
  report.screens.push(hub);

  // Mobile pass
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mpage = await mobile.newPage();
  mpage.on("pageerror", (e) => report.pageErrors.push(`mobile: ${e.message}`));
  await login(mpage);
  for (const [path, name] of [
    ["/app/sales/company", "m-company"],
    ["/app/sales/channel", "m-channel"],
    ["/app/sales/inventory", "m-inventory"],
    ["/app/sales", "m-sales"],
    ["/app", "m-command"],
    ["/app/sales/whatsapp", "m-whatsapp"],
  ]) {
    await mpage.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await mpage.locator("h1").first().waitFor({ timeout: 10000 });
    await mpage.waitForTimeout(300);
    await mpage.screenshot({ path: join(OUT, `${name}.png`) });
    const snap = await snapshot(mpage, name);
    report.screens.push(snap);
    if (snap.overflow) {
      report.actions.push({ name: "mobile-overflow", screen: path });
    }
  }

  await mpage.getByRole("button", { name: /open menu/i }).click();
  await mpage.waitForTimeout(300);
  await mpage.screenshot({ path: join(OUT, "m-nav.png") });
  const mobileNav = await mpage.locator(".fixed .space-y-1, [class*='bg-sidebar']").last().innerText().catch(() => "");
  report.navMobile = mobileNav.split("\n").map((s) => s.trim()).filter(Boolean);
  await mobile.close();

  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        ok: true,
        home: homePath,
        isolation: report.isolation,
        actions: report.actions,
        navLeaks: report.navLeaks,
        pageErrors: report.pageErrors,
        consoleErrors: report.consoleErrors.slice(0, 8),
        screens: report.screens.map((s) => ({
          screen: s.screen,
          path: s.path,
          leak: s.leak,
          title: s.title,
          overflow: s.overflow,
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
