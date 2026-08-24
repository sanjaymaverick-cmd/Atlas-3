export default {
  date: "2026-08-26",
  label: "Wed — lead progression, document revision, change response",
  seats: [
    {
      seat: "sv",
      note: "Wednesday diary — a near-miss to record",
      async run(page, api) {
        await api.act("File Wednesday diary", () =>
          window.__atlasStore.getState().addDiary({
            projectId: "p_kanak",
            date: "2026-08-26",
            weather: "Overcast, 32C",
            labour: 145,
            work: "Tower B raft pour prep. Tower A L13 columns 40%.",
            materials: "Cement 300 bags. Admixture 4 drums.",
            safety: "Near-miss: loose scaffold plank Tower A L11, corrected same shift.",
            deviceKey: "eng-a1-2026-08-26",
          }),
        );
        api.note("ux", "Diary has no field for a near-miss",
          "Supervisor put it in the safety free-text; it will not surface as an exception anywhere");
      },
    },
    {
      seat: "sm",
      note: "Advance the negotiation lead, schedule a visit",
      async run(page, api) {
        await api.act("Schedule site visit for the walk-in", () => {
          const s = window.__atlasStore.getState();
          const l = s.leads.find((x) => x.name === "A. Sethi");
          if (!l) return "lead not found";
          return s.scheduleVisit({ leadId: l.id, scheduled: "2026-08-28", note: "Family visit, west stack L12" });
        });

        await api.act("Advance R. Yadav from negotiation", () => {
          const s = window.__atlasStore.getState();
          const l = s.leads.find((x) => x.stage === "negotiation");
          return l ? s.advanceLead(l.id) : "none in negotiation";
        });
      },
    },
    {
      seat: "pd",
      note: "Respond to the open RFI",
      async run(page, api) {
        await api.act("Respond to beam-column clash RFI", () => {
          const s = window.__atlasStore.getState();
          const c = s.changes.find((x) => x.kind === "rfi" && x.status !== "closed");
          if (!c) return "no open rfi";
          return s.respondChange(c.id, "Shift beam CL 75mm south; consultant confirms cover retained.");
        });
      },
    },
    {
      seat: "dc",
      note: "Issue the revised waterproofing spec",
      async run(page, api) {
        await api.act("Add revision to waterproofing spec", () => {
          const s = window.__atlasStore.getState();
          const d = s.documents.find((x) => /Waterproofing/i.test(x.title ?? ""));
          if (!d) return "doc not found";
          return s.addRevision(d.id, "Rev B — podium detail updated after consultant comment");
        });
      },
    },
  ],
};
