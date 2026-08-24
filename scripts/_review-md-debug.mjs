import { chromium } from "playwright";
const BASE = "http://127.0.0.1:8080";
const browser = await chromium.launch({ headless: true });
const page = await browser.newContext({ viewport: { width: 1280, height: 800 } }).then((c) => c.newPage());
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
page.on("console", (m) => {
  if (m.type() === "error") console.log("CONSOLE", m.text());
});
await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
console.log("url1", page.url());
await page.evaluate(() => {
  for (const k of Object.keys(localStorage)) localStorage.removeItem(k);
});
await page.reload({ waitUntil: "networkidle" });
const body = await page.locator("body").innerText();
console.log("gate", body.slice(0, 400));
await page.getByRole("button", { name: "Managing Director" }).click();
const email = await page.locator("input").nth(0).inputValue();
const pw = await page.locator("input").nth(1).inputValue();
console.log("filled", email, pw);
await page.getByRole("button", { name: /enter local atlas/i }).click();
await page.waitForTimeout(3000);
console.log("url2", page.url());
console.log("body2", (await page.locator("body").innerText()).slice(0, 500));
console.log("selects", await page.locator("select").count());
await page.screenshot({ path: "screenshots/review/md/_debug-login.png" });
await browser.close();
