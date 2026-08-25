import type { IngestRequest } from "@/lib/sales/ingest";
import { mapKind, mapProject, normalizePhone } from "@/lib/sales/ingest";

export type EmailParts = { subject?: string; from?: string; body: string };

function field(body: string, labels: string[]) {
  for (const label of labels) {
    const re = new RegExp(`(?:^|\\n)\\s*${label}\\s*[:\\-]\\s*(.+)`, "i");
    const m = body.match(re);
    if (m?.[1]) return m[1].replace(/\r/g, "").trim();
  }
  return "";
}

function detectSource(subject: string, from: string): IngestRequest["source"] {
  const blob = `${subject} ${from}`.toLowerCase();
  if (blob.includes("99acres") || blob.includes("99 acres")) return "99acres";
  if (blob.includes("magicbrick")) return "magicbricks";
  if (blob.includes("housing")) return "housing";
  return "email";
}

/** Plain-text lead alert → IngestRequest. Same path as portal webhooks. */
export function adaptEmail(input: EmailParts): IngestRequest | { error: string } {
  const body = input.body || "";
  const name = field(body, ["name", "customer", "lead name", "full name"]);
  const phone = normalizePhone(field(body, ["phone", "mobile", "mobile no", "contact"]));
  if (!name || !phone) return { error: "Email needs Name and Phone lines." };
  const source = detectSource(input.subject ?? "", input.from ?? "");
  const budgetRaw = field(body, ["budget", "max budget"]);
  const budget = budgetRaw
    ? Number(budgetRaw.replace(/[,\s]/g, "").replace(/lakh|lac/i, "00000"))
    : undefined;
  return {
    projectId: mapProject(
      field(body, ["project", "project name", "project code"]) || input.subject,
    ),
    name,
    phone,
    source,
    unit: field(body, ["unit", "unit no"]) || undefined,
    budget: Number.isFinite(budget) && budget ? budget : undefined,
    note:
      field(body, ["comment", "message", "requirement", "remarks"]) ||
      input.subject ||
      "Inbound lead email",
    kind: mapKind(field(body, ["type", "property", "configuration", "bhk"])),
  };
}
