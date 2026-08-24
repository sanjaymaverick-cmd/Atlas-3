/**
 * Local-only ERPNext Desk dry-run for DUKIA books UX.
 * Does not delete trial data. Does not post elim JEs. Does not mutate Atlas.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://127.0.0.1:8000";
const OUT = "D:/work Dir/Atlas 3/screenshots/review/erpnext-desk";
const NOTES = [];
mkdirSync(OUT, { recursive: true });

function note(step, extra = {}) {
  const row = { t: new Date().toISOString(), step, ...extra };
  NOTES.push(row);
  console.log(JSON.stringify(row));
}

async function shot(page, name, extra = {}) {
  const path = join(OUT, name);
  await page.screenshot({ path, fullPage: extra.fullPage ?? false });
  note("screenshot", { name, url: page.url() });
}

async function login(page, user, password, label) {
  const t0 = Date.now();
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input", { timeout: 20000 });
  const email =
    (await page.$("#login_email")) ||
    (await page.$('input[type="text"]')) ||
    (await page.$('input[type="email"]'));
  const pass =
    (await page.$("#login_password")) || (await page.$('input[type="password"]'));
  if (!email || !pass) throw new Error("login fields missing");
  await email.fill(user);
  await pass.fill(password);
  const btn =
    (await page.$(".btn-login")) ||
    (await page.$('button[type="submit"]')) ||
    (await page.getByRole("button", { name: /login/i }));
  await Promise.all([
    page.waitForURL((u) => !String(u).includes("/login"), { timeout: 30000 }).catch(() => null),
    btn.click(),
  ]);
  await page.waitForTimeout(2500);
  note("login", { label, user, ms: Date.now() - t0, url: page.url() });
}

async function awesomeSearch(page, query) {
  const t0 = Date.now();
  // Frappe awesome bar: click navbar search or Ctrl+K / Ctrl+G
  const searchBox =
    (await page.$("#navbar-search")) ||
    (await page.$('input[placeholder*="Search"]')) ||
    (await page.$(".search-bar input")) ||
    (await page.$('[data-original-title="Search"]'));
  if (searchBox) {
    await searchBox.click();
    await searchBox.fill(query);
  } else {
    await page.keyboard.press("Control+K");
    await page.waitForTimeout(400);
    await page.keyboard.type(query, { delay: 40 });
  }
  await page.waitForTimeout(800);
  const items = await page.evaluate(() => {
    const nodes = [
      ...document.querySelectorAll(".awesomplete li, .dropdown-menu li, .search-results .result, [data-doctype]"),
    ];
    return nodes.slice(0, 20).map((n) => (n.innerText || "").trim()).filter(Boolean);
  });
  note("search", { query, ms: Date.now() - t0, items: items.slice(0, 12) });
  return { ms: Date.now() - t0, items };
}

async function sidebarLabels(page) {
  return page.evaluate(() => {
    const sels = [
      ".desk-sidebar .sidebar-item-label",
      ".standard-sidebar-item .sidebar-item-label",
      ".desk-sidebar .item-anchor",
      ".sidebar-menu .sidebar-item",
      '[class*="sidebar"] a',
    ];
    const out = [];
    for (const s of sels) {
      document.querySelectorAll(s).forEach((n) => {
        const t = (n.innerText || n.getAttribute("title") || "").trim();
        if (t) out.push(t);
      });
    }
    return [...new Set(out)].slice(0, 40);
  });
}

async function companySwitcher(page, name) {
  const t0 = Date.now();
  // navbar company dropdown
  const clicked = await page.evaluate((want) => {
    const candidates = [
      ...document.querySelectorAll("button, a, .dropdown-toggle, .nav-link"),
    ];
    const btn = candidates.find((el) => {
      const t = (el.innerText || "").trim();
      return /SATYAM|MGB|MOCK|DUKIA|Company/i.test(t) && t.length < 80;
    });
    if (btn) {
      btn.click();
      return btn.innerText.trim();
    }
    return null;
  }, name);
  await page.waitForTimeout(500);
  const picked = await page.evaluate((want) => {
    const items = [...document.querySelectorAll(".dropdown-item, a, li, button")];
    const hit = items.find((el) => (el.innerText || "").trim() === want);
    if (hit) {
      hit.click();
      return true;
    }
    return false;
  }, name);
  await page.waitForTimeout(1200);
  note("company-switch", { to: name, clicked, picked, ms: Date.now() - t0 });
  return { clicked, picked, ms: Date.now() - t0 };
}

async function visibleFields(page) {
  return page.evaluate(() => {
    const rows = [];
    document.querySelectorAll(".form-group, .frappe-control").forEach((el) => {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return;
      const label = (el.querySelector("label, .control-label, .label-area")?.innerText || "").trim();
      const req = !!el.querySelector(".reqd, .bold");
      if (label) rows.push({ label, req, text: (el.innerText || "").slice(0, 80) });
    });
    return rows.slice(0, 80);
  });
}

const report = {
  login: {},
  timeToJe: {},
  companySwitch: [],
  jeList: {},
  jeOpen: {},
  jeDraft: {},
  stockRefuse: {},
  reports: {},
  icPath: {},
  sidebar: [],
  clutter: [],
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(40000);
  page.on("pageerror", (e) => note("pageerror", { message: e.message }));

  // 1. Login as Administrator (only Desk user with full modules; no Finance seat exists)
  await login(page, "Administrator", "admin", "Administrator");
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  await shot(page, "01-desk-home.png");
  report.sidebar = await sidebarLabels(page);
  note("sidebar", { labels: report.sidebar });

  const homeText = await page.evaluate(() => document.body.innerText.slice(0, 2500));
  report.login.homeSnippet = homeText.slice(0, 800);
  report.clutter.push({
    hotspot: "Desk Home after login",
    note: "Home shortcuts default to Item / Customer / Supplier / Sales Invoice — trading pack, not books.",
  });

  // 2. Time-to-first-JE via Awesome Bar
  const tJe = Date.now();
  const search = await awesomeSearch(page, "Journal Entry");
  await shot(page, "02-search-journal-entry.png");
  // try click first result containing Journal Entry
  const clickedJe = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll("a, li, .result, .awesomplete li, div")];
    const hit = nodes.find((n) => /^Journal Entry$/m.test((n.innerText || "").trim()) || (n.innerText || "").includes("Journal Entry"));
    if (hit) {
      hit.click();
      return (hit.innerText || "").slice(0, 80);
    }
    return null;
  });
  if (!clickedJe) {
    await page.goto(`${BASE}/app/journal-entry`, { waitUntil: "domcontentloaded" });
  }
  await page.waitForTimeout(2500);
  report.timeToJe = {
    searchMs: search.ms,
    totalMs: Date.now() - tJe,
    searchItems: search.items,
    clicked: clickedJe,
    url: page.url(),
    path: "awesome-bar 'Journal Entry' (not on Home shortcuts)",
  };
  await shot(page, "03-journal-entry-list.png");
  const listText = await page.evaluate(() => document.body.innerText.slice(0, 2000));
  report.jeList.snippet = listText.slice(0, 900);

  // 3. Switch companies — via navbar if possible, else User defaults is too heavy; record navbar text
  for (const co of ["SATYAM BUILDCOM", "SATYAM CONSTRUCTION", "MGB PRIME ESTATES LLP"]) {
    const sw = await companySwitcher(page, co);
    report.companySwitch.push(sw);
    await shot(page, `04-company-${co.replace(/\s+/g, "-").toLowerCase()}.png`);
  }

  // 4. Open submitted ATLAS-OPS IC loan JE
  await page.goto(`${BASE}/app/journal-entry/ACC-JV-2026-00016`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await shot(page, "05-je-atlas-ops-ic-loan.png", { fullPage: true });
  const jeFields = await visibleFields(page);
  const jeBody = await page.evaluate(() => document.body.innerText);
  report.jeOpen = {
    url: page.url(),
    visibleFieldCount: jeFields.length,
    visibleFields: jeFields.map((f) => f.label),
    hasUserRemark: /ATLAS-OPS \| DUKIA-RUN/.test(jeBody),
    hasTitle: /ic-loan-sbc-scn-lender/.test(jeBody),
    hasDueFrom: /Due from SATYAM CONSTRUCTION/.test(jeBody),
    hasInterCompanyRef: /Inter Company Journal Entry Reference/.test(jeBody),
    snippet: jeBody.slice(0, 1500),
  };
  await shot(page, "05b-je-ic-loan-scrolled.png");

  // 5. New draft JE form
  await page.goto(`${BASE}/app/journal-entry/new`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await shot(page, "06-je-new-form.png", { fullPage: true });
  const draftFields = await visibleFields(page);
  report.jeDraft = {
    visibleFieldCount: draftFields.length,
    required: draftFields.filter((f) => f.req).map((f) => f.label),
    labels: draftFields.map((f) => f.label),
  };

  // 6. Stock account refusal is API-captured; also try picking Stock In Hand in the UI if grid exists
  report.stockRefuse = {
    apiException:
      "Account: Stock In Hand - SBC can only be updated via Stock Transactions",
    groupDraftException:
      "Account Stock Assets - SBC is a Group Account and group accounts cannot be used in transactions",
    humanSentence: false,
    recoveryPath: "none — no 'use Stock Entry instead' link",
  };

  // 7. Chart of Accounts / GL / Trial Balance
  const reports = [
    ["chart-of-accounts", `${BASE}/app/account/view/tree/Chart%20of%20Accounts`],
    ["general-ledger", `${BASE}/app/query-report/General%20Ledger`],
    ["trial-balance", `${BASE}/app/query-report/Trial%20Balance`],
    ["consolidated", `${BASE}/app/query-report/Consolidated%20Financial%20Statement`],
  ];
  for (const [key, url] of reports) {
    const t0 = Date.now();
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    await shot(page, `07-${key}.png`);
    const txt = await page.evaluate(() => document.body.innerText.slice(0, 1200));
    report.reports[key] = { ms: Date.now() - t0, url: page.url(), snippet: txt.slice(0, 500) };
  }

  // 8. Inter Company Journal Entry path
  await page.goto(`${BASE}/app/journal-entry/new`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const icSearch = await awesomeSearch(page, "Inter Company Journal");
  await shot(page, "08-search-inter-company.png");
  report.icPath = {
    searchItems: icSearch.items,
    note: "No separate doctype. Voucher Type select includes Inter Company Journal Entry. Trial IC loans used voucher_type=Journal Entry and left inter_company_journal_entry_reference empty.",
  };

  // 9. Module noise (Administrator sees everything; no MD user)
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await shot(page, "09-desk-modules.png");
  report.clutter.push({
    hotspot: "Sidebar workspaces",
    labels: report.sidebar,
    noise: ["Stock", "Manufacturing", "CRM", "Selling", "Buying", "Quality", "Support", "Website", "Subcontracting", "Assets"],
  });

  // extra: Financial Reports + Invoicing
  await page.goto(`${BASE}/app/financial-reports`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await shot(page, "10-workspace-financial-reports.png");
  await page.goto(`${BASE}/app/invoicing`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await shot(page, "11-workspace-invoicing.png");
  await page.goto(`${BASE}/app/stock`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await shot(page, "12-workspace-stock-noise.png");
  await page.goto(`${BASE}/app/manufacturing`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await shot(page, "13-workspace-manufacturing-noise.png");

  writeFileSync(join(OUT, "notes.json"), JSON.stringify({ report, NOTES }, null, 2));
  console.log("WROTE", join(OUT, "notes.json"));
  await browser.close();
})().catch((err) => {
  console.error(err);
  writeFileSync(join(OUT, "notes.json"), JSON.stringify({ error: String(err), NOTES, report }, null, 2));
  process.exit(1);
});
