/**
 * MD can open /app/ceo and sees Group pulse KPIs. Channel is redirected.
 *
 *   node scripts/trial/probes/ceo-open.mjs
 */
import { openTrial, signIn, signOut, go, closeTrial } from "../session.mjs";

const { context, page } = await openTrial({ reset: false });
let failed = 0;
function line(id, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${id}  ${detail}`);
  if (!ok) failed += 1;
}

try {
  await signIn(page, "md");
  await go(page, "/app/ceo");
  const heading = page.getByRole("heading", { name: /group pulse/i });
  const seen = await heading
    .waitFor({ timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  const md = await page.evaluate(() => {
    const path = location.pathname;
    const text = (document.body?.innerText ?? "").slice(0, 1500);
    const err =
      document.querySelector("[data-error], pre, .error")?.textContent?.slice(0, 400) ?? "";
    return {
      path,
      title: /Group pulse/i.test(text),
      kpis: /Available|Held|Booked|Commission accrued/i.test(text),
      noPay: /does not pay|accrues only|does not post/i.test(text),
      text,
      err,
    };
  });
  if (!seen) console.log("CEO dump:\n", md.text, "\nERR:", md.err);
  line("md-ceo-route", md.path === "/app/ceo", md.path);
  line("md-ceo-title", md.title, "Group pulse");
  line("md-ceo-kpis", md.kpis, "KPI copy present");
  line("md-ceo-policy", md.noPay, "commission accrues / no ERPNext post");
  await signOut(page);

  await signIn(page, "agap1");
  await go(page, "/app/ceo");
  await page.waitForTimeout(500);
  const ch = new URL(page.url()).pathname;
  line("channel-blocked", ch !== "/app/ceo", `→ ${ch}`);
  await signOut(page);
} finally {
  await closeTrial(context);
}
if (failed) process.exitCode = 1;
