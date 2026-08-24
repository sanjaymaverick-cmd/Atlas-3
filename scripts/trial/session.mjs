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
 *   - the store persists to localStorage under `atlas3-dukia-v1`.
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
const STORE_PREFIX = "atlas3-";

export const SEATS = {
  md: "md@dukia.local",
  dir1: "dir1@dukia.local",
  dir2: "dir2@dukia.local",
  fl: "fl@dukia.local",
  fl2: "fl2@dukia.local",
  cm: "cm@dukia.local",
  ll: "ll@dukia.local",
  dc: "dc@dukia.local",
  st: "st@dukia.local",
  st2: "st2@dukia.local",
  sm: "sm@dukia.local",
  smav: "sm-av@dukia.local",
  smac: "sm-ac@dukia.local",
  smsf: "sm-sf@dukia.local",
  pdav: "pd-av@dukia.local",
  pdac: "pd-ac@dukia.local",
  pdsf: "pd-sf@dukia.local",
  seav: "se-av@dukia.local",
  seac: "se-ac@dukia.local",
  sesf: "se-sf@dukia.local",
  svav: "sv-av@dukia.local",
  svac: "sv-ac@dukia.local",
  svsf: "sv-sf@dukia.local",
  caap: "ca-ap@dukia.local",
  agap1: "ag-ap1@dukia.local",
  agap2: "ag-ap2@dukia.local",
  casy: "ca-sy@dukia.local",
  agsy1: "ag-sy1@dukia.local",
  casbg: "ca-sbg@dukia.local",
  agsbg1: "ag-sbg1@dukia.local",
};

export const PASSWORDS = {
  "md@dukia.local": "AtlasLocal-MD",
  "dir1@dukia.local": "AtlasLocal-DIR1",
  "dir2@dukia.local": "AtlasLocal-DIR2",
  "fl@dukia.local": "AtlasLocal-FL",
  "fl2@dukia.local": "AtlasLocal-FL2",
  "cm@dukia.local": "AtlasLocal-CM",
  "ll@dukia.local": "AtlasLocal-LL",
  "dc@dukia.local": "AtlasLocal-DC",
  "st@dukia.local": "AtlasLocal-ST",
  "st2@dukia.local": "AtlasLocal-ST2",
  "sm@dukia.local": "AtlasLocal-SM",
  "sm-av@dukia.local": "AtlasLocal-SMAV",
  "sm-ac@dukia.local": "AtlasLocal-SMAC",
  "sm-sf@dukia.local": "AtlasLocal-SMSF",
  "pd-av@dukia.local": "AtlasLocal-PDAV",
  "pd-ac@dukia.local": "AtlasLocal-PDAC",
  "pd-sf@dukia.local": "AtlasLocal-PDSF",
  "se-av@dukia.local": "AtlasLocal-SEAV",
  "se-ac@dukia.local": "AtlasLocal-SEAC",
  "se-sf@dukia.local": "AtlasLocal-SESF",
  "sv-av@dukia.local": "AtlasLocal-SVAV",
  "sv-ac@dukia.local": "AtlasLocal-SVAC",
  "sv-sf@dukia.local": "AtlasLocal-SVSF",
  "ca-ap@dukia.local": "AtlasLocal-CAAP",
  "ag-ap1@dukia.local": "AtlasLocal-AGAP1",
  "ag-ap2@dukia.local": "AtlasLocal-AGAP2",
  "ca-sy@dukia.local": "AtlasLocal-CASY",
  "ag-sy1@dukia.local": "AtlasLocal-AGSY1",
  "ca-sbg@dukia.local": "AtlasLocal-CASBG",
  "ag-sbg1@dukia.local": "AtlasLocal-AGSBG1",
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
