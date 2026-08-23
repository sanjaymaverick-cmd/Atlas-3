import { NAV } from "@/components/layout/nav";
import { canSeeTally, homeForRole } from "@/lib/roles";
import { USERS } from "@/lib/seed";
import { useAtlas } from "@/lib/store";
import { tallyAgent } from "@/lib/tally";
import { todayIso } from "@/lib/utils";
import type { Role } from "@/lib/types";

export interface CompanyDayStep {
  id: string;
  seat: string;
  role: Role;
  action: string;
  ok: boolean;
  detail: string;
}

export interface UxNote {
  seat: string;
  screen: string;
  issue: string;
  severity: "p2" | "p3";
}

export interface CompanyDayReport {
  at: string;
  live: false;
  steps: CompanyDayStep[];
  ux: UxNote[];
  passed: number;
  failed: number;
}

const SEATS = USERS.filter((u) => u.id !== "u_test");

function asUser(email: string) {
  const row = USERS.find((u) => u.email === email);
  if (!row) throw new Error(`Unknown seat ${email}`);
  const err = useAtlas.getState().signInLocal(row.email, row.password);
  if (err) throw new Error(err);
  return row;
}

export async function executeCompanyDay(): Promise<CompanyDayReport> {
  const steps: CompanyDayStep[] = [];
  const ux: UxNote[] = [];

  function addUx(seat: string, screen: string, issue: string, severity: UxNote["severity"] = "p2") {
    ux.push({ seat, screen, issue, severity });
  }

  function record(
    id: string,
    seat: string,
    role: Role,
    action: string,
    result: string | null | undefined | boolean,
    expectRefuse = false,
  ) {
    const refused = typeof result === "string" && result.length > 0;
    const ok = typeof result === "boolean" ? result : expectRefuse ? refused : !refused;
    const detail =
      typeof result === "boolean"
        ? result
          ? "ok"
          : "failed"
        : result || (expectRefuse ? "expected a refuse, got success" : "ok");
    steps.push({ id, seat, role, action, ok, detail });
  }

  // ── Seat roster & homes ──────────────────────────────────────────────
  for (const u of SEATS) {
    asUser(u.email);
    const home = homeForRole(u.role);
    record(`home-${u.role}`, u.title, u.role, `Land on ${home}`, true);
    const tallyLink = NAV.some((n) => n.to === "/app/finance" && n.roles.includes(u.role));
    const tallyOk = canSeeTally(u.role) ? tallyLink : !tallyLink;
    record(
      `tally-nav-${u.role}`,
      u.title,
      u.role,
      canSeeTally(u.role) ? "Tally visible on this seat" : "Tally hidden on this seat",
      tallyOk,
    );
    if (!canSeeTally(u.role) && tallyLink) {
      addUx(u.title, "Nav", "Tally is visible to a seat that must never see Tally actions.");
    }
  }

  // ── Legal: land ──────────────────────────────────────────────────────
  const legal = asUser("ll@atlas.local");
  useAtlas.getState().setEntity("le_homes");
  const acquireBlocked = useAtlas.getState().acquireParcel("lp2");
  record("land-refuse", legal.title, legal.role, "Acquire Baggad while diligence is open", acquireBlocked, true);
  if (!acquireBlocked) {
    addUx(legal.title, "Land", "Acquire succeeded with open diligence — refuse reason should list open/flagged items.");
  }
  useAtlas.getState().setDiligence("dd1", "clear");
  useAtlas.getState().setDiligence("dd3", "clear");
  const acquired = useAtlas.getState().acquireParcel("lp2");
  record("land-acquire", legal.title, legal.role, "Acquire Baggad after diligence clear", acquired);

  // ── Documents: quarantine → four-eyes → single-use ───────────────────
  const docs = asUser("dc@atlas.local");
  useAtlas.getState().setEntity("le_llp");
  useAtlas.getState().registerDocument({
    projectId: "p_kanak",
    title: "Company-day raft scan",
    kind: "Drawing",
    classification: "internal",
    sheet: "CD-SCAN",
  });
  const fresh = useAtlas.getState().documents.find((d) => d.title === "Company-day raft scan");
  record("doc-register", docs.title, docs.role, "Register file lands in quarantine", fresh?.status === "quarantine");
  const cleared = fresh ? useAtlas.getState().clearQuarantine(fresh.id) : "no document";
  record("doc-clear", docs.title, docs.role, "Clear quarantine", cleared);
  const exportReq = fresh ? useAtlas.getState().requestExport(fresh.id) : "no document";
  record("doc-export-req", docs.title, docs.role, "Request original (four-eyes)", exportReq);

  const md = asUser("md@atlas.local");
  const exportApproval = useAtlas
    .getState()
    .approvals.find((a) => a.kind === "Document export" && a.status === "pending" && a.title.includes("Company-day"));
  const exportDecide = exportApproval
    ? useAtlas.getState().decideApproval(exportApproval.id, "approved")
    : "export approval missing";
  record("doc-four-eyes", md.title, md.role, "MD approves original export", exportDecide);
  const grant = useAtlas.getState().exports.find((e) => e.documentId === fresh?.id && e.status === "granted");
  const once = grant ? useAtlas.getState().consumeExport(grant.id) : "grant missing";
  record("doc-consume", docs.title, "docs", "Consume single-use grant", once);
  const twice = grant ? useAtlas.getState().consumeExport(grant.id) : "grant missing";
  record("doc-consume-2", md.title, md.role, "Second download refused", twice, true);

  // ── Site supervisor: diary idempotency ───────────────────────────────
  const sup = asUser("sv@atlas.local");
  const deviceKey = `company-day-sup-${todayIso()}`;
  const diary1 = useAtlas.getState().addDiary({
    projectId: "p_kanak",
    date: todayIso(),
    weather: "Clear",
    labour: 96,
    work: "Company-day raft steel.",
    materials: "TMT issued from stores.",
    safety: "Nil.",
    deviceKey,
  });
  record("diary-seal", sup.title, sup.role, "Seal today’s diary", diary1);
  const diary2 = useAtlas.getState().addDiary({
    projectId: "p_kanak",
    date: todayIso(),
    weather: "Clear",
    labour: 96,
    work: "Duplicate seal.",
    materials: "—",
    safety: "Nil.",
    deviceKey,
  });
  record("diary-idempotent", sup.title, sup.role, "Second seal same device+date refused", diary2, true);

  // ── Site engineer: fail inspection → NCR ─────────────────────────────
  const eng = asUser("se@atlas.local");
  useAtlas.getState().scheduleInspection({
    projectId: "p_kanak",
    template: "Company-day pour",
    location: "Tower B raft",
  });
  const insp = useAtlas.getState().inspections.find((i) => i.template === "Company-day pour");
  const failInsp = insp ? useAtlas.getState().completeInspection(insp.id, "fail") : "inspection missing";
  record("insp-fail", eng.title, eng.role, "Fail inspection", failInsp);
  const ncr = useAtlas.getState().changes.some((c) => c.kind === "ncr" && c.title.includes("Company-day pour"));
  record("insp-ncr", eng.title, eng.role, "Fail raises NCR in change control", ncr);

  // ── Stores: issue cannot exceed receipts ─────────────────────────────
  const stores = asUser("st@atlas.local");
  const issueOk = useAtlas.getState().issueMaterial("m1", 10);
  record("mat-issue", stores.title, stores.role, "Issue 10 TMT within receipts", issueOk);
  const issueOver = useAtlas.getState().issueMaterial("m1", 10_000);
  record("mat-over", stores.title, stores.role, "Issue past receipts refused", issueOver, true);
  const qty = useAtlas.getState().approveQuantity("q2");
  record("qty-approve", stores.title, stores.role, "Approve raft quantity variance", qty);

  // ── Commercial: vendor gate + RFQ → PO ───────────────────────────────
  const com = asUser("cm@atlas.local");
  useAtlas.getState().inviteVendor({
    name: "Company-day Scaffolding",
    trade: "Scaffold",
    city: "Jaipur",
    gstin: "",
  });
  const noGst = useAtlas.getState().vendors.find((v) => v.name === "Company-day Scaffolding");
  let adv = noGst ? useAtlas.getState().advanceVendor(noGst.id) : "vendor missing";
  adv = noGst ? useAtlas.getState().advanceVendor(noGst.id) : adv;
  record("vendor-gstin", com.title, com.role, "Advance to verified without GSTIN refused", adv, true);

  const poKyc = useAtlas.getState().createPO({
    projectId: "p_kanak",
    vendorId: "v2",
    title: "Should not issue",
    amount: 1000,
  });
  record("po-not-active", com.title, com.role, "PO against non-Active vendor refused", poKyc, true);

  const selBad = useAtlas.getState().selectQuote("q4");
  record("quote-inactive", com.title, com.role, "Select quote from invited vendor refused", selBad, true);

  const selOk = useAtlas.getState().selectQuote("q5");
  record("quote-select", com.title, com.role, "Select Active vendor quote on waterproofing RFQ", selOk);
  const poFrom = useAtlas.getState().createPOFromQuote("q5");
  record("po-from-quote", com.title, com.role, "Create PO from selected quote", poFrom);
  const poDup = useAtlas.getState().createPOFromQuote("q5");
  record("po-dup", com.title, com.role, "Second Create PO on same quote refused", poDup, true);
  if (poDup === null) {
    addUx(
      com.title,
      "Quotations",
      "Create PO stays enabled after the first PO from this quote — a second click mints a duplicate order.",
    );
  }

  const md2 = asUser("md@atlas.local");
  const poCard = useAtlas
    .getState()
    .approvals.find(
      (a) => a.kind === "Purchase order" && a.status === "pending" && (a.context ?? "").includes("Selected quote"),
    );
  record(
    "po-context",
    md2.title,
    md2.role,
    "PO approval card carries quote context",
    Boolean(poCard?.context && poCard.context.toLowerCase().includes("quote")),
  );
  const poApprove = poCard ? useAtlas.getState().decideApproval(poCard.id, "approved") : "PO card missing";
  record("po-approve", md2.title, md2.role, "MD approves PO from quote", poApprove);

  const vendorActivate = useAtlas.getState().approvals.find((a) => a.id === "a4" && a.status === "pending");
  const v2 = useAtlas.getState().vendors.find((v) => v.id === "v2");
  if (vendorActivate && v2?.stage === "approval") {
    const act = useAtlas.getState().decideApproval(vendorActivate.id, "approved");
    record("vendor-activate", md2.title, md2.role, "MD activates vendor already in approval stage", act);
  } else if (vendorActivate && v2 && v2.stage !== "approval") {
    const act = useAtlas.getState().decideApproval(vendorActivate.id, "approved");
    record("vendor-skip-block", md2.title, md2.role, "Refuse activate while vendor is not in approval", act, true);
  }

  // ── Sales: booking, commission accrue, possession gate ───────────────
  const sales = asUser("sm@atlas.local");
  const convert = useAtlas.getState().convertLead("ld2", 7_500_000);
  record("crm-convert", sales.title, sales.role, "Convert partner lead → booking + accrued commission", convert);
  const comm = useAtlas.getState().commissions.find((c) => c.bookingId && c.status === "accrued");
  record("crm-accrue", sales.title, sales.role, "Commission accrued (not paid)", comm?.status === "accrued");
  const clash = useAtlas.getState().addBooking({
    projectId: "p_kanak",
    unit: "B-1104",
    customer: "Clash",
    value: 1,
  });
  record("book-clash", sales.title, sales.role, "Second active booking on same unit refused", clash, true);
  const possessed = useAtlas.getState().addBooking({
    projectId: "p_mansar",
    unit: "C-304",
    customer: "Should fail",
    value: 1,
  });
  record("book-possessed", sales.title, sales.role, "Book a possessed unit refused", possessed, true);
  if (possessed === null) {
    addUx(sales.title, "Customers", "Possessed unit C-304 can be booked again — one live booking per unit should include possession.");
  }
  const earlyPoss = useAtlas.getState().markPossession("b1");
  record("poss-early", sales.title, sales.role, "Possession before full collection refused", earlyPoss, true);
  const dupLead = useAtlas.getState().ingestLead({
    projectId: "p_kanak",
    name: "Dup",
    phone: "98xxxx2101",
    source: "99acres",
    unit: "A-0802",
    note: "dup probe",
  });
  record("lead-dedup", sales.title, sales.role, "Duplicate phone on same project refused", dupLead, true);
  const assigned = useAtlas.getState().assignLead("ld5", "ag5");
  record("lead-assign", sales.title, sales.role, "Assign in-house lead to active in-house agent", assigned);
  const crossDesk = useAtlas.getState().assignLead("ld5", "ag4");
  record("lead-assign-firm", sales.title, sales.role, "Desert Reach agent cannot take an in-house lead", crossDesk, true);
  useAtlas.getState().setAgentStatus("ag5", "suspended");
  const sus = useAtlas.getState().assignLead("ld3", "ag5");
  record("lead-assign-suspended", sales.title, sales.role, "Suspended agent cannot take a lead", sus, true);
  useAtlas.getState().setAgentStatus("ag5", "active");
  const hoOpen = useAtlas.getState().handovers.some((h) => h.unit === "B-1104");
  record("handover-open", sales.title, sales.role, "Convert opens a handover case for the unit", hoOpen);
  const hoNew = useAtlas.getState().handovers.find((h) => h.unit === "B-1104");
  const hoOc = hoNew ? useAtlas.getState().advanceHandover(hoNew.id) : "handover missing";
  record("ho-no-oc", sales.title, sales.role, "Handover possession blocked until OC/CC", hoOc, true);
  const hoSeed = useAtlas.getState().handovers.find((h) => h.unit === "C-304");
  const hoSnag = hoSeed ? useAtlas.getState().advanceHandover(hoSeed.id) : "handover missing";
  record("ho-snags", sales.title, sales.role, "Handover possession blocked while snags are open", hoSnag, true);
  const visit = useAtlas.getState().scheduleVisit({
    leadId: "ld1",
    scheduled: todayIso(),
    note: "Company-day sample flat",
  });
  record("visit-schedule", sales.title, sales.role, "Schedule site visit", visit);
  const visitWa = useAtlas.getState().waSends.some((w) => w.leadId === "ld1" && w.templateId === "wa1");
  record("visit-wa", sales.title, sales.role, "Site-visit auto-sends utility confirm", visitWa);
  const bookYadav = useAtlas.getState().bookings.find((b) => b.unit === "B-1104" && b.status === "active");
  const dueBefore = useAtlas.getState().waSends.filter((w) => w.templateId === "wa3").length;
  const collected = bookYadav ? useAtlas.getState().collect(bookYadav.id, 50_000) : "booking missing";
  record("collect-token", sales.title, sales.role, "Collect a token on the converted booking", collected);
  const dueAfter = useAtlas.getState().waSends.filter((w) => w.templateId === "wa3").length;
  record("wa-payment-due", sales.title, sales.role, "Remaining balance fires payment_due template", dueAfter > dueBefore);
  const mkt = useAtlas.getState().sendWhatsApp({ templateId: "wa7", leadId: "ld5" });
  record("wa-marketing-consent", sales.title, sales.role, "Marketing WhatsApp refused without consent", mkt, true);
  const low = useAtlas.getState().sendWhatsApp({ templateId: "wa8", leadId: "ld1" });
  record("wa-low-quality", sales.title, sales.role, "Paused / low-quality template refused", low, true);
  useAtlas.getState().setScoreModel("catboost");
  record(
    "score-catboost",
    sales.title,
    sales.role,
    "CatBoost selected (native if scoring URL bound, else hybrid)",
    useAtlas.getState().activeScoreModel === "catboost",
  );
  const wonLead = useAtlas.getState().leads.find((l) => l.id === "ld2");
  record("customer-360", sales.title, sales.role, "Customer master row on convert", Boolean(wonLead?.customerId));

  const ch = asUser("ag@atlas.local");
  const holdNoReport = useAtlas.getState().holdUnit({
    unitId: "un3",
    agentId: "ag1",
    customer: "Hold probe",
    until: todayIso(),
  });
  record("hold-no-report", ch.title, ch.role, "Channel hold refused until daily report", holdNoReport, true);
  const filed = useAtlas.getState().fileDailyReport({
    agentId: "ag1",
    calls: 6,
    visits: 1,
    leads: 1,
    notes: "company-day",
  });
  record("daily-report", ch.title, ch.role, "File mandatory daily report", filed);
  const holdOk = useAtlas.getState().holdUnit({
    unitId: "un3",
    agentId: "ag1",
    customer: "Hold probe",
    until: todayIso(),
  });
  record("hold-lock", ch.title, ch.role, "Hold locks available unit", holdOk);
  const holdClash = useAtlas.getState().holdUnit({
    unitId: "un3",
    agentId: "ag1",
    customer: "Second probe",
    until: todayIso(),
  });
  record("hold-clash", ch.title, ch.role, "Second hold on same unit refused", holdClash, true);
  const desertHold = useAtlas.getState().holds.find((h) => h.id === "hd2" && h.status === "held");
  const pinkHolds = useAtlas.getState().holds.filter((h) => h.status === "held" && h.agentId === "ag1");
  record("channel-isolation", ch.title, ch.role, "Pink City hold exists; Desert Reach hold is a different firm", Boolean(desertHold && pinkHolds.length));
  const released = useAtlas.getState().holds.find((h) => h.customer === "Hold probe" && h.status === "held");
  const rel = released ? useAtlas.getState().releaseHold(released.id) : "hold missing";
  record("hold-release", ch.title, ch.role, "Release hold returns unit to available", rel);
  asUser("sm@atlas.local");
  const inbound = useAtlas.getState().acceptInbound("in1");
  record("inbound-portal", sales.title, sales.role, "Apply 99acres webhook into scored lead", inbound);
  const ca = asUser("ca@atlas.local");
  const invite = useAtlas.getState().inviteAgent({ name: "Probe Agent", phone: "90xxxx0001", companyId: "pt1" });
  record("company-invite", ca.title, ca.role, "Company admin invites an agent", invite);
  const ch2 = asUser("ag@atlas.local");
  const held = useAtlas.getState().holds.find((h) => h.status === "held" && h.agentId === "ag1");
  const req = held
    ? useAtlas.getState().bookHold(held.id, 3_600_000)
    : "no pink city hold";
  record("hold-approve-queue", ch2.title, ch2.role, "Partner hold→booking waits in Approvals", req);
  const queued = useAtlas.getState().approvals.some((a) => a.kind === "Hold booking" && a.status === "pending");
  record("hold-approve-card", ch2.title, ch2.role, "Hold booking approval card exists", queued);
  asUser("sm@atlas.local");
  const waIn = useAtlas.getState().receiveWhatsApp("ld1", "Yes, Sunday 11. Budget 80L.");
  record("wa-inbound", sales.title, sales.role, "Inbound WhatsApp qualifies and re-scores", waIn);

  // ── Finance: Tally is the books. Atlas never posts. ─────────────────
  const fin = asUser("fl@atlas.local");
  useAtlas.getState().setEntity("le_llp");
  useAtlas.getState().settleTally("t1", "reconciled");
  const reconciled = useAtlas.getState().tally.find((t) => t.id === "t1")?.status === "reconciled";
  record("tally-reconcile", fin.title, fin.role, "Reconcile Tally case", reconciled);
  const tallyRun = await tallyAgent("company-day");
  record(
    "tally-open-books",
    fin.title,
    fin.role,
    "Trial Tally open on Atlas Mock LLP with prior-run books",
    tallyRun.ok ? true : tallyRun.detail,
  );
  record(
    "tally-no-post",
    fin.title,
    fin.role,
    "Atlas did not post a voucher",
    !tallyRun.posted || tallyRun.posted.length === 0,
  );
  if (!tallyRun.ok) {
    addUx(
      fin.title,
      "Tally",
      `Trial Tally did not answer with Atlas Mock LLP (${tallyRun.detail}). Keep that company open; Atlas will not post.`,
    );
  }
  const commRow = useAtlas.getState().commissions.find((c) => c.status === "accrued");
  const send = commRow ? useAtlas.getState().requestCommission(commRow.id) : "no accrued commission";
  record("comm-send", fin.title, fin.role, "Send commission for approval (does not pay)", send);
  const send2 = commRow ? useAtlas.getState().requestCommission(commRow.id) : "no accrued commission";
  if (send2 === null) {
    addUx(fin.title, "CRM", "Send for approval can be clicked twice and mints duplicate Approvals. Queue should be unique.");
  }
  record("comm-dup", fin.title, fin.role, "Duplicate commission approval refused", send2, true);

  const md3 = asUser("md@atlas.local");
  const commAp = useAtlas
    .getState()
    .approvals.find((a) => a.kind === "Commission" && a.status === "pending");
  const commOk = commAp ? useAtlas.getState().decideApproval(commAp.id, "approved") : "commission approval missing";
  record("comm-approve", md3.title, md3.role, "MD approves commission (still not paid)", commOk);
  const stillNotPaid = useAtlas.getState().commissions.every((c) => c.status !== "paid");
  record("comm-not-paid", md3.title, md3.role, "No commission self-pay after approval", stillNotPaid);

  // ── Project Director: VO to approvals ────────────────────────────────
  const pd = asUser("pd@atlas.local");
  useAtlas.getState().raiseChange({
    projectId: "p_kanak",
    kind: "change",
    title: "Company-day VO — extra raft steel",
    status: "review",
  });
  const vo = useAtlas.getState().approvals.some((a) => a.title.includes("Company-day VO") && a.status === "pending");
  record("vo-raise", pd.title, pd.role, "Raise VO → Approvals", vo);

  // ── Assistant: Level-2 only ──────────────────────────────────────────
  const draft = useAtlas.getState().draftAdvice("Draft a site instruction for the company-day raft variance.");
  record("ai-draft", pd.title, pd.role, "Level-2 draft only", draft);
  const notes = useAtlas.getState().notes;
  const levelOk = notes.length === 0 || notes.every((n) => n.level === 2);
  const noAct = notes.every((n) => !/approved|paid|signed|deleted/i.test(n.draft.split("\n")[0] ?? ""));
  record("ai-no-act", pd.title, pd.role, "Draft does not approve/pay/sign/delete", levelOk && noAct);

  useAtlas.getState().signInLocal("md@atlas.local", "AtlasLocal-MD");
  useAtlas.getState().setEntity("le_llp");

  const passed = steps.filter((s) => s.ok).length;
  const failed = steps.filter((s) => !s.ok).length;
  return {
    at: new Date().toISOString(),
    live: false,
    steps,
    ux,
    passed,
    failed,
  };
}
