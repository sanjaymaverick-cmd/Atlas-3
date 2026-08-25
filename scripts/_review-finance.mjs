#!/usr/bin/env node
/**
 * Role review: Finance Lead + Commercial Manager. Atlas never posts Tally.
 * Does not edit application source.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = process.env.ATLAS_URL || "http://127.0.0.1:8080";
const OUT = join(process.cwd(), "screenshots", "review", "finance");
mkdirSync(OUT, { recursive: true });

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
];

const report = {
  live: false,
  at: new Date().toISOString(),
  seats: {},
  screens: [],
  finds: [],
  actions: [],
  nav: {},
  navFlags: {},
  entitySwitch: [],
  overflow: [],
  primaryCounts: [],
  tallyLanguage: [],
  console: [],
  errors: [],
};

function note(list, item) {
  list.push(item);
}

async function login(page, seat) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.evaluate((keys) => {
    for (const k of keys) localStorage.removeItem(k);
  }, LS_KEYS);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("Local test accounts").waitFor({ timeout: 20000 });
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: seat, exact: true }).click();
  await page.getByRole("button", { name: /enter local atlas/i }).click();
  await page.getByRole("button", { name: /end session/i }).waitFor({ timeout: 25000 });
}

async function shot(page, name) {
  const path = join(OUT, `${name}.png`);
  await page
    .locator("h1")
    .first()
    .waitFor({ state: "visible", timeout: 8000 })
    .catch(() => {});
  await page.waitForTimeout(150);
  await page.screenshot({ path, fullPage: true, animations: "disabled" });
  return path;
}

async function inspect(page, seat, screen) {
  return page.evaluate(
    ({ seat, screen }) => {
      const overflow = document.documentElement.scrollWidth > window.innerWidth + 8;
      const title = document.querySelector("h1")?.textContent?.trim() || "";
      const desc = document.querySelector("h1")?.nextElementSibling?.textContent?.trim() || "";
      const kicker =
        document.querySelector("h1")?.previousElementSibling?.textContent?.trim() || "";
      const body = document.body.innerText;
      const nav = Array.from(document.querySelectorAll("aside nav a, aside nav span"))
        .map((el) => el.textContent?.trim())
        .filter(Boolean);
      const mobileNav = Array.from(document.querySelectorAll(".fixed.inset-0 a, .fixed.z-40 a"))
        .map((el) => el.textContent?.trim())
        .filter(Boolean);
      const primaries = Array.from(document.querySelectorAll("button, a"))
        .filter((el) => (el.className || "").includes("bg-primary"))
        .map((el) => (el.textContent || "").trim().slice(0, 80));
      const tallyNav = [...nav, ...mobileNav, body.slice(0, 400)].some((t) =>
        /\bTally\b/i.test(t || ""),
      );
      const postHits = (body.match(/post[^\n.]{0,80}/gi) || []).slice(0, 12);
      const voucherHits = (body.match(/voucher[^\n.]{0,80}/gi) || []).slice(0, 8);
      const localOnly = /Local only|Local\b/.test(body);
      return {
        seat,
        screen,
        title,
        kicker,
        desc,
        overflow,
        nav,
        mobileNav,
        primaries,
        primaryCount: primaries.length,
        tallyNav,
        postHits,
        voucherHits,
        localOnly,
        bodyLen: body.length,
        snippet: body.replace(/\s+/g, " ").slice(0, 1400),
      };
    },
    { seat, screen },
  );
}

async function findTime(page, needle, label) {
  const t0 = Date.now();
  try {
    await page.getByText(needle, { exact: false }).first().waitFor({ timeout: 10000 });
    const ms = Date.now() - t0;
    note(report.finds, { label, needle, ms, ok: true, under10s: ms < 10000 });
    return ms;
  } catch {
    const ms = Date.now() - t0;
    note(report.finds, { label, needle, ms, ok: false, under10s: false });
    return ms;
  }
}

function pathMatches(url, path) {
  const p = new URL(url).pathname.replace(/\/$/, "") || "/";
  const want = path.replace(/\/$/, "") || "/";
  if (want === "/app") return p === "/app";
  return p === want || p.startsWith(`${want}/`);
}

async function gotoPath(page, path) {
  const vp = page.viewportSize();
  const desktop = Boolean(vp && vp.width >= 1024);
  const navLink = page.locator(`aside a[href="${path}"]`);
  if (desktop && (await navLink.count())) {
    await navLink.first().click();
  } else {
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  }
  await page.waitForURL((url) => pathMatches(url, path), { timeout: 15000 });
  await page.locator("h1").first().waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(400);
}

async function entitySelect(page) {
  return page.locator("header select").first();
}

async function captureScreen(page, seat, slug, path, extra = {}) {
  try {
    if (path) await gotoPath(page, path);
  } catch (err) {
    note(report.errors, `${seat} ${slug} nav: ${err?.message || err}`);
    await page
      .goto(`${BASE}${path || "/app"}`, { waitUntil: "domcontentloaded", timeout: 30000 })
      .catch(() => {});
    await page.waitForTimeout(600);
  }
  const data = await inspect(page, seat, slug);
  if (data.overflow) note(report.overflow, { seat, screen: slug, viewport: extra.viewport });
  note(report.primaryCounts, {
    seat,
    screen: slug,
    count: data.primaryCount,
    labels: data.primaries,
  });
  if (data.postHits.length || data.voucherHits.length) {
    note(report.tallyLanguage, {
      seat,
      screen: slug,
      post: data.postHits,
      voucher: data.voucherHits,
    });
  }
  const file = await shot(page, slug);
  note(report.screens, {
    seat,
    slug,
    path: path || page.url(),
    url: page.url(),
    title: data.title,
    kicker: data.kicker,
    desc: data.desc,
    localOnly: data.localOnly,
    overflow: data.overflow,
    primaryCount: data.primaryCount,
    primaries: data.primaries,
    file,
    snippet: data.snippet,
  });
  return data;
}

async function runFinanceLead(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const consoleErr = [];
  page.on("pageerror", (e) => consoleErr.push(`FL pageerror ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") consoleErr.push(`FL console ${m.text()}`);
  });

  await login(page, "Finance Lead");
  const home = new URL(page.url()).pathname;
  const identity = await page.locator("aside").innerText();
  const navText = await page.locator("aside nav").innerText();
  report.nav.fl = navText
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  report.seats.fl = {
    home,
    homeOk: home === "/app/finance" || home.startsWith("/app/finance"),
    identity,
    tallyInNav: /\bTally\b/i.test(navText),
    salesInNav: /\bSales\b/i.test(navText),
    salesAnalyticsInNav: /Sales analytics/i.test(navText),
    inventoryInNav: /Inventory/i.test(navText),
    pipelineInNav: /Pipeline/i.test(navText),
  };

  // Home: Tally
  await findTime(page, "ERP invoice missing in Tally", "FL open Tally exception");
  await findTime(page, "Atlas never posts", "FL never-posts copy");
  const finHome = await captureScreen(page, "FL", "fl-desktop-finance", null, {
    viewport: "1280x800",
  });
  note(report.actions, {
    seat: "FL",
    action: "landed finance home",
    entity: finHome.snippet.includes("Kanakpura Developers LLP"),
    openCase: finHome.snippet.includes("ERP invoice missing"),
    reconciledCase: finHome.snippet.includes("Wrong project allocation"),
    homesCasePresent: finHome.snippet.includes("customer receipt C-304"),
  });

  // Reconcile open case — must not invent a Tally post
  const toastPromise = page
    .locator("[data-sonner-toast], [data-sonner-toaster]")
    .first()
    .waitFor({ timeout: 4000 })
    .catch(() => null);
  await page.getByRole("button", { name: "Reconcile" }).first().click();
  await toastPromise;
  await page.waitForTimeout(400);
  const toastText = await page.locator("body").innerText();
  note(report.actions, {
    seat: "FL",
    action: "Reconcile",
    toastMentionsNoVoucher: /Tally remains the books|no voucher posted/i.test(toastText),
    after: toastText.includes("reconciled") || /Reconciled in Atlas/i.test(toastText),
  });
  await shot(page, "fl-desktop-finance-reconcile");

  // Entity switch: LLP → Aravalli Homes — cases must change
  const beforeCases = (await page.locator("body").innerText()).includes("ERP invoice missing");
  await (await entitySelect(page)).selectOption({ label: "Aravalli Homes Pvt Ltd" });
  await page.waitForTimeout(400);
  const afterAravalli = await page.locator("body").innerText();
  const caseTitles = await page.locator("main .font-medium").allTextContents();
  note(report.entitySwitch, {
    seat: "FL",
    screen: "finance",
    from: "Kanakpura Developers LLP",
    to: "Aravalli Homes Pvt Ltd",
    beforeHadRA: beforeCases,
    afterHasReceiptMismatch: /customer receipt C-304/i.test(afterAravalli),
    afterLostRA: !/ERP invoice missing/i.test(afterAravalli),
    caseTitles,
    reconcileCount: await page.getByRole("button", { name: "Reconcile" }).count(),
    gstin: /08AABCA1234P1Z5/.test(afterAravalli),
  });
  await captureScreen(page, "FL", "fl-desktop-finance-aravalli", null);

  // Accept exception on remaining open/review case
  const acceptBtn = page.getByRole("button", { name: "Accept exception" });
  if (await acceptBtn.count()) {
    await acceptBtn.first().click();
    await page.waitForTimeout(350);
    note(report.actions, { seat: "FL", action: "Accept exception", ok: true });
  } else {
    note(report.actions, {
      seat: "FL",
      action: "Accept exception",
      ok: false,
      reason: "no open/review case on Aravalli after reconcile",
    });
  }

  await (await entitySelect(page)).selectOption({ label: "Kanakpura Developers LLP" });
  await page.waitForTimeout(250);

  // Command
  await captureScreen(page, "FL", "fl-desktop-command", "/app");
  await findTime(page, "Tally cases", "FL command Tally queue");

  // Portfolio / capital / concept
  await captureScreen(page, "FL", "fl-desktop-portfolio", "/app/portfolio");
  await captureScreen(page, "FL", "fl-desktop-capital", "/app/capital");
  await findTime(page, "Concept", "FL concept label on capital");
  await findTime(page, "Committed total (ex-concept)", "FL committed totals exclude concept");
  await (await entitySelect(page)).selectOption({ label: "Aravalli Homes Pvt Ltd" });
  await page.waitForTimeout(400);
  const capA = await page.locator("body").innerText();
  note(report.entitySwitch, {
    seat: "FL",
    screen: "capital",
    to: "Aravalli Homes Pvt Ltd",
    hasBaggad: /Baggad Heights/i.test(capA),
    baggadConcept: /Concept — planned only/i.test(capA),
    hasMansar: /Mansarovar Enclave/i.test(capA),
    noKanakpura: !/Kanakpura Residences/i.test(capA),
    committedLine: /Committed total \(ex-concept\)/i.test(capA),
  });
  await shot(page, "fl-desktop-capital-aravalli");
  await (await entitySelect(page)).selectOption({ label: "Kanakpura Developers LLP" });
  await page.waitForTimeout(200);

  await captureScreen(page, "FL", "fl-desktop-phases", "/app/phases");
  await captureScreen(page, "FL", "fl-desktop-org", "/app/org");
  await captureScreen(page, "FL", "fl-desktop-approvals", "/app/approvals");
  await findTime(page, "RA-07 Shakti Earthworks", "FL RA bill in approvals");
  await findTime(page, "Finance Lead", "FL waiting-on Finance Lead");
  const approvalsText = await page.locator("body").innerText();
  note(report.actions, {
    seat: "FL",
    action: "approvals visible",
    canApprove: await page.getByRole("button", { name: /approve/i }).count(),
    raWaitingOnFinance: /RA-07/i.test(approvalsText) && /Finance Lead/i.test(approvalsText),
    poWaitingOnMdAlsoActionable:
      /PO-1042/i.test(approvalsText) &&
      (await page.getByRole("button", { name: /approve/i }).count()) > 0,
  });

  await captureScreen(page, "FL", "fl-desktop-projects", "/app/projects");
  await captureScreen(page, "FL", "fl-desktop-land", "/app/land");
  const landText = await page.locator("body").innerText();
  note(report.actions, {
    seat: "FL",
    action: "land EMI / acquire",
    emiPayVisible: await page.getByRole("button", { name: /pay/i }).count(),
    acquireVisible: await page.getByRole("button", { name: /acquire/i }).count(),
    tallyBooksCopy: /Tally remains the books/i.test(landText),
  });

  await captureScreen(page, "FL", "fl-desktop-commercial", "/app/commercial");
  await findTime(page, "Issue purchase order", "FL issue PO form");
  await findTime(page, "Orders & contracts", "FL PO status table");
  const commText = await page.locator("body").innerText();
  note(report.actions, {
    seat: "FL",
    action: "commercial scan",
    gstinPromptBtn: await page.getByRole("button", { name: "GSTIN" }).count(),
    submitPoPrimary: await page.getByRole("button", { name: "Submit PO" }).count(),
    liftPackage: /Lift package/i.test(commText),
    excavationExecuted: /Excavation/i.test(commText),
  });

  await captureScreen(page, "FL", "fl-desktop-quotations", "/app/quotations");
  await findTime(page, "Podium waterproofing", "FL open RFQ");
  const compareBtn = page.getByRole("button", { name: "Compare" });
  if (await compareBtn.count()) {
    await compareBtn
      .nth(1)
      .click()
      .catch(() => compareBtn.first().click());
    await page.waitForTimeout(300);
  }
  await shot(page, "fl-desktop-quotations-compare");

  await captureScreen(page, "FL", "fl-desktop-customers", "/app/customers");
  await findTime(page, "Collect next installment", "FL collect action");
  await findTime(page, "V. Agarwal", "FL booking by name");
  const agingHints = await page.locator("body").innerText();
  note(report.actions, {
    seat: "FL",
    action: "customers scan",
    hasAgingBuckets: /0–30|31–60|90\+|overdue aging|DSO/i.test(agingHints),
    hasNextUnpaid: /next unpaid/i.test(agingHints),
    receiptMatch: /unmatched receipt|bank statement/i.test(agingHints),
  });
  await page
    .getByRole("button", { name: /Collect next installment/i })
    .first()
    .click();
  await page.waitForTimeout(500);
  const collectAfter = await page.locator("body").innerText();
  note(report.actions, {
    seat: "FL",
    action: "Collect next installment",
    toastOrChange: /Collected next step|Collection recorded|On slab/i.test(collectAfter),
  });
  await shot(page, "fl-desktop-customers-collect");

  await captureScreen(page, "FL", "fl-desktop-crm", "/app/crm");
  await captureScreen(page, "FL", "fl-desktop-sales", "/app/sales");
  const salesHub = await page.locator("body").innerText();
  note(report.actions, {
    seat: "FL",
    action: "sales hub",
    neverPosts: /never posts Tally/i.test(salesHub),
    inventoryLink: /Inventory lock|Available units/i.test(salesHub),
  });
  await captureScreen(page, "FL", "fl-desktop-analytics", "/app/sales/analytics");
  await findTime(page, "Commission accrued", "FL sales analytics commission");
  await captureScreen(page, "FL", "fl-desktop-audit", "/app/audit");
  await captureScreen(page, "FL", "fl-desktop-assistant", "/app/assistant");

  // Deep-link inventory (not in nav for FL)
  await gotoPath(page, "/app/sales/inventory");
  const invBody = await page.locator("body").innerText();
  note(report.actions, {
    seat: "FL",
    action: "deeplink sales inventory (not in nav)",
    url: page.url(),
    rendered: /inventory|source of truth|Available/i.test(invBody),
    blocked: /does not|not offered|no access/i.test(invBody),
  });
  await shot(page, "fl-desktop-inventory-deeplink");

  // Mobile
  await page.setViewportSize({ width: 390, height: 844 });
  await captureScreen(page, "FL", "fl-mobile-finance", "/app/finance", { viewport: "390x844" });
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.waitForTimeout(300);
  const mobileNav = await page.locator("body").innerText();
  report.navFlags.flMobileHasTally = /\bTally\b/i.test(mobileNav);
  await shot(page, "fl-mobile-menu");
  await page.keyboard.press("Escape").catch(() => {});
  await page
    .locator("body")
    .click({ position: { x: 350, y: 20 } })
    .catch(() => {});
  await page.waitForTimeout(200);
  // close overlay if still open
  const overlay = page.locator(".fixed.inset-0");
  if (await overlay.count()) {
    await overlay
      .first()
      .click({ position: { x: 380, y: 10 } })
      .catch(() => {});
  }
  await captureScreen(page, "FL", "fl-mobile-customers", "/app/customers", { viewport: "390x844" });
  await captureScreen(page, "FL", "fl-mobile-capital", "/app/capital", { viewport: "390x844" });
  await captureScreen(page, "FL", "fl-mobile-commercial", "/app/commercial", {
    viewport: "390x844",
  });
  await captureScreen(page, "FL", "fl-mobile-quotations", "/app/quotations", {
    viewport: "390x844",
  });

  report.seats.fl.console = consoleErr;
  report.console.push(...consoleErr);
  await ctx.close();
}

async function runCommercial(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const consoleErr = [];
  page.on("pageerror", (e) => consoleErr.push(`CM pageerror ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") consoleErr.push(`CM console ${m.text()}`);
  });

  await login(page, "Commercial Manager");
  const home = new URL(page.url()).pathname;
  const identity = await page.locator("aside").innerText();
  const navText = await page.locator("aside nav").innerText();
  report.nav.cm = navText
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  report.seats.cm = {
    home,
    homeOk: home === "/app/commercial" || home.startsWith("/app/commercial"),
    identity,
    tallyInNav: /\bTally\b/i.test(navText),
    financeInNav: /Finance/i.test(navText),
    capitalInNav: /Capital/i.test(navText),
    customersInNav: /Customers/i.test(navText),
    salesInNav: /^Sales$/m.test(navText) || navText.split("\n").includes("Sales"),
  };

  await findTime(page, "Invite vendor", "CM invite vendor form");
  await findTime(page, "Issue purchase order", "CM issue PO");
  await findTime(page, "Orders & contracts", "CM PO status");
  await captureScreen(page, "CM", "cm-desktop-commercial", null);

  // Invite vendor (GSTIN in form, not prompt)
  await page.getByLabel("Vendor name").fill("Jaipur Tile Works");
  await page.getByLabel("GSTIN").fill("08AAJTW4455F1Z3");
  await page.getByRole("button", { name: "Invite vendor" }).click();
  await page.waitForTimeout(400);
  const invited = await page.locator("body").innerText();
  note(report.actions, {
    seat: "CM",
    action: "Invite vendor",
    visible: /Jaipur Tile Works/i.test(invited),
  });
  await shot(page, "cm-desktop-commercial-invite");

  // GSTIN via window.prompt on Aravalli Waterproofing
  page.once("dialog", async (d) => {
    note(report.actions, {
      seat: "CM",
      action: "GSTIN prompt",
      type: d.type(),
      message: d.message(),
    });
    await d.accept("08AAAWP7788G1Z9");
  });
  const gstBtn = page.getByRole("button", { name: "GSTIN" });
  if (await gstBtn.count()) {
    await gstBtn.first().click();
    await page.waitForTimeout(400);
    note(report.actions, {
      seat: "CM",
      action: "GSTIN saved via prompt",
      bodyHas: /08AAAWP7788G1Z9|GSTIN saved/i.test(await page.locator("body").innerText()),
    });
  }

  // Advance invited vendor (Aravalli Waterproofing) — GSTIN was missing
  const advanceBtns = page.getByRole("button", { name: "Advance" });
  if (await advanceBtns.count()) {
    await advanceBtns.first().click();
    await page.waitForTimeout(350);
    note(report.actions, {
      seat: "CM",
      action: "Advance vendor",
      after: (await page.locator("body").innerText()).slice(0, 200),
    });
  }

  // Submit PO with inactive vendor if selectable
  await page.getByLabel("Title").fill("Review PO — podium membrane");
  await page.getByRole("button", { name: "Submit PO" }).click();
  await page.waitForTimeout(500);
  const poToast = await page.locator("body").innerText();
  note(report.actions, {
    seat: "CM",
    action: "Submit PO (may be inactive vendor default v1=active)",
    blockedInactive: /cannot be issued until the vendor is Active/i.test(poToast),
    submitted: /waiting in Approvals/i.test(poToast),
  });
  await shot(page, "cm-desktop-commercial-po");

  // Entity switch POs
  const beforePos = await page.locator("body").innerText();
  await (await entitySelect(page)).selectOption({ label: "Aravalli Homes Pvt Ltd" });
  await page.waitForTimeout(400);
  const afterPos = await page.locator("body").innerText();
  note(report.entitySwitch, {
    seat: "CM",
    screen: "commercial",
    beforeLift: /Lift package/i.test(beforePos),
    afterDg: /DG set/i.test(afterPos),
    afterLostLift: !/Lift package/i.test(afterPos),
    afterBaggadContract: /Site grading/i.test(afterPos),
  });
  await shot(page, "cm-desktop-commercial-aravalli");
  await (await entitySelect(page)).selectOption({ label: "Kanakpura Developers LLP" });
  await page.waitForTimeout(200);

  // Quotations flow
  await captureScreen(page, "CM", "cm-desktop-quotations", "/app/quotations");
  await findTime(page, "Compare", "CM compare quotes");
  // Select podium waterproofing RFQ
  const _rfqCards = page.locator("h2:has-text('RFQs') + div").locator("button:has-text('Compare')");
  const nCompare = await page.getByRole("button", { name: "Compare" }).count();
  if (nCompare >= 2) {
    await page.getByRole("button", { name: "Compare" }).nth(1).click();
  } else if (nCompare) {
    await page.getByRole("button", { name: "Compare" }).first().click();
  }
  await page.waitForTimeout(350);
  await shot(page, "cm-desktop-quotations-compare");

  // Try select inactive vendor quote first if Select exists on Aravalli Waterproofing row
  const selectBtns = page.getByRole("button", { name: "Select" });
  const selectCount = await selectBtns.count();
  if (selectCount) {
    // First select is likely inactive vendor q4; try it
    await selectBtns.first().click();
    await page.waitForTimeout(400);
    const sel1 = await page.locator("body").innerText();
    note(report.actions, {
      seat: "CM",
      action: "Select quote #1",
      blockedInactive: /not Active/i.test(sel1),
      selected: /Quote selected/i.test(sel1),
    });
  }
  if ((await selectBtns.count()) > 0) {
    await selectBtns.last().click();
    await page.waitForTimeout(400);
    note(report.actions, {
      seat: "CM",
      action: "Select quote last",
      selected: /Quote selected|Create PO/i.test(await page.locator("body").innerText()),
    });
  }
  const createPo = page.getByRole("button", { name: "Create PO" });
  if (await createPo.count()) {
    await createPo.first().click();
    await page.waitForTimeout(450);
    note(report.actions, {
      seat: "CM",
      action: "Create PO from quote",
      waiting: /waiting in Approvals|PO already/i.test(await page.locator("body").innerText()),
    });
  }
  await shot(page, "cm-desktop-quotations-flow");

  // Raise RFQ
  await page.getByPlaceholder("Waterproofing").fill("Façade glass");
  await page.getByPlaceholder("Podium membrane supply").fill("Tower A façade package");
  await page.getByRole("button", { name: "Raise RFQ" }).click();
  await page.waitForTimeout(400);
  note(report.actions, {
    seat: "CM",
    action: "Raise RFQ",
    visible: /Tower A façade package/i.test(await page.locator("body").innerText()),
  });
  await shot(page, "cm-desktop-quotations-rfq");

  await captureScreen(page, "CM", "cm-desktop-command", "/app");
  await captureScreen(page, "CM", "cm-desktop-phases", "/app/phases");
  await captureScreen(page, "CM", "cm-desktop-projects", "/app/projects");
  await captureScreen(page, "CM", "cm-desktop-audit", "/app/audit");
  await captureScreen(page, "CM", "cm-desktop-assistant", "/app/assistant");

  // Deep-link finance — must NOT look like a Tally poster
  await captureScreen(page, "CM", "cm-desktop-finance-deeplink", "/app/finance");
  const finDeny = await page.locator("body").innerText();
  note(report.actions, {
    seat: "CM",
    action: "deeplink /app/finance",
    denied: /does not post books|not offered/i.test(finDeny),
    siteSeatCopy: /site seats/i.test(finDeny),
    reconcileVisible: await page.getByRole("button", { name: "Reconcile" }).count(),
    noCases: !/ERP invoice missing/i.test(finDeny),
  });

  await gotoPath(page, "/app/capital");
  const capLeak = await page.locator("body").innerText();
  note(report.actions, {
    seat: "CM",
    action: "deeplink /app/capital (not in nav)",
    renderedPlan: /Plan vs reality|Committed total/i.test(capLeak),
    blocked: /does not|not offered/i.test(capLeak),
  });
  await shot(page, "cm-desktop-capital-deeplink");

  await gotoPath(page, "/app/customers");
  const custLeak = await page.locator("body").innerText();
  note(report.actions, {
    seat: "CM",
    action: "deeplink /app/customers (not in nav)",
    collectVisible: await page.getByRole("button", { name: /Collect next installment/i }).count(),
    rendered: /Customers|Book unit/i.test(custLeak),
  });
  await shot(page, "cm-desktop-customers-deeplink");

  await gotoPath(page, "/app/approvals");
  note(report.actions, {
    seat: "CM",
    action: "deeplink /app/approvals",
    rendered: /Approvals|Queue is clear|waiting/i.test(await page.locator("body").innerText()),
    approveCount: await page.getByRole("button", { name: /approve/i }).count(),
  });
  await shot(page, "cm-desktop-approvals-deeplink");

  // Mobile
  await page.setViewportSize({ width: 390, height: 844 });
  await captureScreen(page, "CM", "cm-mobile-commercial", "/app/commercial", {
    viewport: "390x844",
  });
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.waitForTimeout(300);
  const cmMenu = await page.locator("body").innerText();
  report.navFlags.cmMobileHasTally = /\bTally\b/i.test(cmMenu);
  await shot(page, "cm-mobile-menu");
  const ov = page.locator(".fixed.inset-0");
  if (await ov.count())
    await ov
      .first()
      .click({ position: { x: 380, y: 10 } })
      .catch(() => {});
  await captureScreen(page, "CM", "cm-mobile-quotations", "/app/quotations", {
    viewport: "390x844",
  });
  await captureScreen(page, "CM", "cm-mobile-finance-deeplink", "/app/finance", {
    viewport: "390x844",
  });

  report.seats.cm.console = consoleErr;
  report.console.push(...consoleErr);
  await ctx.close();
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
  try {
    await runFinanceLead(browser);
    await runCommercial(browser);
  } catch (err) {
    report.errors.push(String(err?.stack || err));
  } finally {
    await browser.close();
  }

  const outJson = join(OUT, "report.json");
  writeFileSync(outJson, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        ok: report.errors.length === 0,
        screens: report.screens.length,
        finds: report.finds,
        entitySwitch: report.entitySwitch,
        overflow: report.overflow,
        errors: report.errors,
        seats: report.seats,
        actions: report.actions,
        nav: report.nav,
        primaryCounts: report.primaryCounts,
        tallyLanguage: report.tallyLanguage,
        console: report.console,
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
