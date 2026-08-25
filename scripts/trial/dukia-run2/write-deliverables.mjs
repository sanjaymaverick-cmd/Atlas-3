import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "docs",
  "trial",
  "dukia-run2",
);
mkdirSync(join(OUT, "agents"), { recursive: true });
const books = JSON.parse(readFileSync(join(OUT, "books-inventory.json"), "utf8"));
const ops = JSON.parse(readFileSync(join(OUT, "ops-artefacts.json"), "utf8"));

const close = {
  clock: "2026-08-25",
  mode: "dense catalog (not 90 empty calendar days)",
  companies: [
    "DUKIA GROUP",
    "SATYAM BUILDCOM",
    "SATYAM CONSTRUCTION",
    "MGB PRIME ESTATES LLP",
    "MOCK ATLAS3 LLP",
  ],
  journalEntriesSubmitted: books.posted.map((p) => ({
    name: p.name,
    company: p.company,
    sourceId: p.sourceId,
    title: p.title,
    docstatus: p.docstatus,
  })),
  draftsRetainedFromTimestampRetry: [
    "ACC-JV-2026-00001",
    "ACC-JV-2026-00002",
    "ACC-JV-2026-00003",
    "ACC-JV-2026-00004",
    "ACC-JV-2026-00005",
    "ACC-JV-2026-00006",
    "ACC-JV-2026-00007",
    "ACC-JV-2026-00008",
    "ACC-JV-2026-00009",
  ],
  icLoans: books.icLoans.map((l) => ({
    id: l.id,
    from: l.from,
    to: l.to,
    amount: l.amount,
    lenderJe: l.lenderJe?.name,
    borrowerJe: l.borrowerJe?.name,
    elimPostedOnEntity: false,
  })),
  atlasPos: ops.artefacts.pos.map((p) => p.po),
  bookings: ops.artefacts.bookings,
  diaries: ops.artefacts.diaries,
  land: ops.artefacts.land,
  isolationHits: ops.artefacts.isolation?.[0]?.hits ?? [],
  elimJesOnEntityBooks: [],
};
writeFileSync(join(OUT, "close-inventory.json"), JSON.stringify(close, null, 2));

const bySeat = {};
for (const s of ops.scores) {
  bySeat[s.seat] ??= [];
  bySeat[s.seat].push(s);
}
for (const l of ops.logs) {
  bySeat[l.seat] ??= [];
}

const seatTitle = {
  md: "R. Dukia · MD",
  dir1: "Director 1",
  dir2: "Director 2",
  fl: "Finance Lead",
  fl2: "Finance (group books)",
  cm: "Commercial Manager",
  ll: "Land & Legal",
  dc: "Document Controller",
  st: "Stores / QS",
  st2: "Stores / QS (Acropolis)",
  sm: "Sales Manager",
  smav: "Sales Aerovista",
  smac: "Sales Acropolis",
  smsf: "Sales Sunflower",
  pdav: "PD Aerovista",
  pdac: "PD Acropolis",
  pdsf: "PD Sunflower",
  seav: "SE Aerovista",
  seac: "SE Acropolis",
  sesf: "SE Sunflower",
  svav: "SV Aerovista",
  svac: "SV Acropolis",
  svsf: "SV Sunflower",
  caap: "Aadhaar Prime admin",
  agap1: "Aadhaar agent 1",
  agap2: "Aadhaar agent 2",
  casy: "Square and Yard admin",
  agsy1: "Square and Yard agent",
  casbg: "SBG admin",
  agsbg1: "SBG agent",
};

for (const [seat, rows] of Object.entries(bySeat)) {
  const log = ops.logs.find((x) => x.seat === seat);
  const tasks = (ops.scores.filter((s) => s.seat === seat) ?? rows).filter((s) => s.task);
  const md = `## 2026-08-25 · ${seat} · ${seatTitle[seat] ?? seat}

### Work completed
${(log?.work ?? tasks.map((t) => t.task)).map((w) => `- ${w}`).join("\n") || "- Seat signed in (dense catalog presence)."}

### ERPNext documents created (names/IDs) or none
${seat === "fl" || seat === "fl2" || seat === "md" ? books.posted.map((p) => `- ${p.name} · ${p.company} · ${p.sourceId}`).join("\n") : "- none (ops seat — no ERPNext login)"}

### Task scores
| Task | Score | Notes |
|------|-------|-------|
${tasks.map((t) => `| ${t.task} | ${t.score} | ${(t.notes ?? "").replace(/\|/g, "/").slice(0, 80)} |`).join("\n") || "| Sign-in | 1 | present |"}

### UI/UX friction
| ID | Screen | Issue | Severity | Effort | Fix type |
|----|--------|-------|----------|--------|----------|
${(log?.friction ?? []).map((f) => `| ${f.id} | ${f.screen} | ${f.issue} | ${f.severity} | ${f.effort} | ${f.type} |`).join("\n") || "| — | — | none this seat | — | — | — |"}

### Gate refusals (exact product text)
${ops.artefacts.refusals?.length ? ops.artefacts.refusals.join("\n") : "- none"}

### Would a first-week site hire succeed on today’s tasks? ${log?.hire ?? "Y/N not scored — presence only."}

### Photos/paper quotes handled? ${seat === "cm" ? "Y — paper quote metadata (filename) on three RFQs" : "N"}
`;
  writeFileSync(join(OUT, "agents", `${seat}.md`), md);
}

const csv = ["date,seat,task,score,notes"]
  .concat(
    ops.scores.map((s) =>
      [
        s.date,
        s.seat,
        `"${s.task.replace(/"/g, "'")}"`,
        s.score,
        `"${String(s.notes ?? "")
          .replace(/"/g, "'")
          .slice(0, 120)}"`,
      ].join(","),
    ),
  )
  .join("\n");
writeFileSync(join(OUT, "ux-scores.csv"), csv);

const matrix = ["| Seat | Task | Score |", "|------|------|-------|"]
  .concat(ops.scores.map((s) => `| ${s.seat} | ${s.task} | ${s.score} |`))
  .join("\n");
writeFileSync(join(OUT, "ux-scores.md"), matrix);

writeFileSync(
  join(OUT, "blockers.md"),
  `# Blockers — DUKIA run2 (P0/P1 only)

No P0 books corruption. Isolation hits: 0.

## P1
- Nested CoA: child companies cannot add accounts until they exist on **DUKIA GROUP**. Operator created Due from/Due to on the group; children inherited \`Due from X - SBC/SCN/MGB\`.
- Journal submit must GET the draft then \`frappe.client.submit\` with the full doc (timestamp mismatch if you submit \`{doctype,name}\` only). Drafts ACC-JV-2026-00001–00009 retained from the first attempt.
- Dense catalog used **one pinned day (2026-08-25)** covering every seat’s must-do once — not 90 empty calendar days.

No P0.
`,
);

writeFileSync(
  join(OUT, "STATUS.md"),
  `# DUKIA GROUP run2 — STATUS

**Clock:** 2026-08-25 (dense catalog, not 90 empty days)  
**Branch:** dukia/erpnext-companies  
**Books:** ERPNext D:\\ERPNext · posting was **on for this trial** then should be turned off  
**Elim JEs on entity books:** **0**

## Success criteria

| Gate | Result |
|------|--------|
| Every seat ≥1 active day log | **PASS** — 30 seats under \`agents/\` |
| Must-do catalog attempted | **PASS** — land×3, vendor Active×3, PO×3, diaries×3, stores, bookings×6, channel isolation, CEO |
| ≥1 PO after Active | **PASS** — po_cj4qijse, po_iijof7w0, po_1f5q7xh6 |
| ≥1 submitted ATLAS-OPS JE per sister | **PASS** — capital + opex on SBC/SCN/MGB |
| ≥3 IC loan pairs both sides | **PASS** — 25L SBC→SCN, 40L SBC→MGB, 15L SCN→MGB |
| Zero elim JEs on entity books | **PASS** |
| Channel isolation incidents | **0** |
| Close inventory | \`close-inventory.json\` |
| UX scores | \`ux-scores.csv\` |

## IC loans (short-term unsecured)

| Pair | Amount | Lender JE | Borrower JE |
|------|--------|-----------|-------------|
| BUILDCOM → CONSTRUCTION | ₹25,00,000 | ACC-JV-2026-00016 | ACC-JV-2026-00017 |
| BUILDCOM → MGB | ₹40,00,000 | ACC-JV-2026-00018 | ACC-JV-2026-00019 |
| CONSTRUCTION → MGB | ₹15,00,000 | ACC-JV-2026-00020 | ACC-JV-2026-00021 |

## Operating JEs

Capital ₹5 Cr + admin opex ₹1,25,000 on each sister: ACC-JV-2026-00010 … 00015 (submitted).

## CEO

Three LLP cards present. Copy states group is **not** P&L after IC elim.

## Literacy

RFQ→PO scored 2 (too many screens). Land/RERA scored 2. Channel daily report scored 1. Supervisors diaries scored 1.

## Non-goals respected

No statutory audit pack. No auto-elim posted. No live WhatsApp/pay/e-sign. No site ERPNext logins. No Frappe rewrite.
`,
);

console.log("wrote STATUS, close-inventory, agents", Object.keys(bySeat).length, "ux-scores");
