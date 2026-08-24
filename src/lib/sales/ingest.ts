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

const PROJECT_ALIASES: Record<string, string> = {
  p_av: "p_av",
  aerovista: "p_av",
  "av-01": "p_av",
  p_sf: "p_sf",
  sunflower: "p_sf",
  "sf-01": "p_sf",
  p_ac: "p_ac",
  acropolis: "p_ac",
  "ac-01": "p_ac",
};

export function mapProject(raw?: string | null) {
  if (!raw) return "p_av";
  const key = raw.trim().toLowerCase();
  return PROJECT_ALIASES[key] ?? (PROJECT_ALIASES[key.replace(/\s+/g, " ")] ?? "p_av");
}

export function mapKind(raw?: string | null): Lead["kind"] | undefined {
  if (!raw) return undefined;
  const s = raw.toLowerCase();
  if (/plot|land/.test(s)) return "plot";
  if (/shop|retail|showroom|clinic/.test(s)) return "shop";
  if (/flat|apartment|bhk|residen/.test(s)) return "flat";
  return undefined;
}

export function asRecord(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) return payload as Record<string, unknown>;
  return {};
}

export function pickString(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const v = row[key];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return "";
}

export function pickNumber(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const v = row[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim()) {
      const n = Number(v.replace(/[,\s]/g, "").replace(/lakh|lac/i, "00000").replace(/cr/i, "0000000"));
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return undefined;
}

export function ingestErrorToResult(err: string | null, duplicateId?: string): IngestResult {
  if (!err) return { ok: true };
  if (/duplicate/i.test(err)) return { ok: false, duplicateOf: duplicateId, error: err };
  return { ok: false, error: err };
}
