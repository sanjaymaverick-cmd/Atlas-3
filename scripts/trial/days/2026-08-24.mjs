/**
 * MOCK ATLAS3 LLP — Monday 24 August 2026. Opening of the run.
 *
 * Portfolio: Kanakpura Residences (core, under construction, possession
 * 31 Mar 2027) · Mansarovar Enclave (handover, possession ~15 Dec 2026) ·
 * Baggad Heights (planning).
 *
 * Each seat does the job, not a test. Refusals are recorded as findings, and
 * nobody works around a gate to make the day complete.
 */

export default {
  date: "2026-08-24",
  label: "Week 1 opens — MD sets the week, site restarts after the weekend",

  seats: [
    // ---------------------------------------------------------------- MD ---
    {
      seat: "md",
      note: "Opens the week: approvals queue, portfolio position, capital",
      async run(page, api) {
        const approvals = await api.read("approvals");
        const pending = (approvals ?? []).filter((a) => a.status === "pending");
        api.note(
          "did",
          `Approvals queue: ${pending.length} pending`,
          pending.map((a) => `${a.kind} → ${a.waitingOn}`).join(" · ") || "empty",
        );

        // Four-eyes probe: is anything waiting on someone else actionable by MD?
        const notMine = pending.filter((a) => !/managing director|md/i.test(a.waitingOn ?? ""));
        if (notMine.length) {
          const target = notMine[0];
          const out = await page.evaluate((id) => {
            const s = window.__atlasStore.getState();
            const before = s.approvals.find((a) => a.id === id)?.status;
            const err = s.decideApproval(id, "approved");
            const after = window.__atlasStore.getState().approvals.find((a) => a.id === id)?.status;
            return { err, before, after };
          }, target.id);

          if (!out.err && out.after === "approved") {
            api.note(
              "blocked",
              "FOUR-EYES BYPASS — MD approved an item waiting on another seat",
              `${target.kind} · waitingOn "${target.waitingOn}" · ${out.before} → ${out.after}`,
            );
          } else {
            api.note(
              "did",
              "Four-eyes held — MD could not act on another seat's item",
              out.err ?? `status stayed ${out.after}`,
            );
          }
        }

        const projects = await api.read("projects");
        api.note(
          "did",
          "Portfolio read",
          (projects ?? []).map((p) => `${p.code} ${p.status} ${p.progress}%`).join(" · "),
        );

        api.note(
          "jargon",
          "Nav label 'Waiting for a yes'",
          "MD reads it fine, but it replaced 'Approvals' — an MD who learned the old label loses the word they search for",
        );
      },
    },

    // ---------------------------------------------------------------- PD ---
    {
      seat: "pd",
      note: "Kanakpura slab cycle, open changes and NCRs",
      async run(page, api) {
        const changes = await api.read("changes");
        const open = (changes ?? []).filter((c) => c.status !== "closed");
        api.note(
          "did",
          `Change register: ${open.length} open`,
          open
            .map((c) => `${c.kind}:${c.title}`)
            .slice(0, 4)
            .join(" · ") || "none",
        );

        await api.act("Raise VO — Tower A lobby granite upgrade", () => {
          const s = window.__atlasStore.getState();
          s.raiseChange({
            projectId: "p_kanak",
            kind: "vo",
            title: "Tower A lobby — granite upgrade to client spec",
            status: "raised",
            severity: "medium",
          });
          return null;
        });
      },
    },

    // ---------------------------------------------------------------- SV ---
    {
      seat: "sv",
      note: "Monday diary — Kanakpura, weekend pour cured",
      async run(page, api) {
        await api.act("File Monday site diary", () =>
          window.__atlasStore.getState().addDiary({
            projectId: "p_kanak",
            date: "2026-08-24",
            weather: "Clear, 36°C",
            labour: 148,
            work: "Tower A L12 slab de-shuttering. Tower B raft steel 75%. Lift core shuttering resumed.",
            materials: "Cement 380 bags consumed. TMT 12t issued to Tower B.",
            safety: "No incidents. Toolbox talk on de-shuttering sequence.",
            deviceKey: "eng-a1-2026-08-24",
          }),
        );
      },
    },

    // ---------------------------------------------------------------- SE ---
    {
      seat: "se",
      note: "Schedule slab inspection, close out an open NCR if corrected",
      async run(page, api) {
        await api.act("Schedule Tower A L12 slab inspection", () => {
          window.__atlasStore.getState().scheduleInspection({
            projectId: "p_kanak",
            template: "Slab pre-pour checklist",
            location: "Tower A · L12",
          });
          return null;
        });

        const inspections = await api.read("inspections");
        const pendingInsp = (inspections ?? []).find((i) => !i.result);
        if (pendingInsp) {
          await api.act(`Complete inspection ${pendingInsp.template}`, () => {
            const s = window.__atlasStore.getState();
            const i = s.inspections.find((x) => !x.result);
            return i ? s.completeInspection(i.id, "pass") : "no open inspection";
          });
        }
      },
    },

    // ---------------------------------------------------------------- ST ---
    {
      seat: "st",
      note: "Receive TMT against PO, issue to Tower B",
      async run(page, api) {
        const before = await api.read("materials");
        api.note(
          "did",
          "Material position",
          (before ?? []).map((m) => `${m.name} ${m.issued}/${m.received}${m.unit}`).join(" · "),
        );

        await api.act("Receive 20t TMT 12mm", () => {
          const s = window.__atlasStore.getState();
          const m = s.materials.find((x) => /TMT/i.test(x.name));
          if (!m) return "no TMT line";
          s.receiveMaterial(m.id, 20);
          return null;
        });

        await api.act("Issue 12t TMT to Tower B", () => {
          const s = window.__atlasStore.getState();
          const m = s.materials.find((x) => /TMT/i.test(x.name));
          return m ? s.issueMaterial(m.id, 12) : "no TMT line";
        });

        // Over-issue must be refused — §6 says this already works.
        await api.act("Over-issue probe: attempt 9999t", () => {
          const s = window.__atlasStore.getState();
          const m = s.materials.find((x) => /TMT/i.test(x.name));
          return m ? s.issueMaterial(m.id, 9999) : "no TMT line";
        });

        api.note(
          "jargon",
          "'GRN' and 'QS' on the stores desk",
          "A storekeeper says 'gate entry' and 'measurement'; GRN/QS are the accountant's words",
        );
      },
    },

    // ---------------------------------------------------------------- CM ---
    {
      seat: "cm",
      note: "Baggad Heights — raise RFQ for the boundary package",
      async run(page, api) {
        await api.act("Raise RFQ — Baggad boundary wall + gate", () => {
          window.__atlasStore.getState().createRfq({
            projectId: "p_baggad",
            title: "Boundary wall and main gate",
            package: "Civil — external",
            due: "2026-09-07",
            required: true,
          });
          return null;
        });

        const vendors = await api.read("vendors");
        const notActive = (vendors ?? []).filter((v) => v.stage !== "active");
        api.note(
          "did",
          `Vendor pipeline: ${notActive.length} not yet active`,
          notActive.map((v) => `${v.name}:${v.stage}`).join(" · ") || "all active",
        );

        // KYC gate probe — a vendor must not jump straight to active.
        if (notActive.length) {
          await api.act("KYC probe: advance a non-KYC vendor", () => {
            const s = window.__atlasStore.getState();
            const v = s.vendors.find((x) => x.stage !== "active");
            return v ? s.advanceVendor(v.id) : "none";
          });
        }
      },
    },

    // ---------------------------------------------------------------- SM ---
    {
      seat: "sm",
      note: "Pipeline review, Mansarovar handover readiness",
      async run(page, api) {
        const leads = await api.read("leads");
        const live = (leads ?? []).filter((l) => l.stage !== "lost" && l.stage !== "booked");
        api.note(
          "did",
          `Live pipeline: ${live.length}`,
          live.map((l) => `${l.name}:${l.stage}:${l.band ?? "-"}`).join(" · "),
        );

        await api.act("Log a walk-in at Kanakpura sales lounge", () =>
          window.__atlasStore.getState().addLead({
            projectId: "p_kanak",
            name: "A. Sethi",
            phone: "98xxxx7742",
            source: "walk-in",
            unit: "A-1203",
            note: "Wants 3BHK west stack, possession-linked payment",
            budget: 12_600_000,
            kind: "flat",
          }),
        );

        const handovers = await api.read("handovers");
        api.note(
          "did",
          `Handover files: ${(handovers ?? []).length}`,
          (handovers ?? []).map((h) => `${h.unit ?? h.id}:oc=${h.oc ?? "-"}`).join(" · ") || "none",
        );
      },
    },

    // ------------------------------------------------- Channel agent (PC) ---
    {
      seat: "ag",
      note: "Pink City field agent — Monday report, then a hold",
      async run(page, api) {
        await api.act("File Monday daily report", () => {
          const s = window.__atlasStore.getState();
          const me = s.agents.find((a) => a.userId === s.user?.id);
          if (!me) return "agent row not found for this login";
          return s.fileDailyReport({
            agentId: me.id,
            calls: 16,
            visits: 3,
            leads: 4,
            holds: 1,
            bookings: 0,
            cancellations: 0,
            notes: "Two west-stack enquiries from Sunday hoarding. One site visit booked for Wed.",
          });
        });

        // ISOLATION PROBE — Pink City must not see Desert Reach.
        const probe = await page.evaluate(() => {
          const s = window.__atlasStore.getState();
          const me = s.agents.find((a) => a.userId === s.user?.id);
          const myCompany = me?.companyId;
          const otherAgents = s.agents.filter((a) => a.companyId && a.companyId !== myCompany);
          const otherLeads = s.leads.filter((l) => l.partnerId && l.partnerId !== myCompany);
          return {
            myCompany,
            otherAgentNames: otherAgents.map((a) => `${a.name}(${a.companyId})`),
            otherLeadNames: otherLeads.map((l) => `${l.name}(${l.partnerId})`),
          };
        });
        api.note(
          probe.otherLeadNames.length || probe.otherAgentNames.length ? "blocked" : "did",
          "ISOLATION — what the Pink City store holds about other agencies",
          `mine=${probe.myCompany} · other agents=[${probe.otherAgentNames.join(", ")}] · other leads=[${probe.otherLeadNames.join(", ")}]`,
        );

        api.note(
          "jargon",
          "'Band' on a lead card",
          "Field agent reads hot/warm/cold fine, but 'band' itself means nothing to them",
        );
      },
    },

    // ------------------------------------------- Channel company admin ---
    {
      seat: "ca",
      note: "Pink City roster and scorecard",
      async run(page, api) {
        const agents = await api.read("agents");
        const mine = (agents ?? []).filter((a) => a.companyId);
        api.note(
          "did",
          `Roster visible: ${mine.length}`,
          mine.map((a) => `${a.name}:${a.companyId}:${a.status}`).join(" · "),
        );
      },
    },

    // ---------------------------------------------------------------- FL ---
    {
      seat: "fl",
      note: "Open MOCK ATLAS3 LLP books, reconcile — Atlas must not post",
      async run(page, api) {
        const tally = await api.read("tally");
        api.note(
          "did",
          `Tally cases in Atlas: ${(tally ?? []).length}`,
          (tally ?? [])
            .map((t) => `${t.id}:${t.status ?? "open"}`)
            .slice(0, 6)
            .join(" · "),
        );

        const open = (tally ?? []).find((t) => t.status !== "reconciled");
        if (open) {
          await api.act(`Reconcile case ${open.id}`, () => {
            const s = window.__atlasStore.getState();
            const c = s.tally.find((t) => t.status !== "reconciled");
            if (!c) return "nothing open";
            s.settleTally(c.id, "reconciled");
            return null;
          });
        }

        const customers = await api.read("customers");
        api.note("did", `Collections book: ${(customers ?? []).length} customers`);
      },
    },

    // ---------------------------------------------------------------- LL ---
    {
      seat: "ll",
      note: "Baggad land — diligence and a statutory obligation",
      async run(page, api) {
        const dili = await api.read("diligence");
        api.note(
          "did",
          `Diligence items: ${(dili ?? []).length}`,
          (dili ?? [])
            .map((d) => `${d.title ?? d.id}:${d.status}`)
            .slice(0, 5)
            .join(" · "),
        );

        await api.act("Add RERA quarterly obligation for Q2", () =>
          window.__atlasStore.getState().addObligation({
            projectId: "p_kanak",
            kind: "rera",
            title: "RERA QPR — quarter ending 30 Sep 2026",
            due: "2026-10-15",
          }),
        );

        // Acquisition must stay blocked until diligence clears.
        const parcels = await api.read("parcels");
        const unacquired = (parcels ?? []).find((p) => p.status !== "acquired");
        if (unacquired) {
          await api.act("Acquisition gate probe", () => {
            const s = window.__atlasStore.getState();
            const p = s.parcels.find((x) => x.status !== "acquired");
            return p ? s.acquireParcel(p.id) : "none";
          });
        }
      },
    },

    // ---------------------------------------------------------------- DC ---
    {
      seat: "dc",
      note: "Register the week's drawings, four-eyes export",
      async run(page, api) {
        const docs = await api.read("documents");
        api.note(
          "did",
          `Register: ${(docs ?? []).length} documents`,
          (docs ?? [])
            .map((d) => `${d.title ?? d.id}:${d.status}`)
            .slice(0, 5)
            .join(" · "),
        );

        const quarantined = (docs ?? []).find((d) => d.status === "quarantine");
        if (quarantined) {
          await api.act("Clear quarantine on the scanned drawing", () => {
            const s = window.__atlasStore.getState();
            const d = s.documents.find((x) => x.status === "quarantine");
            return d ? s.clearQuarantine(d.id) : "none";
          });
        }

        await api.act("Request export of an issued document (four-eyes)", () => {
          const s = window.__atlasStore.getState();
          const d = s.documents.find((x) => x.status === "issued") ?? s.documents[0];
          return d ? s.requestExport(d.id) : "no documents";
        });

        api.note(
          "jargon",
          "'Quarantine' on the document register",
          "Document controller expected a virus/scan word; 'quarantine' read as 'legally held'",
        );
      },
    },
  ],
};
