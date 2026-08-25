#!/usr/bin/env node
/**
 * Role review: Land & Legal + Document Controller.
 * Does not edit application source. Local only — not live.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = process.env.ATLAS_URL || "http://127.0.0.1:8080";
const OUT = join(process.cwd(), "screenshots", "review", "legal");
mkdirSync(OUT, { recursive: true });

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

const SEATS = {
  ll: {
    id: "ll",
    title: "Land & Legal",
    name: "M. Iyer",
    email: "ll@atlas.local",
    password: "AtlasLocal-LL",
    seatButton: "Land & Legal",
    home: "/app/land",
    expectedNav: [
      "Command",
      "All phases",
      "Projects",
      "Documents",
      "Land & legal",
      "Audit",
      "Assistant",
    ],
    forbiddenNav: [
      "Land & legal",
      "Tally",
      "Approvals",
      "Customers",
      "Sales",
      "Site & quality",
      "Controls",
    ],
  },
  dc: {
    id: "dc",
    title: "Document Controller",
    name: "T. Joseph",
    email: "dc@atlas.local",
    password: "AtlasLocal-DC",
    seatButton: "Document Controller",
    home: "/app/documents",
    expectedNav: ["Command", "All phases", "Projects", "Documents", "Audit", "Assistant"],
    forbiddenNav: [
      "Land & legal",
      "Tally",
      "Approvals",
      "Customers",
      "Sales",
      "Site & quality",
      "Controls",
    ],
  },
};

const report = {
  live: false,
  at: new Date().toISOString(),
  seats: {},
  findings: [],
  timings: [],
  screenshots: [],
  console: [],
};

function addFinding(seat, screen, severity, issue) {
  report.findings.push({ seat, screen, severity, issue });
}

function addTiming(seat, screen, label, ms) {
  report.timings.push({ seat, screen, label, ms: Math.round(ms) });
}

async function shot(page, name) {
  const file = `${name}.png`;
  await page.screenshot({ path: join(OUT, file), fullPage: true });
  report.screenshots.push(file);
  return file;
}

async function login(page, user) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.evaluate((keys) => {
    for (const k of keys) localStorage.removeItem(k);
  }, STORAGE_KEYS);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("Local test accounts").waitFor({ timeout: 20000 });
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: user.seatButton, exact: true }).click();
  await page.getByRole("button", { name: /enter local atlas/i }).click();
  await page.waitForURL(/\/app/, { timeout: 25000 });
  await page.locator("h1").first().waitFor({ timeout: 20000 });
}

async function findTime(page, needle, timeout = 10000) {
  const t0 = Date.now();
  try {
    await page.getByText(needle).first().waitFor({ timeout });
    return { found: true, ms: Date.now() - t0 };
  } catch {
    return { found: false, ms: Date.now() - t0 };
  }
}

async function navLabels(page, viewport) {
  if (viewport === "mobile") {
    const menu = page.getByRole("button", { name: /open menu/i });
    if (await menu.isVisible().catch(() => false)) {
      await menu.click();
      await page.waitForTimeout(200);
      const drawer = page.locator("div.fixed.inset-0");
      const text = (await drawer.innerText().catch(() => "")) || "";
      await page
        .locator("div.fixed.inset-0")
        .click({ position: { x: 300, y: 20 } })
        .catch(() => {});
      await page.waitForTimeout(150);
      return text;
    }
  }
  const aside = page.locator("aside nav");
  if (await aside.count()) return aside.innerText().catch(() => "");
  return "";
}

async function _entityOptions(page) {
  const sel = page.locator("header select").first();
  return sel.locator("option").allTextContents();
}

async function setEntityByName(page, name) {
  const sel = page.locator("header select").first();
  const options = await sel.locator("option").all();
  for (const opt of options) {
    const text = (await opt.textContent())?.trim();
    if (text && text.includes(name)) {
      const value = await opt.getAttribute("value");
      await sel.selectOption(value);
      await page.waitForTimeout(350);
      return text;
    }
  }
  return null;
}

async function setProjectByCode(page, code) {
  const sel = page.locator("header select").nth(1);
  const options = await sel.locator("option").all();
  for (const opt of options) {
    const text = (await opt.textContent())?.trim();
    if (text && text.includes(code)) {
      const value = await opt.getAttribute("value");
      await sel.selectOption(value);
      await page.waitForTimeout(350);
      return text;
    }
  }
  return null;
}

async function uxNotes(page, seat, screen) {
  return page.evaluate(
    ({ seat, screen }) => {
      const notes = [];
      if (document.documentElement.scrollWidth > window.innerWidth + 8) {
        notes.push({
          seat,
          screen,
          severity: "p2",
          issue: "Horizontal overflow on this viewport.",
        });
      }
      const title = document.querySelector("h1");
      if (!title) notes.push({ seat, screen, severity: "p3", issue: "No visible h1 title." });
      const jade = getComputedStyle(document.documentElement).getPropertyValue("--primary") || "";
      void jade;
      const buttons = [...document.querySelectorAll("button")].filter((b) => {
        const s = getComputedStyle(b);
        return s.backgroundColor.includes("29, 79, 66") || s.backgroundColor.includes("31, 79");
      });
      if (buttons.length > 3) {
        notes.push({
          seat,
          screen,
          severity: "p3",
          issue: `Many primary-looking buttons (${buttons.length}) — density of jade actions.`,
        });
      }
      return notes;
    },
    { seat, screen },
  );
}

async function gotoPath(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.locator("h1").first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(200);
}

async function reviewLandLegal(page, viewport) {
  const seat = "Land & Legal";
  const tag = `ll-${viewport}`;
  const rec = {
    home: null,
    nav: "",
    entitySwitch: {},
    actions: {},
    leaks: {},
    find: {},
  };

  rec.home = new URL(page.url()).pathname;
  if (rec.home !== "/app/land")
    addFinding(seat, "home", "p0", `Expected home /app/land, landed on ${rec.home}.`);

  rec.nav = await navLabels(page, viewport);
  for (const item of SEATS.ll.expectedNav) {
    if (!rec.nav.includes(item))
      addFinding(seat, "nav", "p1", `Missing expected nav item "${item}".`);
  }
  if (/\bTally\b/i.test(rec.nav))
    addFinding(seat, "nav", "p0", "Tally leaked into Land & Legal nav.");
  if (/Approvals/i.test(rec.nav))
    addFinding(
      seat,
      "nav",
      "p2",
      "Approvals visible — this seat cannot four-eyes its own export requests.",
    );
  if (/Customers|Sales|Site & quality|Controls|Owner decisions/i.test(rec.nav)) {
    addFinding(seat, "nav", "p2", "Unexpected commercial/site/owner nav on legal desk.");
  }

  // Land home — 5-second find
  const landTitle = await findTime(page, "Land & legal");
  rec.find.title = landTitle;
  addTiming(seat, "/app/land", "title", landTitle.ms);
  if (!landTitle.found || landTitle.ms > 10000)
    addFinding(seat, "/app/land", "p0", "Title 'Land & legal' not found <10s.");

  const overdue = await findTime(page, "BOCW cess return");
  rec.find.overdue = overdue;
  addTiming(seat, "/app/land", "overdue filing", overdue.ms);
  if (!overdue.found)
    addFinding(seat, "/app/land", "p1", "Overdue BOCW cess return not visible on default entity.");

  const dueDate = await findTime(page, "Due 2026-08-31");
  rec.find.dueDate = dueDate;
  addTiming(seat, "/app/land", "obligation due date", dueDate.ms);

  const rera = await findTime(page, "RAJ/P/2024/1288");
  rec.find.rera = rera;
  addTiming(seat, "/app/land", "RERA number", rera.ms);

  rec.find.encumbranceOnDefaultLlp = (await page.getByText("Encumbrance").count()) > 0;
  rec.find.cluOnDefaultLlp = (await page.getByText("Conversion / CLU").count()) > 0;

  const baggadOnLlp = await page.getByText("RIICO plot 18 Baggad").count();
  rec.actions.baggadOnDefaultLlp = baggadOnLlp;
  if (baggadOnLlp > 0)
    addFinding(
      seat,
      "/app/land",
      "p0",
      "Baggad parcel (Homes entity) leaked onto LLP default entity.",
    );

  await shot(page, `${tag}-land-home`);

  const landText = await page.locator("main").innerText();
  rec.actions.landHasAddParcel = /add parcel|new parcel|register parcel/i.test(landText);
  rec.actions.landHasAddObligation = /add obligation|new filing|new obligation/i.test(landText);
  rec.actions.landHasAttach = /attach|upload|evidence|acknowledgement|challan/i.test(landText);
  rec.actions.landHasSearch = (await page.locator("main input").count()) > 0;
  rec.actions.landHasNaConversionField =
    /NA conversion|7\/12|sale deed|mutation|power of attorney/i.test(landText);
  if (!rec.actions.landHasAddParcel)
    addFinding(seat, "/app/land", "p1", "No way to add a parcel from the land register.");
  if (!rec.actions.landHasAddObligation)
    addFinding(
      seat,
      "/app/land",
      "p1",
      "No way to add a statutory obligation (RERA, NA, labour, insurance).",
    );
  if (!rec.actions.landHasAttach)
    addFinding(
      seat,
      "/app/land",
      "p1",
      "Mark filed has no evidence/challan/acknowledgement attach.",
    );
  if (!rec.actions.landHasSearch)
    addFinding(seat, "/app/land", "p2", "No search on khasra / RERA / parcel name.");

  // Mark overdue obligation
  const markFiled = page.getByRole("button", { name: /mark filed/i }).first();
  if (await markFiled.count()) {
    await markFiled.click();
    await page.waitForTimeout(400);
    rec.actions.markFiled = true;
    const after = await page.locator("main").innerText();
    rec.actions.bocwStillOverdue = /BOCW cess return[\s\S]{0,200}overdue/i.test(
      after.replace(/\n/g, " "),
    );
    await shot(page, `${tag}-land-filed`);
  } else {
    rec.actions.markFiled = false;
    addFinding(seat, "/app/land", "p1", "No Mark filed control on visible obligations.");
  }

  // Diligence + blocked acquire
  await setEntityByName(page, "Aravalli Homes");
  await page.waitForTimeout(400);
  const baggad = await findTime(page, "RIICO plot 18 Baggad");
  rec.find.baggadAfterEntity = baggad;
  addTiming(seat, "/app/land", "entity switch → Baggad", baggad.ms);
  if (!baggad.found)
    addFinding(
      seat,
      "/app/land",
      "p0",
      "Entity switch to Aravalli Homes did not show Baggad parcel.",
    );
  const kanakAfterHomes = await page.getByText("Khasra 214/2 Kanakpura").count();
  rec.entitySwitch.kanakOnHomes = kanakAfterHomes;
  if (kanakAfterHomes > 0)
    addFinding(
      seat,
      "/app/land",
      "p0",
      "Kanakpura parcel still visible after switching to Aravalli Homes.",
    );
  await shot(page, `${tag}-land-homes`);

  const acquire = page.getByRole("button", { name: /complete acquisition/i });
  rec.actions.acquireVisible = (await acquire.count()) > 0;
  if (rec.actions.acquireVisible) {
    await acquire.first().click();
    await page.waitForTimeout(500);
    const toast = await page
      .locator("[data-sonner-toast], li[data-type], [role='status']")
      .allTextContents();
    rec.actions.acquireToast = toast.join(" | ");
    const body = await page.locator("body").innerText();
    rec.actions.acquireBlocked = /due-diligence|must be clear/i.test(
      body + rec.actions.acquireToast,
    );
    if (!rec.actions.acquireBlocked) {
      addFinding(
        seat,
        "/app/land",
        "p0",
        "Acquisition did not refuse while diligence is open/flagged.",
      );
    }
    await shot(page, `${tag}-land-acquire-blocked`);
  }

  const flagBtn = page.getByRole("button", { name: /^Flag$/ });
  const clearBtn = page.getByRole("button", { name: /^Clear$/ });
  rec.actions.flagCount = await flagBtn.count();
  rec.actions.clearCount = await clearBtn.count();
  if (rec.actions.clearCount) {
    await clearBtn.first().click();
    await page.waitForTimeout(300);
    rec.actions.clearedOne = true;
  }

  // Project filter
  await setProjectByCode(page, "BGH-02");
  const afterProj = await page.locator("main").innerText();
  rec.entitySwitch.projectFilterBaggad = /RIICO plot 18 Baggad/.test(afterProj);
  rec.entitySwitch.projectFilterMansarHidden = !/Mansarovar Sector 6/.test(afterProj);
  if (!rec.entitySwitch.projectFilterBaggad || !rec.entitySwitch.projectFilterMansarHidden) {
    addFinding(
      seat,
      "/app/land",
      "p1",
      "Project filter did not isolate Baggad from Mansarovar parcels.",
    );
  }
  await shot(page, `${tag}-land-project-filter`);
  await setProjectByCode(page, "All projects");

  // Command on default LLP (statutory overdue lives here)
  await setEntityByName(page, "Kanakpura Developers");
  await gotoPath(page, "/app");
  const cmdTitle = await findTime(page, "Are we on track");
  rec.find.command = cmdTitle;
  addTiming(seat, "/app", "command title", cmdTitle.ms);
  const cmd = await page.locator("main").innerText();
  rec.actions.commandHasStatutory = /statutory/i.test(cmd);
  rec.actions.commandHasCollections = /collections/i.test(cmd);
  rec.actions.commandHasApprovals = /approvals waiting/i.test(cmd);
  rec.actions.commandHasQuality = /failed inspection/i.test(cmd);
  if (!rec.actions.commandHasStatutory) {
    addFinding(
      seat,
      "/app",
      "p1",
      "Command does not surface statutory overdue as a first-class KPI for Legal.",
    );
  }
  if (rec.actions.commandHasCollections && rec.actions.commandHasQuality) {
    addFinding(
      seat,
      "/app",
      "p2",
      "Legal Command is a generic office dashboard (collections / inspections / spend) not a land/legal queue.",
    );
  }
  await shot(page, `${tag}-command`);
  const cmdUx = await uxNotes(page, seat, "/app");
  report.findings.push(...cmdUx);

  // Phases — leak links
  await gotoPath(page, "/app/phases");
  await shot(page, `${tag}-phases`);
  rec.actions.phasesHasTallyLink = (await page.getByText("Tally").count()) > 0;
  rec.actions.phasesHasLandLink = (await page.getByText("Land & legal").count()) > 0;

  // Projects
  await gotoPath(page, "/app/projects");
  const projFind = await findTime(page, "Projects");
  rec.find.projects = projFind;
  addTiming(seat, "/app/projects", "title", projFind.ms);
  rec.actions.projectsNewButton = await page.getByRole("button", { name: /new project/i }).count();
  await shot(page, `${tag}-projects`);

  // Documents — reset to LLP so Kanakpura drawings are in scope
  await setEntityByName(page, "Kanakpura Developers");
  await gotoPath(page, "/app/documents");
  const docTitle = await findTime(page, "Documents");
  rec.find.documents = docTitle;
  addTiming(seat, "/app/documents", "title", docTitle.ms);
  const drawingRev = await findTime(page, "R4");
  rec.find.drawingRevision = drawingRev;
  addTiming(seat, "/app/documents", "drawing revision R4", drawingRev.ms);
  if (!drawingRev.found)
    addFinding(
      seat,
      "/app/documents",
      "p1",
      "Drawing revision R4 (Architectural GA) not found <10s on LLP.",
    );
  await shot(page, `${tag}-documents`);

  const previewBtn = page.getByRole("button", { name: /watermarked preview/i }).first();
  if (await previewBtn.count()) {
    await previewBtn.click();
    await page.waitForTimeout(500);
    rec.actions.previewOpened = (await page.getByText(/watermarked/i).count()) > 0;
    rec.actions.previewStamp = (await page.getByText(/M\. Iyer/i).count()) > 0;
    rec.actions.previewTimer = (await page.getByText(/\d{2}:\d{2}/).count()) > 0;
    await shot(page, `${tag}-preview`);
    const close = page.getByRole("button", { name: /close preview/i });
    if (await close.count()) await close.click();
    else await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  } else {
    rec.actions.previewOpened = false;
    addFinding(seat, "/app/documents", "p1", "No Watermarked preview button visible.");
  }

  const register = page.getByRole("button", { name: /register file/i });
  rec.actions.registerFile = (await register.count()) > 0;
  if (rec.actions.registerFile) {
    await register.click();
    await page.waitForTimeout(250);
    rec.actions.registerHasFileInput = (await page.locator("input[type=file]").count()) > 0;
    if (!rec.actions.registerHasFileInput) {
      addFinding(
        seat,
        "/app/documents",
        "p1",
        "Register file is metadata-only — no actual file upload.",
      );
    }
    await page.getByLabel(/^Title$/i).fill("Legal review — NA conversion pack");
    await page.getByRole("button", { name: /^Register$/ }).click();
    await page.waitForTimeout(400);
    rec.actions.registered =
      (await page.getByText("Legal review — NA conversion pack").count()) > 0;
    await shot(page, `${tag}-documents-registered`);
  }

  // Approvals leak
  await gotoPath(page, "/app/approvals");
  rec.leaks.approvalsPath = new URL(page.url()).pathname;
  rec.leaks.approvalsBody = (
    await page
      .locator("main")
      .innerText()
      .catch(() => "")
  ).slice(0, 400);
  const approvalsRendered = /Approvals|Queue is clear|waitingOn/i.test(rec.leaks.approvalsBody);
  rec.leaks.approvalsRendered = approvalsRendered;
  if (approvalsRendered)
    addFinding(
      seat,
      "/app/approvals",
      "p1",
      "Deep-link /app/approvals renders the queue — legal cannot four-eyes, but the page is unguarded.",
    );
  await shot(page, `${tag}-leak-approvals`);

  // Finance leak
  await gotoPath(page, "/app/finance");
  rec.leaks.financePath = new URL(page.url()).pathname;
  rec.leaks.financeBody = (
    await page
      .locator("main")
      .innerText()
      .catch(() => "")
  ).slice(0, 500);
  rec.leaks.financeDenied = /does not post books|not offered/i.test(rec.leaks.financeBody);
  rec.leaks.financeHasReconcile = /Reconcile|Tally reconciliation/i.test(rec.leaks.financeBody);
  if (!rec.leaks.financeDenied && rec.leaks.financeHasReconcile) {
    addFinding(
      seat,
      "/app/finance",
      "p0",
      "Deep-link /app/finance leaked Tally reconcile actions to Legal.",
    );
  }
  await shot(page, `${tag}-leak-finance`);

  // Audit + assistant
  await gotoPath(page, "/app/audit");
  rec.find.audit = await findTime(page, "Audit trail");
  await shot(page, `${tag}-audit`);
  await gotoPath(page, "/app/assistant");
  rec.find.assistantFailClosed = (await page.getByText("Fail-closed").count()) > 0;
  rec.find.assistantDraft =
    (await page.getByRole("button", { name: /draft \(level 2\)/i }).count()) > 0;
  await shot(page, `${tag}-assistant`);

  report.seats[tag] = rec;
}

async function reviewDocs(page, viewport) {
  const seat = "Document Controller";
  const tag = `dc-${viewport}`;
  const rec = {
    home: null,
    nav: "",
    entitySwitch: {},
    actions: {},
    leaks: {},
    find: {},
  };

  rec.home = new URL(page.url()).pathname;
  if (rec.home !== "/app/documents")
    addFinding(seat, "home", "p0", `Expected home /app/documents, landed on ${rec.home}.`);

  rec.nav = await navLabels(page, viewport);
  if (/Land & legal/i.test(rec.nav))
    addFinding(seat, "nav", "p0", "Document Controller nav includes Land & legal.");
  if (/\bTally\b/i.test(rec.nav))
    addFinding(seat, "nav", "p0", "Tally leaked into Document Controller nav.");
  for (const item of SEATS.dc.expectedNav) {
    if (!rec.nav.includes(item))
      addFinding(seat, "nav", "p1", `Missing expected nav item "${item}".`);
  }

  const title = await findTime(page, "Documents");
  rec.find.title = title;
  addTiming(seat, "/app/documents", "title", title.ms);
  const rev = await findTime(page, "R4");
  rec.find.drawingRevision = rev;
  addTiming(seat, "/app/documents", "drawing revision R4", rev.ms);
  rec.find.reraCertOnDefaultLlp =
    (await page.getByText("RERA Registration Certificate").count()) > 0;
  rec.actions.defaultHasBaggadSoil =
    (await page.getByText("Soil Investigation Report").count()) > 0;
  if (rec.actions.defaultHasBaggadSoil) {
    addFinding(seat, "/app/documents", "p0", "Baggad soil report visible on default LLP entity.");
  }
  await shot(page, `${tag}-documents-home`);

  // Kind filter
  const statutory = page.getByRole("button", { name: /^Statutory$/ });
  if (await statutory.count()) {
    await statutory.click();
    await page.waitForTimeout(300);
    const t = await page.locator("main").innerText();
    rec.actions.statFilterShowsJda = /JDA Layout Approval/.test(t);
    rec.actions.statFilterHidesGa = !/Architectural GA/.test(t);
    if (!rec.actions.statFilterShowsJda || !rec.actions.statFilterHidesGa) {
      addFinding(
        seat,
        "/app/documents",
        "p1",
        "Kind filter Statutory did not isolate statutory files from drawings.",
      );
    }
    await shot(page, `${tag}-filter-statutory`);
    await page.getByRole("button", { name: /^all$/i }).click();
    await page.waitForTimeout(200);
  }

  // Preview
  const previewBtn = page.getByRole("button", { name: /watermarked preview/i }).first();
  if (await previewBtn.count()) {
    await previewBtn.click();
    await page.waitForTimeout(500);
    rec.actions.previewOpened = true;
    rec.actions.previewActor = (await page.getByText(/T\. Joseph/i).count()) > 0;
    rec.actions.previewWatermark = (await page.getByText(/watermarked/i).count()) > 0;
    rec.actions.previewRequestOriginal =
      (await page.getByRole("button", { name: /request original/i }).count()) > 0;
    await shot(page, `${tag}-preview`);
    const close = page.getByRole("button", { name: /close preview/i });
    if (await close.count()) await close.click();
    await page.waitForTimeout(250);
  } else {
    rec.actions.previewOpened = false;
    addFinding(seat, "/app/documents", "p1", "No Watermarked preview on DC home.");
  }

  // Quarantine clear
  const clearScan = page.getByRole("button", { name: /clear scan/i }).first();
  rec.actions.quarantineVisible = (await clearScan.count()) > 0;
  if (rec.actions.quarantineVisible) {
    await clearScan.click();
    await page.waitForTimeout(350);
    rec.actions.clearedScan = true;
    await shot(page, `${tag}-cleared-scan`);
  }

  // New revision
  const revInput = page.getByPlaceholder("Revision notes").first();
  if (await revInput.count()) {
    await revInput.fill("IFC lift overrun — issued for construction");
    await page
      .getByRole("button", { name: /new revision/i })
      .first()
      .click();
    await page.waitForTimeout(400);
    rec.actions.newRevision = (await page.getByText("IFC lift overrun").count()) > 0;
    await shot(page, `${tag}-new-revision`);
  } else {
    rec.actions.newRevision = false;
    addFinding(seat, "/app/documents", "p2", "Revision notes field not found.");
  }

  // Register
  const register = page.getByRole("button", { name: /register file/i });
  if (await register.count()) {
    await register.click();
    await page.waitForTimeout(200);
    rec.actions.registerHasFileInput = (await page.locator("input[type=file]").count()) > 0;
    rec.actions.registerHasTransmittal =
      (await page.getByText(/transmittal|discipline|issued to/i).count()) > 0;
    await page.getByLabel(/^Title$/i).fill("Site IFC — Tower B raft");
    await page.getByRole("button", { name: /^Register$/ }).click();
    await page.waitForTimeout(400);
    rec.actions.registered = (await page.getByText("Site IFC — Tower B raft").count()) > 0;
    await shot(page, `${tag}-registered`);
    if (!rec.actions.registerHasFileInput) {
      addFinding(
        seat,
        "/app/documents",
        "p1",
        "DC register is metadata-only — cannot attach the actual drawing/PDF.",
      );
    }
  }

  // Request original
  const reqOrig = page.getByRole("button", { name: /request original/i }).first();
  if (await reqOrig.count()) {
    await reqOrig.click();
    await page.waitForTimeout(400);
    rec.actions.requestOriginal = true;
    const body = await page.locator("body").innerText();
    rec.actions.exportQueued = /four-eyes|waiting approval|queued/i.test(body);
    await shot(page, `${tag}-export-request`);
  }

  rec.actions.hasSearch = (await page.locator("main input[placeholder]").count()) > 0;
  rec.actions.hasExpiry = (await page.getByText(/expir|validity|renewal/i).count()) > 0;
  if (!rec.actions.hasSearch)
    addFinding(
      seat,
      "/app/documents",
      "p2",
      "No document search (sheet, SHA, title). Kind chips only.",
    );
  if (!rec.actions.hasExpiry)
    addFinding(
      seat,
      "/app/documents",
      "p1",
      "No expiry / validity reminder on statutory certificates.",
    );

  // Entity switch
  await setEntityByName(page, "Aravalli Homes");
  await page.waitForTimeout(350);
  const after = await page.locator("main").innerText();
  rec.entitySwitch.showsSoil = /Soil Investigation Report/.test(after);
  rec.entitySwitch.hidesKanakGa = !/Architectural GA — Tower A/.test(after);
  rec.entitySwitch.showsReraMansar = /RERA Registration Certificate/.test(after);
  if (!rec.entitySwitch.showsSoil || !rec.entitySwitch.hidesKanakGa) {
    addFinding(
      seat,
      "/app/documents",
      "p0",
      "Entity switch did not change document rows (Kanakpura vs Homes).",
    );
  }
  await shot(page, `${tag}-entity-homes`);
  await setProjectByCode(page, "MSE-03");
  const mansarOnly = await page.locator("main").innerText();
  rec.entitySwitch.projectMansarOnly =
    /RERA Registration Certificate/.test(mansarOnly) &&
    !/Soil Investigation Report/.test(mansarOnly);
  if (!rec.entitySwitch.projectMansarOnly) {
    addFinding(
      seat,
      "/app/documents",
      "p1",
      "Project filter did not isolate Mansarovar documents from Baggad.",
    );
  }
  await shot(page, `${tag}-project-mansar`);
  await setProjectByCode(page, "All projects");

  // Command leak via queue — LLP has the overdue BOCW item
  await setEntityByName(page, "Kanakpura Developers");
  await gotoPath(page, "/app");
  const cmd = await page.locator("main").innerText();
  rec.actions.commandStatutoryLink = /statutory overdue/i.test(cmd);
  rec.actions.commandApprovalsLink = /approvals waiting/i.test(cmd);
  rec.actions.commandSiteLink = /failed inspection/i.test(cmd);
  if (rec.actions.commandStatutoryLink) {
    addFinding(
      seat,
      "/app",
      "p1",
      "Command queue offers Statutory overdue → /app/land, a module DC must not see.",
    );
  }
  await shot(page, `${tag}-command`);

  // Phases land card
  await gotoPath(page, "/app/phases");
  rec.leaks.phasesLandCard = (await page.getByText("Land & legal").count()) > 0;
  rec.leaks.phasesTallyCard = (await page.getByText("Tally").count()) > 0;
  if (rec.leaks.phasesLandCard)
    addFinding(
      seat,
      "/app/phases",
      "p1",
      "All phases lists Land & legal and links into it for a seat that must not see Land.",
    );
  await shot(page, `${tag}-phases`);

  // Deep-link land
  await gotoPath(page, "/app/land");
  rec.leaks.landPath = new URL(page.url()).pathname;
  rec.leaks.landBody = (
    await page
      .locator("main")
      .innerText()
      .catch(() => "")
  ).slice(0, 800);
  rec.leaks.landTitle = /Land & legal/.test(rec.leaks.landBody);
  rec.leaks.landParcels = /Khasra|RIICO|RERA/.test(rec.leaks.landBody);
  rec.leaks.landMutate = /Mark filed|Complete acquisition|Clear/.test(rec.leaks.landBody);
  if (rec.leaks.landTitle && rec.leaks.landParcels) {
    addFinding(
      seat,
      "/app/land",
      "p0",
      "Deep-link /app/land renders the full land register to Document Controller (nav hide only, no route guard).",
    );
  }
  if (rec.leaks.landMutate) {
    addFinding(
      seat,
      "/app/land",
      "p0",
      "DC can mutate land (Mark filed / Clear diligence / Complete acquisition) via deep-link.",
    );
  }
  await shot(page, `${tag}-leak-land`);

  if (rec.leaks.landMutate) {
    const filed = page.getByRole("button", { name: /mark filed/i }).first();
    if (await filed.count()) {
      await filed.click();
      await page.waitForTimeout(300);
      rec.leaks.dcFiledObligation = true;
      addFinding(
        seat,
        "/app/land",
        "p0",
        "Confirmed: DC clicked Mark filed on a statutory obligation and the control accepted it.",
      );
    }
  }

  // Deep-link finance
  await gotoPath(page, "/app/finance");
  rec.leaks.financePath = new URL(page.url()).pathname;
  rec.leaks.financeBody = (
    await page
      .locator("main")
      .innerText()
      .catch(() => "")
  ).slice(0, 500);
  rec.leaks.financeDenied = /does not post books|not offered/i.test(rec.leaks.financeBody);
  rec.leaks.financeReconcile = /Reconcile/.test(rec.leaks.financeBody);
  if (rec.leaks.financeReconcile && !rec.leaks.financeDenied) {
    addFinding(
      seat,
      "/app/finance",
      "p0",
      "Deep-link /app/finance leaked Tally reconcile to Document Controller.",
    );
  } else if (rec.leaks.financeDenied) {
    addFinding(
      seat,
      "/app/finance",
      "p3",
      "Finance deep-link is denied in-page (good) but still reachable — prefer a 403/home redirect.",
    );
  }
  await shot(page, `${tag}-leak-finance`);

  await gotoPath(page, "/app/projects");
  await shot(page, `${tag}-projects`);
  await gotoPath(page, "/app/audit");
  await shot(page, `${tag}-audit`);
  await gotoPath(page, "/app/assistant");
  await shot(page, `${tag}-assistant`);

  report.seats[tag] = rec;
}

async function runSeat(browser, seatKey, viewport) {
  const user = SEATS[seatKey];
  const vp =
    viewport === "mobile"
      ? { width: 390, height: 844, isMobile: true }
      : { width: 1280, height: 800 };
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: Boolean(vp.isMobile),
    userAgent: vp.isMobile
      ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      : undefined,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  try {
    await login(page, user);
    if (viewport === "mobile") {
      const menu = page.getByRole("button", { name: /open menu/i });
      if (await menu.isVisible().catch(() => false)) {
        await menu.click();
        await page.waitForTimeout(250);
        await shot(page, `${seatKey}-${viewport}-nav`);
        await page
          .locator("div.fixed.inset-0")
          .click({ position: { x: 340, y: 12 } })
          .catch(() => {});
        await page.waitForTimeout(150);
      }
    }
    if (seatKey === "ll") await reviewLandLegal(page, viewport);
    else await reviewDocs(page, viewport);
  } catch (err) {
    addFinding(user.title, viewport, "p0", `Runner crashed: ${err.message}`);
    await shot(page, `${seatKey}-${viewport}-crash`).catch(() => {});
  }
  report.console.push({ seat: user.title, viewport, errors });
  if (errors.length) {
    addFinding(
      user.title,
      viewport,
      "p1",
      `Browser console errors: ${errors.slice(0, 3).join(" | ")}`,
    );
  }
  await context.close();
}

async function main() {
  let serverOk = false;
  for (let i = 0; i < 20; i++) {
    try {
      const r = await fetch(BASE, { signal: AbortSignal.timeout(2000) });
      serverOk = r.ok || r.status === 200;
      if (serverOk) break;
    } catch {
      serverOk = false;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (!serverOk) {
    console.error(JSON.stringify({ ok: false, error: `Atlas is not running at ${BASE}` }));
    process.exit(2);
  }

  const browser = await chromium.launch({ headless: true });
  await runSeat(browser, "ll", "desktop");
  await runSeat(browser, "ll", "mobile");
  await runSeat(browser, "dc", "desktop");
  await runSeat(browser, "dc", "mobile");
  await browser.close();

  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        ok: true,
        findings: report.findings.length,
        screenshots: report.screenshots.length,
        out: OUT,
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
