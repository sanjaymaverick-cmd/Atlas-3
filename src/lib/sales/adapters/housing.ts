import type { IngestRequest } from "@/lib/sales/ingest";
import { asRecord, mapKind, mapProject, pickNumber, pickString } from "@/lib/sales/ingest";

/** Housing.com webhook → IngestRequest. */
export function adaptHousing(payload: unknown): IngestRequest | { error: string } {
  const row = asRecord(payload);
  const name = pickString(row, ["lead_name", "name", "Name", "customer_name"]);
  const phone = pickString(row, ["phone_number", "phone", "mobile", "Mobile"]);
  if (!name || !phone) return { error: "Housing.com payload needs lead_name and phone_number." };
  return {
    projectId: mapProject(pickString(row, ["project_code", "project_id", "project", "project_name"])),
    name,
    phone,
    source: "housing",
    unit: pickString(row, ["unit", "apartment"]) || undefined,
    budget: pickNumber(row, ["budget_max", "budget", "max_budget", "budget_min"]),
    note: pickString(row, ["message", "comment", "notes"]) || "Housing.com webhook",
    kind: mapKind(pickString(row, ["property_type", "bhk", "configuration"])),
  };
}

export function housingExternalId(payload: unknown) {
  const row = asRecord(payload);
  return pickString(row, ["id", "lead_id", "LeadId"]) || "";
}
