import type { Lead, WaTemplate } from "@/lib/types";

export function fillTemplate(body: string, values: string[]) {
  return body.replace(/\{\{(\d+)\}\}/g, (_, n) => values[Number(n) - 1] ?? "");
}

export function refuseSend(tpl: WaTemplate | undefined, lead: Lead | undefined, marketingConsent: boolean) {
  if (!tpl) return "Template not found.";
  if (tpl.status !== "approved") return "Template is not Meta-approved (local registry).";
  if (tpl.quality === "low") return "Quality-rating protection — this template is paused.";
  if (tpl.category === "marketing" && !marketingConsent) {
    return "Marketing templates need WhatsApp consent.";
  }
  if (tpl.category === "utility" && /free|discount|offer|limited time/i.test(tpl.body)) {
    return "Utility templates cannot carry promotional language.";
  }
  if (!lead?.phone) return "A phone number is required.";
  return null;
}

export function leadValues(lead: Lead, extra: string[] = []): string[] {
  return [lead.name, lead.unit || "unit", extra[0] ?? "", extra[1] ?? ""].filter((x, i) => i < 4);
}

export function templateByTrigger(templates: WaTemplate[], trigger: WaTemplate["trigger"]) {
  return templates.find((t) => t.trigger === trigger && t.status === "approved" && t.quality !== "low");
}

/** Lightweight WhatsApp qualifier — not a live chatbot. */
export function readReply(text: string): "confirm" | "qualify" | "none" {
  if (/yes|ok|confirm|sunday|tomorrow|aunga|haan/i.test(text)) return "confirm";
  if (/lakh|budget|loan|bhk|shop|plot|price|emi/i.test(text)) return "qualify";
  return "none";
}
