export default {
  date: "2026-08-28",
  label: "Fri — hold converts to booking, week closes",
  seats: [
    {
      seat: "sv",
      note: "Friday diary",
      async run(page, api) {
        await api.act("File Friday diary", () =>
          window.__atlasStore.getState().addDiary({
            projectId: "p_kanak",
            date: "2026-08-28",
            weather: "Clear, 37C",
            labour: 138,
            work: "Raft curing day 1. Tower A L13 columns 80%. Lift core to L11.",
            materials: "Curing water. Cement 260 bags.",
            safety: "No incidents.",
            deviceKey: "eng-a1-2026-08-28",
          }),
        );
      },
    },
    {
      seat: "ag",
      note: "Buyer confirms — convert the hold to a booking",
      async run(page, api) {
        await api.act("Book the held unit", () => {
          const s = window.__atlasStore.getState();
          const h = (s.holds ?? []).find((x) => x.status !== "released" && x.status !== "booked");
          return h ? s.bookHold(h.id, 11_800_000) : "no live hold";
        });

        const approvals = await api.read("approvals");
        const pend = (approvals ?? []).filter((a) => a.status === "pending");
        api.note("did", `Approvals queue after booking: ${pend.length}`,
          pend.map((a) => `${a.kind} → ${a.waitingOn}`).join(" · ") || "empty");

        // Unit lock is strict — the held/booked unit must not be re-holdable.
        await api.act("Lock probe: try to hold the same unit again", () => {
          const s = window.__atlasStore.getState();
          const me = s.agents.find((a) => a.userId === s.user?.id);
          const h = (s.holds ?? [])[0];
          if (!h || !me) return "no hold to probe";
          return s.holdUnit({ unitId: h.unitId, agentId: me.id, customer: "Probe buyer", until: "2026-09-05" });
        });
      },
    },
    {
      seat: "ca",
      note: "Pink City weekly scorecard",
      async run(page, api) {
        const reports = await api.read("dailyReports");
        api.note("did", `Daily reports on file: ${(reports ?? []).length}`,
          (reports ?? []).slice(0, 6).map((r) => `${r.date}:${r.agentId}:${r.calls}c/${r.visits}v`).join(" · "));
      },
    },
    {
      seat: "md",
      note: "Week close — booking approval and commission position",
      async run(page, api) {
        const approvals = await api.read("approvals");
        const book = (approvals ?? []).find(
          (a) => a.status === "pending" && /book|hold/i.test(`${a.kind} ${a.waitingOn}`),
        );
        if (book) {
          await api.act("Approve the partner booking", () => {
            const s = window.__atlasStore.getState();
            const a = s.approvals.find(
              (x) => x.status === "pending" && /book|hold/i.test(`${x.kind} ${x.waitingOn}`),
            );
            return a ? s.decideApproval(a.id, "approved") : "none";
          });
        }

        const commissions = await api.read("commissions");
        api.note("did", `Commissions: ${(commissions ?? []).length}`,
          (commissions ?? []).map((c) => `${c.id}:${c.status}`).join(" · ") || "none");

        // Commission must accrue only — never self-pay.
        await api.act("Self-pay probe: request commission payout", () => {
          const s = window.__atlasStore.getState();
          const c = (s.commissions ?? [])[0];
          return c ? s.requestCommission(c.id) : "no commissions";
        });
      },
    },
  ],
};
