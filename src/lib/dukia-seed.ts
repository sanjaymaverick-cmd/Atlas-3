/**
 * DUKIA GROUP opening seed — Jun 2024.
 * Three sister companies, named people, empty operational history.
 * Units exist as available inventory; no bookings, POs, or diaries yet.
 */
import type {
  Approval,
  Booking,
  ChangeItem,
  Contract,
  DiaryEntry,
  DiligenceItem,
  Document,
  Inspection,
  InventoryUnit,
  LandParcel,
  LegalEntity,
  MaterialItem,
  Obligation,
  Partner,
  Project,
  PurchaseOrder,
  Quote,
  Rfq,
  SalesAgent,
  TallyCase,
  Tower,
  User,
  Vendor,
  FundingSanction,
} from "./types";

/** Shared group + per-project + three broker firms. One person, one login. */
export const DUKIA_USERS: User[] = [
  {
    id: "u_md",
    name: "R. Dukia",
    role: "owner",
    title: "Managing Director",
    email: "md@dukia.local",
    password: "AtlasLocal-MD",
    grade: "md",
  },
  {
    id: "u_dir1",
    name: "A. Sharma",
    role: "owner",
    title: "Director (group)",
    email: "dir1@dukia.local",
    password: "AtlasLocal-DIR1",
    grade: "director",
  },
  {
    id: "u_dir2",
    name: "K. Mehta",
    role: "owner",
    title: "Director (group)",
    email: "dir2@dukia.local",
    password: "AtlasLocal-DIR2",
    grade: "director",
  },
  {
    id: "u_fl",
    name: "P. Jain",
    role: "accountant",
    title: "Finance Lead",
    email: "fl@dukia.local",
    password: "AtlasLocal-FL",
  },
  {
    id: "u_fl2",
    name: "S. Gupta",
    role: "accountant",
    title: "Finance (group books)",
    email: "fl2@dukia.local",
    password: "AtlasLocal-FL2",
  },
  {
    id: "u_cm",
    name: "A. Kapoor",
    role: "commercial",
    title: "Commercial Manager",
    email: "cm@dukia.local",
    password: "AtlasLocal-CM",
  },
  {
    id: "u_ll",
    name: "M. Iyer",
    role: "legal",
    title: "Land & Legal",
    email: "ll@dukia.local",
    password: "AtlasLocal-LL",
  },
  {
    id: "u_dc",
    name: "T. Joseph",
    role: "docs",
    title: "Document Controller",
    email: "dc@dukia.local",
    password: "AtlasLocal-DC",
  },
  {
    id: "u_st",
    name: "H. Singh",
    role: "stores",
    title: "Stores / QS",
    email: "st@dukia.local",
    password: "AtlasLocal-ST",
  },
  {
    id: "u_st2",
    name: "R. Yadav",
    role: "stores",
    title: "Stores / QS (Acropolis)",
    email: "st2@dukia.local",
    password: "AtlasLocal-ST2",
  },
  {
    id: "u_sm",
    name: "N. Bhatia",
    role: "sales",
    title: "Sales Manager (group)",
    email: "sm@dukia.local",
    password: "AtlasLocal-SM",
  },
  {
    id: "u_sm_av",
    name: "A. Joshi",
    role: "sales",
    title: "Sales (Aerovista)",
    email: "sm-av@dukia.local",
    password: "AtlasLocal-SMAV",
  },
  {
    id: "u_sm_ac",
    name: "L. Bansal",
    role: "sales",
    title: "Sales (Acropolis)",
    email: "sm-ac@dukia.local",
    password: "AtlasLocal-SMAC",
  },
  {
    id: "u_sm_sf",
    name: "P. Mathur",
    role: "sales",
    title: "Sales (Sunflower)",
    email: "sm-sf@dukia.local",
    password: "AtlasLocal-SMSF",
  },
  {
    id: "u_pd_av",
    name: "R. Sharma",
    role: "pm",
    title: "Project Director (Aerovista)",
    email: "pd-av@dukia.local",
    password: "AtlasLocal-PDAV",
  },
  {
    id: "u_pd_ac",
    name: "V. Nair",
    role: "pm",
    title: "Project Director (Acropolis)",
    email: "pd-ac@dukia.local",
    password: "AtlasLocal-PDAC",
  },
  {
    id: "u_pd_sf",
    name: "S. Malik",
    role: "pm",
    title: "Project Director (Sunflower)",
    email: "pd-sf@dukia.local",
    password: "AtlasLocal-PDSF",
  },
  {
    id: "u_se_av",
    name: "K. Rathore",
    role: "engineer",
    title: "Site Engineer (Aerovista)",
    email: "se-av@dukia.local",
    password: "AtlasLocal-SEAV",
  },
  {
    id: "u_se_ac",
    name: "S. Bisht",
    role: "engineer",
    title: "Site Engineer (Acropolis)",
    email: "se-ac@dukia.local",
    password: "AtlasLocal-SEAC",
  },
  {
    id: "u_se_sf",
    name: "M. Khan",
    role: "engineer",
    title: "Site Engineer (Sunflower)",
    email: "se-sf@dukia.local",
    password: "AtlasLocal-SESF",
  },
  {
    id: "u_sv_av",
    name: "D. Chauhan",
    role: "supervisor",
    title: "Site Supervisor (Aerovista)",
    email: "sv-av@dukia.local",
    password: "AtlasLocal-SVAV",
  },
  {
    id: "u_sv_ac",
    name: "B. Lal",
    role: "supervisor",
    title: "Site Supervisor (Acropolis)",
    email: "sv-ac@dukia.local",
    password: "AtlasLocal-SVAC",
  },
  {
    id: "u_sv_sf",
    name: "G. Verma",
    role: "supervisor",
    title: "Site Supervisor (Sunflower)",
    email: "sv-sf@dukia.local",
    password: "AtlasLocal-SVSF",
  },
  {
    id: "u_ca_ap",
    name: "K. Pink",
    role: "channel_admin",
    title: "Aadhaar Prime — company admin",
    email: "ca-ap@dukia.local",
    password: "AtlasLocal-CAAP",
  },
  {
    id: "u_ag_ap1",
    name: "V. Meena",
    role: "channel",
    title: "Aadhaar Prime — agent 1",
    email: "ag-ap1@dukia.local",
    password: "AtlasLocal-AGAP1",
  },
  {
    id: "u_ag_ap2",
    name: "S. Qureshi",
    role: "channel",
    title: "Aadhaar Prime — agent 2",
    email: "ag-ap2@dukia.local",
    password: "AtlasLocal-AGAP2",
  },
  {
    id: "u_ca_sy",
    name: "D. Rathi",
    role: "channel_admin",
    title: "Square and Yard — company admin",
    email: "ca-sy@dukia.local",
    password: "AtlasLocal-CASY",
  },
  {
    id: "u_ag_sy1",
    name: "R. Shekhawat",
    role: "channel",
    title: "Square and Yard — agent",
    email: "ag-sy1@dukia.local",
    password: "AtlasLocal-AGSY1",
  },
  {
    id: "u_ca_sbg",
    name: "L. Saxena",
    role: "channel_admin",
    title: "SBG Sales Group — company admin",
    email: "ca-sbg@dukia.local",
    password: "AtlasLocal-CASBG",
  },
  {
    id: "u_ag_sbg1",
    name: "P. Rathi",
    role: "channel",
    title: "SBG Sales Group — agent",
    email: "ag-sbg1@dukia.local",
    password: "AtlasLocal-AGSBG1",
  },
];

export const DUKIA_ENTITIES: LegalEntity[] = [
  { id: "le_mgb", name: "MGB PRIME ESTATES LLP", kind: "LLP", gstin: "08AAGCM1111A1Z5" },
  { id: "le_sbc", name: "SATYAM BUILDCOM", kind: "Company", gstin: "08AASCS2222B1Z6" },
  { id: "le_scn", name: "SATYAM CONSTRUCTION", kind: "Company", gstin: "08AASCS3333C1Z7" },
];

export const DUKIA_PROJECTS: Project[] = [
  {
    id: "p_av",
    entityId: "le_sbc",
    name: "Aerovista",
    code: "AV-01",
    city: "Jaipur",
    type: "residential",
    status: "planning",
    budget: 980_000_000,
    spent: 0,
    progress: 0,
    units: 119,
    sold: 0,
    start: "2024-06-01",
    possession: "2026-11-30",
    forecast: 0,
    concept: true,
    constructionStart: "2024-10-01",
    constructionEnd: "2026-10-31",
    exclusivePartnerId: "pt_ap",
  },
  {
    id: "p_sf",
    entityId: "le_scn",
    name: "Sunflower",
    code: "SF-01",
    city: "Jaipur",
    type: "residential",
    status: "planning",
    budget: 240_000_000,
    spent: 0,
    progress: 0,
    units: 53,
    sold: 0,
    start: "2025-01-01",
    possession: "2026-06-30",
    forecast: 0,
    concept: true,
    constructionStart: "2025-04-01",
    constructionEnd: "2026-06-14",
    exclusivePartnerId: "pt_sy",
  },
  {
    id: "p_ac",
    entityId: "le_mgb",
    name: "Acropolis",
    code: "AC-01",
    city: "Jaipur",
    type: "residential",
    status: "planning",
    budget: 1_620_000_000,
    spent: 0,
    progress: 0,
    units: 184,
    sold: 0,
    start: "2025-03-01",
    possession: "2027-11-30",
    forecast: 0,
    concept: true,
    constructionStart: "2025-06-02",
    constructionEnd: "2027-10-31",
    exclusivePartnerId: "pt_sbg",
  },
];

export const DUKIA_PARTNERS: Partner[] = [
  {
    id: "pt_ap",
    name: "Aadhaar Prime",
    city: "Jaipur",
    gstin: "08AAAAP1111A1Z1",
    status: "active",
    rate: 3,
  },
  {
    id: "pt_sy",
    name: "Square and Yard",
    city: "Jaipur",
    gstin: "08AAAAS2222B1Z2",
    status: "active",
    rate: 2.5,
  },
  {
    id: "pt_sbg",
    name: "SBG Sales Group",
    city: "Jaipur",
    gstin: "08AAAAB3333C1Z3",
    status: "active",
    rate: 4,
  },
];

export const DUKIA_AGENTS: SalesAgent[] = [
  {
    id: "ag_ap1",
    name: "V. Meena",
    phone: "98xxxx3301",
    companyId: "pt_ap",
    userId: "u_ag_ap1",
    inHouse: false,
    status: "active",
  },
  {
    id: "ag_ap2",
    name: "S. Qureshi",
    phone: "97xxxx1188",
    companyId: "pt_ap",
    userId: "u_ag_ap2",
    inHouse: false,
    status: "active",
  },
  {
    id: "ag_ca_ap",
    name: "K. Pink",
    phone: "91xxxx2201",
    companyId: "pt_ap",
    userId: "u_ca_ap",
    inHouse: false,
    status: "active",
  },
  {
    id: "ag_sy1",
    name: "R. Shekhawat",
    phone: "96xxxx4410",
    companyId: "pt_sy",
    userId: "u_ag_sy1",
    inHouse: false,
    status: "active",
  },
  {
    id: "ag_ca_sy",
    name: "D. Rathi",
    phone: "93xxxx5510",
    companyId: "pt_sy",
    userId: "u_ca_sy",
    inHouse: false,
    status: "active",
  },
  {
    id: "ag_sbg1",
    name: "P. Rathi",
    phone: "95xxxx6601",
    companyId: "pt_sbg",
    userId: "u_ag_sbg1",
    inHouse: false,
    status: "active",
  },
  {
    id: "ag_ca_sbg",
    name: "L. Saxena",
    phone: "94xxxx7701",
    companyId: "pt_sbg",
    userId: "u_ca_sbg",
    inHouse: false,
    status: "active",
  },
  {
    id: "ag_sm",
    name: "N. Bhatia",
    phone: "90xxxx2200",
    userId: "u_sm",
    inHouse: true,
    status: "active",
  },
  {
    id: "ag_sm_av",
    name: "A. Joshi",
    phone: "95xxxx1180",
    userId: "u_sm_av",
    inHouse: true,
    status: "active",
  },
  {
    id: "ag_sm_ac",
    name: "L. Bansal",
    phone: "92xxxx2280",
    userId: "u_sm_ac",
    inHouse: true,
    status: "active",
  },
  {
    id: "ag_sm_sf",
    name: "P. Mathur",
    phone: "91xxxx3380",
    userId: "u_sm_sf",
    inHouse: true,
    status: "active",
  },
];

export const DUKIA_TOWERS: Tower[] = [
  { id: "tw_av_a", projectId: "p_av", name: "Aerovista Tower A (2BHK)", kind: "tower" },
  { id: "tw_av_b", projectId: "p_av", name: "Aerovista Tower B (3BHK)", kind: "tower" },
  { id: "tw_sf_a", projectId: "p_sf", name: "Sunflower A (2BHK)", kind: "tower" },
  { id: "tw_sf_b", projectId: "p_sf", name: "Sunflower B (3BHK)", kind: "tower" },
  { id: "tw_ac_a", projectId: "p_ac", name: "Acropolis Tower A", kind: "tower" },
  { id: "tw_ac_b", projectId: "p_ac", name: "Acropolis Tower B", kind: "tower" },
];

function pad(n: number, w = 2) {
  return String(n).padStart(w, "0");
}

function flats(
  prefix: string,
  projectId: string,
  towerId: string,
  count: number,
  perFloor: number,
  price: (i: number, floor: number) => number,
  area: string,
): InventoryUnit[] {
  const out: InventoryUnit[] = [];
  for (let i = 1; i <= count; i++) {
    const floor = Math.ceil(i / perFloor);
    const stack = ((i - 1) % perFloor) + 1;
    out.push({
      id: `un_${prefix}_${i}`,
      projectId,
      towerId,
      code: `${prefix}-${pad(floor)}${pad(stack)}`,
      kind: "flat",
      floor: String(floor),
      area,
      price: price(i, floor),
      status: "available",
    });
  }
  return out;
}

export const DUKIA_UNITS: InventoryUnit[] = [
  ...flats("AVA", "p_av", "tw_av_a", 26, 4, () => 4_500_000, "1050 sqft"),
  ...flats("AVB", "p_av", "tw_av_b", 93, 4, () => 10_000_000, "1650 sqft"),
  ...flats("SFA", "p_sf", "tw_sf_a", 30, 4, () => 4_500_000, "980 sqft"),
  ...flats("SFB", "p_sf", "tw_sf_b", 23, 4, () => 5_000_000, "1280 sqft"),
  ...flats("ACA", "p_ac", "tw_ac_a", 92, 4, (_i, floor) => 8_000_000 + floor * 70_000, "1750 sqft"),
  ...flats("ACB", "p_ac", "tw_ac_b", 92, 4, (_i, floor) => 8_200_000 + floor * 80_000, "1820 sqft"),
];

/** Aerovista land is in diligence at run start (Jun 2024). Others identified only. */
export const DUKIA_PARCELS: LandParcel[] = [
  {
    id: "lp_av",
    projectId: "p_av",
    name: "Muhana Mandi khasra 41/2 — Aerovista",
    khasra: "41/2",
    area: "3600 sq yd",
    status: "diligence",
    rera: "RAJ/P/2024/2144",
    loan: 0,
  },
  {
    id: "lp_sf",
    projectId: "p_sf",
    name: "Patrakar Colony khasra 9 — Sunflower",
    khasra: "9",
    area: "1000 sq yd",
    status: "identified",
    rera: "RAJ/P/2025/0088",
    loan: 0,
  },
  {
    id: "lp_ac",
    projectId: "p_ac",
    name: "Mansarovar khasra 112/3 — Acropolis",
    khasra: "112/3",
    area: "6000 sq yd",
    status: "identified",
    rera: "RAJ/P/2025/0312",
    loan: 0,
  },
];

export const DUKIA_DILIGENCE: DiligenceItem[] = [
  { id: "dd_av1", parcelId: "lp_av", title: "Title search — 30 year", status: "open" },
  { id: "dd_av2", parcelId: "lp_av", title: "Encumbrance certificate", status: "open" },
  { id: "dd_av3", parcelId: "lp_av", title: "Conversion / CLU", status: "open" },
  { id: "dd_av4", parcelId: "lp_av", title: "Mutation in revenue record", status: "open" },
  { id: "dd_av5", parcelId: "lp_av", title: "Access road NOC", status: "open" },
];

export const DUKIA_OBLIGATIONS: Obligation[] = [];

export const DUKIA_FUNDING: FundingSanction[] = [
  {
    id: "fs_av",
    projectId: "p_av",
    bank: "SBI",
    sanctionNo: "SBI/JPR/AV/2024/014",
    loanPct: 60,
    equityPct: 40,
    amount: 588_000_000,
    status: "sanctioned",
    sanctionedAt: "2024-07-15",
  },
  {
    id: "fs_sf",
    projectId: "p_sf",
    bank: "AU Small Finance Bank",
    sanctionNo: "AU/JPR/SF/2025/008",
    loanPct: 60,
    equityPct: 40,
    amount: 144_000_000,
    status: "sanctioned",
    sanctionedAt: "2025-02-03",
  },
  {
    id: "fs_ac",
    projectId: "p_ac",
    bank: "SBI",
    sanctionNo: "SBI/JPR/AC/2025/031",
    loanPct: 60,
    equityPct: 40,
    amount: 972_000_000,
    status: "sanctioned",
    sanctionedAt: "2025-04-07",
  },
];

export const DUKIA_VENDORS: Vendor[] = [
  {
    id: "v_civ",
    name: "Shakti Earthworks",
    trade: "Structure / civil",
    stage: "invited",
    gstin: "—",
    city: "Jaipur",
  },
  {
    id: "v_pnt",
    name: "Jaipur Colour Works",
    trade: "Painting",
    stage: "invited",
    gstin: "—",
    city: "Jaipur",
  },
  {
    id: "v_plb",
    name: "Marwar Plumbing",
    trade: "Plumbing",
    stage: "invited",
    gstin: "—",
    city: "Jaipur",
  },
  {
    id: "v_til",
    name: "Rajputana Stones",
    trade: "Tiles / granite / marble",
    stage: "invited",
    gstin: "—",
    city: "Jaipur",
  },
  {
    id: "v_elc",
    name: "Pink City Electricals",
    trade: "Electrical",
    stage: "invited",
    gstin: "—",
    city: "Jaipur",
  },
  {
    id: "v_lft",
    name: "Aravali Lifts",
    trade: "Elevators",
    stage: "invited",
    gstin: "—",
    city: "Jaipur",
  },
  {
    id: "v_fin",
    name: "Desert Finishers",
    trade: "Other finishing",
    stage: "invited",
    gstin: "—",
    city: "Jaipur",
  },
];

export const DUKIA_MATERIALS: MaterialItem[] = [
  { id: "m_av_tmt", projectId: "p_av", name: "TMT 12mm", unit: "t", received: 0, issued: 0 },
  { id: "m_av_opc", projectId: "p_av", name: "OPC 53", unit: "bag", received: 0, issued: 0 },
  { id: "m_sf_tmt", projectId: "p_sf", name: "TMT 12mm", unit: "t", received: 0, issued: 0 },
  { id: "m_ac_tmt", projectId: "p_ac", name: "TMT 12mm", unit: "t", received: 0, issued: 0 },
];

export const DUKIA_DOCUMENTS: Document[] = [];
export const DUKIA_RFQS: Rfq[] = [];
export const DUKIA_QUOTES: Quote[] = [];
export const DUKIA_POS: PurchaseOrder[] = [];
export const DUKIA_CONTRACTS: Contract[] = [];
export const DUKIA_APPROVALS: Approval[] = [];
export const DUKIA_DIARIES: DiaryEntry[] = [];
export const DUKIA_INSPECTIONS: Inspection[] = [];
export const DUKIA_CHANGES: ChangeItem[] = [];
export const DUKIA_BOOKINGS: Booking[] = [];
export const DUKIA_TALLY: TallyCase[] = [];
export const DUKIA_EXPORTS: {
  id: string;
  documentId: string;
  revision: string;
  status: "pending";
  requestedBy: string;
  createdAt: string;
}[] = [];
