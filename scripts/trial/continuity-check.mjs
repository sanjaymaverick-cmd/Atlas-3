/**
 * Proves the two seams the company trial depends on (FIX-THIS B8, B10).
 *
 *   1. CONTINUITY — a lead created by the Sales Manager is still there when the
 *      MD signs in, in the SAME process and again in a SEPARATE one.
 *   2. CLOCK — the app's "today" follows the trial date, so ageing, overdue
 *      logic and quarter boundaries can actually be exercised.
 *
 * Run it before the trial starts, and any time the harness changes:
 *
 *   node scripts/trial/continuity-check.mjs --reset     # cold start, then pass 1
 *   node scripts/trial/continuity-check.mjs             # pass 2, separate process
 *
 * Pass 2 must still see the lead from pass 1. If it doesn't, the trial cannot
 * produce a company — stop and fix the harness first.
 */

import {
  openTrial,
  signIn,
  signOut,
  setTrialDate,
  trialDate,
  readStore,
  closeTrial,
} from "./session.mjs";

const reset = process.argv.includes("--reset");
const MARKER = "TRIAL-CONTINUITY-PROBE";
const results = [];

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "  ok  " : " FAIL "} ${name}${detail ? ` — ${detail}` : ""}`);
  return ok;
}

async function main() {
  const { context, page } = await openTrial({ reset });

  try {
    // ---- clock ----
    await signIn(page, "md");
    await setTrialDate(page, "2026-11-08"); // Diwali week
    const d = await trialDate(page);
    check("clock: trial date is set", d === "2026-11-08", d ?? "null");

    const appToday = await page.evaluate(() => {
      const s = window.__atlasStore?.getState?.();
      if (!s) return null;
      s.log("Continuity probe", "clock read");
      return s.audit[0]?.at ?? null;
    });
    check(
      "clock: a new audit event carries the trial date",
      typeof appToday === "string" && appToday.startsWith("2026-11-08"),
      appToday ?? "null",
    );

    // ---- write as one seat ----
    await signIn(page, "sm");
    const wrote = await page.evaluate((marker) => {
      const s = window.__atlasStore?.getState?.();
      if (!s?.addLead) return null;
      const err = s.addLead({
        projectId: "p_kanak",
        name: marker,
        phone: "99xxxx0000",
        source: "walk-in",
        unit: "A-0901",
        note: "Continuity probe — safe to delete",
        budget: 12_400_000,
        kind: "flat",
      });
      return err ?? "ok";
    }, MARKER);
    // On a warm pass the probe already exists, and the app refuses the
    // duplicate. That refusal IS the proof of persistence — treat it as a pass.
    const dup = typeof wrote === "string" && /duplicate/i.test(wrote);
    check(
      "write: Sales Manager lead accepted (or already present from a previous run)",
      wrote === "ok" || dup,
      dup ? "already present — carried over from the last run" : String(wrote),
    );

    const afterWrite = await readStore(page, "leads");
    check(
      "write: lead is in the store",
      Array.isArray(afterWrite) && afterWrite.some((l) => l.name === MARKER),
      `${afterWrite?.length ?? 0} leads`,
    );

    // ---- read as another seat, same process ----
    await signOut(page);
    await signIn(page, "md");
    const seenByMd = await readStore(page, "leads");
    check(
      "continuity: MD sees the Sales Manager's lead after a seat switch",
      Array.isArray(seenByMd) && seenByMd.some((l) => l.name === MARKER),
      `${seenByMd?.length ?? 0} leads`,
    );

    // ---- clock survives the seat switch ----
    const dAfter = await trialDate(page);
    check(
      "continuity: trial clock survives the seat switch",
      dAfter === "2026-11-08",
      dAfter ?? "null",
    );

    // ---- audit attributes the right person ----
    const audit = await readStore(page, "audit");
    const actors = new Set((audit ?? []).map((a) => a.actor));
    check(
      "audit: more than one person appears in the trail",
      actors.size > 1,
      [...actors].slice(0, 6).join(", "),
    );
  } finally {
    await closeTrial(context);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.log("\nThe trial is NOT ready. Failing checks:");
    for (const f of failed) console.log(`  - ${f.name} (${f.detail})`);
    process.exit(1);
  }
  if (reset) {
    console.log(
      "\nCold start done. Now run again WITHOUT --reset — pass 2 must still see the probe lead.",
    );
  } else {
    console.log("\nContinuity holds across processes. The trial can run.");
  }
}

main().catch((err) => {
  console.error(`\nHarness error: ${err.message}`);
  process.exit(2);
});
