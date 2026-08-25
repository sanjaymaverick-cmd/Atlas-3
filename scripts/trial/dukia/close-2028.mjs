/** Fix vendor/PO gates, book leftover 3BHK, pin clock 2028-12-31. */
import { openTrial, signIn, setTrialDate, closeTrial } from "../session.mjs";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "docs",
  "trial",
  "dukia",
);
const { context, page } = await openTrial();
try {
  await setTrialDate(page, "2028-12-31");
  await signIn(page, "md");
  const out = await page.evaluate(() => {
    const g = () => window.__atlasStore.getState();
    g().setSimDate("2028-12-31");
    g().signInLocal("md@dukia.local", "AtlasLocal-MD");
    const notes = [];
    for (const a of g().approvals.filter((x) => x.status === "pending")) {
      notes.push(`approve ${a.kind} ${a.id} -> ${g().decideApproval(a.id, "approved")}`);
    }
    g().signInLocal("cm@dukia.local", "AtlasLocal-CM");
    for (const q of g().quotes.filter((x) => x.status === "submitted")) {
      notes.push(`select ${q.id} -> ${g().selectQuote(q.id)}`);
    }
    for (const q of g().quotes.filter((x) => x.status === "selected")) {
      notes.push(`po ${q.id} -> ${g().createPOFromQuote(q.id)}`);
    }
    g().signInLocal("md@dukia.local", "AtlasLocal-MD");
    for (const a of g().approvals.filter(
      (x) => x.status === "pending" && x.kind === "Purchase order",
    )) {
      notes.push(`po-approve ${a.id} -> ${g().decideApproval(a.id, "approved")}`);
    }
    g().signInLocal("sm@dukia.local", "AtlasLocal-SM");
    let booked = 0;
    for (const prefix of ["AVB", "SFB", "ACB"]) {
      const projectId = prefix.startsWith("AV")
        ? "p_av"
        : prefix.startsWith("SF")
          ? "p_sf"
          : "p_ac";
      const cap = 20;
      let n = 0;
      while (n < cap) {
        const unit = g().units.find((u) => u.status === "available" && u.code.startsWith(prefix));
        if (!unit) break;
        g().addLead({
          projectId,
          name: `Buyer ${unit.code}`,
          phone: `96${unit.code.replace(/\D/g, "").slice(0, 8)}`,
          source: "walk-in",
          unit: unit.code,
          note: "close-period 3BHK",
          budget: unit.price,
          kind: "flat",
        });
        const lead = g().leads.find(
          (l) => l.unit === unit.code && l.stage !== "won" && l.stage !== "lost",
        );
        const err = lead ? g().convertLead(lead.id, unit.price) : "no lead";
        if (err) {
          notes.push(String(err));
          break;
        }
        n++;
        booked++;
      }
    }
    g().registerDocument({
      projectId: "p_av",
      title: "DUKIA GROUP close note 31 Dec 2028",
      kind: "Report",
      classification: "internal",
      sheet: "MD-CLOSE",
      fileName: "dukia-close-2028-12-31.pdf",
    });
    const s = g();
    return {
      notes,
      booked,
      simDate: s.simDate,
      vendors: s.vendors.map((v) => `${v.id}:${v.stage}`),
      pos: s.pos.map((p) => `${p.id}:${p.title}:${p.status}`),
      quotes: s.quotes.map((q) => `${q.id}:${q.status}`),
      bookings: s.bookings.length,
      available: s.units.filter((u) => u.status === "available").length,
      sold: s.units.filter((u) => u.status === "sold").length,
      bookedU: s.units.filter((u) => u.status === "booked").length,
    };
  });
  console.log(JSON.stringify(out, null, 2));
  writeFileSync(join(OUT, "close-2028.json"), JSON.stringify(out, null, 2));
} finally {
  await closeTrial(context);
}
