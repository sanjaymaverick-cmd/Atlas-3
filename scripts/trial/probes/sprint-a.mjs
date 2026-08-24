/**
 * Sprint A acceptance: vendor card → Active → quote select → one PO.
 * Also: land consideration if parcel still open; book-next fallback.
 *
 *   node scripts/trial/probes/sprint-a.mjs
 */
import { openTrial, signIn, signOut, closeTrial } from "../session.mjs";

const { context, page } = await openTrial({ reset: false });
const out = [];

function line(id, ok, detail) {
  out.push({ id, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${id}  ${detail}`);
}

try {
  await signIn(page, "cm");
  const cm = await page.evaluate(() => {
    const g = () => window.__atlasStore.getState();
    g().setEntity("le_sbc");
    g().setProject("p_av");
    const gst = g().setVendorGstin("v_civ", "08AASFE2211C1Z8");
    let guard = 0;
    let last = gst;
    while (guard++ < 10) {
      const v = g().vendors.find((x) => x.id === "v_civ");
      if (!v || v.stage === "approval" || v.stage === "active") break;
      last = g().advanceVendor("v_civ");
      if (last) break;
    }
    const v = g().vendors.find((x) => x.id === "v_civ");
    if (v?.stage === "approval") g().advanceVendor("v_civ");
    const card = g().approvals.find((a) => a.kind === "Vendor" && a.refId === "v_civ" && a.status === "pending");
    return {
      stage: v?.stage,
      card: card ? `${card.id} · ${card.waitingOn} · ${card.title}` : "missing",
      last,
    };
  });
  line("vendor-card", Boolean(cm.card !== "missing" || cm.stage === "active"), JSON.stringify(cm));
  await signOut(page);

  await signIn(page, "md");
  const md = await page.evaluate(() => {
    const g = () => window.__atlasStore.getState();
    g().setEntity("le_sbc");
    const pending = g().approvals.filter((a) => a.status === "pending" && a.kind === "Vendor");
    const done = pending.map((a) => g().decideApproval(a.id, "approved") ?? a.id);
    const v = g().vendors.find((x) => x.id === "v_civ");
    return { approved: done, stage: v?.stage };
  });
  line("vendor-active", md.stage === "active", JSON.stringify(md));
  await signOut(page);

  await signIn(page, "cm");
  const po = await page.evaluate(() => {
    const g = () => window.__atlasStore.getState();
    g().setEntity("le_sbc");
    g().setProject("p_av");
    let rfq = g().rfqs.find((r) => r.projectId === "p_av" && r.status === "open");
    if (!rfq) {
      g().createRfq({
        projectId: "p_av",
        title: "Sprint A structure / civil",
        package: "Structure / civil",
        due: g().simDate ?? "2024-09-16",
        required: true,
      });
      rfq = g().rfqs.find((r) => r.projectId === "p_av" && r.status === "open");
    }
    const existing = g().quotes.find((q) => q.rfqId === rfq?.id && q.vendorId === "v_civ");
    if (!existing && rfq) {
      g().submitQuote({
        rfqId: rfq.id,
        vendorId: "v_civ",
        amount: 42_00_00_000,
        validity: g().simDate ?? "2025-03-31",
        exclusions: "as per spec",
      });
    }
    const q = g().quotes.find((x) => x.rfqId === rfq?.id && x.vendorId === "v_civ");
    const sel = q && q.status !== "selected" ? g().selectQuote(q.id) : q ? null : "quote missing";
    const poErr = q ? g().createPOFromQuote(q.id) : "no quote";
    const row = g().pos.find((p) => p.quoteId === q?.id) ?? g().pos.find((p) => p.vendorId === "v_civ" && p.projectId === "p_av");
    const bookFallback = g().bookNextAvailable("p_av", { prefix: "ZZZ", customer: "Sprint-A fallback 3BHK" });
    const av = g().parcels.find((p) => p.id === "lp_av");
    return {
      select: sel,
      poErr,
      po: row ? { id: row.id, vendorId: row.vendorId, amount: row.amount, status: row.status } : null,
      bookFallback,
      land: av ? { status: av.status, considerationInr: av.considerationInr, saleDeedNo: av.saleDeedNo } : null,
      shakti: g().vendors.find((v) => v.id === "v_civ")?.stage,
    };
  });
  line("quote-select", !po.select, String(po.select));
  line("po-created", Boolean(po.po?.id), JSON.stringify({ po: po.po, poErr: po.poErr }));
  line("book-fallback", po.bookFallback === null, String(po.bookFallback));
  line("shakti-active", po.shakti === "active", String(po.shakti));
  await signOut(page);
} finally {
  await closeTrial(context);
}

const failed = out.filter((x) => !x.ok);
console.log(`\n${out.filter((x) => x.ok).length}/${out.length} passed · ${failed.length} failed`);
if (failed.length) process.exitCode = 1;
