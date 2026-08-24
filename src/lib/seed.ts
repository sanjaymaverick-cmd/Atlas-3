import type { AuditEvent, OwnerDecision } from "./types";

export {
  DUKIA_USERS as USERS,
  DUKIA_ENTITIES as ENTITIES,
  DUKIA_PROJECTS as PROJECTS,
  DUKIA_DOCUMENTS as DOCUMENTS,
  DUKIA_EXPORTS as EXPORTS_SEED,
  DUKIA_VENDORS as VENDORS,
  DUKIA_POS as POS,
  DUKIA_CONTRACTS as CONTRACTS,
  DUKIA_APPROVALS as APPROVALS,
  DUKIA_RFQS as RFQS,
  DUKIA_QUOTES as QUOTES,
  DUKIA_DIARIES as DIARIES,
  DUKIA_INSPECTIONS as INSPECTIONS,
  DUKIA_CHANGES as CHANGES,
  DUKIA_BOOKINGS as BOOKINGS,
  DUKIA_TALLY as TALLY,
} from "./dukia-seed";

export const DECISIONS: OwnerDecision[] = [
  { id: "ai_hosting", title: "AI hosting model", detail: "Self-hosted open-weight model, or a commercial API under a zero-retention DPA. Blocks live Phase 11 inference.", status: "recorded", note: "Self-hosted open-weight model. No commercial inference API." },
  { id: "kms", title: "Key management product", detail: "Self-hosted HSM / Vault versus cloud KMS with customer-managed keys.", status: "recorded", note: "Self-hosted HSM / Vault. Keys do not leave our control." },
  { id: "rto_rpo", title: "RTO / RPO targets", detail: "Proposed 4-hour RTO, 15-minute database RPO, 24-hour document RPO.", status: "recorded", note: "Accepted: 4-hour RTO, 15-minute database RPO, 24-hour document RPO." },
  { id: "break_glass", title: "Break-glass holder", detail: "Name the sealed secondary owner-console credential holder and brief them.", status: "recorded", note: "Sealed secondary owner-console holder: Bhagwan Ram Bagriya. Brief required before first production cutover." },
  { id: "warm_standby", title: "Warm-standby location", detail: "Second physical site, independent failure domain. Quarterly restore drill cannot start until this exists.", status: "recorded", note: "Warm standby: Jaipur. Independent failure domain. First quarterly restore drill can be scheduled." },
  { id: "crm", title: "CRM build vs integrate", detail: "Lead funnel and channel-partner commissions: build inside Atlas or integrate a third party.", status: "recorded", note: "Build inside Atlas. Lead funnel and channel-partner commissions are first-class Atlas modules, not a third-party CRM." },
];

export const AUDIT: AuditEvent[] = [];
