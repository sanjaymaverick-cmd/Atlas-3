#!/usr/bin/env node
/**
 * Stores / QS role review — H. Singh, st@atlas.local.
 * Isolated Playwright context. Does not edit application source.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = process.env.ATLAS_URL || "http://127.0.0.1:8080";
const OUT = join(process.cwd(), "screenshots", "review", "stores");
mkdirSync(OUT, { recursive: true });

const findings = [];
const timings = [];
const navDesktop = [];
const navMobile = [];
const consoleErrors = [];
const pageErrors = [];

function note(screen, severity, issue, extra = {}) {
  findings.push({ screen, severity, issue, ...extra });
}

function ms(start) {
  return Math.round(performance.now() - start);
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
  await page.getByRole("button", { name: "Stores / QS" }).click();
  await page.getByRole("button", { name: /enter local atlas/i }).click();
  await page.getByRole("button", { name: /end session/i }).waitFor({ timeout: 25000 });
}

async function shot(page, name) {
  await page
    .locator("h1")
    .waitFor({ timeout: 12000 })
    .catch(() => {});
  await page.waitForTimeout(250);
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
}

async function go(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.locator("h1").waitFor({ timeout: 15000 });
}

async function collectOverflow(page, screen) {
  return page.evaluate((screen) => {
    const notes = [];
    if (document.documentElement.scrollWidth > window.innerWidth + 8) {
      notes.push({ screen, severity: "Painful", issue: "Horizontal overflow on this viewport." });
    }
    const jade = [...document.querySelectorAll("button, a, [role='button']")].filter((el) => {
      const s = getComputedStyle(el);
      const bg = s.backgroundColor;
      return (
        bg.includes("29, 79, 66") || bg.includes("31, 79") || el.className.includes("bg-primary")
      );
    });
    if (jade.length > 3) {
      notes.push({
        screen,
        severity: "Acceptable",
        issue: `${jade.length} primary-looking (jade) actions visible — DESIGN.md wants one primary per screen.`,
      });
    }
    return notes;
  }, screen);
}

async function bodyText(page) {
  return page.locator("body").innerText();
}

async function findTime(page, needle, screen, question) {
  const t0 = performance.now();
  const text = await bodyText(page);
  const found = new RegExp(needle, "i").test(text);
  const elapsed = ms(t0);
  timings.push({ screen, question, needle, found, elapsedMs: elapsed, under10s: elapsed < 10000 });
  if (!found) note(screen, "Painful", `Could not find "${needle}" while asking: ${question}`);
  return { found, elapsed, text };
}

async function navLabels(page, dest) {
  const labels = await page.evaluate(() => {
    const aside = document.querySelector("aside nav");
    if (aside)
      return [...aside.querySelectorAll("a")].map((a) => a.textContent.trim()).filter(Boolean);
    const drawer = [...document.querySelectorAll("a")].filter((a) =>
      (a.getAttribute("href") || "").startsWith("/app"),
    );
    return drawer.map((a) => a.textContent.trim()).filter(Boolean);
  });
  dest.splice(0, dest.length, ...labels);
  return labels;
}

async function tourDesktop(page) {
  // Home should be Controls
  const url = page.url();
  if (!url.includes("/app/controls")) {
    note("login", "Broken", `Stores home is ${url}, expected /app/controls`);
  }
  await page.waitForTimeout(400);
  await shot(page, "01-desktop-home-controls");

  const home = await bodyText(page);
  await findTime(page, "TMT 12mm|OPC 53|Waterproof", "controls", "What materials are on site?");
  await findTime(page, "Issued .* / received", "controls", "What is GRN'd / received vs issued?");
  await findTime(
    page,
    "Quantity verification|Tower B raft|variance",
    "controls",
    "What QS measurement is waiting?",
  );
  await findTime(
    page,
    "GRN|challan|delivery",
    "controls",
    "Is there a GRN / delivery challan number?",
  );
  await findTime(
    page,
    "wastage|waste|remaining|on hand|stock",
    "controls",
    "Wastage / remaining stock?",
  );
  await findTime(page, "BOQ|bill of quant", "controls", "BOQ reconciliation?");
  await findTime(page, "Purchase order|PO ", "controls", "Can I see commercial POs from Controls?");

  if (!/TMT 12mm/i.test(home))
    note("controls", "Broken", "Seed TMT 12mm not visible on Controls home.");
  if (!/Issued 61 \/ received 86/i.test(home) && !/Issued .* \/ received/i.test(home)) {
    note("controls", "Painful", "Received vs issued ledger not obvious in first glance.");
  }
  if (/GRN/i.test(home))
    note("controls", "Acceptable", "GRN label present (unexpected from source).");
  else
    note(
      "controls",
      "Painful",
      "Receive is a qty bump, not a GRN. No challan, vendor, PO, date, or remaining-on-hand.",
    );

  if (/Tower B raft/i.test(home) && /Approve quantity/i.test(home)) {
    note("controls", "Acceptable", "Variance (Tower B raft) is visible with Approve quantity.");
  }

  const labels = await navLabels(page, navDesktop);
  for (const forbidden of ["Commercial", "Quotations", "Tally"]) {
    if (labels.includes(forbidden))
      note("nav", "Broken", `${forbidden} unexpectedly in Stores nav.`);
  }
  for (const expected of [
    "Command",
    "All phases",
    "Projects",
    "Site & quality",
    "Controls",
    "Audit",
    "Assistant",
  ]) {
    if (!labels.some((l) => l.includes(expected) || expected.includes(l))) {
      note("nav", "Painful", `Expected nav item missing: ${expected}. Saw: ${labels.join(" | ")}`);
    }
  }
  if (labels.includes("Change control")) {
    note(
      "nav",
      "Acceptable",
      "Change control visible to stores (NAV_ROLES.changes excludes stores — unexpected).",
    );
  } else {
    note(
      "nav",
      "Painful",
      "Stores cannot open Change control from nav, but Command queue still links Open NCRs there.",
    );
  }

  // Primary actions on Controls
  const receive = page.getByRole("button", { name: /^Receive$/ });
  const issue = page.getByRole("button", { name: /^Issue$/ });
  const approve = page.getByRole("button", { name: /Approve quantity/i });
  const nReceive = await receive.count();
  const nIssue = await issue.count();
  const nApprove = await approve.count();
  if (nReceive + nIssue + nApprove > 1) {
    note(
      "controls",
      "Painful",
      `Multiple equal-weight actions on one screen: ${nReceive} Receive, ${nIssue} Issue, ${nApprove} Approve quantity. DESIGN.md: one jade primary. Receive and Issue share one qty field.`,
    );
  }

  // Real action: issue 10 TMT (within receipts)
  const _tmtCard = page
    .locator("div")
    .filter({ hasText: /^TMT 12mm/ })
    .first();
  const tmtInput = page.getByLabel("Quantity for TMT 12mm");
  await tmtInput.fill("10");
  await page
    .getByRole("button", { name: /^Issue$/ })
    .first()
    .click();
  await page.waitForTimeout(500);
  const afterIssue = await bodyText(page);
  if (!/Issued 71 \/ received 86/i.test(afterIssue) && !/Issued 71/i.test(afterIssue)) {
    note("controls-issue", "Broken", "Issue 10 TMT did not update Issued 61→71.");
  } else {
    note("controls-issue", "Easy", "Issue 10 TMT within receipts updated the ledger.");
  }
  await shot(page, "02-desktop-controls-after-issue");

  // Over-issue should refuse
  await tmtInput.fill("10000");
  await page
    .getByRole("button", { name: /^Issue$/ })
    .first()
    .click();
  await page.waitForTimeout(600);
  const toast = await page
    .locator("[data-sonner-toast], [data-sonner-toaster], li[data-type], [role='status']")
    .allInnerTexts()
    .catch(() => []);
  const toastJoin = toast.join(" ");
  const afterOver = await bodyText(page);
  if (
    !/Cannot issue more than accepted receipts/i.test(toastJoin) &&
    !/Cannot issue/i.test(afterOver)
  ) {
    note(
      "controls-overissue",
      "Painful",
      `Over-issue toast not obvious. Toasts: ${toastJoin.slice(0, 200)}`,
    );
  } else {
    note("controls-overissue", "Easy", "Issue past receipts refused with explicit reason.");
  }
  await shot(page, "03-desktop-controls-overissue-toast");

  // Receive 5 (same shared field — friction)
  await tmtInput.fill("5");
  await page
    .getByRole("button", { name: /^Receive$/ })
    .first()
    .click();
  await page.waitForTimeout(400);
  const afterRecv = await bodyText(page);
  if (!/received 91/i.test(afterRecv)) {
    note(
      "controls-receive",
      "Painful",
      "Receive 5 did not bump received 86→91 (or label is unclear).",
    );
  } else {
    note(
      "controls-receive",
      "Acceptable",
      "Receive works but is not a GRN: no vendor, PO, challan, or date.",
    );
  }
  await shot(page, "04-desktop-controls-after-receive");

  // Approve raft variance
  const raft = page
    .locator("div")
    .filter({ hasText: /Tower B raft/ })
    .first();
  if (await raft.getByRole("button", { name: /Approve quantity/i }).count()) {
    await raft.getByRole("button", { name: /Approve quantity/i }).click();
    await page.waitForTimeout(400);
    const afterQty = await bodyText(page);
    if (/Approve quantity/i.test(afterQty) && /Tower B raft/i.test(afterQty)) {
      // Button may still exist if another item pending; check this card
      const raftText = await raft.innerText();
      if (/Approve quantity/i.test(raftText)) {
        note("controls-qty", "Broken", "Approve quantity on Tower B raft did not lock the item.");
      } else {
        note("controls-qty", "Easy", "Approve quantity locked Tower B raft.");
      }
    } else {
      note("controls-qty", "Easy", "Approve quantity path completed.");
    }
  } else {
    note(
      "controls-qty",
      "Acceptable",
      "No pending Approve quantity on Tower B raft (already approved?).",
    );
  }
  await shot(page, "05-desktop-controls-qty-approved");

  // Site grading provisional — can QS enter site qty? Source says no.
  if (/Site grading/i.test(afterRecv) || /Site grading/i.test(home)) {
    const grading = page
      .locator("div")
      .filter({ hasText: /Site grading/ })
      .first();
    const gText = await grading.innerText().catch(() => "");
    if (/site 0/i.test(gText) && /Approve quantity/i.test(gText)) {
      note(
        "controls-qty",
        "Painful",
        "Site grading is provisional with site 0, but the only action is Approve quantity — no field to enter a measurement, no BIM vs site delta shown as a number, no reject.",
      );
    }
  }

  findings.push(
    ...(await collectOverflow(page, "controls-desktop")).map((n) => ({
      screen: n.screen,
      severity: n.severity,
      issue: n.issue,
    })),
  );

  // Command — stores is lumped with site desk
  await go(page, "/app");
  await shot(page, "06-desktop-command");
  const cmd = await bodyText(page);
  await findTime(
    page,
    "Failed inspections|Open NCRs|Statutory",
    "command",
    "Does Command answer stores questions?",
  );
  if (
    /Failed inspections/i.test(cmd) &&
    !/material|GRN|quantity|issued/i.test(cmd.split("Failed inspections")[0] + cmd.slice(0, 400))
  ) {
    note(
      "command",
      "Painful",
      "Stores Command is the engineer/supervisor desk: Failed inspections, Open NCRs, Statutory open. No materials-on-hand, pending GRN, or QS variance queue. Queue links Open NCRs → /app/changes and Statutory → /app/land — neither is in Stores nav.",
    );
  }
  if (/Diary/i.test(cmd)) {
    note(
      "command",
      "Acceptable",
      "Today’s site queue chip exists but is labelled Diary (supervisor work), not Stores.",
    );
  }

  // Follow queue dead-ends
  await go(page, "/app/changes");
  await shot(page, "07-desktop-deeplink-changes");
  const chg = await bodyText(page);
  if (/Change control/i.test(chg)) {
    note(
      "changes-deeplink",
      "Painful",
      "Deep-link /app/changes works (no role gate) even though Change control is hidden from Stores nav. Command still sends this seat here for NCRs.",
    );
  }

  await go(page, "/app/land");
  await shot(page, "08-desktop-deeplink-land");
  note(
    "land-deeplink",
    "Painful",
    "Deep-link /app/land works. Stores Command KPI 'Statutory open' sends QS to Land — not a stores job, and not in nav.",
  );

  // Site diary
  await go(page, "/app/site");
  await shot(page, "09-desktop-site");
  const site = await bodyText(page);
  await findTime(page, "Today’s diary|Seal diary", "site", "Can Stores see / seal diary?");
  if (/TMT 18t received|Membrane 240/i.test(site)) {
    note(
      "site",
      "Acceptable",
      "Recent diaries mention materials as free text, not linked to Controls receipts.",
    );
  }
  if (/See store/i.test(site)) {
    note(
      "site",
      "Painful",
      "Diary materials field is a hardcoded 'See store.' — no live stock from Controls.",
    );
  }
  if (/Seal diary/i.test(site) && /Pass/i.test(site)) {
    note(
      "site",
      "Painful",
      "Stores can seal today’s diary and Pass/Fail inspections. That is supervisor/engineer work; QS still has no GRN form here. Site density is phone-first, which is good, but the primary action is wrong for this seat.",
    );
  }
  const diaryMaterials = /materials/i.test(site);
  if (!diaryMaterials) {
    note(
      "site",
      "Acceptable",
      "Diary cards do not surface the materials line (only work + safety). Stores cannot answer 'what was consumed today' from the list.",
    );
  }

  // Projects
  await go(page, "/app/projects");
  await shot(page, "10-desktop-projects");
  const proj = await bodyText(page);
  if (/New project/i.test(proj))
    note("projects", "Broken", "Stores can create projects (should be owner/pm).");
  if (!/Kanakpura|Mansarovar|Baggad/i.test(proj))
    note("projects", "Painful", "Project list empty or names not visible.");
  await findTime(page, "Kanakpura", "projects", "Find a live project");

  await go(page, "/app/projects/p_kanak");
  await shot(page, "11-desktop-project-detail");
  {
    const det = await bodyText(page);
    if (!/TMT|OPC|quantity|GRN|material/i.test(det)) {
      note(
        "project-detail",
        "Painful",
        "Project dossier has register, bookings, diaries — no materials on site, no QS quantities, no PO receipts. Stores must leave to Controls.",
      );
    }
  }

  // Phases — commercial card is a back door
  await go(page, "/app/phases");
  await shot(page, "12-desktop-phases");
  const phases = await bodyText(page);
  if (/Commercial/i.test(phases) && /Quotations/i.test(phases)) {
    note(
      "phases",
      "Acceptable",
      "All phases lists Commercial (path /app/quotations) even though nav hides it. This is the only in-product hint that POs exist.",
    );
  }

  // Deep-link commercial / quotations / finance
  await go(page, "/app/commercial");
  await shot(page, "13-desktop-deeplink-commercial");
  const com = await bodyText(page);
  if (/Vendor must be Active|Issue purchase order|Orders & contracts/i.test(com)) {
    note(
      "commercial-deeplink",
      "Painful",
      "Deep-link /app/commercial fully loads with Invite vendor + Submit PO. No role gate. QS can mutate commercial data they cannot discover from nav. POs exist here — this is the answer to 'Can I see commercial POs?' but it is hidden.",
    );
  } else if (/not offered|view only|no access/i.test(com)) {
    note("commercial-deeplink", "Acceptable", "Commercial deep-link is gated.");
  }

  await go(page, "/app/quotations");
  await shot(page, "14-desktop-deeplink-quotations");
  const q = await bodyText(page);
  if (/RFQ|compare|select/i.test(q)) {
    note(
      "quotations-deeplink",
      "Painful",
      "Deep-link /app/quotations loads the full RFQ desk. QS has no BOQ/quote view in nav; this is the existing module they need for measurement vs quote, but it is hidden and unguarded.",
    );
  }

  await go(page, "/app/finance");
  await shot(page, "15-desktop-deeplink-finance");
  const fin = await bodyText(page);
  if (/View only is not offered to site seats/i.test(fin)) {
    note("finance-deeplink", "Easy", "Tally correctly refuses site/stores seats.");
  } else if (/Reconcile|Tally case/i.test(fin)) {
    note("finance-deeplink", "Broken", "Stores can see Tally actions.");
  }

  // Audit after our mutations
  await go(page, "/app/audit");
  await shot(page, "16-desktop-audit");
  const aud = await bodyText(page);
  if (!/Material issued|Material received|Quantity approved/i.test(aud)) {
    note("audit", "Painful", "Expected stores actions not visible on Audit (or copy differs).");
  } else {
    note("audit", "Easy", "Issue / receive / quantity approve land on the audit trail.");
  }

  // Assistant
  await go(page, "/app/assistant");
  await shot(page, "17-desktop-assistant");
  const ast = await bodyText(page);
  if (/Fail-closed/i.test(ast)) {
    note(
      "assistant",
      "Acceptable",
      "Assistant fail-closed until owner records AI hosting. Default prompt is raft variance — relevant to QS but unreachable.",
    );
  }

  // Entity / project switch
  await go(page, "/app/controls");
  const entitySelect = page.locator("header.sticky select").first();
  const projectSelect = page.locator("header.sticky select").nth(1);
  const entityOptions = await entitySelect.locator("option").allInnerTexts();
  const projectOptions = await projectSelect.locator("option").allInnerTexts();
  note(
    "scope",
    "Easy",
    `Entity switcher present: ${entityOptions.join(" / ")}. Project: ${projectOptions.join(" / ")}`,
  );

  await entitySelect.selectOption({ index: 0 }).catch(() => {});
  await page.waitForTimeout(400);
  await shot(page, "18-desktop-entity-switch");
  const switched = await bodyText(page);
  const afterSwitchMats = /TMT 12mm|OPC 53|Touch-up paint/i.test(switched);
  if (!afterSwitchMats) {
    note(
      "scope",
      "Painful",
      "After entity switch, Controls can go empty with no empty-state explaining that materials live on the other legal entity. Stores must already know which entity holds Kanakpura.",
    );
  }

  await page.waitForTimeout(50);
  await page.waitForTimeout(400);
  await shot(page, "18b-desktop-homes-entity");
  const homesView = await bodyText(page);
  if (!/TMT 12mm/i.test(homesView) && !/empty|no material|no stock/i.test(homesView)) {
    note(
      "scope",
      "Painful",
      "Aravalli Homes Controls shows Baggad/Mansarovar lines with no empty-state when TMT (Kanakpura LLP) disappears. Stores can think stock is missing.",
    );
  }

  // Restore LLP so later tours still have TMT
  const llpValue = await entitySelect.locator("option").evaluateAll((opts) => {
    const hit = opts.find((o) => /LLP|Kanakpura Developers/i.test(o.textContent || ""));
    return hit ? hit.value : null;
  });
  if (llpValue) await entitySelect.selectOption(llpValue);
  await page.waitForTimeout(300);
  if (projectOptions.some((o) => /KPR|Kanak/i.test(o))) {
    const val = await projectSelect.locator("option").evaluateAll((opts) => {
      const hit = opts.find((o) => /KPR|Kanak/i.test(o.textContent || ""));
      return hit ? hit.value : null;
    });
    if (val) await projectSelect.selectOption(val);
    await page.waitForTimeout(300);
    await shot(page, "19-desktop-project-filter");
    const scoped = await bodyText(page);
    if (/Touch-up paint/i.test(scoped) && /KPR/i.test(projectOptions.join(" "))) {
      note(
        "scope",
        "Painful",
        "Project filter still showing Mansarovar paint on a Kanakpura selection.",
      );
    }
  }
}

async function tourMobile(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await go(page, "/app/controls");
  await shot(page, "20-mobile-controls");
  findings.push(
    ...(await collectOverflow(page, "controls-mobile")).map((n) => ({
      screen: n.screen,
      severity: n.severity,
      issue: n.issue,
    })),
  );

  const localBadge = await page.locator("header.sticky").innerText();
  if (!/Local/i.test(localBadge)) {
    note("mobile-chrome", "Broken", "Local only badge missing on phone (DESIGN.md: never hide).");
  } else if (/Local only · not live/i.test(localBadge)) {
    note("mobile-chrome", "Easy", "Full Local only copy on phone.");
  } else {
    note(
      "mobile-chrome",
      "Acceptable",
      "Phone header shortens to 'Local' — DESIGN.md allows this.",
    );
  }

  // Material row targets
  const issueBtn = page.getByRole("button", { name: /^Issue$/ }).first();
  if (await issueBtn.count()) {
    const box = await issueBtn.boundingBox();
    if (box && box.height < 44) {
      note(
        "controls-mobile",
        "Painful",
        `Issue button height ${Math.round(box.height)}px — site density wants ~48px.`,
      );
    } else if (box) {
      note(
        "controls-mobile",
        "Easy",
        `Issue button height ${Math.round(box.height)}px meets site target.`,
      );
    }
  } else {
    note(
      "controls-mobile",
      "Painful",
      "No Issue button on mobile Controls — materials empty after entity switch?",
    );
  }

  const tmtQty = page.getByLabel("Quantity for TMT 12mm");
  if (await tmtQty.count()) {
    const qtyBox = await tmtQty.boundingBox();
    if (qtyBox && qtyBox.height < 40) {
      note(
        "controls-mobile",
        "Painful",
        `Qty input ${Math.round(qtyBox.height)}px — too small with gloves.`,
      );
    }
  } else {
    note(
      "controls-mobile",
      "Painful",
      "TMT qty field missing on mobile — stock not in current entity/project scope.",
    );
  }

  // Two-select header on 390
  const headerH = await page
    .locator("header.sticky")
    .evaluate((el) => el.getBoundingClientRect().height);
  if (headerH > 80) {
    note(
      "mobile-chrome",
      "Acceptable",
      `Sticky header is ${Math.round(headerH)}px with two selects + menu — eats a dusty-phone viewport.`,
    );
  }

  await page.getByRole("button", { name: "Open menu" }).click();
  await page.waitForTimeout(300);
  await shot(page, "21-mobile-nav");
  const drawerText = await page.locator("body").innerText();
  const mobileNav = [];
  for (const label of [
    "Command",
    "All phases",
    "Projects",
    "Site & quality",
    "Controls",
    "Audit",
    "Assistant",
  ]) {
    if (drawerText.includes(label)) mobileNav.push(label);
  }
  navMobile.splice(0, navMobile.length, ...mobileNav);
  if (drawerText.includes("Commercial") || drawerText.includes("Quotations")) {
    note("mobile-nav", "Broken", "Commercial/Quotations in mobile drawer for stores.");
  }
  if (!drawerText.includes("H. Singh") && !drawerText.includes("Stores")) {
    note("mobile-nav", "Acceptable", "Drawer may omit seat name (desktop footer has H. Singh).");
  }
  await page
    .locator("body")
    .click({ position: { x: 350, y: 20 } })
    .catch(() => {});
  await page.waitForTimeout(200);

  await go(page, "/app");
  await shot(page, "22-mobile-command");
  findings.push(
    ...(await collectOverflow(page, "command-mobile")).map((n) => ({
      screen: n.screen,
      severity: n.severity,
      issue: n.issue,
    })),
  );

  await go(page, "/app/site");
  await shot(page, "23-mobile-site");
  findings.push(
    ...(await collectOverflow(page, "site-mobile")).map((n) => ({
      screen: n.screen,
      severity: n.severity,
      issue: n.issue,
    })),
  );
  const seal = page.getByRole("button", { name: /Seal diary/i });
  const sealBox = await seal.boundingBox();
  if (sealBox && sealBox.height >= 44) {
    note(
      "site-mobile",
      "Easy",
      `Seal diary is ${Math.round(sealBox.height)}px full-width — site density OK, but the action is not stores' job.`,
    );
  }

  await go(page, "/app/projects");
  await shot(page, "24-mobile-projects");

  await go(page, "/app/commercial");
  await shot(page, "25-mobile-deeplink-commercial");
  findings.push(
    ...(await collectOverflow(page, "commercial-mobile")).map((n) => ({
      screen: n.screen,
      severity: n.severity,
      issue: n.issue,
    })),
  );
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
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on("pageerror", (err) => pageErrors.push(String(err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  const tLogin = performance.now();
  await login(page);
  timings.push({
    screen: "login",
    question: "Enter as Stores / QS",
    found: page.url().includes("/app"),
    elapsedMs: ms(tLogin),
    under10s: ms(tLogin) < 10000,
  });
  await shot(page, "00-desktop-after-login");

  await tourDesktop(page);
  await tourMobile(page);

  await context.close();
  await browser.close();

  const report = {
    seat: "stores",
    title: "Stores / QS",
    persona: "H. Singh",
    navDesktop,
    navMobile,
    timings,
    findings,
    consoleErrors,
    pageErrors,
  };
  writeFileSync(join(OUT, "findings.json"), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        ok: true,
        shots: OUT,
        findings: findings.length,
        timings,
        navDesktop,
        errors: consoleErrors.length + pageErrors.length,
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
