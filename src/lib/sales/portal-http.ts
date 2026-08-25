import { createHash } from "node:crypto";
import { adaptPortal, portalExternalId, type PortalId } from "@/lib/sales/adapters";
import { normalizePhone, type IngestResult } from "@/lib/sales/ingest";
import {
  appendJournal,
  findJournal,
  pendingJournal,
  ackJournal,
  type JournalEvent,
} from "@/lib/sales/portal-journal";
import { ingestSecret, verifyIngestAuth } from "@/lib/sales/portal-secret";

const PORTALS: PortalId[] = ["99acres", "magicbricks", "housing", "email"];

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function portalFromPath(pathname: string): PortalId | "config" | "journal" | "ack" | null {
  const parts = pathname.replace(/\/+$/, "").split("/");
  const last = parts.at(-1) ?? "";
  if (last === "config") return "config";
  if (last === "journal") return "journal";
  if (last === "ack") return "ack";
  if ((PORTALS as string[]).includes(last)) return last as PortalId;
  return null;
}

function idempotencyKey(
  portal: PortalId,
  ingest: { phone: string; projectId: string },
  externalId: string,
  headerKey: string,
) {
  if (headerKey.trim()) return `${portal}:${headerKey.trim()}`;
  const phone = normalizePhone(ingest.phone);
  const basis = externalId || `${phone}:${ingest.projectId}`;
  const hash = createHash("sha256").update(`${portal}:${basis}`).digest("hex").slice(0, 24);
  return `${portal}:${hash}`;
}

export async function handlePortalPost(
  portal: PortalId,
  raw: string,
  headers: Headers,
): Promise<Response> {
  const auth = verifyIngestAuth(headers, raw);
  if (auth) return json(401, { ok: false, error: auth });

  let payload: unknown = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    if (portal === "email") payload = { body: raw };
    else return json(400, { ok: false, error: "JSON body required." });
  }

  const adapted = adaptPortal(portal, payload);
  if ("error" in adapted) return json(400, { ok: false, error: adapted.error });

  const key = idempotencyKey(
    portal,
    adapted,
    portalExternalId(portal, payload),
    headers.get("idempotency-key") ?? "",
  );
  const prior = findJournal(key);
  if (prior) {
    return json(200, {
      ok: prior.result.ok || Boolean(prior.result.duplicateOf),
      duplicate: true,
      ingest: prior.ingest,
      result: prior.result,
      eventId: prior.id,
    });
  }

  const result: IngestResult & { queued?: boolean } = { ok: true, queued: true };
  const event: JournalEvent = {
    id: `wh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    portal,
    idempotencyKey: key,
    ingest: adapted,
    result,
    raw: payload,
  };
  appendJournal(event);
  return json(200, {
    ok: true,
    queued: true,
    ingest: adapted,
    result,
    eventId: event.id,
  });
}

export async function handleIngestHttp(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const route = portalFromPath(path);
  const method = request.method.toUpperCase();

  if (!route) return json(404, { ok: false, error: "Unknown ingest route." });

  if (route === "config" && method === "GET") {
    const origin = url.origin;
    return json(200, {
      ok: true,
      live: ["99acres", "magicbricks", "housing"],
      designed: ["meta", "google", "whatsapp", "razorpay", "esign", "telephony"],
      secret: ingestSecret(),
      signatureHeader: "X-Atlas-Signature",
      secretHeader: "X-Atlas-Ingest-Secret",
      urls: {
        "99acres": `${origin}/api/ingest/99acres`,
        magicbricks: `${origin}/api/ingest/magicbricks`,
        housing: `${origin}/api/ingest/housing`,
        email: `${origin}/api/ingest/email`,
      },
    });
  }

  if (route === "journal" && method === "GET") {
    return json(200, { ok: true, events: pendingJournal() });
  }

  if (route === "ack" && method === "POST") {
    const body = (await request.json().catch(() => ({}))) as { ids?: string[] };
    ackJournal(Array.isArray(body.ids) ? body.ids : []);
    return json(200, { ok: true });
  }

  if (method !== "POST") return json(405, { ok: false, error: "POST required." });
  if (route === "config" || route === "journal" || route === "ack") {
    return json(405, { ok: false, error: "Wrong method for this path." });
  }

  const raw = await request.text();
  return handlePortalPost(route, raw, request.headers);
}
