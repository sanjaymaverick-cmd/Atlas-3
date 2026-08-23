import type { Lead } from "@/lib/types";

const PORTALS = new Set(["99acres", "magicbricks", "housing", "meta", "google", "website", "email", "webhook"]);

export interface IngestRequest {
  projectId: string;
  name: string;
  phone: string;
  source: string;
  unit?: string;
  budget?: number;
  note?: string;
  partnerId?: string;
  agentId?: string;
  kind?: Lead["kind"];
}

export interface IngestResult {
  ok: boolean;
  leadId?: string;
  duplicateOf?: string;
  error?: string;
}

export function normalizePhone(phone: string) {
  return phone.replace(/\s+/g, "");
}

export function findDuplicate(leads: Lead[], phone: string, projectId: string) {
  const p = normalizePhone(phone);
  return leads.find((l) => normalizePhone(l.phone) === p && l.projectId === projectId && l.stage !== "lost" && l.stage !== "nurture");
}

export function isPortalSource(source: string) {
  return PORTALS.has(source);
}
