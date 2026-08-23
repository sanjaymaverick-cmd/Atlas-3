import type { IngestRequest } from "@/lib/sales/ingest";
import { asRecord, mapKind, mapProject, pickNumber, pickString } from "@/lib/sales/ingest";

/** 99acres webhook → IngestRequest. External id is lead_id / LeadId. */
export function adapt99acres(payload: unknown): IngestRequest | { error: string } {
  const row = asRecord(payload);
  const name = pickString(row, ["name", "Name", "lead_name", "customer_name"]);
  const phone = pickString(row, ["mobile", "Mobile", "phone", "Phone", "mobile_number"]);
  if (!name || !phone) return { error: "99acres payload needs name and mobile." };
  return {
    projectId: mapProject(pickString(row, ["project_id", "ProjectId", "project_name", "ProjectName", "project"])),
    name,
    phone,
    source: "99acres",
    unit: pickString(row, ["unit", "Unit", "unit_no"]) || undefined,
    budget: pickNumber(row, ["budget", "Budget", "max_budget", "budget_max"]),
    note: pickString(row, ["comments", "Comments", "remark", "message", "requirement"]) || "99acres webhook",
    kind: mapKind(pickString(row, ["requirement", "property_type", "PropertyType", "bhk"])),
  };
}

export function acresExternalId(payload: unknown) {
  const row = asRecord(payload);
  return pickString(row, ["lead_id", "LeadId", "id", "ID"]) || "";
}
