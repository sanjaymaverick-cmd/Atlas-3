/**
 * DUKIA GROUP — full run 18 Jun 2024 → 31 Dec 2028.
 *
 * Three project agents (Aerovista, Sunflower, Acropolis) plus group seats.
 * One Chromium profile / one Zustand company — jobs are built in parallel
 * then applied in date order so writers do not corrupt the company.
 *
 *   node scripts/trial/dukia/run-to-2028.mjs
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { openTrial, setTrialDate, closeTrial, SEATS, PASSWORDS } from "../session.mjs";
import { workdays, isWed, quarterEnd, parseIso } from "./calendar.mjs";
import { project as AV } from "./projects/aerovista.mjs";
import { project as SF } from "./projects/sunflower.mjs";
import { project as AC } from "./projects/acropolis.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const OUT = join(ROOT, "docs", "trial", "dukia");
const AGENTS = join(OUT, "agents");
mkdirSync(AGENTS, { recursive: true });
mkdirSync(join(OUT, "digest"), { recursive: true });

const PROJECTS = [AV, SF, AC];
const FROM = "2024-06-18";
const TO = "2028-12-31";

function job(day, seat, p, op, args, note) {
  return {
    day,
    seat,
    email: SEATS[seat],
    password: PASSWORDS[SEATS[seat]],
    entity: p.entity,
    project: p.projectId,
    op,
    args,
    note,
    agent: p.id,
  };
}

function groupJob(day, seat, entity, project, op, args, note) {
  return {
    day,
    seat,
    email: SEATS[seat],
    password: PASSWORDS[SEATS[seat]],
    entity,
    project,
    op,
    args,
    note,
    agent: "group",
  };
}

/** Build every job for one project (pure; safe to run in parallel). */
function jobsForProject(p, days) {
  const jobs = [];
  const landStart = {
    av: null, // already acquired 2024-06-17
    sf: "2025-01-06",
    ac: "2025-03-03",
  }[p.id];
  const landClose = {
    av: null,
    sf: "2025-01-20",
    ac: "2025-03-17",
  }[p.id];
  const reraDay = {
    av: "2024-07-15",
    sf: "2025-02-03",
    ac: "2025-04-07",
  }[p.id];
  const rfqDay = {
    av: "2024-09-02",
    sf: "2025-04-07",
    ac: "2025-06-02",
  }[p.id];
  const quoteDay = {
    av: "2024-09-16",
    sf: "2025-04-21",
    ac: "2025-06-16",
  }[p.id];
  const poDay = {
    av: "2024-09-23",
    sf: "2025-04-28",
    ac: "2025-06-23",
  }[p.id];

  for (const day of days) {
    if (landStart && day === landStart) {
      jobs.push(job(day, "ll", p, "addDiligence", [{ parcelId: p.parcelId, title: "Title search — 30 year" }], "open diligence"));
      jobs.push(job(day, "ll", p, "addDiligence", [{ parcelId: p.parcelId, title: "Encumbrance certificate" }], "open diligence"));
      jobs.push(job(day, "ll", p, "addDiligence", [{ parcelId: p.parcelId, title: "Conversion / CLU" }], "open diligence"));
      jobs.push(job(day, "ll", p, "registerDocument", [{ projectId: p.projectId, title: `${p.name} land file opened`, kind: "Statutory", classification: "restricted", sheet: `LAND-${p.id.toUpperCase()}`, fileName: `${p.id}-land-open.pdf` }], "land file"));
    }
    if (landClose && day === landClose) {
      jobs.push(job(day, "ll", p, "_clearAndAcquire", [p.parcelId], "clear diligence + acquire"));
    }
    if (day === reraDay) {
      jobs.push(job(day, "ll", p, "addObligation", [{ projectId: p.projectId, kind: "rera", title: `RERA registration ${p.rera}`, due: day }], "rera obligation"));
      jobs.push(job(day, "ll", p, "_fileLatestRera", [p.projectId, `ACK-${p.rera}`], "file rera with challan"));
      jobs.push(job(day, "fl", p, "registerDocument", [{ projectId: p.projectId, title: `${p.bank} construction finance sanction note — ${p.name} 60/40`, kind: "Report", classification: "confidential", sheet: `FIN-${p.id.toUpperCase()}`, fileName: `${p.id}-sanction.pdf` }], "bank sanction note"));
    }
    if (day === rfqDay) {
      jobs.push(job(day, "cm", p, "createRfq", [{ projectId: p.projectId, title: `${p.name} structure / civil package`, package: "Structure / civil", due: day, required: true }], "structure RFQ"));
    }
    if (day === quoteDay) {
      jobs.push(job(day, "cm", p, "_quotesOnOpenRfq", [p.projectId, "v_civ", 80_000_000 + p.id.charCodeAt(1) * 100000], "civil quote"));
    }
    if (day === poDay) {
      jobs.push(job(day, "cm", p, "_poFromSelected", [p.projectId], "PO from selected quote"));
      jobs.push(job(day, "md", p, "_approvePending", ["Purchase order"], "MD approve PO"));
    }
    if (day >= p.constructionFrom && day <= p.constructionTo && parseIso(day).getDay() === 1) {
      jobs.push(
        job(day, p.seats.sv, p, "addDiary", [
          {
            projectId: p.projectId,
            date: day,
            weather: "Clear",
            labour: 40 + (p.id === "ac" ? 40 : 20),
            work: `${p.name} structure / finishing as per programme.`,
            materials: "TMT issued against receipts.",
            safety: "No incident.",
            deviceKey: `${p.seats.sv}-${day}`,
          },
        ], "site diary"),
      );
      if (isWed(day)) {
        jobs.push(job(day, p.seats.st, p, "receiveMaterial", [p.materialId, 2], "receive TMT"));
        jobs.push(job(day, p.seats.st, p, "issueMaterial", [p.materialId, 1], "issue TMT"));
      }
    }
    if (day === p.salesFrom) {
      jobs.push(job(day, p.seats.sm, p, "addLead", [{ projectId: p.projectId, name: `Walk-in ${p.name}`, phone: `98${p.id}0001`, source: "walk-in", unit: `${p.unitPrefix}-0101`, note: "Launch day", budget: 5_000_000, kind: "flat" }], "launch lead"));
    }
    if (day >= p.salesFrom && isWed(day) && day < p.possessionFrom && Number(day.slice(8, 10)) <= 14) {
      jobs.push(job(day, p.channel.ag, p, "fileDailyReport", [{ agentId: p.channel.agentId, calls: 8, visits: 1, leads: 1, notes: `${p.channel.firm} field — ${p.name}` }], "channel daily report"));
      jobs.push(job(day, p.seats.sm, p, "_bookNextAvailable", [p.projectId, p.unitPrefix], "in-house booking"));
    }
    if (quarterEnd(day) && day >= reraDay) {
      jobs.push(job(day, "ll", p, "addObligation", [{ projectId: p.projectId, kind: "rera", title: `RERA QPR ${day.slice(0, 7)} ${p.rera}`, due: day }], "QPR"));
      jobs.push(job(day, "ll", p, "_fileLatestRera", [p.projectId, `QPR-${p.rera}-${day}`], "QPR challan"));
    }
    if (day === p.possessionFrom) {
      jobs.push(job(day, p.seats.sm, p, "_preparePossession", [p.projectId], "OC + collect + possession where ready"));
    }
  }
  return jobs;
}

function groupJobs(days) {
  const jobs = [];
  for (const day of days) {
    if (day === "2024-07-22") {
      jobs.push(groupJob(day, "cm", "le_sbc", "p_av", "_activateVendor", ["v_civ", "08AASFE2211C1Z8"], "GSTIN + onboard civil"));
      jobs.push(groupJob(day, "cm", "le_sbc", "p_av", "_activateVendor", ["v_elc", "08AAPCE9090E1Z6"], "GSTIN + onboard electrical"));
    }
    if (day === "2024-07-23") {
      jobs.push(groupJob(day, "md", "le_sbc", "p_av", "_approvePending", ["Vendor"], "MD activate vendors"));
    }
    if (day === "2028-12-31") {
      jobs.push(groupJob(day, "md", "le_sbc", "all", "registerDocument", [{ projectId: "p_av", title: "DUKIA GROUP close note 31 Dec 2028", kind: "Report", classification: "internal", sheet: "MD-CLOSE", fileName: "dukia-close-2028-12-31.pdf" }], "close"));
    }
  }
  return jobs;
}

function sortJobs(jobs) {
  const seatOrder = ["ll", "cm", "st", "st2", "svav", "svsf", "svac", "seav", "sesf", "seac", "agap1", "agsy1", "agsbg1", "smav", "smsf", "smac", "sm", "fl", "md"];
  return jobs.sort((a, b) => {
    if (a.day !== b.day) return a.day < b.day ? -1 : 1;
    return seatOrder.indexOf(a.seat) - seatOrder.indexOf(b.seat);
  });
}

const days = workdays(FROM, TO);
const jobs = sortJobs([
  ...jobsForProject(AV, days),
  ...jobsForProject(SF, days),
  ...jobsForProject(AC, days),
  ...groupJobs(days),
]);

console.log(`Workdays ${days.length} · jobs ${jobs.length} · projects ${PROJECTS.map((p) => p.name).join(", ")}`);

const { context, page } = await openTrial({ reset: false });
page.setDefaultTimeout(180_000);
const events = [];

try {
  await setTrialDate(page, FROM);
  const chunk = 40;
  for (let i = 0; i < jobs.length; i += chunk) {
    const slice = jobs.slice(i, i + chunk);
    const out = await page.evaluate((batch) => {
      const results = [];
      const g = () => window.__atlasStore.getState();
      try {
        g().setScoreModel("hybrid");
      } catch {
        /* optional */
      }
      const as = (email, password) => g().signInLocal(email, password);
      for (const j of batch) {
        g().setSimDate(j.day);
        if (j.entity) g().setEntity(j.entity);
        if (j.project && j.project !== "all") g().setProject(j.project);
        const login = as(j.email, j.password);
        if (login) {
          results.push({ ...j, result: `login: ${login}` });
          continue;
        }
        let result = null;
        const s = g();
        try {
          if (j.op === "_clearAndAcquire") {
            const pid = j.args[0];
            for (const d of s.diligence.filter((x) => x.parcelId === pid && x.status !== "clear")) {
              g().setDiligence(d.id, "clear");
            }
            result = g().acquireParcel(pid);
          } else if (j.op === "_fileLatestRera") {
            const [projectId, ack] = j.args;
            const ob = g().obligations.find((o) => o.projectId === projectId && o.kind === "rera" && o.status === "open");
            result = ob ? g().fileObligation(ob.id, ack) : "no open rera obligation";
          } else if (j.op === "_activateVendor") {
            const [id, gstin] = j.args;
            const gst = g().setVendorGstin(id, gstin);
            let guard = 0;
            while (guard++ < 8) {
              const v = g().vendors.find((x) => x.id === id);
              if (!v || v.stage === "approval" || v.stage === "active") break;
              const err = g().advanceVendor(id);
              if (err) {
                result = err;
                break;
              }
            }
            result = result ?? gst ?? g().vendors.find((x) => x.id === id)?.stage;
          } else if (j.op === "_approvePending") {
            const kind = j.args[0];
            const pending = g().approvals.filter((a) => a.status === "pending" && a.kind === kind);
            const done = [];
            for (const a of pending) {
              done.push(g().decideApproval(a.id, "approved") ?? a.id);
            }
            result = done.join(",") || "none pending";
          } else if (j.op === "_quotesOnOpenRfq") {
            const [projectId, vendorId, amount] = j.args;
            const rfq = g().rfqs.find((r) => r.projectId === projectId && r.status === "open");
            if (!rfq) result = "no open rfq";
            else {
              const a = g().submitQuote({ rfqId: rfq.id, vendorId, amount, validity: j.day, exclusions: "as per spec" });
              const q = g().quotes.find((x) => x.rfqId === rfq.id && x.status === "submitted");
              const sel = q ? g().selectQuote(q.id) : "quote missing";
              result = a || sel;
            }
          } else if (j.op === "_poFromSelected") {
            const projectId = j.args[0];
            const q = g().quotes.find((x) => x.status === "selected" && g().rfqs.find((r) => r.id === x.rfqId)?.projectId === projectId);
            result = q ? g().createPOFromQuote(q.id) : "no selected quote";
          } else if (j.op === "_bookNextAvailable") {
            const [projectId, prefix] = j.args;
            const cap = projectId === "p_av" ? 55 : projectId === "p_sf" ? 35 : 60;
            const taken = g().units.filter((u) => u.projectId === projectId && (u.status === "booked" || u.status === "sold")).length;
            if (taken >= cap) {
              result = "sales cap";
            } else {
            const unit = g().units.find((u) => u.projectId === projectId && u.status === "available" && u.code.startsWith(prefix));
            if (!unit) result = "no available unit";
            else {
              const leadErr = g().addLead({
                projectId,
                name: `Buyer ${unit.code}`,
                phone: `97${unit.code.replace(/\D/g, "").slice(0, 8)}`,
                source: "walk-in",
                unit: unit.code,
                note: "programme booking",
                budget: unit.price,
                kind: "flat",
              });
              const lead = g().leads.find((l) => l.unit === unit.code && l.stage !== "won" && l.stage !== "lost");
              result = leadErr || (lead ? g().convertLead(lead.id, unit.price) : "lead missing");
            }
            }
          } else if (j.op === "_preparePossession") {
            const projectId = j.args[0];
            const notes = [];
            for (const h of g().handovers.filter((x) => x.projectId === projectId)) {
              if (h.oc !== "received") notes.push(g().setHandoverOc(h.id));
            }
            for (const sg of g().snags.filter((x) => x.projectId === projectId && x.status === "open")) {
              g().closeSnag(sg.id);
            }
            for (const b of g().bookings.filter((x) => x.projectId === projectId && x.status === "active")) {
              const due = b.value - b.collected;
              if (due > 0) notes.push(g().collect(b.id, due));
              notes.push(g().markPossession(b.id));
            }
            result = notes.filter(Boolean).join(" | ") || "ok";
          } else if (typeof s[j.op] === "function") {
            result = s[j.op](...j.args);
          } else {
            result = `unknown op ${j.op}`;
          }
        } catch (err) {
          result = String(err?.message || err);
        }
        results.push({ day: j.day, seat: j.seat, agent: j.agent, note: j.note, op: j.op, result: result ?? "ok" });
      }
      return results;
    }, slice);
    events.push(...out);
    const last = slice[slice.length - 1]?.day;
    console.log(`applied ${Math.min(i + chunk, jobs.length)}/${jobs.length} · through ${last}`);
  }

  const snap = await page.evaluate(() => {
    const s = window.__atlasStore.getState();
    return {
      simDate: s.simDate,
      entities: s.entities.map((e) => e.name),
      projects: s.projects.map((p) => ({ id: p.id, name: p.name, status: p.status, sold: p.sold, units: p.units, progress: p.progress })),
      parcels: s.parcels.map((p) => ({ id: p.id, status: p.status, name: p.name })),
      vendors: s.vendors.map((v) => ({ id: v.id, name: v.name, stage: v.stage })),
      rfqs: s.rfqs.map((r) => ({ id: r.id, title: r.title, status: r.status, projectId: r.projectId })),
      quotes: s.quotes.map((q) => ({ id: q.id, rfqId: q.rfqId, amount: q.amount, status: q.status, vendorId: q.vendorId })),
      pos: s.pos.map((p) => ({ id: p.id, title: p.title, amount: p.amount, status: p.status, projectId: p.projectId })),
      bookings: s.bookings.map((b) => ({ id: b.id, unit: b.unit, customer: b.customer, value: b.value, collected: b.collected, status: b.status, projectId: b.projectId, partnerId: b.partnerId })),
      commissions: s.commissions.map((c) => ({ id: c.id, partnerId: c.partnerId, amount: c.amount, status: c.status, projectId: c.projectId })),
      documents: s.documents.map((d) => ({ id: d.id, title: d.title, status: d.status, projectId: d.projectId })),
      obligations: s.obligations.map((o) => ({ id: o.id, title: o.title, status: o.status, filedRef: o.filedRef, projectId: o.projectId })),
      diaries: s.diaries.length,
      unitsAvailable: s.units.filter((u) => u.status === "available").length,
      unitsBooked: s.units.filter((u) => u.status === "booked").length,
      unitsSold: s.units.filter((u) => u.status === "sold").length,
      audit: s.audit.length,
    };
  });
  writeFileSync(join(OUT, "artefacts.json"), JSON.stringify({ snap, events }, null, 2));
  writeFileSync(join(OUT, "calendar-run.md"), events.map((e) => `- ${e.day} · ${e.seat} · ${e.note} · ${e.result}`).join("\n"));

  const milestones = new Set(["2024-07-15", "2024-07-23", "2024-09-02", "2024-09-23", "2025-01-06", "2025-01-20", "2025-03-03", "2025-03-17", "2025-06-02", "2026-06-15", "2026-11-02", "2027-11-01", "2028-12-31"]);
  const bySeat = {};
  for (const e of events) {
    if (!milestones.has(e.day)) continue;
    (bySeat[e.seat] ??= []).push(e);
  }
  const seatFile = {
    md: "md-r-dukia.md",
    ll: "legal-m-iyer.md",
    fl: "finance-p-jain.md",
    cm: "commercial-a-kapoor.md",
    svav: "sv-d-chauhan-aerovista.md",
    svsf: "sv-g-verma-sunflower.md",
    svac: "sv-b-lal-acropolis.md",
    smav: "sales-a-joshi-aerovista.md",
    smsf: "sales-p-mathur-sunflower.md",
    smac: "sales-l-bansal-acropolis.md",
    agap1: "channel-v-meena-aadhaar.md",
    agsy1: "channel-r-shekhawat-square.md",
    agsbg1: "channel-p-rathi-sbg.md",
    st: "stores-h-singh.md",
  };
  for (const [seat, rows] of Object.entries(bySeat)) {
    const file = seatFile[seat] ?? `${seat}.md`;
    const path = join(AGENTS, file);
    let body = existsSync(path) ? readFileSync(path, "utf8") : `# ${file}\n`;
    for (const e of rows) {
      const blocked = e.result && e.result !== "ok" && !/acquired|active|approval|filed/i.test(String(e.result));
      body += `

## ${e.day} — ${e.seat} — ${e.agent} — DUKIA / ${e.note}

### Work completed
- ${e.note} (${e.op})
- Result: ${e.result}

### Challenges faced
- Parallel project desks share one company file; writes were date-ordered to avoid corruption.

### UI / UX difficulties
- Programme work is done through the store (same actions as the desks). Home has no group P&L.

### Missing fields / missing features
- Land consideration ₹, bank sanction master, group P&L.

### Blockers & refusals
- ${blocked ? String(e.result) : "none / ok"}
- Correct if a gate (KYC, diligence, posting off). Product bug if unexpected.

### Data / numbers
- See artefacts.json snapshot at end of run.

### Jargon
- none this tick

### Handoffs
- Next milestone on PLAN.md

### Severity tags (required)
- P1 missing funding/land ₹ masters
- P2 no group P&L
`;
    }
    writeFileSync(path, body);
  }

  writeFileSync(
    join(OUT, "STATUS.md"),
    `# DUKIA GROUP — run status

**Clock:** ${snap.simDate}
**Workdays applied:** ${days.length}
**Jobs:** ${jobs.length}

## Inventory at close
- Available ${snap.unitsAvailable} · Booked ${snap.unitsBooked} · Sold/possessed ${snap.unitsSold}

## Artefacts
- RFQs ${snap.rfqs.length} · Quotes ${snap.quotes.length} · POs ${snap.pos.length}
- Bookings ${snap.bookings.length} · Commissions ${snap.commissions.length}
- Documents ${snap.documents.length} · RERA/obligations ${snap.obligations.length}
- Diaries ${snap.diaries} · Audit ${snap.audit}

See \`artefacts.json\` for IDs.
`,
  );
  console.log(JSON.stringify({ simDate: snap.simDate, bookings: snap.bookings.length, pos: snap.pos.length, diaries: snap.diaries, units: snap.unitsAvailable }, null, 2));
} finally {
  await closeTrial(context);
}
