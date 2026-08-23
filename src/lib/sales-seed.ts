import type {
  BookingDoc,
  DailyReport,
  InboundEvent,
  WaSend,
  WaTemplate,
  HandoverCase,
  InventoryUnit,
  LeadActivity,
  LeadFeatureRow,
  LeadScoreHistory,
  SalesAgent,
  ScoringModel,
  SiteVisit,
  Tower,
  UnitEvent,
  UnitHold,
} from "@/lib/types";

export const TOWERS: Tower[] = [
  { id: "tw_a", projectId: "p_kanak", name: "Tower A", kind: "tower" },
  { id: "tw_b", projectId: "p_kanak", name: "Tower B", kind: "tower" },
  { id: "tw_c", projectId: "p_mansar", name: "Tower C", kind: "tower" },
  { id: "tw_p", projectId: "p_baggad", name: "Plot pocket", kind: "pocket" },
  { id: "tw_s", projectId: "p_baggad", name: "Shop line", kind: "phase" },
];

export const UNITS: InventoryUnit[] = [
  { id: "un1", projectId: "p_kanak", towerId: "tw_a", code: "A-1204", kind: "flat", floor: "12", area: "1450 sqft", price: 8_450_000, status: "booked" },
  { id: "un2", projectId: "p_kanak", towerId: "tw_b", code: "B-0302", kind: "flat", floor: "3", area: "1280 sqft", price: 6_920_000, status: "booked" },
  { id: "un3", projectId: "p_kanak", towerId: "tw_a", code: "A-0802", kind: "flat", floor: "8", area: "1420 sqft", price: 8_100_000, status: "available" },
  { id: "un4", projectId: "p_kanak", towerId: "tw_b", code: "B-1104", kind: "flat", floor: "11", area: "1380 sqft", price: 7_800_000, status: "available" },
  { id: "un5", projectId: "p_kanak", towerId: "tw_a", code: "A-0101", kind: "shop", floor: "G", area: "420 sqft", price: 4_200_000, status: "available" },
  { id: "un6", projectId: "p_mansar", towerId: "tw_c", code: "C-304", kind: "flat", floor: "3", area: "1180 sqft", price: 5_150_000, status: "sold" },
  { id: "un7", projectId: "p_mansar", towerId: "tw_c", code: "C-512", kind: "flat", floor: "5", area: "1180 sqft", price: 5_200_000, status: "held" },
  { id: "un8", projectId: "p_baggad", towerId: "tw_p", code: "P-101", kind: "plot", floor: "—", area: "180 sq.yd", price: 11_200_000, status: "booked" },
  { id: "un9", projectId: "p_baggad", towerId: "tw_p", code: "P-204", kind: "plot", floor: "—", area: "200 sq.yd", price: 12_400_000, status: "available" },
  { id: "un10", projectId: "p_baggad", towerId: "tw_s", code: "S-12", kind: "shop", floor: "G", area: "380 sqft", price: 3_600_000, status: "held" },
];

export const AGENTS: SalesAgent[] = [
  { id: "ag1", name: "V. Meena", phone: "98xxxx3301", companyId: "pt1", userId: "u_ch", inHouse: false, status: "active" },
  { id: "ag_ca", name: "K. Pink", phone: "91xxxx2201", companyId: "pt1", userId: "u_ca", inHouse: false, status: "active" },
  { id: "ag2", name: "S. Qureshi", phone: "97xxxx1188", companyId: "pt1", inHouse: false, status: "active" },
  { id: "ag3", name: "N. Bhatia", phone: "90xxxx2200", userId: "u_sales", inHouse: true, status: "active" },
  { id: "ag4", name: "R. Shekhawat", phone: "96xxxx4410", companyId: "pt3", inHouse: false, status: "active" },
];

export const DAILY_REPORTS: DailyReport[] = [
  { id: "dr1", agentId: "ag1", date: "2026-08-22", calls: 14, visits: 2, leads: 3, holds: 1, bookings: 0, cancellations: 0, notes: "Tower A west stack interest." },
  { id: "dr2", agentId: "ag4", date: "2026-08-22", calls: 9, visits: 1, leads: 1, holds: 1, bookings: 0, cancellations: 0, notes: "Mansar C stack — other firm, must not leak to Pink City." },
];

export const HOLDS: UnitHold[] = [
  {
    id: "hd1",
    unitId: "un10",
    projectId: "p_baggad",
    agentId: "ag1",
    customer: "R. Soni",
    until: "2026-08-28",
    status: "held",
  },
  {
    id: "hd2",
    unitId: "un7",
    projectId: "p_mansar",
    agentId: "ag4",
    customer: "L. Bhati",
    until: "2026-08-27",
    status: "held",
  },
];

export const LEAD_ACTIVITIES: LeadActivity[] = [
  { id: "la1", leadId: "ld1", at: "2026-08-20T11:00:00+05:30", kind: "visit", note: "Walked Tower A sample flat." },
];

export const HANDOVERS: HandoverCase[] = [
  { id: "ho1", projectId: "p_mansar", unit: "C-304", oc: "received", snagsOpen: 1, status: "snagging" },
];

export const SCORE_MODELS: ScoringModel[] = [
  { id: "m_hybrid", name: "Rules + GBDT-lite", kind: "hybrid", active: true, note: "Live on this host. Calibrated, imbalance-aware." },
  { id: "m_xgb", name: "XGBoost", kind: "xgboost", active: false, note: "Swap-ready. Trained booster is an owner TODO." },
  { id: "m_lgb", name: "LightGBM", kind: "lightgbm", active: false, note: "Swap-ready. Trained booster is an owner TODO." },
  { id: "m_cat", name: "CatBoost", kind: "catboost", active: false, note: "Ordered target statistics for portal source." },
];

export const UNIT_EVENTS: UnitEvent[] = [
  { id: "ue1", unitId: "un10", at: "2026-08-21T10:00:00+05:30", from: "available", to: "held", note: "Hold hd1 · R. Soni" },
  { id: "ue2", unitId: "un7", at: "2026-08-22T09:30:00+05:30", from: "available", to: "held", note: "Hold hd2 · L. Bhati" },
  { id: "ue3", unitId: "un1", at: "2025-10-12T12:00:00+05:30", from: "available", to: "booked", note: "Booking b1" },
  { id: "ue4", unitId: "un6", at: "2026-01-10T12:00:00+05:30", from: "booked", to: "sold", note: "Possession C-304" },
];

export const SITE_VISITS: SiteVisit[] = [
  { id: "sv1", leadId: "ld1", projectId: "p_kanak", unit: "A-0802", scheduled: "2026-08-20", status: "done", note: "Walked Tower A sample flat." },
];

export const BOOKING_DOCS: BookingDoc[] = [
  { id: "bd1", bookingId: "b1", title: "PAN / Aadhaar KYC", status: "received" },
  { id: "bd2", bookingId: "b1", title: "Allotment letter", status: "received" },
  { id: "bd3", bookingId: "b1", title: "Agreement for sale", status: "open" },
  { id: "bd4", bookingId: "b1", title: "Home-loan NOC", status: "open" },
];

export const LEAD_FEATURES: LeadFeatureRow[] = [
  { id: "lf1", leadId: "ld1", at: "2026-08-20T11:00:00+05:30", features: { sourcePrior: 0.34, budgetOk: 1, stage: 1, visitAct: 1 } },
];

export const INBOUND: InboundEvent[] = [
  {
    id: "in1",
    at: "2026-08-23T08:10:00+05:30",
    kind: "99acres",
    status: "queued",
    projectId: "p_kanak",
    phone: "98xxxx9001",
    name: "T. Verma",
    note: "Portal webhook — 3 BHK west stack, budget 80L.",
  },
  {
    id: "in2",
    at: "2026-08-23T09:02:00+05:30",
    kind: "whatsapp",
    status: "queued",
    projectId: "p_kanak",
    phone: "98xxxx2101",
    name: "M. Saxena",
    note: "WhatsApp reply: can we visit this Sunday?",
    leadId: "ld1",
  },
  {
    id: "in3",
    at: "2026-08-23T09:40:00+05:30",
    kind: "meta",
    status: "queued",
    projectId: "p_kanak",
    phone: "97xxxx3300",
    name: "A. Joshi",
    note: "Meta Lead Ad — shop enquiry, clinic.",
  },
  {
    id: "in4",
    at: "2026-08-23T10:15:00+05:30",
    kind: "razorpay",
    status: "queued",
    projectId: "p_kanak",
    note: "Gateway token ₹84,500 for A-1204. Atlas records collection only — Tally stays books.",
    bookingId: "b1",
  },
  {
    id: "in5",
    at: "2026-08-23T10:40:00+05:30",
    kind: "esign",
    status: "queued",
    projectId: "p_kanak",
    note: "E-sign completed: Agreement for sale · A-1204.",
    bookingId: "b1",
  },
];

export const SCORE_HISTORY: LeadScoreHistory[] = [
  { id: "sh1", leadId: "ld1", at: "2026-08-20T11:00:00+05:30", score: 78, band: "hot", model: "rules+gbdt-lite", reasons: ["Walk-in", "Budget matches", "Site visit"] },
  { id: "sh2", leadId: "ld2", at: "2026-08-21T16:00:00+05:30", score: 81, band: "hot", model: "rules+gbdt-lite", reasons: ["Partner", "Late-funnel", "Car park intent"] },
];

export const WA_SENDS: WaSend[] = [
  {
    id: "ws1",
    templateId: "wa1",
    to: "98xxxx2101",
    at: "2026-08-22T18:10:00+05:30",
    body: "Hello M. Saxena, your site visit for A-0802 is confirmed. Please arrive 10 minutes early at the sample flat.",
    leadId: "ld1",
    direction: "out",
  },
  {
    id: "ws2",
    templateId: "in",
    to: "98xxxx2101",
    at: "2026-08-22T18:22:00+05:30",
    body: "Yes, Sunday 11am. Also, is loan tie-up available for 80L?",
    leadId: "ld1",
    direction: "in",
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
    samples: ["M. Saxena", "A-0802"],
    trigger: "visit_scheduled",
    quality: "high",
  },
  {
    id: "wa2",
    name: "site_visit_reminder",
    category: "utility",
    language: "en",
    status: "approved",
    body: "Reminder: {{1}}, we meet tomorrow at the {{2}} sample flat. Reply YES to confirm.",
    variables: ["customer_name", "unit_code"],
    samples: ["M. Saxena", "Tower A"],
    trigger: "visit_reminder",
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
    samples: ["V. Agarwal", "₹1.69 L", "A-1204"],
    trigger: "payment_due",
    quality: "high",
  },
  {
    id: "wa4",
    name: "document_request",
    category: "utility",
    language: "en",
    status: "approved",
    body: "{{1}}, please upload {{2}} for unit {{3}} so documentation can proceed.",
    variables: ["customer_name", "document", "unit_code"],
    samples: ["V. Agarwal", "PAN / Aadhaar", "A-1204"],
    trigger: "document_request",
    quality: "high",
  },
  {
    id: "wa5",
    name: "construction_update",
    category: "utility",
    language: "en",
    status: "approved",
    body: "{{1}}, construction update for {{2}}: {{3}}.",
    variables: ["customer_name", "project", "update"],
    samples: ["V. Agarwal", "Kanakpura Residences", "Tower A slab 12 complete"],
    trigger: "construction",
    quality: "high",
  },
  {
    id: "wa6",
    name: "brochure_delivery",
    category: "utility",
    language: "en",
    status: "approved",
    body: "{{1}}, brochure for {{2}}: https://atlas.local/brochure/{{3}}",
    variables: ["customer_name", "project", "slug"],
    samples: ["M. Saxena", "Kanakpura Residences", "kpr-01"],
    trigger: "brochure",
    quality: "high",
  },
  {
    id: "wa7",
    name: "channel_broadcast",
    category: "marketing",
    language: "en",
    status: "approved",
    body: "{{1}}, this week at {{2}}: west-stack 3 BHKs are on show. Book a walk-through with your desk.",
    variables: ["agent_name", "project"],
    samples: ["V. Meena", "Kanakpura Residences"],
    trigger: "channel_broadcast",
    quality: "medium",
  },
  {
    id: "wa8",
    name: "new_launch",
    category: "marketing",
    language: "en",
    status: "paused",
    body: "{{1}}, new launch at {{2}}. Limited inventory this month.",
    variables: ["customer_name", "project"],
    samples: ["M. Saxena", "Baggad Heights"],
    trigger: "launch",
    quality: "low",
  },
];
