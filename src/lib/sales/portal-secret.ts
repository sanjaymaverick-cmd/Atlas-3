import { createHmac, timingSafeEqual } from "node:crypto";

/** Local demo secret. Override with ATLAS_INGEST_SECRET. Not a VITE_ var. */
export const DEFAULT_INGEST_SECRET = "atlas-local-ingest-2026";

export function ingestSecret() {
  return process.env.ATLAS_INGEST_SECRET?.trim() || DEFAULT_INGEST_SECRET;
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function signBody(raw: string, secret = ingestSecret()) {
  return `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
}

/**
 * Accept either HMAC (`X-Atlas-Signature: sha256=…`) or the shared secret
 * (`X-Atlas-Ingest-Secret`). Account Managers who cannot HMAC still work.
 */
export function verifyIngestAuth(headers: Headers, raw: string) {
  const secret = ingestSecret();
  const shared = headers.get("x-atlas-ingest-secret") ?? headers.get("x-webhook-secret") ?? "";
  if (shared && safeEqual(shared, secret)) return null;
  const sig = headers.get("x-atlas-signature") ?? headers.get("x-hub-signature-256") ?? "";
  if (sig && safeEqual(sig, signBody(raw, secret))) return null;
  return "Unauthorized — send X-Atlas-Ingest-Secret or X-Atlas-Signature.";
}
