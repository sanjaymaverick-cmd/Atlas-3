import type { AssistantNote, BudgetLine, Emi, QuantityItem } from "./types";

export {
  DUKIA_PARCELS as PARCELS,
  DUKIA_DILIGENCE as DILIGENCE,
  DUKIA_OBLIGATIONS as OBLIGATIONS,
  DUKIA_MATERIALS as MATERIALS,
} from "./dukia-seed";

export const EMIS: Emi[] = [];

export const BUDGET_LINES: BudgetLine[] = [
  { id: "bl_av_civ", projectId: "p_av", code: "01-CIV", name: "Civil structure", budget: 420_000_000, committed: 0 },
  { id: "bl_av_mep", projectId: "p_av", code: "02-MEP", name: "MEP", budget: 90_000_000, committed: 0 },
  { id: "bl_sf_civ", projectId: "p_sf", code: "01-CIV", name: "Civil structure", budget: 95_000_000, committed: 0 },
  { id: "bl_ac_civ", projectId: "p_ac", code: "01-CIV", name: "Civil structure", budget: 720_000_000, committed: 0 },
];

export const QUANTITIES: QuantityItem[] = [];

export const NOTES: AssistantNote[] = [];

export const OWNER_TODOS = [
  {
    id: "todo_funding",
    title: "Funding-source module",
    detail: "Whether to track lender / internal / JV funding inside Atlas. Stub only until go-live is decided.",
    status: "open" as const,
  },
  {
    id: "todo_auth",
    title: "Production auth",
    detail: "Passkeys / IdP only after UAT is signed. This host stays local test accounts.",
    status: "open" as const,
  },
  {
    id: "todo_erpnext_posting",
    title: "ERPNext posting (Phase 2)",
    detail: "Read/reconcile is Phase 1. Controlled posting stays off until ERPNEXT_POSTING_ENABLED is an explicit owner decision.",
    status: "open" as const,
  },
  {
    id: "todo_hsm",
    title: "HSM / Vault cutover drill",
    detail: "First production key ceremony and restore drill.",
    status: "open" as const,
  },
  {
    id: "todo_portals",
    title: "Portal / ads connectors",
    detail: "99acres, MagicBricks, Housing.com webhooks are bound on this host. Meta / Google Lead Ads and live WhatsApp Business remain owner TODOs.",
    status: "open" as const,
  },
];
