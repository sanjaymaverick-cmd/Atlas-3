import type {
  AssistantNote,
  BudgetLine,
  OwnerTodo,
  DiligenceItem,
  Emi,
  LandParcel,
  MaterialItem,
  Obligation,
  QuantityItem,
} from "./types";

export const PARCELS: LandParcel[] = [
  { id: "lp1", projectId: "p_kanak", name: "Khasra 214/2 Kanakpura", khasra: "214/2", area: "12,400 sq.yd", status: "acquired", rera: "RAJ/P/2024/1288", loan: 180_000_000 },
  { id: "lp2", projectId: "p_baggad", name: "RIICO plot 18 Baggad", khasra: "RIICO-18", area: "8.2 acre", status: "diligence", rera: "Filing", loan: 0 },
  { id: "lp3", projectId: "p_mansar", name: "Mansarovar Sector 6", khasra: "S6/41", area: "9,800 sq.yd", status: "acquired", rera: "RAJ/P/2023/0441", loan: 95_000_000 },
];

export const DILIGENCE: DiligenceItem[] = [
  { id: "dd1", parcelId: "lp2", title: "Title search — 30 year", status: "open" },
  { id: "dd2", parcelId: "lp2", title: "Encumbrance certificate", status: "clear" },
  { id: "dd3", parcelId: "lp2", title: "Conversion / CLU", status: "flagged" },
  { id: "dd4", parcelId: "lp1", title: "Mutation in revenue record", status: "clear" },
  { id: "dd5", parcelId: "lp1", title: "Access road NOC", status: "clear" },
];

export const OBLIGATIONS: Obligation[] = [
  { id: "ob1", projectId: "p_kanak", kind: "rera", title: "RERA quarterly progress", due: "2026-09-30", status: "open" },
  { id: "ob2", projectId: "p_kanak", kind: "labour", title: "BOCW cess return", due: "2026-08-31", status: "overdue" },
  { id: "ob3", projectId: "p_kanak", kind: "insurance", title: "CAR policy renewal", due: "2026-10-12", status: "open" },
  { id: "ob4", projectId: "p_mansar", kind: "rera", title: "Occupation certificate follow-up", due: "2026-09-15", status: "open" },
  { id: "ob5", projectId: "p_baggad", kind: "tax", title: "GST on advances", due: "2026-09-20", status: "open" },
];

export const EMIS: Emi[] = [
  { id: "e1", parcelId: "lp1", due: "2026-09-05", amount: 2_150_000, status: "due" },
  { id: "e2", parcelId: "lp1", due: "2026-08-05", amount: 2_150_000, status: "paid" },
  { id: "e3", parcelId: "lp3", due: "2026-09-05", amount: 980_000, status: "due" },
];

export const BUDGET_LINES: BudgetLine[] = [
  { id: "bl1", projectId: "p_kanak", code: "01-CIV", name: "Civil structure", budget: 180_000_000, committed: 86_000_000 },
  { id: "bl2", projectId: "p_kanak", code: "02-MEP", name: "MEP", budget: 48_000_000, committed: 24_500_000 },
  { id: "bl3", projectId: "p_kanak", code: "03-FIN", name: "Finishes", budget: 62_000_000, committed: 8_200_000 },
  { id: "bl4", projectId: "p_baggad", code: "01-CIV", name: "Civil / grading", budget: 210_000_000, committed: 12_200_000 },
];

export const MATERIALS: MaterialItem[] = [
  { id: "m1", projectId: "p_kanak", name: "TMT 12mm", unit: "t", received: 86, issued: 61 },
  { id: "m2", projectId: "p_kanak", name: "OPC 53", unit: "bag", received: 4200, issued: 3100 },
  { id: "m3", projectId: "p_kanak", name: "Waterproof membrane", unit: "sqm", received: 800, issued: 240 },
  { id: "m4", projectId: "p_mansar", name: "Touch-up paint", unit: "L", received: 40, issued: 18 },
];

export const QUANTITIES: QuantityItem[] = [
  { id: "q1", projectId: "p_kanak", wbs: "01-CIV-SLB", name: "Tower A slabs L1–L12", bimQty: 1840, siteQty: 1792, status: "approved" },
  { id: "q2", projectId: "p_kanak", wbs: "01-CIV-RAF", name: "Tower B raft", bimQty: 420, siteQty: 468, status: "variance" },
  { id: "q3", projectId: "p_baggad", wbs: "01-GRD", name: "Site grading", bimQty: 22000, siteQty: 0, status: "provisional" },
];

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
    id: "todo_tally_live",
    title: "Live Tally sync",
    detail: "Atlas must not post vouchers. A later cutover may reconcile to a live Tally company — owner decision.",
    status: "open" as const,
  },
  {
    id: "todo_hsm",
    title: "HSM / Vault cutover drill",
    detail: "First production key ceremony and restore drill against Aerovista / Acropolis.",
    status: "open" as const,
  },
  {
    id: "todo_portals",
    title: "Portal / ads connectors",
    detail: "99acres, MagicBricks, Housing.com, Meta, Google — ingest APIs after UAT. Seed uses source tags only.",
    status: "open" as const,
  },
  {
    id: "todo_gbdt",
    title: "GBDT model lab",
    detail: "Train/compare XGBoost, LightGBM, CatBoost off-host. This demo uses rules + GBDT-lite. SHAP stays a later swap.",
    status: "open" as const,
  },
];
