/** Hard invariant: a held or booked unit must not be re-holdable. */
import { openTrial, signIn, signOut, closeTrial } from "../session.mjs";
const { context, page } = await openTrial();
await signIn(page, "ag");
const out = await page.evaluate(() => {
  const s = window.__atlasStore.getState();
  const me = s.agents.find((a) => a.userId === s.user?.id);
  // Clear the daily-report gate first so the lock itself is what we test.
  const rep = s.fileDailyReport({
    agentId: me.id,
    calls: 5,
    visits: 1,
    leads: 1,
    holds: 0,
    bookings: 0,
    cancellations: 0,
    notes: "Lock probe day.",
  });
  const st = window.__atlasStore.getState();
  const booked = st.units.find((u) => u.status === "booked");
  const held = st.units.find((u) => u.status === "held");
  return {
    reportGate: rep ?? "filed",
    bookedUnit: booked?.id,
    reholdBooked: booked
      ? st.holdUnit({ unitId: booked.id, agentId: me.id, customer: "Probe A", until: "2026-09-10" })
      : "no booked unit",
    heldUnit: held?.id,
    reholdHeld: held
      ? window.__atlasStore
          .getState()
          .holdUnit({ unitId: held.id, agentId: me.id, customer: "Probe B", until: "2026-09-10" })
      : "no held unit",
  };
});
console.log("daily report gate :", out.reportGate);
console.log("re-hold BOOKED", out.bookedUnit, "->", out.reholdBooked ?? "ALLOWED (no refusal)");
console.log("re-hold HELD  ", out.heldUnit, "->", out.reholdHeld ?? "ALLOWED (no refusal)");
await signOut(page);
await closeTrial(context);
