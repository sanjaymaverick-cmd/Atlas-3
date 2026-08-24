import type {
  BookingDoc,
  DailyReport,
  InboundEvent,
  WaSend,
  WaTemplate,
  Customer,
  HandoverCase,
  LeadActivity,
  LeadFeatureRow,
  LeadScoreHistory,
  ScoringModel,
  SiteVisit,
  UnitEvent,
  UnitHold,
} from "@/lib/types";

export {
  DUKIA_TOWERS as TOWERS,
  DUKIA_UNITS as UNITS,
  DUKIA_AGENTS as AGENTS,
} from "./dukia-seed";

export const CUSTOMERS: Customer[] = [];
export const DAILY_REPORTS: DailyReport[] = [];
export const HOLDS: UnitHold[] = [];
export const LEAD_ACTIVITIES: LeadActivity[] = [];
export const HANDOVERS: HandoverCase[] = [];
export const UNIT_EVENTS: UnitEvent[] = [];
export const SITE_VISITS: SiteVisit[] = [];
export const BOOKING_DOCS: BookingDoc[] = [];
export const LEAD_FEATURES: LeadFeatureRow[] = [];
export const INBOUND: InboundEvent[] = [];
export const SCORE_HISTORY: LeadScoreHistory[] = [];
export const WA_SENDS: WaSend[] = [];

const FEATURE_LIST = ["source", "stage", "kind", "budget", "unit_price", "wa", "call", "brochure", "visit"];

export const SCORE_MODELS: ScoringModel[] = [
  {
    id: "m_hybrid",
    name: "Rules + GBDT-lite",
    algorithm: "hybrid",
    kind: "hybrid",
    version: "1.0",
    metrics: { auc: 0.71, logloss: 0.48 },
    featureList: FEATURE_LIST,
    active: false,
    isActive: false,
    createdAt: "2024-06-01T00:00:00+05:30",
    notes: "Fallback when the CatBoost process is down.",
    note: "Fallback when the CatBoost process is down.",
  },
  {
    id: "m_cat",
    name: "CatBoost",
    algorithm: "catboost",
    kind: "catboost",
    version: "1.0",
    trainedAt: "2024-06-01T00:00:00+05:30",
    metrics: {},
    featureList: FEATURE_LIST,
    active: true,
    isActive: true,
    createdAt: "2024-06-01T00:00:00+05:30",
    notes: "Native CatBoost via cat_features on services/scoring (:8091).",
    note: "Native CatBoost via cat_features.",
  },
];

export const WA_TEMPLATES: WaTemplate[] = [
  {
    id: "wa1",
    name: "site_visit_confirm",
    category: "utility",
    language: "en",
    status: "approved",
    body: "Hello {{1}}, your site visit for {{2}} is confirmed. Please arrive 10 minutes early at the sample flat.",
    variables: ["customer_name", "unit_code"],
    samples: ["buyer", "AVA-0101"],
    trigger: "visit_scheduled",
    quality: "high",
  },
  {
    id: "wa3",
    name: "payment_reminder",
    category: "utility",
    language: "en",
    status: "approved",
    body: "{{1}}, a milestone of {{2}} is due on your booking {{3}}. Pay using the link already shared by accounts. This is not a promotional message.",
    variables: ["customer_name", "amount", "unit_code"],
    samples: ["buyer", "₹4.5 L", "AVA-0101"],
    trigger: "payment_due",
    quality: "high",
  },
];
