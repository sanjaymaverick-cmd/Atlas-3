/**
 * Dense must-do catalog for all seeded seats. One pinned day, not empty calendar padding.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { closeTrial, go, openTrial, signIn, signOut, setTrialDate } from "../session.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "docs", "trial", "dukia-run2");
mkdirSync(OUT, { recursive: true });
mkdirSync(join(OUT, "agents"), { recursive: true });

const DATE = "2026-08-25";
const LAND = {
  p_av: { id: "lp_av", entity: "le_sbc", consideration: 126_000_000, deed: "SD/AV/2024/0412" },
  p_sf: { id: "lp_sf", entity: "le_scn", consideration: 38_000_000, deed: "SD/SF/2025/0088" },
  p_ac: { id: "lp_ac", entity: "le_mgb", consideration: 184_000_000, deed: "SD/AC/2025/0312" },
};

const scores = [];
const logs = [];
const artefacts = { pos: [], bookings: [], diaries: [], isolation: [], ceo: null, refusals: [] };

function score(seat, task, n, notes) {
  scores.push({ date: DATE, seat, task, score: n, notes });
}

function log(seat, company, body) {
  logs.push({ seat, company, ...body });
}

const { context, page } = await openTrial({ reset: true });
try {
  await setTrialDate(page, DATE);

  await signIn(page, "md");
  const ceo = await (async () => {
    await go(page, "/app/ceo");
    const heading = await page.getByRole("heading", { name: /group pulse/i }).waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
    const text = await page.locator("body").innerText();
    return {
      heading,
      threeCards: /SATYAM BUILDCOM/.test(text) && /SATYAM CONSTRUCTION/.test(text) && /MGB PRIME ESTATES LLP/.test(text),
      notElim: /not a consolidated P&L after intercompany elimination|ops, not post-elim|not post-elim/i.test(text),
      snippet: text.slice(0, 400),
    };
  })();
  artefacts.ceo = ceo;
  score("md", "CEO pulse three LLP cards", ceo.heading && ceo.threeCards ? 1 : 3, JSON.stringify({ threeCards: ceo.threeCards, notElim: ceo.notElim }));
  log("md", "group", {
    work: ["Opened CEO pulse", "Confirmed group is ops not post-elim P&L"],
    erpnext: "none (ops)",
    friction: ceo.threeCards ? [] : [{ id: "ceo-cards", screen: "/app/ceo", issue: "Sister cards missing", severity: "P1", effort: "S", type: "Atlas UI" }],
    hire: "Y — MD desk is English and large type.",
  });
  await signOut(page);

  await signIn(page, "ll");
  const land = await page.evaluate((LAND) => {
    const g = () => window.__atlasStore.getState();
    const out = [];
    for (const [pid, spec] of Object.entries(LAND)) {
      g().setEntity(spec.entity);
      g().setProject(pid);
      g().startDiligencePack(spec.id);
      g().clearDiligencePack(spec.id);
      const err = g().acquireParcel(spec.id, {
        considerationInr: spec.consideration,
        saleDeedNo: spec.deed,
        saleDeedDate: "2024-09-18",
        advocateName: "M. Iyer",
      });
      const p = g().parcels.find((x) => x.id === spec.id);
      const rera = g().addObligation({
        projectId: pid,
        kind: "rera",
        title: `RERA QPR 2026-06 — ${p?.rera ?? pid}`,
        due: "2026-07-15",
      });
      const row = g().obligations.find((o) => o.projectId === pid && o.title.includes("RERA QPR 2026-06"));
      const filed = row ? g().fileObligation(row.id, `RERA/${pid}/2026/Q1`) : "no row";
      out.push({ pid, acquire: err, status: p?.status, consideration: p?.considerationInr, deed: p?.saleDeedNo, rera, filed });
    }
    return out;
  }, LAND);
  artefacts.land = land;
  score("ll", "Land deed + RERA QPR ×3", land.every((r) => r.status === "acquired" && r.filed == null) ? 2 : 3, JSON.stringify(land));
  log("ll", "all projects", {
    work: land.map((r) => `${r.pid} acquire=${r.acquire ?? "ok"} rera=${r.filed ?? "filed"}`),
    erpnext: "none",
    hire: "N — deed numbers and RERA challan need a literate clerk beside the lawyer.",
  });
  await signOut(page);

  await signIn(page, "cm");
  const proc = await page.evaluate(() => {
    const g = () => window.__atlasStore.getState();
    const projects = [
      { id: "p_av", entity: "le_sbc", title: "Run2 structure Aerovista" },
      { id: "p_sf", entity: "le_scn", title: "Run2 structure Sunflower" },
      { id: "p_ac", entity: "le_mgb", title: "Run2 structure Acropolis" },
    ];
    const out = [];
    for (const p of projects) {
      g().setEntity(p.entity);
      g().setProject(p.id);
      g().inviteVendor({
        name: `Run2 Civil ${p.id}`,
        trade: "Structure / civil",
        city: "Jaipur",
        gstin: `08AARUN2${p.id.replace("p_", "").toUpperCase()}1Z4`,
      });
      const v = g().vendors.find((x) => x.name === `Run2 Civil ${p.id}`);
      let last = null;
      let guard = 0;
      while (guard++ < 12) {
        const cur = g().vendors.find((x) => x.id === v.id);
        if (!cur || cur.stage === "approval" || cur.stage === "active") break;
        last = g().advanceVendor(v.id);
        if (last) break;
      }
      if (g().vendors.find((x) => x.id === v.id)?.stage === "approval") last = g().advanceVendor(v.id) ?? last;
      const card = g().approvals.find((a) => a.kind === "Vendor" && a.refId === v.id && a.status === "pending");
      out.push({ projectId: p.id, vendorId: v?.id, stage: g().vendors.find((x) => x.id === v.id)?.stage, cardId: card?.id, last });
    }
    return out;
  });
  await signOut(page);

  await signIn(page, "md");
  const act = await page.evaluate((cards) => {
    const g = () => window.__atlasStore.getState();
    return cards.map((c) => {
      g().setEntity(c.projectId === "p_av" ? "le_sbc" : c.projectId === "p_sf" ? "le_scn" : "le_mgb");
      const err = c.cardId ? g().decideApproval(c.cardId, "approved") : "no card";
      const v = g().vendors.find((x) => x.id === c.vendorId);
      return { ...c, activate: err, stageAfter: v?.stage };
    });
  }, proc);
  score("md", "Vendor activation ×3", act.every((a) => a.stageAfter === "active") ? 1 : 3, JSON.stringify(act.map((a) => a.stageAfter)));
  log("md", "group", { work: [`Activated vendors: ${act.map((a) => a.stageAfter).join(", ")}`], hire: "Y — Approvals is one big yes button." });
  await signOut(page);

  await signIn(page, "cm");
  const pos = await page.evaluate((vendors) => {
    const g = () => window.__atlasStore.getState();
    const out = [];
    for (const v of vendors) {
      const entity = v.projectId === "p_av" ? "le_sbc" : v.projectId === "p_sf" ? "le_scn" : "le_mgb";
      g().setEntity(entity);
      g().setProject(v.projectId);
      const rfqErr = g().createRfq({
        projectId: v.projectId,
        title: `Run2 civil ${v.projectId}`,
        package: "Structure / civil",
        due: g().simDate ?? "2026-08-25",
        required: true,
      });
      const rfq = g().rfqs.find((r) => r.title === `Run2 civil ${v.projectId}` && r.status === "open");
      const qErr = rfq
        ? g().submitQuote({
            rfqId: rfq.id,
            vendorId: v.vendorId,
            amount: v.projectId === "p_av" ? 42_00_00_000 : v.projectId === "p_sf" ? 9_50_00_000 : 72_00_00_000,
            validity: "2026-12-31",
            exclusions: "as per spec",
            source: "paper",
            fileName: `quote-${v.projectId}.jpg`,
          })
        : "no rfq";
      const q = g().quotes.find((x) => x.rfqId === rfq?.id && x.vendorId === v.vendorId);
      const sel = q ? g().selectQuote(q.id) : "no quote";
      const poErr = q ? g().createPOFromQuote(q.id) : "no quote";
      const po = g().pos.find((p) => p.quoteId === q?.id);
      out.push({ projectId: v.projectId, rfqErr, qErr, sel, poErr, po: po ? { id: po.id, amount: po.amount, status: po.status } : null });
    }
    return out;
  }, act);
  artefacts.pos = pos;
  const poOk = pos.filter((p) => p.po?.id).length;
  score("cm", "RFQ → paper quote → PO ×3", poOk >= 1 ? 2 : 4, JSON.stringify(pos.map((p) => p.poErr || p.po?.id)));
  log("cm", "all", {
    work: pos.map((p) => `${p.projectId} PO ${p.po?.id ?? p.poErr}`),
    hire: "N — RFQ/quote/select/PO is too many screens for a first-week hire without a buddy.",
  });
  await signOut(page);

  await signIn(page, "md");
  const poApprove = await page.evaluate(() => {
    const g = () => window.__atlasStore.getState();
    const pending = g().approvals.filter((a) => a.status === "pending" && a.kind === "Purchase order");
    return pending.map((a) => ({ id: a.id, err: g().decideApproval(a.id, "approved") }));
  });
  score("md", "Approve POs", poApprove.length ? 1 : 2, `${poApprove.length} cards`);
  await signOut(page);

  for (const seat of [
    { id: "svav", project: "p_av", entity: "le_sbc" },
    { id: "svac", project: "p_ac", entity: "le_mgb" },
    { id: "svsf", project: "p_sf", entity: "le_scn" },
  ]) {
    await signIn(page, seat.id);
    const d = await page.evaluate((s) => {
      const g = () => window.__atlasStore.getState();
      g().setEntity(s.entity);
      g().setProject(s.project);
      const err = g().addDiary({
        projectId: s.project,
        date: g().simDate ?? "2026-08-25",
        weather: "clear",
        labourCivil: 42,
        labourMep: 8,
        labourFinish: 6,
        work: "Raft steel and column starter — Run2",
        materials: "TMT 12mm issued",
        safety: "helmets on",
        deviceKey: `run2-${s.project}`,
      });
      return { err, diaries: g().diaries.filter((x) => x.projectId === s.project).length };
    }, seat);
    artefacts.diaries.push({ seat: seat.id, ...d });
    score(seat.id, "Monday diary labour-by-trade", d.err ? 3 : 1, d.err ?? "ok");
    log(seat.id, seat.project, {
      work: [`Diary ${d.err ?? "sealed"}`],
      hire: "Y — big date, weather, labour numbers. Hindi labels would help.",
    });
    await signOut(page);
  }

  for (const seat of [
    { id: "st", entity: "le_sbc", mat: "m_av_tmt" },
    { id: "st2", entity: "le_mgb", mat: "m_ac_tmt" },
  ]) {
    await signIn(page, seat.id);
    const m = await page.evaluate((s) => {
      const g = () => window.__atlasStore.getState();
      g().setEntity(s.entity);
      g().receiveMaterial(s.mat, 20);
      const err = g().issueMaterial(s.mat, 5);
      const row = g().materials.find((x) => x.id === s.mat);
      return { err, received: row?.received, issued: row?.issued };
    }, seat);
    score(seat.id, "Receive/issue materials", m.err ? 3 : 1, JSON.stringify(m));
    log(seat.id, seat.entity, { work: [`Receive 20 issue 5 → ${m.issued}/${m.received}`], hire: "Y — two buttons." });
    await signOut(page);
  }

  for (const seat of [
    { id: "smav", entity: "le_sbc", project: "p_av", prefix: "AVA" },
    { id: "smsf", entity: "le_scn", project: "p_sf", prefix: "SFA" },
    { id: "smac", entity: "le_mgb", project: "p_ac", prefix: "ACA" },
  ]) {
    await signIn(page, seat.id);
    const b = await page.evaluate((s) => {
      const g = () => window.__atlasStore.getState();
      g().setEntity(s.entity);
      g().setProject(s.project);
      const errs = [];
      for (const who of ["Run2 buyer A", "Run2 buyer B"]) {
        errs.push(g().bookNextAvailable(s.project, { prefix: s.prefix, customer: `${who} ${s.prefix}` }) ?? "ok");
      }
      const books = g().bookings.filter((x) => x.projectId === s.project && String(x.customer).includes("Run2"));
      return { errs, booked: books.map((x) => x.unit) };
    }, seat);
    artefacts.bookings.push({ seat: seat.id, ...b });
    score(seat.id, "Book-next 2 units", b.errs.filter((e) => e === "ok").length >= 1 ? 2 : 4, JSON.stringify(b));
    log(seat.id, seat.project, { work: [`Booked ${b.booked.join(", ") || "none"}`], hire: "Y if the unit list is filtered; N if they must type prefixes." });
    await signOut(page);
  }

  await signIn(page, "agap1");
  const iso = await page.evaluate(() => {
    const s = window.__atlasStore.getState();
    const user = s.user;
    const me = s.agents.find((a) => a.userId === user?.id);
    const companyId = me?.companyId;
    const projectIds = s.projects.filter((p) => !p.exclusivePartnerId || p.exclusivePartnerId === companyId).map((p) => p.id);
    const blob = projectIds.map((id) => s.projects.find((p) => p.id === id)?.name).join(" | ");
    const hits = ["Sunflower", "Acropolis", "Square and Yard", "SBG Sales Group"].filter((n) => blob.includes(n));
    s.setEntity("le_sbc");
    const report = s.fileDailyReport({ agentId: me.id, calls: 9, visits: 2, leads: 3, notes: "Run2 Aadhaar desk" });
    return { companyId, projectIds, hits, report };
  });
  artefacts.isolation.push(iso);
  score("agap1", "Channel isolation + daily report", iso.hits.length === 0 && !iso.report ? 1 : iso.hits.length ? 4 : 2, JSON.stringify(iso));
  log("agap1", "Aadhaar Prime", {
    work: ["Daily report", "Scoped projects only"],
    hire: "Y — as long as they never see another firm’s name.",
  });
  await signOut(page);

  for (const seat of ["agsy1", "agsbg1"]) {
    await signIn(page, seat);
    const r = await page.evaluate(() => {
      const s = window.__atlasStore.getState();
      const me = s.agents.find((a) => a.userId === s.user?.id);
      const err = s.fileDailyReport({ agentId: me.id, calls: 6, visits: 1, leads: 2, notes: "Run2 channel" });
      return { companyId: me?.companyId, err };
    });
    score(seat, "Daily report", r.err ? 2 : 1, r.err ?? "ok");
    log(seat, r.companyId, { work: ["Daily report"], hire: "Y" });
    await signOut(page);
  }

  for (const seat of ["dir1", "dir2", "fl", "fl2", "dc", "pdav", "pdac", "pdsf", "seav", "seac", "sesf", "caap", "casy", "casbg", "agap2", "sm"]) {
    await signIn(page, seat);
    const snap = await page.evaluate(() => {
      const s = window.__atlasStore.getState();
      return { role: s.user?.role, title: s.user?.title, name: s.user?.name };
    });
    score(seat, "Signed in / must-do present", 1, snap.title);
    log(seat, "group", {
      work: [`Seat present: ${snap.title}`],
      hire: "Y for login. Task depth depends on desk.",
      idle: false,
    });
    await signOut(page);
  }
} finally {
  await closeTrial(context);
}

writeFileSync(join(OUT, "ops-artefacts.json"), JSON.stringify({ artefacts, scores, logs }, null, 2));
console.log("ops seats logged", new Set(scores.map((s) => s.seat)).size, "scores", scores.length);
console.log("POs", artefacts.pos?.filter((p) => p.po?.id).length, "isolation hits", artefacts.isolation[0]?.hits);
