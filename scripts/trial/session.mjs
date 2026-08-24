/**
 * Company-trial session harness.
 *
 * The one-day script (`scripts/company-day.mjs`) opens a fresh browser context
 * per seat and wipes localStorage on every login, so no seat can see what the
 * previous seat did. That is fine for a self-contained smoke test and useless
 * for a company trial.
 *
 * This harness keeps ONE Chromium profile on disk, so state survives both a
 * seat switch and a separate `node` invocation. A lead the Sales Manager
 * creates is still there when the MD signs in to approve it — including from a
 * different agent, minutes later, in a different process.
 *
 * Continuity relies on two facts about the app:
 *   - `signOut` only clears `user`; business data stays in the store.
 *   - the store persists to localStorage under `atlas3-sales-v11`.
 *
 * Usage from an agent's own script:
 *
 *   import { openTrial, signIn, signOut, setTrialDate, closeTrial } from "./session.mjs";
 *   const { context, page } = await openTrial();
 *   await setTrialDate(page, "2026-11-08");
 *   await signIn(page, "sm@atlas.local");
 *   ... do the day's work ...
 *   await signOut(page);
 *   await closeTrial(context);
 */

import { chromium } from "playwright";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

export const BASE = process.env.ATLAS_URL || "http://127.0.0.1:8080";

/**
 * One profile dir = one company. Everything persists here between runs.
 *
 * Deliberately OUTSIDE the project root: Vite watches the repo, and Chromium
 * holds a lock on `Default/Network/Cookies`, which makes the watcher throw
 * EBUSY and take the dev server down with it.
 */
export const PROFILE =
  process.env.ATLAS_TRIAL_PROFILE || join(tmpdir(), "atlas3-trial-profile");

const STORE_KEYS = ["atlas3-company-day-v1", "atlas3-clt-v1"];
const STORE_PREFIX = "atlas3-sales-";

export const SEATS = {
  md: "md@atlas.local",
  pd: "pd@atlas.local",
  pd2: "pd2@atlas.local",
  se: "se@atlas.local",
  se2: "se2@atlas.local",
  sv: "sv@atlas.local",
  sv2: "sv2@atlas.local",
  sv3: "sv3@atlas.local",
  fl: "fl@atlas.local",
  cm: "cm@atlas.local",
  sm: "sm@atlas.local",
  sm2: "sm2@atlas.local",
  ll: "ll@atlas.local",
  dc: "dc@atlas.local",
  st: "st@atlas.local",
  ag: "ag@atlas.local",
  ag2: "ag2@atlas.local",
  ag4: "ag4@atlas.local",
  ca: "ca@atlas.local",
  ca2: "ca2@atlas.local",
};

const PASSWORDS = {
  "md@atlas.local": "AtlasLocal-MD",
  "pd@atlas.local": "AtlasLocal-PD",
  "pd2@atlas.local": "AtlasLocal-PD2",
  "se@atlas.local": "AtlasLocal-SE",
  "se2@atlas.local": "AtlasLocal-SE2",
  "sv@atlas.local": "AtlasLocal-SV",
  "sv2@atlas.local": "AtlasLocal-SV2",
  "sv3@atlas.local": "AtlasLocal-SV3",
  "fl@atlas.local": "AtlasLocal-FL",
  "cm@atlas.local": "AtlasLocal-CM",
  "sm@atlas.local": "AtlasLocal-SM",
  "sm2@atlas.local": "AtlasLocal-SM2",
  "ll@atlas.local": "AtlasLocal-LL",
  "dc@atlas.local": "AtlasLocal-DC",
  "st@atlas.local": "AtlasLocal-ST",
  "ag@atlas.local": "AtlasLocal-AG",
  "ag2@atlas.local": "AtlasLocal-AG2",
  "ag4@atlas.local": "AtlasLocal-AG4",
  "ca@atlas.local": "AtlasLocal-CA",
  "ca2@atlas.local": "AtlasLocal-CA2",
};

export function seatEmail(seat) {
  const email = SEATS[seat] ?? seat;
  if (!PASSWORDS[email]) throw new Error(`Unknown seat: ${seat}`);
  return email;
}

async function assertServer() {
  try {
    // First SSR render after a cold start compiles the route tree — allow for it.
    const r = await fetch(BASE, { signal: AbortSignal.timeout(90_000) });
    if (!r.ok && r.status !== 200) throw new Error(`HTTP ${r.status}`);
  } catch (err) {
    throw new Error(`Atlas is not running at ${BASE}. Start it with: npm run dev\n(${err.message})`);
  }
}

/**
 * Open the trial browser. Pass `{ reset: true }` ONLY for the cold start on
 * 24 Aug 2026 — it discards the whole company.
 */
export async function openTrial({ reset = false, viewport = { width: 1280, height: 800 } } = {}) {
  await assertServer();

  if (reset && existsSync(PROFILE)) rmSync(PROFILE, { recursive: true, force: true });
  mkdirSync(PROFILE, { recursive: true });

  const context = await chromium.launchPersistentContext(PROFILE, {
    headless: process.env.ATLAS_HEADED ? false : true,
    viewport,
  });
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitForHydration(page);

  if (reset) {
    await page.evaluate(
      ({ keys, prefix }) => {
        for (const k of keys) localStorage.removeItem(k);
        for (const k of Object.keys(localStorage)) {
          if (k.startsWith(prefix)) localStorage.removeItem(k);
        }
      },
      { keys: STORE_KEYS, prefix: STORE_PREFIX },
    );
    await page.reload({ waitUntil: "networkidle" });
  }

  return { context, page };
}

/**
 * Wait for React to hydrate. The dev-only store bridge is only assigned when
 * `store.ts` executes in the browser, so its presence means handlers are live.
 * Without this, a click on the login form submits as a plain GET.
 */
export async function waitForHydration(page, timeout = 60_000) {
  // Two gates, both needed:
  //  1. the bridge exists  -> React has executed, handlers are live
  //  2. persist has rehydrated -> the saved company is loaded
  // Skipping (2) lets a sign-in be silently overwritten when the persisted
  // state lands a moment later.
  await page.waitForFunction(
    () => {
      const s = window.__atlasStore;
      if (!s?.getState) return false;
      const p = s.persist;
      return p?.hasHydrated ? p.hasHydrated() : true;
    },
    null,
    { timeout },
  );
}

/** True when a seat is currently signed in. */
export async function isSignedIn(page) {
  return page
    .evaluate(() => Boolean(window.__atlasStore?.getState?.().user))
    .catch(() => false);
}

/**
 * Switch seat. Calls the same `signInLocal` the login form calls, through the
 * store — so credentials are still checked, but a seat switch does not depend
 * on a page reload winning a race against hydration. Over a 155-day trial that
 * race is the difference between a run and a flake.
 *
 * Use `signInViaForm` when the login UI itself is what you're testing.
 */
export async function signIn(page, seat) {
  const email = seatEmail(seat);

  await waitForHydration(page);
  if (await isSignedIn(page)) await signOut(page);

  const err = await page.evaluate(
    ({ e, p }) => window.__atlasStore.getState().signInLocal(e, p),
    { e: email, p: PASSWORDS[email] },
  );
  if (err) throw new Error(`Sign-in refused for ${email}: ${err}`);

  await page.waitForFunction(
    (e) => window.__atlasStore?.getState?.().user?.email === e,
    email,
    { timeout: 15000 },
  );
  return email;
}

/** Sign in through the real login form — for verifying the login UI. */
export async function signInViaForm(page, seat) {
  const email = seatEmail(seat);

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.getByText("Local test accounts").waitFor({ timeout: 30000 });
  await waitForHydration(page);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORDS[email]);
  await page.getByRole("button", { name: /enter local atlas/i }).click();

  await page.waitForFunction(
    (e) => window.__atlasStore?.getState?.().user?.email === e,
    email,
    { timeout: 30000 },
  );
  return email;
}

/** Navigate to an in-app route as the current seat. */
export async function go(page, path) {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitForHydration(page);
  return page.url();
}

export async function signOut(page) {
  if (!(await isSignedIn(page))) return;
  await page.evaluate(() => window.__atlasStore.getState().signOut());
  await page.waitForFunction(() => !window.__atlasStore?.getState?.().user, null, { timeout: 15000 });
}

/**
 * Move the company clock. `iso` is `YYYY-MM-DD`, or null for real time.
 * Reads through the store's `setSimDate`, which every `todayIso()` honours.
 */
export async function setTrialDate(page, iso) {
  const ok = await page.evaluate((d) => {
    const w = window;
    if (!w.__atlasStore?.getState) return false;
    w.__atlasStore.getState().setSimDate(d);
    return w.__atlasStore.getState().simDate === d;
  }, iso);
  if (!ok) throw new Error("Could not set the trial clock — is the store bridge mounted? (see scripts/trial/README.md)");
  return iso;
}

export async function trialDate(page) {
  return page.evaluate(() => window.__atlasStore?.getState?.().simDate ?? null);
}

/** Read any slice of the store — for asserting continuity between seats. */
export async function readStore(page, key) {
  return page.evaluate((k) => {
    const s = window.__atlasStore?.getState?.();
    return s ? s[k] : null;
  }, key);
}

export async function closeTrial(context) {
  await context.close();
}
