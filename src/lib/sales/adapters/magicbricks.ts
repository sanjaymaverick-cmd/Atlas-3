import type { IngestRequest } from "@/lib/sales/ingest";
import { asRecord, mapKind, mapProject, pickNumber, pickString } from "@/lib/sales/ingest";

/** MagicBricks webhook → IngestRequest. */
export function adaptMagicbricks(payload: unknown): IngestRequest | { error: string } {
  const row = asRecord(payload);
  const name = pickString(row, ["Name", "name", "LeadName", "customerName"]);
  const phone = pickString(row, ["Mobile", "mobile", "Phone", "phone", "MobileNo"]);
  if (!name || !phone) return { error: "MagicBricks payload needs Name and Mobile." };
  return {
    projectId: mapProject(
      pickString(row, ["ProjectId", "projectId", "ProjectName", "projectName", "Project"]),
    ),
    name,
    phone,
    source: "magicbricks",
    unit: pickString(row, ["Unit", "unit"]) || undefined,
    budget: pickNumber(row, ["Budget", "budget", "MaxBudget"]),
    note: pickString(row, ["Comment", "Comments", "Remarks", "message"]) || "MagicBricks webhook",
    kind: mapKind(pickString(row, ["PropertyType", "property_type", "Configuration"])),
  };
}

export function magicbricksExternalId(payload: unknown) {
  const row = asRecord(payload);
  return pickString(row, ["LeadId", "leadId", "id", "ID"]) || "";
}
