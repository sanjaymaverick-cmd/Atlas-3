/**
 * Hard invariant: Pink City must never see Desert Reach.
 *
 * The store holds every agency's rows in every browser (known architectural
 * limit). What matters operationally is whether a Pink City seat can SEE Desert
 * Reach on screen. This probe reads rendered text, not the store.
 */

import { openTrial, signIn, signOut, go, closeTrial } from "../session.mjs";

const DESERT = ["Desert Reach", "R. Shekhawat", "D. Rathi"];
const ROUTES = [
  "/app/sales/channel",
  "/app/sales/company",
  "/app/sales/inventory",
  "/app/crm",
  "/app/sales/people",
  "/app/sales/pipeline",
];

const { context, page } = await openTrial();
const findings = [];

try {
  for (const seat of ["ag", "ca"]) {
    await signIn(page, seat);
    for (const route of ROUTES) {
      await go(page, route);
      await page.waitForTimeout(700);
      const landed = new URL(page.url()).pathname;
      if (landed !== route) {
        findings.push({ seat, route, verdict: "redirected", detail: `→ ${landed}` });
        continue;
      }
      const text = await page.locator("body").innerText().catch(() => "");
      const hits = DESERT.filter((d) => text.includes(d));
      findings.push({
        seat,
        route,
        verdict: hits.length ? "LEAK" : "clean",
        detail: hits.join(", "),
      });
    }
    await signOut(page);
  }
} finally {
  await closeTrial(context);
}

for (const f of findings) {
  const tag = f.verdict === "LEAK" ? "LEAK      " : f.verdict === "redirected" ? "redirected" : "clean     ";
  console.log(`${tag} ${f.seat.padEnd(3)} ${f.route}${f.detail ? ` — ${f.detail}` : ""}`);
}
const leaks = findings.filter((f) => f.verdict === "LEAK");
console.log(`\n${leaks.length} leak(s) across ${findings.length} seat/route checks`);
