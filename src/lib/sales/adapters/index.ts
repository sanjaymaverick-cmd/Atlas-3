import type { IngestRequest } from "@/lib/sales/ingest";
import { adapt99acres, acresExternalId } from "./acres";
import { adaptMagicbricks, magicbricksExternalId } from "./magicbricks";
import { adaptHousing, housingExternalId } from "./housing";
import { adaptEmail } from "./email";

export type PortalId = "99acres" | "magicbricks" | "housing" | "email";

export function adaptPortal(portal: PortalId, payload: unknown): IngestRequest | { error: string } {
  if (portal === "99acres") return adapt99acres(payload);
  if (portal === "magicbricks") return adaptMagicbricks(payload);
  if (portal === "housing") return adaptHousing(payload);
  if (portal === "email") {
    const row = payload as { subject?: string; from?: string; body?: string; raw?: string };
    return adaptEmail({ subject: row.subject, from: row.from, body: row.body || row.raw || "" });
  }
  return { error: "Unknown portal." };
}

export function portalExternalId(portal: PortalId, payload: unknown) {
  if (portal === "99acres") return acresExternalId(payload);
  if (portal === "magicbricks") return magicbricksExternalId(payload);
  if (portal === "housing") return housingExternalId(payload);
  return "";
}

export { adapt99acres, adaptMagicbricks, adaptHousing, adaptEmail };
