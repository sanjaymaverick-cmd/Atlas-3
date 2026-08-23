import type { InboundEvent } from "@/lib/types";

/** Designed connectors — live APIs are owner TODOs. */
export const CONNECTORS = [
  { kind: "99acres", label: "99acres", channel: "webhook / email parse" },
  { kind: "magicbricks", label: "MagicBricks", channel: "webhook / email parse" },
  { kind: "housing", label: "Housing.com", channel: "webhook / email parse" },
  { kind: "meta", label: "Meta Lead Ads", channel: "Lead Ads webhook" },
  { kind: "google", label: "Google Lead Forms", channel: "Lead Form webhook" },
  { kind: "whatsapp", label: "WhatsApp Business", channel: "primary comms" },
  { kind: "email", label: "Email parse", channel: "inbound mailbox" },
  { kind: "webhook", label: "Generic webhook", channel: "PI / partner post" },
  { kind: "razorpay", label: "Payment gateway", channel: "token / receipt (Tally stays books)" },
  { kind: "esign", label: "E-sign / docs", channel: "allotment + agreement" },
  { kind: "telephony", label: "Telephony", channel: "click-to-call readiness" },
] as const;

export function inboundTitle(row: InboundEvent) {
  return `${row.kind} · ${row.name ?? row.phone ?? row.note.slice(0, 40)}`;
}
