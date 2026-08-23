import type { LeadStage } from "@/lib/types";

/** New → Contacted → Qualified → Site visit → Negotiation → Booked / Lost / Nurture */
export const PIPELINE: LeadStage[] = [
  "inquiry",
  "contacted",
  "qualified",
  "visit",
  "negotiation",
  "documentation",
  "handover",
  "won",
  "lost",
  "nurture",
];

export const STAGE_LABEL: Record<LeadStage, string> = {
  inquiry: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  visit: "Site visit",
  negotiation: "Negotiation",
  documentation: "Documentation",
  handover: "Handover",
  won: "Booked",
  lost: "Lost",
  nurture: "Nurture",
};

export const STAGE_NEXT: Record<LeadStage, LeadStage | undefined> = {
  inquiry: "contacted",
  contacted: "qualified",
  qualified: "visit",
  visit: "negotiation",
  negotiation: "documentation",
  documentation: "handover",
  handover: undefined,
  won: undefined,
  lost: undefined,
  nurture: "inquiry",
};
