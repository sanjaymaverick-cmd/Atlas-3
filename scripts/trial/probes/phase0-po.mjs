/**
 * Phase 0 — prove vendor activation dead end is fixed.
 * Fresh vendor: KYC → approval card → MD Active → quote select → PO.
 *
 *   node scripts/trial/probes/phase0-po.mjs
 */
import { openTrial, signIn, signOut, closeTrial } from "../session.mjs";

const { context, page } = await openTrial({ reset: false });
const out = [];
function line(id, ok, detail) {
  out.push({ id, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${id}  ${String(detail).slice(0, 240)}`);
}

try {
  await signIn(page, "cm");
  const cm = await page.evaluate(() => {
    const g = () => window.__atlasStore.getState();
    g().setEntity("le_sbc");
    g().setProject("p_av");
    g().inviteVendor({
      name: "Phase0 Proof Civil",
      trade: "Structure / civil",
      city: "Jaipur",
      gstin: "08AAPH0SE01C1Z4",
    });
    const v = g().vendors.find((x) => x.name === "Phase0 Proof Civil");
    let last = null;
    let guard = 0;
    while (guard++ < 10) {
      const cur = g().vendors.find((x) => x.id === v.id);
      if (!cur || cur.stage === "approval" || cur.stage === "active") break;
      last = g().advanceVendor(v.id);
      if (last) break;
    }
    if (g().vendors.find((x) => x.id === v.id)?.stage === "approval") {
      last = g().advanceVendor(v.id) ?? last;
    }
    const card = g().approvals.find((a) => a.kind === "Vendor" && a.refId === v.id && a.status === "pending");
    return {
      vendorId: v?.id,
      stage: g().vendors.find((x) => x.id === v.id)?.stage,
      card: card ? { id: card.id, waitingOn: card.waitingOn, title: card.title } : null,
      last,
    };
  });
  line("kyc-approval-card", Boolean(cm.card) && cm.stage === "approval", JSON.stringify(cm));
  await signOut(page);

  await signIn(page, "md");
  const md = await page.evaluate((cardId) => {
    const g = () => window.__atlasStore.getState();
    g().setEntity("le_sbc");
    const pending = g().approvals.filter((a) => a.status === "pending" && a.kind === "Vendor");
    const card = pending.find((a) => a.id === cardId) ?? pending[0];
    const act = card ? g().decideApproval(card.id, "approved") : "none pending";
    const v = g().vendors.find((x) => x.name === "Phase0 Proof Civil");
    return { pendingBefore: pending.length, act, stage: v?.stage, nonePending: pending.length === 0 };
  }, cm.card?.id);
  line("md-sees-card", md.pendingBefore > 0 && md.act !== "none pending", JSON.stringify(md));
  line("vendor-active", md.stage === "active", md.stage);
  await signOut(page);

  await signIn(page, "cm");
  const po = await page.evaluate((vendorId) => {
    const g = () => window.__atlasStore.getState();
    g().setEntity("le_sbc");
    g().setProject("p_av");
    const rfqErr = g().createRfq({
      projectId: "p_av",
      title: "Phase0 structure / civil",
      package: "Structure / civil",
      due: g().simDate ?? "2024-09-16",
      required: true,
    });
    const rfq = g().rfqs.find((r) => r.title === "Phase0 structure / civil" && r.status === "open");
    const qErr = rfq
      ? g().submitQuote({
          rfqId: rfq.id,
          vendorId,
          amount: 41_00_00_000,
          validity: g().simDate ?? "2025-03-31",
          exclusions: "phase0",
        })
      : "no rfq";
    const q = g().quotes.find((x) => x.rfqId === rfq?.id && x.vendorId === vendorId);
    const sel = q ? g().selectQuote(q.id) : "quote missing";
    const poErr = q ? g().createPOFromQuote(q.id) : "no quote";
    const row = g().pos.find((p) => p.quoteId === q?.id);
    const landRefuse = g().acquireParcel("lp_av");
    const book = g().bookNextAvailable("p_av", { prefix: "ZZZ", customer: "Phase0 3BHK fallback" });
    const av = g().parcels.find((p) => p.id === "lp_av");
    const shakti = g().vendors.find((v) => v.id === vendorId);
    return {
      rfqErr,
      qErr,
      sel,
      poErr,
      po: row ? { id: row.id, vendorId: row.vendorId, amount: row.amount } : null,
      posCount: g().pos.length,
      landRefuse,
      book,
      land: av ? { status: av.status, considerationInr: av.considerationInr, saleDeedNo: av.saleDeedNo } : null,
      stage: shakti?.stage,
    };
  }, cm.vendorId);
  line("quote-select", !po.sel, po.sel);
  line("po-created", Boolean(po.po?.id) && po.posCount >= 1, JSON.stringify(po.po));
  line("land-consideration-required", Boolean(po.landRefuse) || Boolean(po.land?.considerationInr && po.land?.saleDeedNo), po.landRefuse ?? JSON.stringify(po.land));
  line("book-next-fallback", po.book === null, po.book);
  line("vendor-still-active", po.stage === "active", po.stage);
  await signOut(page);
} finally {
  await closeTrial(context);
}

const failed = out.filter((x) => !x.ok);
console.log(`\n${out.filter((x) => x.ok).length}/${out.length} passed · ${failed.length} failed`);
if (failed.length) process.exitCode = 1;
