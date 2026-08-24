export default {
  date: "2026-09-30",
  label: "Wed — Q2 CLOSE. RERA QPR, reconcile, full desk",
  seats: [
    {
      seat: "sv",
      note: "Month-end diary",
      async run(page, api) {
        await api.act("File diary", () =>
          window.__atlasStore.getState().addDiary({
            projectId: "p_kanak", date: "2026-09-30", weather: "Clear, 31C", labour: 156,
            work: "Tower A L13 slab poured 28 Sep, curing. Tower B L1 columns started.",
            materials: "RMC 280 cum. Cement 300 bags.", safety: "No incidents. Month-end safety walk with PD.",
            deviceKey: "eng-a1-2026-09-30",
          }));
      },
    },
    {
      seat: "ll",
      note: "File the RERA QPR for Q2",
      async run(page, api) {
        const obs = await api.read("obligations");
        const due = (obs ?? []).filter((o) => o.status !== "filed");
        api.note("did", `Obligations not filed: ${due.length}`,
          due.map((o) => `${o.kind}:${o.title}:${o.due}`).slice(0, 5).join(" · ") || "none");

        await api.act("File the Q2 RERA QPR without evidence", () => {
          const s = window.__atlasStore.getState();
          const o = (s.obligations ?? []).find((x) => /QPR/i.test(x.title ?? ""));
          return o ? s.fileObligation(o.id, "") : "QPR not found";
        });

        await api.act("File the Q2 RERA QPR with acknowledgement", () => {
          const s = window.__atlasStore.getState();
          const o = (s.obligations ?? []).find((x) => /QPR/i.test(x.title ?? ""));
          return o ? s.fileObligation(o.id, "RERA/JPR/QPR/2026-Q2/ACK-88214") : "QPR not found";
        });
      },
    },
    {
      seat: "pd",
      note: "Quarter progress and open changes",
      async run(page, api) {
        const projects = await api.read("projects");
        api.note("did", "Progress at Q2 close",
          (projects ?? []).map((p) => `${p.code} ${p.status} ${p.progress}% spent=${p.spent ?? 0}`).join(" · "));
        const changes = await api.read("changes");
        api.note("did", `Changes open at close: ${(changes ?? []).filter((c) => c.status !== "closed").length}`);
      },
    },
    {
      seat: "sm",
      note: "Q2 funnel position",
      async run(page, api) {
        const leads = await api.read("leads");
        const byStage = {};
        for (const l of leads ?? []) byStage[l.stage] = (byStage[l.stage] ?? 0) + 1;
        api.note("did", "Funnel at Q2 close",
          Object.entries(byStage).map(([k, v]) => `${k}:${v}`).join(" · "));
        const bookings = await api.read("bookings");
        api.note("did", `Bookings: ${(bookings ?? []).length}`,
          `collected total ${(bookings ?? []).reduce((n, b) => n + (b.collected ?? 0), 0)}`);
      },
    },
    {
      seat: "fl",
      note: "Q2 reconcile — and confirm Atlas posted nothing",
      async run(page, api) {
        const tally = await api.read("tally");
        api.note("did", `Tally cases: ${(tally ?? []).length}`,
          (tally ?? []).map((t) => `${t.id}:${t.status ?? "open"}`).join(" · "));

        await api.act("Reconcile an open case", () => {
          const s = window.__atlasStore.getState();
          const c = (s.tally ?? []).find((t) => t.status !== "reconciled");
          if (!c) return "all reconciled";
          s.settleTally(c.id, "reconciled");
          return null;
        });

        await api.act("Accept a case as an exception", () => {
          const s = window.__atlasStore.getState();
          const c = (s.tally ?? []).find((t) => t.status !== "reconciled" && t.status !== "exception");
          if (!c) return "nothing left open";
          s.settleTally(c.id, "exception");
          return null;
        });
      },
    },
    {
      seat: "md",
      note: "Q2 close — approvals and capital",
      async run(page, api) {
        const approvals = await api.read("approvals");
        const pend = (approvals ?? []).filter((a) => a.status === "pending");
        api.note("did", `Pending at Q2 close: ${pend.length}`,
          pend.map((a) => `${a.kind} → ${a.waitingOn}`).join(" · ") || "empty");

        const commissions = await api.read("commissions");
        api.note("did", `Commissions: ${(commissions ?? []).length}`,
          (commissions ?? []).map((c) => `${c.id}:${c.status}`).join(" · "));

        const audit = await api.read("audit");
        api.note("did", `Audit depth at Q2 close: ${(audit ?? []).length} events`);
      },
    },
  ],
};
