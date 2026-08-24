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
  contacted: "Called",
  qualified: "Serious buyer",
  visit: "Site visit",
  negotiation: "Price talk",
  documentation: "Papers",
  handover: "Give keys",
  won: "Booked",
  lost: "Lost",
  nurture: "Follow later",
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
