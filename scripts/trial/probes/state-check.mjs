import { openTrial, readStore, closeTrial } from "../session.mjs";
const { context, page } = await openTrial();
const insp = await readStore(page, "inspections");
console.log(
  "inspections:",
  (insp ?? []).map((i) => `${i.template}@${i.location}=${i.result ?? "OPEN"}`).join(" | "),
);
const dil = await readStore(page, "diligence");
console.log("diligence:", (dil ?? []).map((d) => `${d.title}:${d.status}`).join(" | "));
const com = await readStore(page, "commissions");
console.log("commissions:", (com ?? []).map((c) => `${c.id}:${c.status}`).join(" | "));
const units = await readStore(page, "units");
const held = (units ?? []).filter((u) => u.status !== "available");
console.log("locked units:", held.map((u) => `${u.id}:${u.status}`).join(" | "));
await closeTrial(context);
