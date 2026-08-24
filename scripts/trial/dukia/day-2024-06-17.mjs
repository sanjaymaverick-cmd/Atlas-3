/**
 * 17 Jun 2024 — diligence cleared, Aerovista land acquired.
 * Does not skip the gate: only acquire after every item is clear.
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { openTrial, signIn, signOut, setTrialDate, closeTrial } from "../session.mjs";

const AGENTS = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "docs", "trial", "dukia", "agents");
mkdirSync(AGENTS, { recursive: true });
function appendLog(file, body) {
  const path = join(AGENTS, file);
  const prev = existsSync(path) ? readFileSync(path, "utf8") : `# ${file}\n\n`;
  writeFileSync(path, prev.trimEnd() + "\n\n" + body.trim() + "\n");
}

const { context, page } = await openTrial();
try {
  await setTrialDate(page, "2024-06-17");
  console.log("=== 2024-06-17 — acquire Aerovista land ===\n");

  await signIn(page, "ll");
  const ll = await page.evaluate(() => {
    const ids = ["dd_av1", "dd_av2", "dd_av3", "dd_av4", "dd_av5"];
    for (const id of ids) window.__atlasStore.getState().setDiligence(id, "clear");
    const blockedMid = window.__atlasStore.getState().acquireParcel("lp_av");
    const after = window.__atlasStore.getState();
    const open = after.diligence.filter((d) => d.parcelId === "lp_av" && d.status !== "clear");
    const err = after.acquireParcel("lp_av", {
      considerationInr: 180_000_000,
      saleDeedNo: "AV/SD/2024/0412",
      saleDeedDate: "2024-06-17",
      advocateName: "M. Iyer",
    });
    const parcel = window.__atlasStore.getState().parcels.find((p) => p.id === "lp_av");
    return { blockedMid, open: open.length, acquire: err, parcel: parcel?.status, person: after.user?.name };
  });
  console.log("LL", ll);
  appendLog(
    "legal-m-iyer.md",
    `## 2024-06-17 — Land & Legal — M. Iyer — SATYAM BUILDCOM / Aerovista

### Work completed
- Marked all five Aerovista diligence items **clear**
- Acquire parcel \`lp_av\`: ${ll.acquire ?? "ok"} · status now **${ll.parcel}**

### Challenges faced
- Must click clear on each item separately. No "pack complete". P3

### UI / UX difficulties
- Land papers: acquire is easy to miss under the parcel card.

### Missing fields / missing features
- Still no sale deed number or consideration ₹ after acquire.

### Blockers & refusals
- After clear, acquire ${ll.acquire ? `refused: ${ll.acquire}` : "succeeded"}. ${ll.parcel === "acquired" ? "Correct." : "UNEXPECTED"}

### Data / numbers
- Loan still 0 on parcel. SBI is construction finance, not land.

### Jargon
- none today

### Handoffs
- MD to note land is now in SATYAM BUILDCOM books (ops). Finance to record partner-capital payment as a document until ERPNext posting exists.

### Severity tags (required)
- P1 no sale deed / consideration after acquire
- P3 no bulk-clear diligence
`,
  );
  await signOut(page);

  await signIn(page, "md");
  appendLog(
    "md-r-dukia.md",
    `## 2024-06-17 — Managing Director — R. Dukia — SATYAM BUILDCOM / Aerovista

### Work completed
- Confirmed Land & Legal acquired Muhana Mandi khasra 41/2. Aerovista land is in the group.

### Challenges faced
- I cannot see a rupee figure for the land. P1

### UI / UX difficulties
- Home did not shout "land closed today". I had to open Land papers.

### Missing fields / missing features
- No "capital deployed" widget on Home.

### Blockers & refusals
- none

### Data / numbers
- Land purchased Jun 2024 as briefed.

### Jargon
- none

### Handoffs
- Commercial may start structure package RFQ only after RERA file (July).

### Severity tags (required)
- P1 land consideration missing on Home and parcel
`,
  );
  await signOut(page);

  await signIn(page, "fl");
  const fl = await page.evaluate(() => {
    const s = window.__atlasStore.getState();
    s.registerDocument({
      projectId: "p_av",
      title: "Partner capital — Aerovista land (ops record, not ERPNext voucher)",
      kind: "Report",
      classification: "confidential",
      fileName: "partner-capital-land-av-2024-06-17.pdf",
      sheet: "FIN-AV-02",
    });
    const docs = window.__atlasStore.getState().documents.filter((d) => /Partner capital/i.test(d.title));
    return { docs: docs.map((d) => `${d.id}:${d.title}:${d.status}`) };
  });
  appendLog(
    "finance-p-jain.md",
    `## 2024-06-17 — Finance Lead — P. Jain — SATYAM BUILDCOM / Aerovista

### Work completed
- Partner-capital land payment recorded as ops document (not posted): ${fl.docs.join("; ") || "see register"}
- ERPNext posting still off. Atlas posted nothing.

### Challenges faced
- Cannot post a payment entry to SATYAM BUILDCOM in ERPNext from Atlas. Correct by policy.

### UI / UX difficulties
- Same as 3 Jun — document used as a cash voucher stand-in.

### Missing fields / missing features
- Payment entry, bank, amount on land.

### Blockers & refusals
- Posting off. Correct.

### Data / numbers
- Amount not entered (no field).

### Jargon
- none

### Handoffs
- ERPNext company SATYAM BUILDCOM must exist for later P&L. Operator to create if missing.

### Severity tags (required)
- P1 no amount on partner-capital record
`,
  );
} finally {
  await closeTrial(context);
}
console.log("Land acquire day done. Logs appended.");
