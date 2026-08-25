#!/usr/bin/env node
/** Prove CatBoost native bind: service + pipeline ingest stamps servedBy catboost. */
import { chromium } from "playwright";

const BASE = process.env.ATLAS_URL || "http://127.0.0.1:8080";
const SCORE = process.env.VITE_SCORING_URL || "http://127.0.0.1:8091";

const errors = [];

async function main() {
  const health = await fetch(`${SCORE}/health`).then((r) => r.json());
  if (!health.ok || !health.model) errors.push(`scoring health ${JSON.stringify(health)}`);

  const native = await fetch(`${SCORE}/score`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      cat_features: ["source", "stage", "kind"],
      categoricals: { source: "walk-in", stage: "visit", kind: "flat" },
      numerics: { budget: 8_200_000, unit_price: 8_100_000, wa: 1, call: 1, brochure: 0, visit: 1 },
    }),
  }).then((r) => r.json());
  if (native.algorithm !== "catboost") errors.push("native algorithm is not catboost");
  if (!native.shap_values?.source && native.shap_values?.source !== 0) errors.push("missing shap");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (err) => errors.push(String(err)));
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage))
      if (k.startsWith("atlas3-")) localStorage.removeItem(k);
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("Local test accounts").waitFor({ timeout: 20000 });
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "Sales Manager" }).click();
  await page.getByRole("button", { name: /enter local atlas/i }).click();
  await page.getByRole("button", { name: /end session/i }).waitFor({ timeout: 25000 });
  await page.goto(`${BASE}/app/sales/pipeline`, { waitUntil: "domcontentloaded" });
  await page.getByText("New → visit → book").waitFor({ timeout: 10000 });
  const phone = `99xxxx${String(Date.now()).slice(-4)}`;
  await page
    .locator("label")
    .filter({ hasText: /^Name$/ })
    .locator("input")
    .fill("CatBoost Bind");
  await page
    .locator("label")
    .filter({ hasText: /^Phone$/ })
    .locator("input")
    .fill(phone);
  await page.getByRole("button", { name: /ingest & score/i }).click();
  await page.waitForTimeout(2500);
  const body = await page.locator("body").innerText();
  if (!/CatBoost Bind/i.test(body)) errors.push("ingested lead missing");
  if (!/catboost/i.test(body)) errors.push("pipeline did not stamp catboost (hybrid fallback?)");
  await browser.close();

  const report = {
    ok: errors.length === 0,
    nativeScore: native.score,
    nativeBand: native.band,
    errors,
  };
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
