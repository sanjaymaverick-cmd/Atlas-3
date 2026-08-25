/**
 * MOCK ATLAS3 LLP — company run driver.
 *
 * Runs ONE simulated day: sets the clock, then gives each seat an exclusive
 * turn in sequence. Seats never run concurrently — the profile is a single
 * company and parallel writers corrupt it.
 *
 *   node scripts/trial/run-day.mjs 2026-08-24 --reset
 *   node scripts/trial/run-day.mjs 2026-08-25
 *
 * Each seat's turn is a function in `scripts/trial/days/<date>.mjs`, exporting
 * `{ date, label, seats: [{ seat, note, run(page, api) }] }`.
 */

import { openTrial, signIn, signOut, setTrialDate, closeTrial, readStore } from "./session.mjs";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));

const date = process.argv[2];
const reset = process.argv.includes("--reset");

if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) {
  console.error("Usage: node scripts/trial/run-day.mjs YYYY-MM-DD [--reset]");
  process.exit(2);
}

const dayFile = join(HERE, "days", `${date}.mjs`);
if (!existsSync(dayFile)) {
  console.error(`No script for ${date} — expected ${dayFile}`);
  process.exit(2);
}

const day = (await import(pathToFileURL(dayFile).href)).default;

/** Helpers handed to every seat turn. */
function makeApi(page, log) {
  return {
    /** Call a store action the way the UI would, and record the outcome. */
    async act(label, fn) {
      const out = await page.evaluate(fn);
      const refused = typeof out === "string" && out.length > 0;
      log.push({ kind: refused ? "blocked" : "did", label, detail: refused ? out : "ok" });
      return out;
    },
    /** Read a slice of the company. */
    read: (key) => readStore(page, key),
    /** Record an observation that isn't a store call. */
    note: (kind, label, detail = "") => log.push({ kind, label, detail }),
  };
}

const results = [];

const { context, page } = await openTrial({ reset });
try {
  await setTrialDate(page, date);
  console.log(`\n=== ${date} — ${day.label} ===`);
  console.log(
    `Operating company: MOCK ATLAS3 LLP · Books: Tally MOCK ATLAS3 LLP (local mock, not live)\n`,
  );

  for (const turn of day.seats) {
    const log = [];
    const api = makeApi(page, log);
    let error = null;
    try {
      await signIn(page, turn.seat);
      await turn.run(page, api);
    } catch (err) {
      error = err.message;
      log.push({ kind: "error", label: "seat turn failed", detail: err.message });
    } finally {
      await signOut(page);
    }

    results.push({ seat: turn.seat, note: turn.note, log, error });
    console.log(`-- ${turn.seat} — ${turn.note}`);
    for (const e of log) {
      const tag =
        {
          did: "  did    ",
          blocked: "  BLOCKED",
          error: "  ERROR  ",
          jargon: "  jargon ",
          ux: "  ux     ",
        }[e.kind] ?? "  note   ";
      console.log(`${tag} ${e.label}${e.detail && e.detail !== "ok" ? ` — ${e.detail}` : ""}`);
    }
    console.log("");
  }

  const audit = await readStore(page, "audit");
  console.log(`Audit events after the day: ${audit?.length ?? 0}`);
  console.log(`Actors today: ${[...new Set((audit ?? []).map((a) => a.actor))].join(", ")}`);
} finally {
  await closeTrial(context);
}

const blocked = results.flatMap((r) => r.log.filter((e) => e.kind === "blocked"));
const errors = results.flatMap((r) => r.log.filter((e) => e.kind === "error"));
console.log(`\n${results.length} seats · ${blocked.length} refusals · ${errors.length} errors`);
if (errors.length) process.exitCode = 1;
