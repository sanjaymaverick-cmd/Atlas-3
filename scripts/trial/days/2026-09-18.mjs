export default {
  date: "2026-09-18",
  label: "Fri — PO from quote, collections chase, four-eyes export",
  seats: [
    {
      seat: "cm",
      note: "Select the Baggad quote and raise the PO",
      async run(page, api) {
        const quotes = await api.read("quotes");
        api.note(
          "did",
          `Quotes on file: ${(quotes ?? []).length}`,
          (quotes ?? [])
            .map((q) => `${q.id}:${q.amount}:${q.status ?? "-"}`)
            .slice(0, 5)
            .join(" · ") || "none",
        );

        await api.act("Select the Marwar quote", () => {
          const s = window.__atlasStore.getState();
          const q = (s.quotes ?? [])[0];
          return q ? s.selectQuote(q.id) : "no quotes";
        });

        await api.act("Raise PO from the selected quote", () => {
          const s = window.__atlasStore.getState();
          const q = (s.quotes ?? [])[0];
          return q ? s.createPOFromQuote(q.id) : "no quotes";
        });
      },
    },
    {
      seat: "fl",
      note: "Collections chase before quarter end",
      async run(page, api) {
        const customers = await api.read("customers");
        api.note("did", `Customers: ${(customers ?? []).length}`);

        await api.act("Collect against the newest booking", () => {
          const s = window.__atlasStore.getState();
          const b = (s.bookings ?? []).find((x) => (x.collected ?? 0) < (x.value ?? Infinity));
          return b ? s.collect(b.id, 750_000) : "nothing outstanding";
        });

        const tally = await api.read("tally");
        api.note(
          "did",
          `Tally cases: ${(tally ?? []).length}`,
          (tally ?? []).map((t) => `${t.id}:${t.status ?? "open"}`).join(" · "),
        );
      },
    },
    {
      seat: "dc",
      note: "Complete a four-eyes export end to end",
      async run(page, api) {
        const grants = await api.read("exportGrants");
        api.note(
          "did",
          `Export grants: ${(grants ?? []).length}`,
          (grants ?? []).map((g) => `${g.id}:${g.status}`).join(" · ") || "none",
        );

        await api.act("Consume an approved export grant", () => {
          const s = window.__atlasStore.getState();
          const g = (s.exportGrants ?? []).find((x) => x.status !== "used");
          return g ? s.consumeExport(g.id) : "no grant available";
        });

        await api.act("Replay probe: consume the same grant twice", () => {
          const s = window.__atlasStore.getState();
          const g = (s.exportGrants ?? []).find((x) => x.status === "used");
          return g ? s.consumeExport(g.id) : "no used grant";
        });
      },
    },
  ],
};
