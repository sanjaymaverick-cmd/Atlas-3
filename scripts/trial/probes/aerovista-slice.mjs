/**
 * Short Aerovista slice after merge proof.
 * Active vendor + PO already from phase0; add 2–3 bookings and one RERA QPR.
 *
 *   node scripts/trial/probes/aerovista-slice.mjs
 */
import { openTrial, signIn, signOut, closeTrial } from "../session.mjs";

const { context, page } = await openTrial({ reset: false });
const out = [];
function line(id, ok, detail) {
  out.push({ id, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${id}  ${String(detail).slice(0, 280)}`);
}

try {
  await signIn(page, "md");
  const gate = await page.evaluate(() => {
    const g = () => window.__atlasStore.getState();
    g().setEntity("le_sbc");
    g().setProject("p_av");
    const pending = g().approvals.filter(
      (a) => a.status === "pending" && a.kind === "Purchase order" && a.projectId === "p_av",
    );
    const approved = pending.map((a) => ({ id: a.id, err: g().decideApproval(a.id, "approved") }));
    const pos = g().pos.filter((p) => p.projectId === "p_av");
    const active = g().vendors.filter((v) => v.stage === "active");
    return {
      poApproved: approved,
      poCount: pos.length,
      poStatus: pos.map((p) => `${p.id}:${p.status}`),
      activeVendors: active.map((v) => v.name),
    };
  });
  line("active-vendor", gate.activeVendors.length > 0, gate.activeVendors.join(", ") || "none");
  line("aerovista-po", gate.poCount >= 1, JSON.stringify(gate.poStatus));
  await signOut(page);

  await signIn(page, "smav");
  const books = await page.evaluate(() => {
    const g = () => window.__atlasStore.getState();
    g().setEntity("le_sbc");
    g().setProject("p_av");
    const before = g().bookings.filter(
      (b) => b.projectId === "p_av" && b.status !== "cancelled",
    ).length;
    const errs = [];
    for (const customer of ["Slice buyer A", "Slice buyer B", "Slice buyer C"]) {
      errs.push(g().bookNextAvailable("p_av", { prefix: "AVA", customer }) ?? "ok");
    }
    const after = g().bookings.filter((b) => b.projectId === "p_av" && b.status !== "cancelled");
    const newOnes = after.filter((b) =>
      ["Slice buyer A", "Slice buyer B", "Slice buyer C"].includes(b.customer),
    );
    return {
      before,
      errs,
      booked: newOnes.map((b) => `${b.unit}:${b.customer}`),
      total: after.length,
    };
  });
  const bookedOk = books.booked.length >= 2 && books.errs.filter((e) => e === "ok").length >= 2;
  line("bookings-2-3", bookedOk, JSON.stringify(books));
  await signOut(page);

  await signIn(page, "ll");
  const rera = await page.evaluate(() => {
    const g = () => window.__atlasStore.getState();
    g().setEntity("le_sbc");
    g().setProject("p_av");
    const add = g().addObligation({
      projectId: "p_av",
      kind: "rera",
      title: "RERA QPR 2024-09 — RAJ/P/2024/2144",
      due: "2024-10-15",
    });
    const row = g().obligations.find(
      (o) => o.title.includes("RERA QPR 2024-09") && o.projectId === "p_av",
    );
    const filed = row ? g().fileObligation(row.id, "RERA/AV/2024/Q2-SLICE") : "missing";
    const after = g().obligations.find((o) => o.id === row?.id);
    return { add, filed, status: after?.status, ref: after?.filedRef };
  });
  line("rera-qpr-filed", rera.status === "filed" && Boolean(rera.ref), JSON.stringify(rera));
  await signOut(page);
} finally {
  await closeTrial(context);
}

const failed = out.filter((x) => !x.ok);
console.log(`\n${out.filter((x) => x.ok).length}/${out.length} passed · ${failed.length} failed`);
if (failed.length) process.exitCode = 1;
