/**
 * Literacy + CEO/stores smoke after the combined fix pass.
 *   node scripts/trial/probes/_literacy-fix.mjs
 */
import { openTrial, signIn, signOut, closeTrial, go } from "../session.mjs";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const OUT = join("screenshots", "review", "literacy-fix");
mkdirSync(OUT, { recursive: true });

const { context, page } = await openTrial({ reset: false });
const fails = [];

function check(name, ok, extra = "") {
  console.log(ok ? "PASS" : "FAIL", name, extra);
  if (!ok) fails.push(name);
}

try {
  await signIn(page, "cm");
  await go(page, "/app/quotations");
  await page.waitForSelector("h1", { timeout: 15000 });
  const q = await page.evaluate(() => document.body.innerText);
  check(
    "quotations-4-steps",
    /Ask for prices/.test(q) &&
      /Attach the quote/.test(q) &&
      /Pick the Active quote/.test(q) &&
      /Raise the purchase order/.test(q),
  );
  await page.screenshot({ path: join(OUT, "cm-quotations.png") });
  await go(page, "/app/commercial");
  await page.waitForSelector("h1", { timeout: 15000 });
  const c = await page.evaluate(() => document.body.innerText);
  check("po-gate-copy", /Cannot raise PO — vendor not Active/.test(c));
  await signOut(page);

  await signIn(page, "smav");
  await go(page, "/app/customers");
  await page.waitForSelector("h1", { timeout: 15000 });
  const cu = await page.evaluate(() => document.body.innerText);
  check(
    "book-from-list",
    /Free unit/.test(cu) && /Book this unit/.test(cu) && /Book next in this list/.test(cu),
  );
  check("no-prefix-placeholder", !/A-0802/.test(cu));
  await page.screenshot({ path: join(OUT, "smav-customers.png") });
  const booked = await page.evaluate(() => {
    const g = window.__atlasStore.getState();
    const before = g.bookings.length;
    const err1 = g.bookNextAvailable("p_av", { config: "2BHK", customer: "Literacy A" });
    const err2 = g.bookNextAvailable("p_av", { config: "2BHK", customer: "Literacy B" });
    return { err1, err2, after: window.__atlasStore.getState().bookings.length, before };
  });
  check("book-two-from-list", booked.after >= booked.before + 2, JSON.stringify(booked));
  await signOut(page);

  await signIn(page, "ll");
  await go(page, "/app/land");
  await page.waitForSelector("h1", { timeout: 15000 });
  const l = await page.evaluate(() => document.body.innerText);
  check("land-steps", /Consideration/.test(l) && /Sale deed/.test(l) && /RERA challan/.test(l));
  check("challan-sentence", /Cannot mark this as filed/.test(l) || /challan/.test(l));
  const filed = await page.evaluate(() => {
    const g = window.__atlasStore.getState();
    let o = g.obligations.find((x) => x.status !== "filed");
    if (!o) {
      g.addObligation({
        projectId: "p_av",
        kind: "rera",
        title: "Literacy QPR",
        due: "2026-09-01",
      });
      o = window.__atlasStore.getState().obligations.find((x) => x.title === "Literacy QPR");
    }
    return window.__atlasStore.getState().fileObligation(o.id, "");
  });
  check("empty-challan-refused", /Cannot mark this as filed/.test(filed || ""));
  await page.screenshot({ path: join(OUT, "ll-land.png") });
  await signOut(page);

  await signIn(page, "svav");
  await go(page, "/app/site");
  await page.waitForSelector("h1", { timeout: 15000 });
  const s = await page.evaluate(() => document.body.innerText);
  check("diary-chips", /Civil/.test(s) && /सिविल/.test(s) && /Seal diary/.test(s));
  await page.screenshot({ path: join(OUT, "svav-diary.png") });
  await signOut(page);

  await signIn(page, "st");
  await go(page, "/app/controls");
  await page.waitForSelector("h1", { timeout: 15000 });
  const st = await page.evaluate(() => document.body.innerText);
  check("stores-two-buttons", /Receive/.test(st) && /Issue/.test(st) && /Two buttons/.test(st));
  await signOut(page);

  await signIn(page, "md");
  await go(page, "/app/ceo");
  await page.waitForSelector("h1", { timeout: 15000 });
  const md = await page.evaluate(() => document.body.innerText);
  check(
    "ceo-three-cards",
    /SATYAM BUILDCOM/.test(md) &&
      /SATYAM CONSTRUCTION/.test(md) &&
      /MGB PRIME ESTATES LLP/.test(md),
  );
  check(
    "ceo-not-elim",
    /does not eliminate/i.test(md) || /not P&L after/i.test(md) || /worksheet/i.test(md),
  );
  check("ceo-erpnext-hint", /ERPNext/.test(md));
  check(
    "ceo-funnel-bars",
    /Funnel/.test(md) &&
      /Available/.test(md) &&
      /Possessed/.test(md) &&
      /Velocity/.test(md) &&
      /Aging/.test(md),
  );
  await page.screenshot({ path: join(OUT, "md-ceo.png") });
  await signOut(page);
} finally {
  await closeTrial(context);
}

if (fails.length) {
  console.log("FAILED", fails.join(", "));
  process.exitCode = 1;
} else {
  console.log("PASS literacy fix probes");
}
