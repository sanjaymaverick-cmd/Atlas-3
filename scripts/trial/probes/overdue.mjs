import { openTrial, readStore, trialDate, closeTrial } from "../session.mjs";
const { context, page } = await openTrial();
console.log("trial date:", await trialDate(page));
const obs = await readStore(page, "obligations");
const today = await page.evaluate(() => window.__atlasStore.getState().simDate);
for (const o of obs ?? []) {
  const overdue = o.due < today && o.status !== "filed";
  console.log(`${overdue ? "OVERDUE " : "        "} ${o.kind.padEnd(10)} due ${o.due}  status=${o.status ?? "-"}  ${o.title}`);
}
const emis = await readStore(page, "emis");
console.log("\nEMIs:", (emis ?? []).map(e => `${e.id}:due ${e.due}:${e.status ?? "-"}`).join(" | ") || "none");
await closeTrial(context);
