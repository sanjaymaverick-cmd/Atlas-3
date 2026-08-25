#!/usr/bin/env node
/**
 * Site Engineer + Site Supervisor UX review. Local only. Does not edit app source.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = process.env.ATLAS_URL || "http://127.0.0.1:8080";
const OUT = join(process.cwd(), "screenshots", "review", "site");
mkdirSync(OUT, { recursive: true });

const FORBIDDEN_NAV = [
  "Tally",
  "Sales",
  "Capital",
  "Owner decisions",
  "Handover",
  "Inventory",
  "Pipeline",
  "Channel desk",
];
const SITE_NAV = [
  "Command",
  "All phases",
  "Projects",
  "Site & quality",
  "Controls",
  "Change control",
  "Audit",
  "Assistant",
];

const SEATS = [
  {
    key: "se",
    email: "se@atlas.local",
    password: "AtlasLocal-SE",
    button: "Site Engineer",
    name: "K. Rathore",
    title: "Site Engineer",
    expectDocuments: true,
  },
  {
    key: "sv",
    email: "sv@atlas.local",
    password: "AtlasLocal-SV",
    button: "Site Supervisor",
    name: "D. Chauhan",
    title: "Site Supervisor",
    expectDocuments: false,
  },
];

const report = { at: new Date().toISOString(), live: false, seats: {}, findings: [] };

function note(severity, seat, screen, issue) {
  report.findings.push({ severity, seat, screen, issue });
}

async function login(page, seat) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) localStorage.removeItem(k);
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("Local test accounts").waitFor({ timeout: 20000 });
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: seat.button, exact: true }).click();
  await page.getByRole("button", { name: /enter local atlas/i }).click();
  await page.locator("h1").waitFor({ timeout: 25000 });
}

async function ready(page) {
  await page.locator("h1").first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(250);
}

async function shot(page, name, full = true) {
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: full });
}

async function metrics(page) {
  return page.evaluate(() => {
    const overflow = document.documentElement.scrollWidth > window.innerWidth + 8;
    const buttons = [...document.querySelectorAll("main button, main [role='button']")].map(
      (el) => {
        const r = el.getBoundingClientRect();
        return {
          text: (el.innerText || "").replace(/\s+/g, " ").trim().slice(0, 56),
          h: Math.round(r.height),
          w: Math.round(r.width),
        };
      },
    );
    const fields = [...document.querySelectorAll("main input, main textarea, main select")].map(
      (el) => {
        const r = el.getBoundingClientRect();
        const label =
          el.closest("label")?.querySelector("span")?.textContent ||
          el.getAttribute("aria-label") ||
          el.id ||
          el.type;
        return { label, tag: el.tagName, h: Math.round(r.height), type: el.type };
      },
    );
    return {
      overflow,
      innerW: window.innerWidth,
      scrollW: document.documentElement.scrollWidth,
      title: document.querySelector("h1")?.textContent?.trim() || "",
      buttons,
      fields,
    };
  });
}

function navItems(text) {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function collectNav(page, mobile) {
  if (mobile) {
    const menu = page.getByRole("button", { name: /open menu/i });
    if (await menu.isVisible()) {
      await menu.click();
      await page.waitForTimeout(250);
      const text = await page
        .locator("div.fixed.inset-0")
        .innerText()
        .catch(() => "");
      await page.keyboard.press("Escape").catch(() => {});
      await page
        .locator("div.fixed.inset-0")
        .click({ position: { x: 360, y: 24 } })
        .catch(() => {});
      await page.waitForTimeout(150);
      return navItems(text);
    }
  }
  return navItems(
    await page
      .locator("aside nav")
      .innerText()
      .catch(() => ""),
  );
}

async function bodyText(page) {
  return page.locator("body").innerText();
}

async function gotoApp(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await ready(page);
}

async function clickNav(page, label, mobile) {
  if (mobile) {
    await page.getByRole("button", { name: /open menu/i }).click();
    await page.waitForTimeout(200);
    await page.locator("div.fixed.inset-0").getByRole("link", { name: label, exact: true }).click();
  } else {
    await page.locator("aside nav").getByRole("link", { name: label, exact: true }).click();
  }
  await ready(page);
}

async function step(rec, name, fn) {
  try {
    await fn();
  } catch (err) {
    rec.errors = rec.errors || [];
    rec.errors.push(`${name}: ${String(err?.message || err).slice(0, 240)}`);
  }
}

async function runDesktop(page, seat, rec) {
  const prefix = `${seat.key}-desk`;
  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(e.message));

  rec.homePath = new URL(page.url()).pathname;
  rec.homeOk = rec.homePath === "/app/site";
  if (!rec.homeOk)
    note("p1", seat.title, rec.homePath, `Home was ${rec.homePath}, expected /app/site.`);

  const identity = await page.locator("aside").innerText();
  rec.identity = identity.includes(seat.name) && identity.includes(seat.title);
  if (!rec.identity)
    note("p1", seat.title, "/app/site", `Sidebar missing ${seat.name} / ${seat.title}.`);

  const t0 = Date.now();
  await page.getByRole("button", { name: /seal diary/i }).waitFor({ timeout: 8000 });
  rec.findDiaryMs = Date.now() - t0;

  rec.site = await metrics(page);
  rec.nav = await collectNav(page, false);
  rec.documentsInNav = rec.nav.some((n) => /^Documents$/i.test(n));
  rec.forbiddenNav = FORBIDDEN_NAV.filter((n) => rec.nav.some((x) => x === n || x.startsWith(n)));
  rec.missingSiteNav = SITE_NAV.filter((n) => !rec.nav.some((x) => x === n || x.startsWith(n)));
  rec.tallyInNav = /\bTally\b/i.test(rec.nav.join("\n"));
  if (seat.expectDocuments && !rec.documentsInNav)
    note("p2", seat.title, "nav", "Documents missing from engineer nav.");
  if (!seat.expectDocuments && rec.documentsInNav)
    note("p1", seat.title, "nav", "Documents visible to supervisor.");
  for (const leak of rec.forbiddenNav)
    note("p1", seat.title, "nav", `Forbidden nav item visible: ${leak}`);
  if (rec.tallyInNav) note("p0", seat.title, "nav", "Tally on a site seat nav.");

  await shot(page, `${prefix}-site-home`);
  await shot(page, `${prefix}-site-home-view`, false);

  await step(rec, "diary", async () => {
    const work = `${seat.key.toUpperCase()} dusty-afternoon diary — Tower A L13 pour watch.`;
    await page.getByLabel("Labour on site").fill("96");
    await page.getByLabel("Weather").fill("Dust, 39°C");
    await page.getByLabel("Major work").fill(work);
    await page.getByRole("button", { name: /seal diary/i }).click();
    await page.waitForTimeout(400);
    const after = await bodyText(page);
    rec.diarySealed = after.includes("Diary sealed") || after.includes(work);
    rec.diaryHardcodedSafety = /Nil\./.test(after);
    rec.diaryHardcodedMaterials = false;
    await shot(page, `${prefix}-diary-sealed`);
    await shot(page, `${prefix}-diary-sealed-view`, false);
  });

  await step(rec, "fail-inspection", async () => {
    const failBtn = page.getByRole("button", { name: /^Fail$/i }).first();
    rec.pendingInspection = await failBtn.isVisible();
    if (rec.pendingInspection) {
      await failBtn.click();
      await page.waitForTimeout(400);
      rec.failToast = /Failed|NCR/i.test(await bodyText(page));
    }
    await shot(page, `${prefix}-inspection-fail-view`, false);
    await page.getByRole("heading", { name: /inspections/i }).scrollIntoViewIfNeeded();
    await shot(page, `${prefix}-inspection-fail`);
  });

  await step(rec, "schedule", async () => {
    await page.locator("#tpl").fill("Dusty-afternoon cubicle check");
    await page.locator("#loc").fill("Tower A L13");
    await page.getByRole("button", { name: /^Schedule$/i }).click();
    await page.waitForTimeout(400);
    rec.scheduled = /Dusty-afternoon cubicle check/i.test(await bodyText(page));
    await shot(page, `${prefix}-inspection-scheduled`);
    const passBtn = page.getByRole("button", { name: /^Pass$/i }).first();
    if (await passBtn.isVisible()) {
      await passBtn.click();
      rec.passedScheduled = true;
      await page.waitForTimeout(250);
    }
  });

  await step(rec, "command", async () => {
    await clickNav(page, "Command", false);
    rec.command = await metrics(page);
    rec.commandText = (await bodyText(page)).slice(0, 2000);
    rec.commandLandLink = /Statutory/i.test(rec.commandText);
    rec.commandTally = /\bTally\b/i.test(rec.commandText);
    rec.commandKpis = {
      failed: /Failed inspections/i.test(rec.commandText),
      ncr: /Open NCRs/i.test(rec.commandText),
      statutory: /Statutory open/i.test(rec.commandText),
      diary: /Today/i.test(rec.commandText),
    };
    if (rec.commandTally) note("p0", seat.title, "/app", "Tally copy on site Command.");
    await shot(page, `${prefix}-command`);
    await shot(page, `${prefix}-command-view`, false);
    if (rec.commandLandLink) {
      const landChip = page.getByRole("link", { name: /statutory/i }).first();
      if (await landChip.isVisible()) {
        await landChip.click();
        await ready(page);
        rec.commandLandPath = new URL(page.url()).pathname;
        rec.landFromCommand = (await bodyText(page)).slice(0, 900);
        rec.landMutations = /Acquire|File obligation|Pay EMI|Mark clear/i.test(rec.landFromCommand);
        if (rec.commandLandPath === "/app/land") {
          note("p1", seat.title, "/app", "Command queue deep-links site seats into Land & legal.");
        }
        await shot(page, `${prefix}-land-from-command`);
      }
    }
  });

  await step(rec, "changes", async () => {
    await clickNav(page, "Change control", false);
    const c0 = Date.now();
    await page.getByRole("button", { name: /^Raise$/i }).waitFor({ timeout: 8000 });
    rec.changesFindMs = Date.now() - c0;
    rec.changes = await metrics(page);
    const before = await bodyText(page);
    rec.sawSeedNcr = /Hollow tiles/i.test(before);
    rec.sawFailNcr = /NCR from RCC pour/i.test(before);
    await page.locator("main").getByLabel("Type").selectOption("ncr");
    await page
      .locator("main")
      .getByLabel("Title")
      .fill(`${seat.key.toUpperCase()} NCR — honeycombing at L13 soffit`);
    await page.getByRole("button", { name: /^Raise$/i }).click();
    await page.waitForTimeout(400);
    rec.ncrRaised = /honeycombing at L13/i.test(await bodyText(page));
    rec.canCloseNcr = await page
      .getByRole("button", { name: /close after re-inspection/i })
      .first()
      .isVisible();
    rec.canRespondRfi = await page
      .getByRole("button", { name: /^Respond$/i })
      .first()
      .isVisible();
    await shot(page, `${prefix}-changes-ncr`);
    await shot(page, `${prefix}-changes-ncr-view`, false);
  });

  await step(rec, "controls", async () => {
    await clickNav(page, "Controls", false);
    rec.controls = await metrics(page);
    rec.controlsText = (await bodyText(page)).slice(0, 1800);
    rec.controlsIssue = /\bIssue\b/.test(rec.controlsText);
    rec.controlsReceive = /\bReceive\b/.test(rec.controlsText);
    rec.controlsApproveQty = /Approve quantity/i.test(rec.controlsText);
    rec.controlsTally = /\bTally\b/i.test(rec.controlsText);
    if (rec.controlsTally) note("p0", seat.title, "/app/controls", "Tally on Controls.");
    await shot(page, `${prefix}-controls`);
    await shot(page, `${prefix}-controls-view`, false);
    const issueBtn = page.getByRole("button", { name: /^Issue$/i }).first();
    if (await issueBtn.isVisible()) {
      await issueBtn.click();
      rec.issuedMaterial = true;
      await page.waitForTimeout(250);
    }
  });

  await step(rec, "documents", async () => {
    await gotoApp(page, "/app/documents");
    rec.documentsPath = new URL(page.url()).pathname;
    rec.documentsText = (await bodyText(page)).slice(0, 1200);
    rec.documentsRendered = /Register file|Architectural GA/i.test(rec.documentsText);
    await shot(page, `${prefix}-documents-deeplink`);
    if (!seat.expectDocuments && rec.documentsRendered) {
      note(
        "p2",
        seat.title,
        "/app/documents",
        "Supervisor can deep-link Documents though nav hides it.",
      );
    }
  });

  await step(rec, "projects", async () => {
    await clickNav(page, "Projects", false);
    rec.projectsText = (await bodyText(page)).slice(0, 1000);
    rec.projectsKanak = /Kanakpura Residences/i.test(rec.projectsText);
    rec.canCreateProject = await page.getByRole("button", { name: /new project/i }).isVisible();
    await shot(page, `${prefix}-projects`);
    await gotoApp(page, "/app/projects/p_kanak");
    rec.projectDetail = (await bodyText(page)).slice(0, 900);
    rec.projectHasDocsLink = /Open document control/i.test(rec.projectDetail);
    rec.projectHasBookings = /Bookings/i.test(rec.projectDetail);
    await shot(page, `${prefix}-project-detail`);
  });

  await step(rec, "phases", async () => {
    await clickNav(page, "All phases", false);
    rec.phasesText = (await bodyText(page)).slice(0, 1600);
    rec.phasesLinks = {
      tally: /Tally/i.test(rec.phasesText),
      crm: /Customers & CRM/i.test(rec.phasesText),
      land: /Land & legal/i.test(rec.phasesText),
      commercial: /Commercial/i.test(rec.phasesText),
    };
    if (rec.phasesLinks.tally)
      note("p1", seat.title, "/app/phases", "All phases lists Tally for a site seat.");
    await shot(page, `${prefix}-phases`);
  });

  await step(rec, "audit", async () => {
    await clickNav(page, "Audit", false);
    rec.auditText = (await bodyText(page)).slice(0, 800);
    await shot(page, `${prefix}-audit`);
  });

  await step(rec, "assistant", async () => {
    await clickNav(page, "Assistant", false);
    rec.assistantText = (await bodyText(page)).slice(0, 800);
    await shot(page, `${prefix}-assistant`);
  });

  const leaks = {};
  for (const [path, key] of [
    ["/app/finance", "finance"],
    ["/app/sales", "sales"],
    ["/app/sales/handover", "handover"],
    ["/app/capital", "capital"],
    ["/app/decisions", "decisions"],
  ]) {
    await step(rec, `leak-${key}`, async () => {
      await gotoApp(page, path);
      const text = await bodyText(page);
      leaks[key] = {
        path: new URL(page.url()).pathname,
        title: (await page.locator("h1").first().textContent()) || "",
        snippet: text.replace(/\s+/g, " ").slice(0, 420),
        denied: /does not post books|view only is not offered|not offered to site/i.test(text),
        salesCommand:
          /Third-party now|Inventory is the lock|Available units|Hot \(your firm\)/i.test(text),
        snags: /open snags|Close snag|Paint touch-up/i.test(text),
        capital: /Plan vs reality|JTD spent/i.test(text),
        decisions: /Owner decisions|Open TODOs/i.test(text),
        tallyActions: /Reconcile|Accept exception/i.test(text),
      };
      await shot(page, `${prefix}-leak-${key}`);
      await shot(page, `${prefix}-leak-${key}-view`, false);
    });
  }
  rec.leaks = leaks;
  if (leaks.finance?.tallyActions)
    note("p0", seat.title, "/app/finance", "Site seat can Reconcile Tally via deep-link.");
  else if (leaks.finance?.denied)
    note("info", seat.title, "/app/finance", "Finance deep-link refuses Tally actions.");
  if (leaks.sales?.salesCommand)
    note("p0", seat.title, "/app/sales", "Sales command internals leak via deep-link.");
  if (leaks.handover?.snags)
    note(
      "p1",
      seat.title,
      "/app/sales/handover",
      "Handover/snag queue reachable by URL, absent from site nav.",
    );
  if (leaks.capital?.capital)
    note("p1", seat.title, "/app/capital", "Capital planning leaks via deep-link.");
  if (leaks.decisions?.decisions)
    note("p1", seat.title, "/app/decisions", "Owner decisions leak via deep-link.");

  await step(rec, "entity-switch", async () => {
    await gotoApp(page, "/app/site");
    const entitySelect = page.locator("header select").first();
    rec.kanakRows = /Tower A L12 slab shuttering|Podium waterproofing/i.test(await bodyText(page));
    await entitySelect.selectOption({ label: "Aravalli Homes Pvt Ltd" });
    await page.waitForTimeout(500);
    const aravalliText = await bodyText(page);
    rec.aravalliRows = /Snag close-out Tower C|Door & hardware/i.test(aravalliText);
    rec.aravalliStillKanak = /Tower A L12 slab shuttering/i.test(aravalliText);
    rec.diaryProjectOptions = await page
      .locator("main select")
      .first()
      .locator("option")
      .allTextContents();
    rec.diaryProjectValue = await page.locator("main select").first().inputValue();
    rec.entitySwitchOk = Boolean(rec.aravalliRows && !rec.aravalliStillKanak);
    if (!rec.entitySwitchOk)
      note(
        "p1",
        seat.title,
        "/app/site",
        "Entity switch Kanakpura → Aravalli did not swap site rows.",
      );
    await shot(page, `${prefix}-entity-aravalli`);
    await entitySelect.selectOption({ label: "Kanakpura Developers LLP" });
    await page.waitForTimeout(300);
    await shot(page, `${prefix}-entity-kanakpura`);
  });

  rec.consoleErrors = consoleErrors;
  if (consoleErrors.length) note("p1", seat.title, "runtime", consoleErrors.join(" | "));
}

async function runMobile(page, seat, rec) {
  const prefix = `${seat.key}-mobi`;
  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(e.message));

  rec.homePath = new URL(page.url()).pathname;
  rec.localOnly = /Local/i.test(await page.locator("header").innerText());
  const t0 = Date.now();
  await page.getByRole("button", { name: /seal diary/i }).waitFor({ timeout: 8000 });
  rec.findDiaryMs = Date.now() - t0;
  rec.site = await metrics(page);
  rec.sealBox = await page.getByRole("button", { name: /seal diary/i }).boundingBox();
  await shot(page, `${prefix}-site-view`, false);
  await shot(page, `${prefix}-site-home`);

  rec.nav = await collectNav(page, true);
  rec.documentsInNav = rec.nav.some((n) => /^Documents$/i.test(n));
  rec.forbiddenNav = FORBIDDEN_NAV.filter((n) => rec.nav.some((x) => x === n || x.startsWith(n)));
  await page.getByRole("button", { name: /open menu/i }).click();
  await page.waitForTimeout(250);
  await shot(page, `${prefix}-menu`, false);
  await page
    .locator("div.fixed.inset-0")
    .click({ position: { x: 370, y: 40 } })
    .catch(() => {});
  await page.waitForTimeout(200);

  await step(rec, "mobile-diary", async () => {
    await page
      .getByLabel("Major work")
      .fill(`${seat.key.toUpperCase()} phone diary — raft steel check.`);
    await page.getByRole("button", { name: /seal diary/i }).click();
    await page.waitForTimeout(400);
    rec.diarySealed = /Diary sealed|already exists|raft steel check/i.test(await bodyText(page));
    await shot(page, `${prefix}-diary`, false);
  });

  await step(rec, "mobile-insp", async () => {
    await page.getByRole("heading", { name: /inspections/i }).scrollIntoViewIfNeeded();
    rec.failBox = await page
      .getByRole("button", { name: /^Fail$/i })
      .first()
      .boundingBox();
    rec.passBox = await page
      .getByRole("button", { name: /^Pass$/i })
      .first()
      .boundingBox();
    rec.scheduleBox = await page.getByRole("button", { name: /^Schedule$/i }).boundingBox();
    await shot(page, `${prefix}-inspections`, false);
  });

  await step(rec, "mobile-changes", async () => {
    await clickNav(page, "Change control", true);
    rec.changes = await metrics(page);
    rec.raiseBox = await page.getByRole("button", { name: /^Raise$/i }).boundingBox();
    await shot(page, `${prefix}-changes-view`, false);
    await shot(page, `${prefix}-changes`);
  });

  await step(rec, "mobile-controls", async () => {
    await clickNav(page, "Controls", true);
    rec.controls = await metrics(page);
    await shot(page, `${prefix}-controls-view`, false);
    await shot(page, `${prefix}-controls`);
  });

  await step(rec, "mobile-handover", async () => {
    await gotoApp(page, "/app/sales/handover");
    rec.handoverMobile = (await bodyText(page)).replace(/\s+/g, " ").slice(0, 400);
    await shot(page, `${prefix}-handover`, false);
  });

  rec.consoleErrors = consoleErrors;
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

  for (const seat of SEATS) {
    report.seats[seat.key] = { title: seat.title, desktop: {}, mobile: {} };

    const desk = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const dpage = await desk.newPage();
    try {
      await login(dpage, seat);
      await runDesktop(dpage, seat, report.seats[seat.key].desktop);
    } catch (err) {
      report.seats[seat.key].desktop.error = String(err?.message || err);
      note("p0", seat.title, "desktop", String(err?.message || err));
      await shot(dpage, `${seat.key}-desk-error`).catch(() => {});
    } finally {
      await desk.close();
    }

    const mobi = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    });
    const mpage = await mobi.newPage();
    try {
      await login(mpage, seat);
      await runMobile(mpage, seat, report.seats[seat.key].mobile);
    } catch (err) {
      report.seats[seat.key].mobile.error = String(err?.message || err);
      note("p0", seat.title, "mobile", String(err?.message || err));
      await shot(mpage, `${seat.key}-mobi-error`).catch(() => {});
    } finally {
      await mobi.close();
    }
  }

  await browser.close();
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        ok: true,
        findings: report.findings.length,
        out: OUT,
        errors: {
          seD: report.seats.se.desktop.errors || report.seats.se.desktop.error,
          seM: report.seats.se.mobile.errors || report.seats.se.mobile.error,
          svD: report.seats.sv.desktop.errors || report.seats.sv.desktop.error,
          svM: report.seats.sv.mobile.errors || report.seats.sv.mobile.error,
        },
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
