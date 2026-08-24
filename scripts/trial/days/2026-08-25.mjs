export default {
  date: "2026-08-25",
  label: "Tue — site cycle, channel hold placed, RFQ quotes arrive",
  seats: [
    {
      seat: "sv",
      note: "Tuesday diary",
      async run(page, api) {
        await api.act("File Tuesday diary", () =>
          window.__atlasStore.getState().addDiary({
            projectId: "p_kanak",
            date: "2026-08-25",
            weather: "Humid, 34C",
            labour: 152,
            work: "Tower B raft steel complete, pour scheduled Thu. Tower A L13 column starters.",
            materials: "TMT 12t consumed Tower B. Cement 410 bags.",
            safety: "No incidents. Height-work harness check.",
            deviceKey: "eng-a1-2026-08-25",
          }),
        );
      },
    },
    {
      seat: "ag",
      note: "Pink City — report, then hold a west-stack unit",
      async run(page, api) {
        await api.act("File Tuesday report", () => {
          const s = window.__atlasStore.getState();
          const me = s.agents.find((a) => a.userId === s.user?.id);
          if (!me) return "no agent row";
          return s.fileDailyReport({
            agentId: me.id,
            calls: 12,
            visits: 2,
            leads: 2,
            holds: 1,
            bookings: 0,
            cancellations: 0,
            notes: "West stack couple returning Thu with family. Asked about possession-linked plan.",
          });
        });

        await api.act("Hold a west-stack unit for the returning buyer", () => {
          const s = window.__atlasStore.getState();
          const me = s.agents.find((a) => a.userId === s.user?.id);
          const u = s.units.find((x) => x.status === "available");
          if (!u || !me) return "no available unit";
          return s.holdUnit({ unitId: u.id, agentId: me.id, customer: "R. Malhotra", until: "2026-09-01" });
        });

        const holds = await api.read("holds");
        api.note("did", `Holds now: ${(holds ?? []).length}`,
          (holds ?? []).map((h) => `${h.unitId}:${h.status ?? "held"}`).join(" · "));
      },
    },
    {
      seat: "cm",
      note: "Quotes land against the Baggad RFQ",
      async run(page, api) {
        const rfqs = await api.read("rfqs");
        api.note("did", `RFQs open: ${(rfqs ?? []).length}`,
          (rfqs ?? []).map((r) => r.title).join(" · ") || "none");

        await api.act("Record quote — Marwar Steel", () => {
          const s = window.__atlasStore.getState();
          const r = (s.rfqs ?? [])[0];
          const v = s.vendors.find((x) => /Marwar/i.test(x.name));
          if (!r || !v) return "no rfq or vendor";
          return s.submitQuote({
            rfqId: r.id,
            vendorId: v.id,
            amount: 4_850_000,
            validity: "2026-09-30",
            exclusions: "Excludes gate automation",
          });
        });
      },
    },
    {
      seat: "se",
      note: "Pre-pour checklist for Thursday raft",
      async run(page, api) {
        await api.act("Schedule Tower B raft pre-pour inspection", () => {
          window.__atlasStore.getState().scheduleInspection({
            projectId: "p_kanak",
            template: "Raft pre-pour checklist",
            location: "Tower B · raft",
          });
          return null;
        });
      },
    },
  ],
};
