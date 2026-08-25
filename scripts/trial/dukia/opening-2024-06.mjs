/**
 * DUKIA GROUP — 3 Jun 2024. Aerovista land opens.
 * SATYAM BUILDCOM. Land & Legal, MD, Finance.
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { openTrial, signIn, signOut, setTrialDate, closeTrial } from "../session.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");
const AGENTS = join(ROOT, "docs", "trial", "dukia", "agents");
mkdirSync(AGENTS, { recursive: true });

function appendLog(file, body) {
  const path = join(AGENTS, file);
  const prev = existsSync(path) ? readFileSync(path, "utf8") : `# ${file}\n\n`;
  writeFileSync(path, prev.trimEnd() + "\n\n" + body.trim() + "\n");
}

const reset = process.argv.includes("--reset");
const { context, page } = await openTrial({ reset });

try {
  await setTrialDate(page, "2024-06-03");
  console.log("=== 2024-06-03 — DUKIA GROUP — Aerovista land opens ===\n");

  await signIn(page, "ll");
  const ll = await page.evaluate(() => {
    const s = window.__atlasStore.getState();
    s.setEntity("le_sbc");
    s.setProject("p_av");
    const blocked = s.acquireParcel("lp_av");
    s.registerDocument({
      projectId: "p_av",
      title: "Title search request — Muhana Mandi khasra 41/2",
      kind: "Statutory",
      classification: "restricted",
      fileName: "title-search-request-2024-06-03.pdf",
      sheet: "LAND-AV-01",
    });
    const now = window.__atlasStore.getState();
    const docs = now.documents.filter((d) => d.projectId === "p_av");
    const parcel = now.parcels.find((p) => p.id === "lp_av");
    const openDd = now.diligence.filter((d) => d.parcelId === "lp_av" && d.status !== "clear");
    return {
      person: s.user?.name,
      blocked,
      docs: docs.map((d) => `${d.id}:${d.title}:${d.status}`),
      parcel: `${parcel?.name} · ${parcel?.status}`,
      openDd: openDd.map((d) => d.title),
    };
  });
  console.log("LL", JSON.stringify(ll, null, 2));
  appendLog(
    "legal-m-iyer.md",
    `## 2024-06-03 — Land & Legal — M. Iyer — SATYAM BUILDCOM / Aerovista

### Work completed
- Opened Aerovista land file: ${ll.parcel}
- Registered document (quarantine): ${ll.docs.join("; ") || "none"}
- Did **not** acquire — diligence still open

### Challenges faced
- Five diligence items all open on day one. Cannot buy land. That is the job, not a surprise.
- No place to store the advocate's 30-year title opinion as a real PDF — Atlas hashes a filename only.

### UI / UX difficulties
- Land desk: "Land papers" is the nav word. I looked for "Acquisition".
- Document register starts in virus scan. Extra clicks before the file is usable. P2

### Missing fields / missing features
- No field for advocate name, khasra map attachment, or consideration (₹) on the parcel.
- No "partner capital paid" voucher link to ERPNext (posting is off). P1 for books.

### Blockers & refusals
- Acquire refused: "${ll.blocked}"
- Refusal is **correct**. Diligence items still open: ${ll.openDd.join("; ")}

### Data / numbers
- Area 3600 sq yd as briefed. Loan on parcel still 0 (SBI sanction not yet).

### Jargon
- Diligence | Land papers | I say "title checks"
- Quarantine | Documents | I thought legal hold, not virus scan

### Handoffs
- Document Controller must clear quarantine on the title-search request.
- MD to note we cannot close land this week.

### Severity tags (required)
- P1 missing ₹ consideration / partner-capital payment on parcel
- P2 document quarantine extra step
- P3 nav says Land papers not Acquisition
`,
  );
  await signOut(page);

  await signIn(page, "md");
  const md = await page.evaluate(() => {
    const s = window.__atlasStore.getState();
    const projects = s.projects.map((p) => `${p.code} ${p.name} ${p.status} units=${p.units}`);
    const entities = s.entities.map((e) => e.name);
    return { person: s.user?.name, projects, entities, entityId: s.entityId };
  });
  console.log("MD", JSON.stringify(md, null, 2));
  appendLog(
    "md-r-dukia.md",
    `## 2024-06-03 — Managing Director — R. Dukia — DUKIA GROUP / Aerovista

### Work completed
- Read group entities: ${md.entities.join(" · ")}
- Read projects: ${md.projects.join(" · ")}
- Confirmed land cannot close until Land & Legal clears five checks

### Challenges faced
- Default company on login was SATYAM BUILDCOM (Aerovista). I need all three books; switching is extra work. P2

### UI / UX difficulties
- Home is a queue. I wanted a group P&L. Atlas does not have one. ERPNext would, per company. P1

### Missing fields / missing features
- No group dashboard across three sister companies.
- Directors have the same "owner" role as MD — cannot tell us apart except by name. P2

### Blockers & refusals
- None on my desk today. Land acquire correctly blocked for Legal.

### Data / numbers
- Aerovista 119 units, Sunflower 53, Acropolis 184. Matches brief.

### Jargon
- Waiting for a yes | Home | I still look for Approvals

### Handoffs
- Finance to record 60/40 construction funding picture (SBI for Aerovista) as a note — not a voucher.

### Severity tags (required)
- P1 no group P&L in Atlas
- P2 entity switcher; owner role shared by MD and Directors
`,
  );
  await signOut(page);

  await signIn(page, "fl");
  const fl = await page.evaluate(() => {
    const s = window.__atlasStore.getState();
    s.setEntity("le_sbc");
    s.registerDocument({
      projectId: "p_av",
      title:
        "Funding picture — Aerovista land equity + construction 60% SBI / 40% partner+advances",
      kind: "Report",
      classification: "confidential",
      fileName: "aerovista-funding-2024-06-03.pdf",
      sheet: "FIN-AV-01",
    });
    const now = window.__atlasStore.getState();
    const docs = now.documents.filter((d) => /Funding/i.test(d.title));
    return { person: now.user?.name, docs: docs.map((d) => `${d.id}:${d.title}:${d.status}`) };
  });
  console.log("FL", JSON.stringify(fl, null, 2));
  appendLog(
    "finance-p-jain.md",
    `## 2024-06-03 — Finance Lead — P. Jain — SATYAM BUILDCOM / Aerovista

### Work completed
- Recorded funding picture (ops document, not a voucher): ${fl.docs.join("; ")}
- Land will be partner capital. Construction later: 60% SBI, 40% partners + booking advances.
- Did not post to ERPNext (posting off).

### Challenges faced
- Company accounts desk still talks in Atlas match-cases. There is no "loan sanction" object. I used a document. P1

### UI / UX difficulties
- Company accounts (ERPNext) health is a sentence on the finance desk. If Docker is down it says not configured — that is honest.
- No 60/40 funding slider or bank name field. P1

### Missing fields / missing features
- Bank (SBI / AU), sanction letter number, land vs construction split.
- ERPNext company SATYAM BUILDCOM may not exist yet if only MOCK ATLAS3 LLP was created.

### Blockers & refusals
- Posting refused by policy (ERPNEXT_POSTING_ENABLED=false). Correct.

### Data / numbers
- No ₹ on the parcel yet. I could not enter land consideration.

### Jargon
- Company accounts | Finance | Fine. ERPNext is the word I use for books.

### Handoffs
- Land & Legal to clear five diligence items before I can treat land as acquired capital.

### Severity tags (required)
- P1 no loan/funding master; no land consideration
- P2 document used as a stand-in for a sanction letter
`,
  );
  await signOut(page);
} finally {
  await closeTrial(context);
}

console.log("\nAgent logs in docs/trial/dukia/agents/");
console.log("Next full day: 2024-06-17 after diligence is cleared — do not skip the gate.");
