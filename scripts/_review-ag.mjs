#!/usr/bin/env node
/**
 * Channel agent (Pink City) UX review — V. Meena, mobile-first.
 * Isolated Playwright context. Does not edit application source.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = process.env.ATLAS_URL || "http://127.0.0.1:8080";
const OUT = join(process.cwd(), "screenshots", "review", "ag");
mkdirSync(OUT, { recursive: true });

const FORBIDDEN = [
  { id: "desert-reach", re: /Desert Reach/i, why: "Other firm name" },
  { id: "mansar-stack", re: /Mansar C stack — other firm, must not leak to Pink City/i, why: "Desert Reach daily report notes" },
  { id: "c-512", re: /C-512/i, why: "Desert Reach hold unit" },
  { id: "l-bhati", re: /L\. Bhati/i, why: "Desert Reach hold customer" },
  { id: "shekhawat", re: /Shekhawat/i, why: "Desert Reach agent" },
];
const EXPECTED = [
  { id: "s-12", re: /S-12/i, why: "Pink City hold unit" },
  { id: "r-soni", re: /R\. Soni/i, why: "Pink City hold customer" },
  { id: "pink-city", re: /Pink City/i, why: "Own firm" },
];

const DENIED = [
  ["/app/sales/company", "company"],
  ["/app/sales/pipeline", "pipeline"],
  ["/app/sales/handover", "handover"],
  ["/app/sales/people", "people"],
  ["/app/sales/analytics", "analytics"],
  ["/app/finance", "finance"],
];

const PHASE_LEAKS = [
  ["/app/crm", "crm"],
  ["/app/org", "org"],
  ["/app/documents", "documents"],
  ["/app/land", "land"],
  ["/app/site", "site"],
  ["/app/changes", "changes"],
];

const report = {
  seat: "Channel agent (Pink City)",
  email: "ag@atlas.local",
  at: new Date().toISOString(),
  live: false,
  taps: {},
  isolation: [],
  deepLinks: [],
  ux: [],
  nav: {},
  actions: [],
  ratings: {},
  errors: [],
};

function leakScan(text, screen) {
  const hits = [];
  for (const f of FORBIDDEN) {
    if (f.re.test(text)) hits.push({ screen, id: f.id, why: f.why, severity: "must-fix" });
  }
  const missing = [];
  for (const e of EXPECTED) {
    if (!e.re.test(text)) missing.push({ screen, id: e.id, why: e.why });
  }
  return { hits, missing };
}

async function metrics(page, screen) {
  return page.evaluate((screenName) => {
    const notes = [];
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const overflow = document.documentElement.scrollWidth > vw + 8;
    if (overflow) notes.push({ screen: screenName, severity: "p2", issue: `Horizontal overflow (${document.documentElement.scrollWidth} vs ${vw}).` });

    const header = document.querySelector("header.sticky, .lg\\:pl-60 > header, header");
    const headerH = header ? header.getBoundingClientRect().height : 0;
    const selects = [...document.querySelectorAll("header select")].map((el) => {
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), text: (el.selectedOptions[0]?.textContent || "").trim() };
    });
    const localChip = document.querySelector("header")?.innerText || "";
    const localFull = /Local only/i.test(localChip);
    const localShort = /\bLocal\b/i.test(localChip) && !/Local only/i.test(localChip);

    const small = [];
    for (const el of document.querySelectorAll("button, a, [role='button'], select, input")) {
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) continue;
      if (r.height < 44 || (el.tagName === "BUTTON" && r.width < 44 && r.height < 44)) {
        small.push({
          tag: el.tagName,
          text: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 40),
          w: Math.round(r.width),
          h: Math.round(r.height),
        });
      }
    }

    const hamburger = document.querySelector('button[aria-label="Open menu"]');
    const ham = hamburger ? hamburger.getBoundingClientRect() : null;

    const fields = [...document.querySelectorAll("label")].map((l) => (l.querySelector("span")?.textContent || l.textContent || "").trim().slice(0, 40));

    return {
      screen: screenName,
      vw,
      vh,
      overflow,
      headerH: Math.round(headerH),
      selects,
      localFull,
      localShort,
      localChip: localChip.replace(/\s+/g, " ").trim().slice(0, 160),
      smallTargets: small.slice(0, 12),
      hamburger: ham ? { x: Math.round(ham.x), y: Math.round(ham.y), w: Math.round(ham.width), h: Math.round(ham.height) } : null,
      fieldLabels: fields.slice(0, 20),
      title: document.querySelector("h1")?.textContent?.trim() || "",
      notes,
    };
  }, screen);
}

async function shot(page, name) {
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
}

async function shotViewport(page, name) {
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false });
}

async function login(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith("atlas3-")) localStorage.removeItem(k);
    }
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("Local test accounts").waitFor({ timeout: 20000 });
  await page.waitForTimeout(400);
  const seat = page.getByRole("button", { name: "Channel agent (Pink City)" });
  await seat.scrollIntoViewIfNeeded();
  await seat.click();
  await page.getByRole("button", { name: /enter local atlas/i }).click();
  await page.waitForURL(/\/app/, { timeout: 25000 });
  await page.locator("h1").first().waitFor({ timeout: 15000 });
}

async function gotoPath(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.locator("h1").first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(250);
}

async function bodyText(page) {
  return page.locator("body").innerText();
}

async function scan(page, screen, expectOwn = false) {
  const text = await bodyText(page);
  const { hits, missing } = leakScan(text, screen);
  for (const h of hits) report.isolation.push(h);
  if (expectOwn) {
    for (const m of missing) {
      report.isolation.push({ ...m, severity: "p2", issue: `Expected ${m.why} missing on ${screen}` });
    }
  }
  return text;
}

async function main() {
  let serverOk = false;
  try {
    const r = await fetch(BASE, { signal: AbortSignal.timeout(15000) });
    serverOk = r.ok || r.status === 200;
  } catch {
    serverOk = false;
  }
  if (!serverOk) {
    console.error(JSON.stringify({ ok: false, error: `Atlas is not running at ${BASE}` }));
    process.exit(2);
  }

  const browser = await chromium.launch({ headless: true });

  // ── Mobile 390×844 (primary) ──────────────────────────────────────────
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  const page = await mobile.newPage();
  page.on("pageerror", (e) => report.errors.push(`mobile: ${e.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") report.errors.push(`mobile console: ${msg.text()}`);
  });

  // Login
  const tLogin = Date.now();
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith("atlas3-")) localStorage.removeItem(k);
    }
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("Local test accounts").waitFor({ timeout: 20000 });
  await shot(page, "m00-login");
  const loginOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 8);
  if (loginOverflow) report.ux.push({ screen: "login", severity: "p2", issue: "Login roster table overflows 390px (min-w 420)." });
  const seat = page.getByRole("button", { name: "Channel agent (Pink City)" });
  await seat.scrollIntoViewIfNeeded();
  await seat.click();
  await shotViewport(page, "m00-login-seat-filled");
  await page.getByRole("button", { name: /enter local atlas/i }).click();
  await page.waitForURL(/\/app/, { timeout: 25000 });
  await page.locator("h1").first().waitFor({ timeout: 15000 });
  report.taps.login = { taps: 2, ms: Date.now() - tLogin, note: "Seat chip + Enter local Atlas (password filled by seat)." };

  const homeUrl = new URL(page.url()).pathname;
  report.nav.home = homeUrl;
  if (homeUrl !== "/app/sales/channel") {
    report.ux.push({ screen: "home", severity: "p1", issue: `Expected land on /app/sales/channel, got ${homeUrl}` });
  }

  // Channel desk
  await page.waitForTimeout(400);
  await shot(page, "m01-channel-desk");
  await shotViewport(page, "m01-channel-desk-fold");
  const mChannel = await metrics(page, "channel-desk");
  report.ux.push(...mChannel.notes);
  report.nav.channelMetrics = mChannel;
  const chText = await scan(page, "channel-desk", true);
  if (!/Mandatory daily activity report/i.test(chText)) {
    report.ux.push({ screen: "channel-desk", severity: "p2", issue: "Gate banner for unfiled report not visible (or already filed)." });
  }
  if (mChannel.localShort) {
    report.ux.push({
      screen: "header",
      severity: "must-fix",
      issue: "Header chip shows 'Local' not 'Local only' at 390px — DESIGN.md forbids hiding Local only on a phone.",
    });
  }
  if (mChannel.selects.some((s) => s.w < 140)) {
    report.ux.push({
      screen: "header",
      severity: "p1",
      issue: `Entity/project dropdowns eat the header and truncate (${mChannel.selects.map((s) => `${s.text} ${s.w}px`).join("; ")}).`,
    });
  }
  if (mChannel.headerH > 64) {
    report.ux.push({ screen: "header", severity: "p2", issue: `Sticky header is ${mChannel.headerH}px — covers primary CTA when scrolling.` });
  }

  const dailyFields = ["Calls", "Site visits", "Leads worked", "Holds", "Bookings", "Cancellations", "Notes"];
  const presentFields = dailyFields.filter((f) => chText.includes(f) || mChannel.fieldLabels.some((l) => l.includes(f)));
  report.taps.dailyReportFields = presentFields;
  if (presentFields.length > 4) {
    report.ux.push({
      screen: "channel-desk",
      severity: "p1",
      issue: `Daily report asks ${presentFields.length} fields on a site seat (DESIGN: few fields, ~48px primary).`,
    });
  }

  // Attempt hold BEFORE filing report
  const tHoldBlocked = Date.now();
  await page.getByLabel("Customer").fill("Walk-in Sharma");
  await page.getByRole("button", { name: /place hold/i }).click();
  await page.waitForTimeout(500);
  const blockedToast = await page.locator("[data-sonner-toast], li[data-sonner-toast], [class*='sonner']").allInnerTexts().catch(() => []);
  const blockedBody = await bodyText(page);
  const blockedOk =
    /File today’s daily report|File today's daily report|hold is refused|before placing a hold/i.test(blockedBody) ||
    blockedToast.some((t) => /daily report|hold/i.test(t));
  report.actions.push({
    name: "hold-before-report",
    ok: blockedOk,
    ms: Date.now() - tHoldBlocked,
    toast: blockedToast,
    note: blockedOk ? "Hold correctly refused until daily report." : "Hold may have succeeded without today’s report.",
  });
  await shot(page, "m02-hold-refused");

  // File today's daily report — count taps from current screen
  const tReport = Date.now();
  let reportTaps = 0;
  const calls = page.getByLabel("Calls");
  await calls.click();
  reportTaps += 1;
  await calls.fill("11");
  const visits = page.getByLabel("Site visits");
  await visits.click();
  reportTaps += 1;
  await visits.fill("2");
  await page.getByLabel("Leads worked").fill("3");
  reportTaps += 1;
  await page.getByLabel("Notes").fill("Tower A west stack — cabin walk-in.");
  reportTaps += 1;
  await page.getByRole("button", { name: /file daily report/i }).click();
  reportTaps += 1;
  await page.waitForTimeout(600);
  report.taps.fileDailyReport = {
    taps: reportTaps,
    ms: Date.now() - tReport,
    note: "Already on Channel desk. Four field taps + File. Defaults exist so best-case is 1 tap.",
    bestCaseTaps: 1,
  };
  await shot(page, "m03-report-filed");
  const afterReport = await bodyText(page);
  report.actions.push({
    name: "file-daily-report",
    ok: /already filed|Daily report filed|V\. Meena/i.test(afterReport),
    textSnippet: afterReport.match(/2026-\d{2}-\d{2}[^\n]{0,80}/)?.[0],
  });
  if (/Mansar C stack/i.test(afterReport)) {
    report.isolation.push({ screen: "channel-desk-after-report", id: "mansar-stack", why: "Desert Reach notes in recent reports", severity: "must-fix" });
  }

  // Place hold on Tower A unit
  const tHold = Date.now();
  let holdTaps = 0;
  const unitSelect = page.locator("select").filter({ has: page.locator("option") }).nth(2);
  // Header has 2 selects; the hold unit select is in the form. Prefer label.
  const avail = page.getByLabel("Available unit");
  await avail.click();
  holdTaps += 1;
  const options = await avail.locator("option").allTextContents();
  report.nav.availableUnits = options;
  const towerA = options.find((o) => /^A-/.test(o.trim()) || /A-0802|A-0101/.test(o));
  if (towerA) {
    const val = await avail.locator("option", { hasText: towerA.trim().split("·")[0].trim() }).first().getAttribute("value");
    if (val) await avail.selectOption(val);
    holdTaps += 1;
  } else {
    report.ux.push({
      screen: "channel-desk",
      severity: "p1",
      issue: "Available-unit dropdown does not name Tower A — codes only (A-0802). Field agent cannot filter by tower.",
    });
  }
  await page.getByLabel("Customer").fill("Walk-in Sharma");
  holdTaps += 1;
  await page.getByRole("button", { name: /place hold/i }).click();
  holdTaps += 1;
  await page.waitForTimeout(700);
  report.taps.placeHold = {
    taps: holdTaps,
    ms: Date.now() - tHold,
    note: "Select unit + customer field + Place hold. Date left as default (today).",
  };
  await shot(page, "m04-hold-placed");
  const afterHold = await bodyText(page);
  const holdOk = /Walk-in Sharma/i.test(afterHold) || /Unit locked on hold/i.test(afterHold);
  report.actions.push({ name: "place-hold", ok: holdOk, hasSoni: /R\. Soni/i.test(afterHold), hasSharma: /Walk-in Sharma/i.test(afterHold) });
  await scan(page, "channel-desk-after-hold", true);
  if (!/until \d{4}-\d{2}-\d{2}/i.test(afterHold) === false) {
    /* countdown missing regardless */
  }
  if (!/hour|hrs|expires in|countdown/i.test(afterHold)) {
    report.ux.push({
      screen: "channel-desk",
      severity: "p1",
      issue: "Hold expiry is a date string, not a countdown. Cabin agent cannot see how many hours remain.",
    });
  }
  if (!/my holds/i.test(afterHold)) {
    report.ux.push({
      screen: "channel-desk",
      severity: "p2",
      issue: "No 'my holds only' filter — firm holds mix with own (S. Qureshi would appear here).",
    });
  }

  // Hamburger nav
  await page.getByRole("button", { name: /open menu/i }).click();
  await page.waitForTimeout(300);
  await shotViewport(page, "m05-hamburger");
  const menuText = await page.locator(".fixed.inset-0, [class*='fixed']").first().innerText().catch(() => "");
  const drawer = await page.locator("text=Channel desk").first().innerText().catch(() => "");
  const navBody = (await bodyText(page)) + "\n" + menuText + "\n" + drawer;
  report.nav.mobileMenu = navBody.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 40);
  const forbiddenNav = ["Channel firm", "Pipeline", "Handover", "Customer 360", "Sales analytics", "Tally", "Inbound"];
  for (const label of forbiddenNav) {
    const inMenu = new RegExp(`^${label}$`, "m").test(menuText) || report.nav.mobileMenu.includes(label);
    report.nav[`menuHas:${label}`] = inMenu;
    if (inMenu) {
      report.isolation.push({ screen: "hamburger", id: "nav-leak", why: `Nav shows ${label}`, severity: "must-fix" });
    }
  }
  const allowedNav = ["Command", "All phases", "Projects", "Sales", "Inventory", "Channel desk", "WhatsApp", "Audit"];
  report.nav.allowedPresent = allowedNav.filter((l) => navBody.includes(l));
  await page.keyboard.press("Escape").catch(() => {});
  const overlay = page.locator("div.fixed.inset-0.z-40");
  if (await overlay.isVisible().catch(() => false)) {
    await overlay.click({ position: { x: 360, y: 40 }, force: true }).catch(() => {});
  }
  await page.waitForTimeout(300);

  // Inventory — find Tower A
  const tInv = Date.now();
  let invTaps = 0;
  await page.getByRole("button", { name: /open menu/i }).click();
  invTaps += 1;
  await page.waitForTimeout(200);
  await page.getByRole("link", { name: /^Inventory$/ }).click();
  invTaps += 1;
  await page.locator("h1").first().waitFor({ timeout: 10000 });
  await page.waitForTimeout(300);
  report.taps.findTowerA = {
    taps: invTaps,
    ms: Date.now() - tInv,
    note: "Hamburger + Inventory. No tower filter. Table min-width 640px.",
  };
  await shot(page, "m06-inventory");
  await shotViewport(page, "m06-inventory-fold");
  const invText = await scan(page, "inventory");
  const mInv = await metrics(page, "inventory");
  report.ux.push(...mInv.notes);
  report.nav.inventoryMetrics = mInv;
  const hasTowerA = /Tower A|A-0802|A-0101/i.test(invText);
  const hasC512 = /C-512/i.test(invText);
  const hasS12 = /S-12/i.test(invText);
  report.actions.push({
    name: "inventory-tower-a",
    ok: hasTowerA,
    hasC512,
    hasS12,
    hasWhatsAppShare: /WhatsApp|Share/i.test(invText) && /unit/i.test(invText),
  });
  if (hasC512) {
    report.isolation.push({ screen: "inventory", id: "c-512", why: "Desert Reach unit visible", severity: "must-fix" });
  }
  if (!hasS12) {
    report.isolation.push({ screen: "inventory", id: "s-12", why: "Own hold S-12 missing", severity: "p1" });
  }
  if (!/WhatsApp|Share unit|Copy link/i.test(invText)) {
    report.ux.push({
      screen: "inventory",
      severity: "p1",
      issue: "No WhatsApp share / send unit card from inventory. Cabin agent must leave this screen.",
    });
  }
  if (!/filter|Tower A|search/i.test(invText.split("\n").slice(0, 12).join(" "))) {
    report.ux.push({
      screen: "inventory",
      severity: "p1",
      issue: "No tower / available / my-holds filter. Finding Tower A is a horizontal-scroll hunt in a 640px table.",
    });
  }

  // Sales command
  await gotoPath(page, "/app/sales");
  await shot(page, "m07-sales");
  const salesText = await scan(page, "sales");
  const mSales = await metrics(page, "sales");
  report.ux.push(...mSales.notes);
  if (/Pipeline|Sales analytics|Handover/i.test(salesText) && /In-house|Both desks/i.test(salesText)) {
    report.isolation.push({ screen: "sales", id: "in-house-modules", why: "In-house module cards shown to channel agent", severity: "p1" });
  }

  // WhatsApp
  await gotoPath(page, "/app/sales/whatsapp");
  await shot(page, "m08-whatsapp");
  const waText = await scan(page, "whatsapp");
  const mWa = await metrics(page, "whatsapp");
  report.ux.push(...mWa.notes);
  report.actions.push({
    name: "whatsapp",
    hasThread: /Thread/i.test(waText),
    hasMarketing: /channel_broadcast|new_launch|promotional/i.test(waText),
    hasUtility: /site_visit_confirm|utility/i.test(waText),
    hasShareUnit: /share unit|brochure/i.test(waText),
  });
  if (/channel_broadcast|new_launch/i.test(waText)) {
    report.ux.push({ screen: "whatsapp", severity: "p2", issue: "Marketing templates visible to field agent (code intends utility-only)." });
  }
  const leadSelect = page.locator("select").last();
  const leadOpts = await leadSelect.locator("option").allTextContents().catch(() => []);
  report.nav.whatsappLeads = leadOpts;
  if (leadOpts.some((o) => /Shekhawat|Bhati/i.test(o))) {
    report.isolation.push({ screen: "whatsapp", id: "wa-lead-leak", why: "Other-firm lead in WhatsApp picker", severity: "must-fix" });
  }
  if (await page.getByRole("button", { name: /send \(log\)/i }).first().isVisible().catch(() => false)) {
    await page.getByRole("button", { name: /send \(log\)/i }).first().click();
    await page.waitForTimeout(400);
    await shot(page, "m08-whatsapp-sent");
  }

  // Command / phases / projects / audit
  await gotoPath(page, "/app");
  await shot(page, "m09-command");
  const cmdText = await scan(page, "command");
  const mCmd = await metrics(page, "command");
  report.ux.push(...mCmd.notes);
  if (/Failed inspection|Open NCR|statutory|Spent vs budget|Tally/i.test(cmdText)) {
    report.ux.push({
      screen: "command",
      severity: "p1",
      issue: "Command still shows developer programme / exceptions (inspections, NCR, statutory) to a field agent.",
    });
  }

  await gotoPath(page, "/app/phases");
  await shot(page, "m10-phases");
  const phText = await scan(page, "phases");
  if (/Tally|Land & legal|Site & quality/i.test(phText)) {
    report.ux.push({
      screen: "phases",
      severity: "p1",
      issue: "All phases lists Tally / land / site modules with live links — channel agent can walk into other desks.",
    });
  }

  await gotoPath(page, "/app/projects");
  await shot(page, "m11-projects");
  const prText = await scan(page, "projects");
  const mPr = await metrics(page, "projects");
  report.ux.push(...mPr.notes);
  if (/₹|budget|spent/i.test(prText)) {
    report.ux.push({
      screen: "projects",
      severity: "p2",
      issue: "Projects page shows budget/spend to a channel agent who does not need cost.",
    });
  }

  await gotoPath(page, "/app/audit");
  await shot(page, "m12-audit");
  await scan(page, "audit");

  // Deep-link denied modules
  for (const [path, name] of DENIED) {
    await gotoPath(page, path);
    await page.waitForTimeout(250);
    const url = new URL(page.url()).pathname;
    const text = await bodyText(page);
    const { hits } = leakScan(text, path);
    for (const h of hits) report.isolation.push(h);
    await shot(page, `m13-deny-${name}`);
    report.deepLinks.push({
      path,
      landed: url,
      redirected: url !== path,
      title: (await page.locator("h1").textContent().catch(() => ""))?.trim(),
      leakHits: hits.map((h) => h.id),
      snippet: text.replace(/\s+/g, " ").trim().slice(0, 220),
    });
  }

  // Extra leak surfaces reachable from All phases
  for (const [path, name] of PHASE_LEAKS) {
    await gotoPath(page, path);
    const url = new URL(page.url()).pathname;
    const text = await bodyText(page);
    const { hits } = leakScan(text, path);
    for (const h of hits) report.isolation.push(h);
    const partnersLeak = /Desert Reach/i.test(text);
    await shot(page, `m14-phase-${name}`);
    report.deepLinks.push({
      path,
      landed: url,
      redirected: url !== path,
      via: "all-phases",
      leakHits: hits.map((h) => h.id),
      desertReach: partnersLeak,
      snippet: text.replace(/\s+/g, " ").trim().slice(0, 220),
    });
    if (partnersLeak) {
      report.isolation.push({ screen: path, id: "desert-reach", why: "Desert Reach visible via All phases deep link", severity: "must-fix" });
    }
  }

  // Header entity switch — does Mansarovar appear?
  await gotoPath(page, "/app/sales/channel");
  const entitySelect = page.locator("header select").first();
  const entityOpts = await entitySelect.locator("option").allTextContents();
  report.nav.entities = entityOpts;
  await entitySelect.selectOption({ label: /Aravalli/i }).catch(async () => {
    const vals = await entitySelect.locator("option").allTextContents();
    if (vals[1]) await entitySelect.selectOption({ index: 1 }).catch(() => {});
  });
  await page.waitForTimeout(300);
  await shot(page, "m15-entity-switch");
  const switched = await bodyText(page);
  const projectOpts = await page.locator("header select").nth(1).locator("option").allTextContents();
  report.nav.projectsAfterSwitch = projectOpts;
  if (projectOpts.some((o) => /Mansarovar/i.test(o))) {
    report.ux.push({
      screen: "header",
      severity: "p2",
      issue: "Entity switch reveals Mansarovar Enclave in project picker — irrelevant and adjacent to the other firm’s stack.",
    });
  }
  await scan(page, "channel-after-entity-switch", true);
  if (/Mansar C stack|L\. Bhati|C-512|Shekhawat/i.test(switched)) {
    report.isolation.push({ screen: "entity-switch", id: "scope-break", why: "Switching entity leaked Desert Reach hold/report", severity: "must-fix" });
  }

  // Thumb-zone / one-hand notes
  report.ux.push({
    screen: "shell",
    severity: "p1",
    issue: `Hamburger is top-left (${mChannel.hamburger ? `${mChannel.hamburger.w}×${mChannel.hamburger.h} at x=${mChannel.hamburger.x},y=${mChannel.hamburger.y}` : "missing"}) — opposite the right-thumb zone in a site cabin.`,
  });

  await mobile.close();

  // ── Desktop 1280×800 (secondary) ──────────────────────────────────────
  const desk = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const dpage = await desk.newPage();
  dpage.on("pageerror", (e) => report.errors.push(`desktop: ${e.message}`));
  await login(dpage);
  await dpage.waitForTimeout(400);
  await shot(dpage, "d01-channel-desk");
  const dCh = await scan(dpage, "desktop-channel", true);
  const dMet = await metrics(dpage, "desktop-channel");
  report.ux.push(...dMet.notes);
  report.nav.desktopChannelMetrics = dMet;
  const aside = await dpage.locator("aside nav").innerText().catch(() => "");
  report.nav.desktop = aside.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const label of ["Channel firm", "Pipeline", "Handover", "Customer 360", "Sales analytics", "Tally"]) {
    if (new RegExp(label, "i").test(aside)) {
      report.isolation.push({ screen: "desktop-nav", id: "nav-leak", why: `Desktop nav shows ${label}`, severity: "must-fix" });
    }
  }

  await gotoPath(dpage, "/app/sales/inventory");
  await shot(dpage, "d02-inventory");
  await scan(dpage, "desktop-inventory");
  await gotoPath(dpage, "/app/sales/whatsapp");
  await shot(dpage, "d03-whatsapp");
  await gotoPath(dpage, "/app/sales/company");
  await shot(dpage, "d04-deny-company");
  report.deepLinks.push({ path: "/app/sales/company", landed: new URL(dpage.url()).pathname, viewport: "1280x800" });
  await gotoPath(dpage, "/app/crm");
  const crmDesk = await bodyText(dpage);
  await shot(dpage, "d05-crm-leak");
  if (/Desert Reach/i.test(crmDesk)) {
    report.isolation.push({ screen: "desktop-crm", id: "desert-reach", why: "CRM partner list names Desert Reach", severity: "must-fix" });
  }

  await desk.close();
  await browser.close();

  report.isolation = [...new Map(report.isolation.map((x) => [JSON.stringify(x), x])).values()];
  const jsonPath = join(OUT, "report.json");
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        ok: true,
        shots: OUT,
        isolationHits: report.isolation.filter((i) => i.severity === "must-fix").length,
        ux: report.ux.length,
        taps: report.taps,
        errors: report.errors.length,
        report: jsonPath,
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
