#!/usr/bin/env node
/**
 * Sales Manager seat review (N. Bhatia · sm@atlas.local).
 * Isolated Playwright context. Does not mutate application source.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = process.env.ATLAS_URL || "http://127.0.0.1:8080";
const OUT = join(process.cwd(), "screenshots", "review", "sm");
mkdirSync(OUT, { recursive: true });

const ALLOWED_NAV = [
  "Command",
  "All phases",
  "Approvals",
  "Projects",
  "Customers",
  "CRM",
  "Sales",
  "Inventory",
  "Channel desk",
  "Channel firm",
  "Pipeline",
  "Handover",
  "Sales analytics",
  "Inbound",
  "WhatsApp",
  "Customer 360",
  "Audit",
  "Assistant",
];

const HIDDEN_NAV = [
  "Owners Hub",
  "Capital",
  "Test pack",
  "Organization",
  "Documents",
  "Land & legal",
  "Commercial",
  "Quotations",
  "Site & quality",
  "Controls",
  "Change control",
  "Tally",
  "Owner decisions",
];

const HIDDEN_PATHS = [
  ["/app/portfolio", "portfolio"],
  ["/app/capital", "capital"],
  ["/app/testing", "testing"],
  ["/app/org", "org"],
  ["/app/documents", "documents"],
  ["/app/land", "land"],
  ["/app/commercial", "commercial"],
  ["/app/quotations", "quotations"],
  ["/app/site", "site"],
  ["/app/controls", "controls"],
  ["/app/changes", "changes"],
  ["/app/finance", "finance"],
  ["/app/decisions", "decisions"],
];

const SCREENS = [
  ["/app", "command", /on track|what needs a decision/i],
  ["/app/phases", "phases", /all phases/i],
  ["/app/approvals", "approvals", /approvals/i],
  ["/app/projects", "projects", /projects/i],
  ["/app/projects/p_kanak", "project-kanak", /kanakpura/i],
  ["/app/customers", "customers", /customers/i],
  ["/app/crm", "crm", /leads & partners/i],
  ["/app/sales", "sales-hub", /third-party now|in-house next|sales command/i],
  ["/app/sales/inventory", "inventory", /source of truth|available to hold/i],
  ["/app/sales/channel", "channel", /daily report, then hold/i],
  ["/app/sales/company", "company", /channel firms|pink city/i],
  ["/app/sales/pipeline", "pipeline", /new → visit → book|ingest/i],
  ["/app/sales/handover", "handover", /oc, snags, possession/i],
  ["/app/sales/analytics", "analytics", /one funnel/i],
  ["/app/sales/integrations", "inbound", /live portal|inbound/i],
  ["/app/sales/whatsapp", "whatsapp", /templates, thread/i],
  ["/app/sales/people", "people", /one person, every desk|customer 360/i],
  ["/app/audit", "audit", /audit trail/i],
  ["/app/assistant", "assistant", /assistant|fail-closed|draft/i],
];

const findings = [];
const screens = [];
const consoleErrors = [];
const pageErrors = [];

function note(severity, screen, issue, evidence) {
  findings.push({ severity, screen, issue, evidence: evidence ?? "" });
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
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "Sales Manager" }).click();
  await page.getByRole("button", { name: /enter local atlas/i }).click();
  await page.getByRole("button", { name: /end session/i }).waitFor({ timeout: 25000 });
}

async function shot(page, name) {
  const path = join(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  return path;
}

async function ux(page, screen) {
  return page.evaluate((screenName) => {
    const notes = [];
    if (document.documentElement.scrollWidth > window.innerWidth + 8) {
      notes.push({ screen: screenName, issue: "Horizontal overflow on this viewport." });
    }
    const h1 = document.querySelector("h1");
    const title = h1?.textContent?.trim() ?? "";
    const jade = document.querySelectorAll("button.bg-primary, button[class*='bg-primary']");
    const buttons = Array.from(document.querySelectorAll("button")).map((b) => b.textContent?.trim()).filter(Boolean);
    const selects = document.querySelectorAll("select").length;
    const inputs = document.querySelectorAll("input, textarea").length;
    const search = Boolean(
      document.querySelector("input[type='search'], input[placeholder*='search' i], input[placeholder*='filter' i]"),
    );
    const text = document.body.innerText;
    return {
      title,
      overflow: document.documentElement.scrollWidth > window.innerWidth + 8,
      jadeButtons: jade.length,
      buttonCount: buttons.length,
      selectCount: selects,
      inputCount: inputs,
      hasSearch: search,
      charCount: text.length,
      hasDesertReach: /Desert Reach/i.test(text),
      hasPinkCity: /Pink City/i.test(text),
      hasMansar: /Mansar C stack/i.test(text),
      hasShekhawat: /Shekhawat/i.test(text),
      hasSoni: /R\. Soni/i.test(text),
      hasBhati: /L\. Bhati/i.test(text),
      hasTallyPost: /post.*tally|post voucher|settleTally|Reconcile/i.test(text),
      hasReconcile: /Reconcile/i.test(text),
      hasAcceptException: /Accept exception/i.test(text),
      textSample: text.slice(0, 1800),
      notes,
    };
  }, screen);
}

async function go(page, path, name, needle) {
  const t0 = Date.now();
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.locator("h1").first().waitFor({ timeout: 10000 }).catch(() => {});
  const findMs = Date.now() - t0;
  await page.waitForTimeout(350);
  const body = await page.locator("body").innerText();
  const shotPath = await shot(page, name);
  const stats = await ux(page, name);
  const hit = needle ? needle.test(body) : true;
  if (!hit) note("P1", name, `Expected copy missing (${needle})`, path);
  if (findMs > 10000) note("P1", name, `Took ${findMs}ms to find the screen (>10s)`, path);
  if (stats.overflow) note("P2", name, "Horizontal overflow", path);
  screens.push({
    path,
    name,
    findMs,
    title: stats.title,
    hit,
    url: page.url(),
    shot: shotPath,
    stats,
  });
  return { body, stats, findMs };
}

async function setEntity(page, label) {
  const entity = page.locator("header select").first();
  await entity.selectOption({ label: String(label) });
  await page.waitForTimeout(400);
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
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: "en-IN",
  });
  const page = await context.newPage();
  page.on("pageerror", (err) => pageErrors.push(String(err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await login(page);
  let homeUrl = page.url();
  let navFlat = [];
  let desertReportVisible = false;
  let shekhawatVisible = false;
  let desertHoldVisible = false;
  let pinkHoldVisible = false;
  const hiddenResults = [];

  try {
  homeUrl = page.url();
  if (!homeUrl.includes("/app/sales")) {
    note("P0", "login", `SM did not land on /app/sales, got ${homeUrl}`);
  }
  const session = await page.locator("body").innerText();
  if (!/N\. Bhatia/i.test(session)) note("P1", "login", "Seat name N. Bhatia not visible after login");
  if (!/Sales Manager/i.test(session)) note("P1", "login", "Title Sales Manager not visible");
  await shot(page, "00-login-home");

  const navLabels = await page.locator("aside nav a").allInnerTexts();
  navFlat = navLabels.map((s) => s.replace(/\d+$/, "").trim());
  for (const want of ALLOWED_NAV) {
    if (!navFlat.some((n) => n === want || n.startsWith(want))) {
      note("P1", "nav", `Allowed nav item missing: ${want}`, navFlat.join(" | "));
    }
  }
  for (const hide of HIDDEN_NAV) {
    if (navFlat.some((n) => n === hide || n.includes(hide))) {
      note("P0", "nav", `Hidden module visible in sidebar: ${hide}`, navFlat.join(" | "));
    }
  }

  // Walk every allowed screen on default entity (Kanakpura LLP).
  for (const [path, name, needle] of SCREENS) {
    await go(page, path, `d-${name}`, needle);
  }

  // --- Command / hub: 5-second questions ---
  await page.goto(`${BASE}/app/sales`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(300);
  const hub = await page.locator("body").innerText();
  if (!/hot/i.test(hub)) note("P1", "sales-hub", "Hub does not surface hot leads in the 5-second frame");
  if (!/hold/i.test(hub)) note("P2", "sales-hub", "Hub does not surface holds in the 5-second frame");
  if (/Mansar C stack/i.test(hub)) {
    /* unexpected on hub */
  }
  await shot(page, "d-sales-hub-detail");

  // --- Pipeline: ingest, assign, book controls ---
  await page.goto(`${BASE}/app/sales/pipeline`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  await shot(page, "d-pipeline-before");
  const nameField = page.locator("label").filter({ hasText: /^Name$/ }).locator("input");
  const phoneField = page.locator("label").filter({ hasText: /^Phone$/ }).locator("input");
  await nameField.fill("QA Review Lead");
  await phoneField.fill("99xxxx7701");
  await page.getByRole("button", { name: /ingest & score/i }).click();
  await page.waitForTimeout(700);
  const pipeAfter = await page.locator("body").innerText();
  if (!/QA Review Lead/i.test(pipeAfter)) note("P0", "pipeline", "Ingested lead not visible after Ingest & score");
  await shot(page, "d-pipeline-ingested");

  const assignGupta = page.getByLabel("Assign P. Gupta");
  if (await assignGupta.count()) {
    const opt = assignGupta.locator("option").filter({ hasText: "N. Bhatia" });
    const value = await opt.getAttribute("value");
    if (value) await assignGupta.selectOption(value);
    else await assignGupta.selectOption({ label: "N. Bhatia · in-house" }).catch(async () => {
      await assignGupta.selectOption({ index: 1 });
    });
    await page.waitForTimeout(400);
    await shot(page, "d-pipeline-assigned");
  } else {
    note("P1", "pipeline", "Assign control for unassigned lead P. Gupta not found");
  }

  // Duplicate CRM desk
  await page.goto(`${BASE}/app/crm`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(300);
  const crm = await page.locator("body").innerText();
  if (/Capture lead/i.test(crm) && /Advance/i.test(crm)) {
    note(
      "P1",
      "crm",
      "CRM is a second lead desk (Capture / Advance / Convert) parallel to Sales pipeline — SM has two places to work the same people.",
    );
  }
  await shot(page, "d-crm-duplicate-desk");

  // --- Channel desk default entity: reports vs holds ---
  await page.goto(`${BASE}/app/sales/channel`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  const chDefault = await ux(page, "channel-default");
  await shot(page, "d-channel-default-entity");
  if (!chDefault.hasMansar && !chDefault.hasShekhawat) {
    note(
      "P1",
      "channel",
      "On default Kanakpura entity, Desert Reach daily report (Mansar C stack / R. Shekhawat) is not in the first 1800 chars — check recent reports list.",
      chDefault.textSample.slice(-400),
    );
  }
  const chBody = await page.locator("body").innerText();
  desertReportVisible = /Mansar C stack — other firm, must not leak to Pink City/i.test(chBody);
  shekhawatVisible = /R\. Shekhawat/i.test(chBody);
  desertHoldVisible = /L\. Bhati/i.test(chBody);
  pinkHoldVisible = /R\. Soni/i.test(chBody);
  if (desertReportVisible || shekhawatVisible) {
    /* SM should see this */
  } else {
    note("P0", "channel", "Desert Reach daily report not visible to SM on default entity");
  }
  if (!pinkHoldVisible && !desertHoldVisible) {
    note(
      "P1",
      "channel",
      "Neither Pink City hold (R. Soni / Baggad) nor Desert Reach hold (L. Bhati / Mansar) visible — entity scope hides both live holds on default LLP entity.",
    );
  }

  // Switch to Aravalli Homes — both channel firms live on this entity.
  await setEntity(page, "Aravalli Homes Pvt Ltd");
  await page.goto(`${BASE}/app/sales/channel`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  const chHomes = await page.locator("body").innerText();
  await shot(page, "d-channel-aravalli");
  if (!/L\. Bhati/i.test(chHomes)) {
    note("P0", "channel", "After switching to Aravalli Homes, Desert Reach hold L. Bhati still missing");
  }
  if (!/R\. Soni/i.test(chHomes)) {
    note("P1", "channel", "After switching to Aravalli Homes, Pink City hold R. Soni missing");
  }
  if (!/Desert Reach/i.test(chHomes) && !/Shekhawat/i.test(chHomes)) {
    note("P1", "channel", "Desert Reach firm name / agent not labelled on live holds after entity switch");
  }
  if (!/Pink City/i.test(chHomes)) {
    note("P2", "channel", "Pink City firm name not labelled on live holds after entity switch");
  }

  // File today's report for first agent then hold + request booking.
  const reportedGate = /hold is refused until today’s report/i.test(chHomes);
  await page.getByRole("button", { name: /file daily report/i }).click();
  await page.waitForTimeout(500);
  const afterReport = await page.locator("[data-sonner-toast], li[data-sonner-toast]").first().innerText().catch(async () => page.locator("body").innerText());
  await shot(page, "d-channel-filed-report");

  const customer = page.getByLabel("Customer");
  await customer.fill("QA SM Hold");
  const until = page.getByLabel("Hold until");
  if (await until.count()) {
    await until.fill("2026-09-05");
  }
  await page.getByRole("button", { name: /place hold/i }).click();
  await page.waitForTimeout(700);
  const afterHold = await page.locator("body").innerText();
  const holdOk = /QA SM Hold/i.test(afterHold) || /locked on hold/i.test(afterHold);
  const holdRefused = /refused|already filed|report/i.test(afterHold);
  if (!holdOk && !holdRefused) note("P1", "channel", "Place hold produced no visible result");
  await shot(page, "d-channel-hold");

  const requestBtn = page.getByRole("button", { name: /request booking/i }).first();
  if (await requestBtn.count()) {
    await requestBtn.click();
    await page.waitForTimeout(700);
    await shot(page, "d-channel-book-request");
    const afterBook = await page.locator("body").innerText();
    if (!/Approvals|waiting/i.test(afterBook)) {
      note("P1", "channel", "Request booking did not mention Approvals queue");
    }
  } else {
    note("P2", "channel", "No Request booking button after hold attempt");
  }

  // Inventory on Aravalli — should show C-512 held, P-101 booked, etc.
  await page.goto(`${BASE}/app/sales/inventory`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  const invHomes = await page.locator("body").innerText();
  await shot(page, "d-inventory-aravalli");
  if (!/C-512|P-101|P-204|S-12/i.test(invHomes)) {
    note("P1", "inventory", "Aravalli inventory missing expected Mansar/Baggad units");
  }

  // Handover on Aravalli
  await page.goto(`${BASE}/app/sales/handover`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  const ho = await page.locator("body").innerText();
  await shot(page, "d-handover-aravalli");
  if (!/C-304/i.test(ho)) note("P1", "handover", "Mansar handover C-304 not visible on Aravalli entity");
  const closeSnag = page.getByRole("button", { name: /close snag/i }).first();
  if (await closeSnag.count()) {
    await closeSnag.click();
    await page.waitForTimeout(400);
    await shot(page, "d-handover-snag-closed");
  } else {
    note("P2", "handover", "No Close snag action on visible case");
  }
  const advance = page.getByRole("button", { name: /advance stage/i }).first();
  if (await advance.count()) {
    await advance.click();
    await page.waitForTimeout(400);
    await shot(page, "d-handover-advance");
  }

  // Analytics
  await page.goto(`${BASE}/app/sales/analytics`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  const an = await page.locator("body").innerText();
  await shot(page, "d-analytics-aravalli");
  if (!/Desert Reach|Shekhawat|Pink City|in-house/i.test(an)) {
    note("P1", "analytics", "Channel scorecard does not name both firms + in-house agents");
  }
  if (!/dead|0 calls|0 reports/i.test(an)) {
    /* A. Joshi / S. Qureshi may show 0 reports without being flagged */
  }
  if (!/Send for approval|Never self-pays|never pays/i.test(an)) {
    note("P2", "analytics", "Commission payout copy missing never-pays invariant");
  }
  const sendAppr = page.getByRole("button", { name: /send for approval/i }).first();
  if (await sendAppr.count()) {
    await sendAppr.click();
    await page.waitForTimeout(400);
    await shot(page, "d-analytics-commission");
  }

  // People 360
  await page.goto(`${BASE}/app/sales/people`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  await shot(page, "d-people-aravalli");
  const person = page.getByRole("button", { name: /S\. Bhargava|V\. Agarwal|G\. Singh|L\. Bhati|R\. Soni/i }).first();
  if (await person.count()) {
    await person.click();
    await page.waitForTimeout(400);
    await shot(page, "d-people-open");
  } else {
    const firstCard = page.locator("h1 ~ div button, main button").filter({ hasText: /\./ }).first();
    if (await firstCard.count()) {
      await firstCard.click();
      await page.waitForTimeout(400);
      await shot(page, "d-people-open");
    }
  }
  const peopleText = await page.locator("body").innerText();
  if (!/collected|snag|WhatsApp consent/i.test(peopleText)) {
    note("P2", "people", "Opened 360 missing collections / snag / consent");
  }

  // Inbound
  await setEntity(page, "Kanakpura Developers LLP");
  await page.goto(`${BASE}/app/sales/integrations`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  const inbound = await page.locator("body").innerText();
  await shot(page, "d-inbound-queued");
  if (!/99acres|T\. Verma/i.test(inbound)) {
    note("P1", "inbound", "Today’s portal dump (99acres T. Verma) not visible");
  }
  const applyBtn = page.getByRole("button", { name: /^Apply$/i }).first();
  if (await applyBtn.count()) {
    await applyBtn.click();
    await page.waitForTimeout(500);
    await shot(page, "d-inbound-applied");
  } else {
    note("P2", "inbound", "No Apply on queued inbound events");
  }
  const sample = page.getByRole("button", { name: /send sample/i }).first();
  if (await sample.count()) {
    await sample.click();
    await page.waitForTimeout(900);
    await shot(page, "d-inbound-sample");
  }

  // WhatsApp
  await page.goto(`${BASE}/app/sales/whatsapp`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  await shot(page, "d-whatsapp-thread");
  const receive = page.getByRole("button", { name: /receive reply/i });
  if (await receive.count()) {
    await receive.click();
    await page.waitForTimeout(400);
    await shot(page, "d-whatsapp-reply");
  }
  const sendLog = page.getByRole("button", { name: /send \(log\)/i }).first();
  if (await sendLog.count()) {
    await sendLog.click();
    await page.waitForTimeout(400);
    await shot(page, "d-whatsapp-send");
  }

  // Approvals: SM view-only; hold booking should appear if requested
  await page.goto(`${BASE}/app/approvals`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  const appr = await page.locator("body").innerText();
  await shot(page, "d-approvals-queue");
  if (/Approve/i.test(appr) && !/View only/i.test(appr)) {
    note("P2", "approvals", "SM may have Approve on non-sales items (PO/VO) — check intended authority");
  }
  if (/View only for this role/i.test(appr)) {
    note(
      "P1",
      "approvals",
      "Partner hold→booking waits on 'Sales Manager / MD' but SM is view-only — cannot clear own queue.",
    );
  }
  if (/Hold → booking/i.test(appr) === false) {
    /* may be on other entity */
  }

  // Hold booking may sit on Aravalli project
  await setEntity(page, "Aravalli Homes Pvt Ltd");
  await page.goto(`${BASE}/app/approvals`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  const appr2 = await page.locator("body").innerText();
  await shot(page, "d-approvals-aravalli");
  if (/Hold → booking/i.test(appr2) && /View only/i.test(appr2)) {
    note(
      "P0",
      "approvals",
      "Hold→booking is waiting on Sales Manager / MD, but this seat cannot Approve/Reject.",
    );
  }

  // Customers collections
  await setEntity(page, "Kanakpura Developers LLP");
  await page.goto(`${BASE}/app/customers`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  const cust = await page.locator("body").innerText();
  await shot(page, "d-customers");
  if (!/Collect next installment|next unpaid/i.test(cust)) {
    note("P2", "customers", "Collections follow-up not obvious on Customers");
  }
  if (!/On slab 12|due/i.test(cust)) {
    note("P2", "customers", "Upcoming due (slab 12) not highlighted as a chase list");
  }

  // Company / people score
  await page.goto(`${BASE}/app/sales/company`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  const firm = await page.locator("body").innerText();
  await shot(page, "d-company-all-firms");
  if (!/Pink City/i.test(firm)) note("P0", "company", "Pink City Channel not listed for in-house SM");
  if (!/Desert Reach|Shekhawat/i.test(firm)) note("P0", "company", "Desert Reach / R. Shekhawat not listed for in-house SM");
  if (!/Qureshi|Joshi/i.test(firm)) {
    note("P2", "company", "Other agents missing from firm roster");
  }

  // Audit after actions
  await page.goto(`${BASE}/app/audit`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(300);
  await shot(page, "d-audit-after-actions");

  // Assistant
  await page.goto(`${BASE}/app/assistant`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(300);
  await shot(page, "d-assistant");

  // All phases leak
  await page.goto(`${BASE}/app/phases`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(300);
  const phases = await page.locator("body").innerText();
  await shot(page, "d-phases-leaks");
  if (/Tally/i.test(phases) || /Documents/i.test(phases) || /Land & legal/i.test(phases)) {
    note(
      "P1",
      "phases",
      "All phases cards deep-link SM into modules this seat must not operate (Tally, Documents, Land, Site, Org).",
    );
  }

  // Deep-link hidden modules
  for (const [path, name] of HIDDEN_PATHS) {
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(350);
    const text = await page.locator("body").innerText();
    const url = page.url();
    const blocked =
      /does not post books|view only is not offered|not offered to|this desk does not/i.test(text) ||
      url.includes("/app/sales") && path !== "/app/sales";
    await shot(page, `hidden-${name}`);
    const tallyActions = /Reconcile|Accept exception|post voucher/i.test(text);
    hiddenResults.push({
      path,
      url,
      blocked,
      tallyActions,
      title: (await page.locator("h1").first().textContent().catch(() => "")) ?? "",
      snippet: text.slice(0, 400),
    });
    if (path === "/app/finance" && tallyActions) {
      note("P0", "finance", "Deep-link /app/finance exposes Tally reconcile / exception actions to SM");
    }
    if (path === "/app/finance" && !/does not post books|Tally stays with Finance/i.test(text) && tallyActions) {
      note("P0", "finance", "Finance deep-link is not a closed gate");
    }
    if (path !== "/app/finance" && !blocked) {
      note("P1", `hidden-${name}`, `Deep-link ${path} renders the full module instead of a closed gate`, text.slice(0, 220));
    }
  }

  // Project detail leak to documents
  await page.goto(`${BASE}/app/projects/p_kanak`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(300);
  const pd = await page.locator("body").innerText();
  await shot(page, "d-project-detail");
  if (/Open document control/i.test(pd)) {
    note("P2", "projects", "Project detail links SM into Documents (hidden module)");
  }

  // Stale-hold / dead-agent / collections signals
  await page.goto(`${BASE}/app/sales`, { waitUntil: "domcontentloaded" });
  const hub2 = await page.locator("body").innerText();
  if (!/stale|expir/i.test(hub2)) {
    note("P1", "sales-hub", "No stale-hold ageing on command (persona: who is sitting on a hold?)");
  }
  if (!/didn’t report|not filed|missing report/i.test(hub2)) {
    note("P1", "sales-hub", "No ‘who has not filed today’s report’ exception list");
  }
  if (!/dead|inactive agent|0 calls/i.test(hub2)) {
    note("P2", "sales-hub", "No dead-agent flag on command");
  }

  // Mobile pass on key screens
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [path, name, needle] of [
    ["/app/sales", "sales-hub", /third-party|inventory/i],
    ["/app/sales/pipeline", "pipeline", /ingest/i],
    ["/app/sales/channel", "channel", /daily report/i],
    ["/app/sales/inventory", "inventory", /unit/i],
    ["/app/sales/analytics", "analytics", /funnel/i],
    ["/app/sales/people", "people", /360|person/i],
    ["/app/sales/handover", "handover", /snag|oc/i],
    ["/app/sales/integrations", "inbound", /inbound|portal|queued/i],
    ["/app/sales/whatsapp", "whatsapp", /whatsapp|template/i],
    ["/app/approvals", "approvals", /approval/i],
    ["/app", "command", /on track/i],
  ]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(400);
    const stats = await ux(page, `m-${name}`);
    await shot(page, `m-${name}`);
    if (stats.overflow) note("P2", `m-${name}`, "Horizontal overflow on 390×844");
    const menu = page.getByLabel("Open menu");
    if (path === "/app/sales" && (await menu.count())) {
      await menu.click();
      await page.waitForTimeout(300);
      await shot(page, "m-nav-open");
      const drawer = await page.locator("body").innerText();
      for (const hide of HIDDEN_NAV) {
        if (drawer.split("\n").some((l) => l.trim() === hide)) {
          note("P0", "m-nav", `Hidden module in mobile drawer: ${hide}`);
        }
      }
      await page.locator("body").click({ position: { x: 360, y: 20 } }).catch(() => {});
    }
    screens.push({ path, name: `m-${name}`, findMs: 0, title: stats.title, hit: needle.test(stats.textSample), stats });
  }
  } catch (err) {
    note("P0", "walk", `Review script aborted: ${err?.message ?? err}`);
    await shot(page, "abort").catch(() => {});
  }

  await browser.close();

  const report = {
    seat: "Sales Manager",
    email: "sm@atlas.local",
    persona: "N. Bhatia",
    homeUrl,
    nav: navFlat,
    screens,
    hiddenResults,
    findings,
    consoleErrors: consoleErrors.slice(0, 40),
    pageErrors,
    desert: {
      reportOnDefault: desertReportVisible || shekhawatVisible,
      holdOnDefault: desertHoldVisible,
      pinkHoldOnDefault: pinkHoldVisible,
    },
  };
  writeFileSync(join(OUT, "walk.json"), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        ok: pageErrors.length === 0,
        screens: screens.length,
        findings: findings.length,
        nav: navFlat,
        p0: findings.filter((f) => f.severity === "P0").length,
        p1: findings.filter((f) => f.severity === "P1").length,
        consoleErrors: consoleErrors.length,
        pageErrors,
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
