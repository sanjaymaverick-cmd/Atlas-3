export default {
  date: "2026-09-10",
  label: "Thu — monsoon slip on Kanakpura, portal leads arrive",
  seats: [
    {
      seat: "sv",
      note: "Rain stops work",
      async run(page, api) {
        await api.act("File diary — washout", () =>
          window.__atlasStore.getState().addDiary({
            projectId: "p_kanak", date: "2026-09-10", weather: "Heavy rain, 27C", labour: 46,
            work: "Work stopped 1030. Slab shuttering covered. Dewatering Tower B pit.",
            materials: "Nil.", safety: "Ladder access restricted, wet surfaces.",
            deviceKey: "eng-a1-2026-09-10",
          }));
        api.note("ux", "No way to mark a day as a washout",
          "Supervisor recorded 46 labour and a note; timeline risk does not change, so nothing upstream sees the lost day");
      },
    },
    {
      seat: "pd",
      note: "Raise the delay against Tower A slab cycle",
      async run(page, api) {
        await api.act("Raise delay change", () => {
          window.__atlasStore.getState().raiseChange({
            projectId: "p_kanak", kind: "change",
            title: "Monsoon slip — Tower A L13 slab cycle +6 days",
            status: "raised", severity: "high",
          });
          return null;
        });
      },
    },
    {
      seat: "sm",
      note: "Portal inbound — ingest, score, assign",
      async run(page, api) {
        const before = await api.read("leads");
        await api.act("Ingest a 99acres enquiry", () => {
          const s = window.__atlasStore.getState();
          return s.ingestLead({
            projectId: "p_kanak", name: "V. Agarwal", phone: "98xxxx5521",
            source: "99acres", unit: "B-0906", note: "Portal enquiry, 3BHK, budget stated",
            budget: 11_500_000, kind: "flat",
          });
        });

        const after = await api.read("leads");
        const fresh = (after ?? []).find((l) => l.name === "V. Agarwal");
        api.note("did", "Scored on ingest",
          fresh ? `score=${fresh.score} band=${fresh.band} model=${fresh.scoreModel} reasons=[${(fresh.scoreReasons ?? []).join(", ")}]` : "not found");
        api.note("did", `Pipeline ${before?.length ?? 0} → ${after?.length ?? 0}`);

        await api.act("Assign the portal lead to an in-house agent", () => {
          const s = window.__atlasStore.getState();
          const l = s.leads.find((x) => x.name === "V. Agarwal");
          const a = s.agents.find((x) => x.inHouse);
          return l && a ? s.assignLead(l.id, a.id) : "lead or agent missing";
        });
      },
    },
  ],
};
