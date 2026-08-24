export default {
  date: "2026-08-27",
  label: "Thu — raft pour, collections, diligence clears, MD clears the queue",
  seats: [
    {
      seat: "sv",
      note: "Thursday diary — raft pour",
      async run(page, api) {
        await api.act("File Thursday diary", () =>
          window.__atlasStore.getState().addDiary({
            projectId: "p_kanak",
            date: "2026-08-27",
            weather: "Clear, 35C",
            labour: 168,
            work: "Tower B raft pour completed 0600-1420, 320 cum. Cube samples taken.",
            materials: "RMC 320 cum. Cement nil (RMC).",
            safety: "No incidents. Night crew briefed on curing.",
            deviceKey: "eng-a1-2026-08-27",
          }),
        );
      },
    },
    {
      seat: "se",
      note: "Close out the pre-pour inspection",
      async run(page, api) {
        await api.act("Complete raft pre-pour inspection", () => {
          const s = window.__atlasStore.getState();
          const i = s.inspections.find((x) => !x.result);
          return i ? s.completeInspection(i.id, "pass") : "none open";
        });
      },
    },
    {
      seat: "fl",
      note: "Collections against an existing booking",
      async run(page, api) {
        const bookings = await api.read("bookings");
        api.note("did", `Bookings: ${(bookings ?? []).length}`,
          (bookings ?? []).map((b) => `${b.unit ?? b.id}:collected ${b.collected ?? 0}`).slice(0, 4).join(" · ") || "none");

        await api.act("Collect an installment", () => {
          const s = window.__atlasStore.getState();
          const b = (s.bookings ?? [])[0];
          return b ? s.collect(b.id, 500_000) : "no bookings";
        });
      },
    },
    {
      seat: "ll",
      note: "Conversion order in — clear CLU, retry acquisition",
      async run(page, api) {
        await api.act("Set Conversion/CLU to clear", () => {
          const s = window.__atlasStore.getState();
          const d = s.diligence.find((x) => x.status === "flagged");
          if (!d) return "nothing flagged";
          s.setDiligence(d.id, "clear");
          return null;
        });

        await api.act("Retry acquisition now diligence is clear", () => {
          const s = window.__atlasStore.getState();
          const p = s.parcels.find((x) => x.status !== "acquired");
          return p ? s.acquireParcel(p.id) : "none";
        });
      },
    },
    {
      seat: "md",
      note: "Clear only what is genuinely waiting on MD",
      async run(page, api) {
        const approvals = await api.read("approvals");
        const mine = (approvals ?? []).filter(
          (a) => a.status === "pending" && /managing director|md/i.test(a.waitingOn ?? ""),
        );
        api.note("did", `Waiting on MD: ${mine.length}`, mine.map((a) => a.kind).join(" · ") || "none");

        for (let i = 0; i < mine.length; i += 1) {
          await api.act("Approve an MD item", () => {
            const s = window.__atlasStore.getState();
            const a = s.approvals.find(
              (x) => x.status === "pending" && /managing director|md/i.test(x.waitingOn ?? ""),
            );
            return a ? s.decideApproval(a.id, "approved") : "none";
          });
        }
      },
    },
  ],
};
