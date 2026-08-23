import type { InboundEvent } from "@/lib/types";

/** Portal webhooks are live-ready on this host. Ads / WhatsApp / pay / e-sign stay designed-only. */
export const CONNECTORS = [
  { kind: "99acres", label: "99acres", channel: "POST /api/ingest/99acres", live: true },
  { kind: "magicbricks", label: "MagicBricks", channel: "POST /api/ingest/magicbricks", live: true },
  { kind: "housing", label: "Housing.com", channel: "POST /api/ingest/housing", live: true },
  { kind: "email", label: "Email parse", channel: "POST /api/ingest/email", live: true },
  { kind: "meta", label: "Meta Lead Ads", channel: "Lead Ads webhook", live: false },
  { kind: "google", label: "Google Lead Forms", channel: "Lead Form webhook", live: false },
  { kind: "whatsapp", label: "WhatsApp Business", channel: "primary comms", live: false },
  { kind: "webhook", label: "Generic webhook", channel: "PI / partner post", live: false },
  { kind: "razorpay", label: "Payment gateway", channel: "token / receipt (Tally stays books)", live: false },
  { kind: "esign", label: "E-sign / docs", channel: "allotment + agreement", live: false },
  { kind: "telephony", label: "Telephony", channel: "click-to-call readiness", live: false },
] as const;

export function inboundTitle(row: InboundEvent) {
  return `${row.kind} · ${row.name ?? row.phone ?? row.note.slice(0, 40)}`;
}
