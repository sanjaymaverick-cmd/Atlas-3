export default {
  date: "2026-09-01",
  label: "Tue — September opens, Mansarovar snag push ahead of Dec possession",
  seats: [
    {
      seat: "sv",
      note: "Month opens, curing complete",
      async run(page, api) {
        await api.act("File diary", () =>
          window.__atlasStore.getState().addDiary({
            projectId: "p_kanak", date: "2026-09-01", weather: "Cloudy, 33C", labour: 141,
            work: "Tower B raft curing complete, cube 7-day 22 MPa. Tower A L13 slab shuttering.",
            materials: "Cement 340 bags. TMT 8t.", safety: "No incidents.",
            deviceKey: "eng-a1-2026-09-01",
          }));
      },
    },
    {
      seat: "se",
      note: "Mansarovar snag sweep before possession",
      async run(page, api) {
        const snags = await api.read("snags");
        const open = (snags ?? []).filter((s) => s.status !== "closed");
        api.note("did", `Open snags: ${open.length}`, open.map((s) => `${s.unit}:${s.title}`).slice(0, 5).join(" · ") || "none");

        await api.act("Raise snag — C-512 window leak recurrence", () => {
          window.__atlasStore.getState().addSnag({ projectId: "p_mansar", unit: "C-512", title: "Window leak recurrence after monsoon" });
          return null;
        });

        await api.act("Close a corrected snag", () => {
          const s = window.__atlasStore.getState();
          const t = s.snags.find((x) => x.status !== "closed");
          if (!t) return "none open";
          s.closeSnag(t.id);
          return null;
        });
      },
    },
    {
      seat: "sm",
      note: "Mansarovar handover readiness",
      async run(page, api) {
        const h = await api.read("handovers");
        api.note("did", `Handover files: ${(h ?? []).length}`,
          (h ?? []).map((x) => `${x.unit ?? x.id}:oc=${x.oc ?? "-"}:stage=${x.stage ?? "-"}`).join(" · ") || "none");

        await api.act("Advance the Mansarovar handover", () => {
          const s = window.__atlasStore.getState();
          const f = (s.handovers ?? [])[0];
          return f ? s.advanceHandover(f.id) : "no handover file";
        });
      },
    },
  ],
};
