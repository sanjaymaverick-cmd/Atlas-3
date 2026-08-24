import type {
  Approval,
  AuditEvent,
  Booking,
  ChangeItem,
  Contract,
  DiaryEntry,
  Document,
  Inspection,
  LegalEntity,
  OwnerDecision,
  Project,
  PurchaseOrder,
  TallyCase,
  User,
  Vendor,
  Rfq,
  Quote,
} from "./types";

export const USERS: User[] = [
  { id: "u_owner", name: "S. Mehta", role: "owner", title: "Managing Director", email: "md@atlas.local", password: "AtlasLocal-MD" },
  { id: "u_pm", name: "R. Sharma", role: "pm", title: "Project Director", email: "pd@atlas.local", password: "AtlasLocal-PD" },
  { id: "u_eng", name: "K. Rathore", role: "engineer", title: "Site Engineer", email: "se@atlas.local", password: "AtlasLocal-SE" },
  { id: "u_sup", name: "D. Chauhan", role: "supervisor", title: "Site Supervisor", email: "sv@atlas.local", password: "AtlasLocal-SV" },
  { id: "u_acc", name: "P. Jain", role: "accountant", title: "Finance Lead", email: "fl@atlas.local", password: "AtlasLocal-FL" },
  { id: "u_com", name: "A. Kapoor", role: "commercial", title: "Commercial Manager", email: "cm@atlas.local", password: "AtlasLocal-CM" },
  { id: "u_sales", name: "N. Bhatia", role: "sales", title: "Sales Manager", email: "sm@atlas.local", password: "AtlasLocal-SM" },
  { id: "u_legal", name: "M. Iyer", role: "legal", title: "Land & Legal", email: "ll@atlas.local", password: "AtlasLocal-LL" },
  { id: "u_docs", name: "T. Joseph", role: "docs", title: "Document Controller", email: "dc@atlas.local", password: "AtlasLocal-DC" },
  { id: "u_stores", name: "H. Singh", role: "stores", title: "Stores / QS", email: "st@atlas.local", password: "AtlasLocal-ST" },
  { id: "u_ch", name: "V. Meena", role: "channel", title: "Channel agent (Pink City)", email: "ag@atlas.local", password: "AtlasLocal-AG" },
  { id: "u_ca", name: "K. Pink", role: "channel_admin", title: "Pink City company admin", email: "ca@atlas.local", password: "AtlasLocal-CA" },
  // Second holders of the same seat. One person, one login — so the audit trail
  // can tell three supervisors apart and four-eyes works between same-role peers.
  { id: "u_pm2", name: "V. Nair", role: "pm", title: "Project Director (Aravalli)", email: "pd2@atlas.local", password: "AtlasLocal-PD2" },
  { id: "u_eng2", name: "S. Bisht", role: "engineer", title: "Site Engineer (Aravalli)", email: "se2@atlas.local", password: "AtlasLocal-SE2" },
  { id: "u_sup2", name: "B. Lal", role: "supervisor", title: "Site Supervisor (Tower B)", email: "sv2@atlas.local", password: "AtlasLocal-SV2" },
  { id: "u_sup3", name: "G. Verma", role: "supervisor", title: "Site Supervisor (night shift)", email: "sv3@atlas.local", password: "AtlasLocal-SV3" },
  { id: "u_sales2", name: "A. Joshi", role: "sales", title: "Sales Manager (channel desk)", email: "sm2@atlas.local", password: "AtlasLocal-SM2" },
  { id: "u_ch2", name: "S. Qureshi", role: "channel", title: "Channel agent 2 (Pink City)", email: "ag2@atlas.local", password: "AtlasLocal-AG2" },
  { id: "u_ch3", name: "R. Shekhawat", role: "channel", title: "Channel agent (Desert Reach)", email: "ag4@atlas.local", password: "AtlasLocal-AG4" },
  { id: "u_ca2", name: "D. Rathi", role: "channel_admin", title: "Desert Reach company admin", email: "ca2@atlas.local", password: "AtlasLocal-CA2" },
  { id: "u_test", name: "UAT Tester", role: "owner", title: "Test owner (local only)", email: "test@atlas.local", password: "AtlasLocal-UAT" },
];

export const ENTITIES: LegalEntity[] = [
  { id: "le_homes", name: "Aravalli Homes Pvt Ltd", kind: "Company", gstin: "08AABCA1234P1Z5" },
  { id: "le_llp", name: "Kanakpura Developers LLP", kind: "LLP", gstin: "08AADCK7788Q1Z2" },
];

export const PROJECTS: Project[] = [
  {
    id: "p_kanak",
    entityId: "le_llp",
    name: "Kanakpura Residences",
    code: "KPR-01",
    city: "Jaipur",
    type: "residential",
    status: "construction",
    budget: 480_000_000,
    spent: 214_000_000,
    progress: 42,
    units: 128,
    sold: 61,
    start: "2024-11-01",
    possession: "2027-03-31",
    forecast: 180_000_000,
    concept: false,
  },
  {
    id: "p_baggad",
    entityId: "le_homes",
    name: "Baggad Heights",
    code: "BGH-02",
    city: "Baggad",
    type: "mixed",
    status: "planning",
    budget: 720_000_000,
    spent: 81_000_000,
    progress: 18,
    units: 86,
    sold: 12,
    start: "2025-06-15",
    possession: "2028-09-30",
    forecast: 40_000_000,
    concept: true,
  },
  {
    id: "p_mansar",
    entityId: "le_homes",
    name: "Mansarovar Enclave",
    code: "MSE-03",
    city: "Jaipur",
    type: "residential",
    status: "handover",
    budget: 360_000_000,
    spent: 298_000_000,
    progress: 78,
    units: 96,
    sold: 88,
    start: "2023-02-01",
    possession: "2026-12-15",
    forecast: 12_000_000,
    concept: false,
  },
];

export const DOCUMENTS: Document[] = [
  {
    id: "d1",
    projectId: "p_kanak",
    title: "Architectural GA — Tower A",
    kind: "Drawing",
    revision: "R4",
    classification: "internal",
    status: "issued",
    uploadedAt: "2026-07-12",
    sha256: "a91c4e2b77d0f1aa9c88b4012e7d3f10",
    pages: 6,
    sheet: "A-GA-01",
    revisions: [
      { id: "r1a", revision: "R3", sha256: "11aa22bb33cc44dd55ee66ff77889900", uploadedAt: "2026-05-02", uploadedBy: "R. Sharma", notes: "Core walls adjusted" },
      { id: "r1b", revision: "R4", sha256: "a91c4e2b77d0f1aa9c88b4012e7d3f10", uploadedAt: "2026-07-12", uploadedBy: "R. Sharma", notes: "Lift overrun + terrace plan" },
    ],
  },
  {
    id: "d2",
    projectId: "p_kanak",
    title: "JDA Layout Approval",
    kind: "Statutory",
    revision: "R1",
    classification: "restricted",
    status: "approved",
    uploadedAt: "2026-04-03",
    sha256: "c0ffee12deadbeef4a11b0a7c0de0001",
    pages: 18,
    sheet: "JDA-LY-01",
    revisions: [
      { id: "r2a", revision: "R1", sha256: "c0ffee12deadbeef4a11b0a7c0de0001", uploadedAt: "2026-04-03", uploadedBy: "S. Mehta", notes: "Original scanned set" },
    ],
  },
  {
    id: "d3",
    projectId: "p_baggad",
    title: "Soil Investigation Report",
    kind: "Report",
    revision: "R2",
    classification: "confidential",
    status: "issued",
    uploadedAt: "2026-06-21",
    sha256: "5e1f0c99ab77d2018e44c3b190aa7712",
    pages: 42,
    sheet: "GEO-01",
    revisions: [
      { id: "r3a", revision: "R2", sha256: "5e1f0c99ab77d2018e44c3b190aa7712", uploadedAt: "2026-06-21", uploadedBy: "R. Sharma", notes: "Bore logs 1–9" },
    ],
  },
  {
    id: "d4",
    projectId: "p_mansar",
    title: "RERA Registration Certificate",
    kind: "Statutory",
    revision: "R1",
    classification: "restricted",
    status: "issued",
    uploadedAt: "2023-03-18",
    sha256: "0b1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f",
    pages: 4,
    sheet: "RERA-01",
    revisions: [
      { id: "r4a", revision: "R1", sha256: "0b1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f", uploadedAt: "2023-03-18", uploadedBy: "P. Jain", notes: "Certificate as issued" },
    ],
  },
  {
    id: "d5",
    projectId: "p_kanak",
    title: "Waterproofing Spec — Podium",
    kind: "Spec",
    revision: "R3",
    classification: "internal",
    status: "review",
    uploadedAt: "2026-08-14",
    sha256: "77aa11bb22cc33dd44ee55ff66778899",
    pages: 11,
    sheet: "SP-WP-03",
    revisions: [
      { id: "r5a", revision: "R3", sha256: "77aa11bb22cc33dd44ee55ff66778899", uploadedAt: "2026-08-14", uploadedBy: "K. Rathore", notes: "Membrane brand change" },
    ],
  },
  {
    id: "d6",
    projectId: "p_kanak",
    title: "Tower B raft scan — 21 Aug",
    kind: "Drawing",
    revision: "R0",
    classification: "internal",
    status: "quarantine",
    uploadedAt: "2026-08-21",
    sha256: "pending-scan",
    pages: 2,
    sheet: "SITE-SCAN",
    revisions: [
      { id: "r6a", revision: "R0", sha256: "pending-scan", uploadedAt: "2026-08-21", uploadedBy: "K. Rathore", notes: "Field capture — awaiting malware scan" },
    ],
  },
];

export const EXPORTS_SEED = [
  {
    id: "exp_seed",
    documentId: "d2",
    revision: "R1",
    status: "pending" as const,
    requestedBy: "R. Sharma",
    createdAt: "2026-08-21",
  },
];

export const VENDORS: Vendor[] = [
  { id: "v1", name: "Shakti Earthworks", trade: "Civil / excavation", stage: "active", gstin: "08AASFE2211C1Z8", city: "Jaipur" },
  { id: "v2", name: "Marwar Steel Traders", trade: "TMT / structural steel", stage: "approval", gstin: "08AAMMS4402D1Z1", city: "Jodhpur" },
  { id: "v3", name: "Pink City Electricals", trade: "MEP electrical", stage: "active", gstin: "08AAPCE9090E1Z6", city: "Jaipur" },
  { id: "v4", name: "Aravalli Waterproofing", trade: "Waterproofing", stage: "invited", gstin: "—", city: "Udaipur" },
];

export const POS: PurchaseOrder[] = [
  { id: "po_1018", projectId: "p_kanak", vendorId: "v1", title: "Excavation — Tower B", amount: 4_800_000, status: "executed", createdAt: "2026-05-02" },
  { id: "po_1042", projectId: "p_kanak", vendorId: "v3", title: "Lift package — 4 cars", amount: 18_400_000, status: "review", createdAt: "2026-08-09", quoteId: "q1", rfqId: "rfq1" },
  { id: "po_1048", projectId: "p_mansar", vendorId: "v3", title: "DG set commissioning", amount: 2_150_000, status: "approved", createdAt: "2026-07-28" },
];

export const CONTRACTS: Contract[] = [
  { id: "c1", projectId: "p_kanak", vendorId: "v1", title: "Civil works — Phase 1", value: 86_000_000, status: "executed" },
  { id: "c2", projectId: "p_kanak", vendorId: "v3", title: "Electrical package", value: 24_500_000, status: "approved" },
  { id: "c3", projectId: "p_baggad", vendorId: "v1", title: "Site grading & roads", value: 12_200_000, status: "draft" },
];

export const APPROVALS: Approval[] = [
  { id: "a1", kind: "Purchase order", title: "PO-1042 Lift package — 4 cars", projectId: "p_kanak", amount: 18_400_000, waitingOn: "Managing Director", agingDays: 6, status: "pending", refId: "po_1042", context: "Selected quote · Pink City Electricals · 3 quotes received · RFQ-LIFT-01" },
  { id: "a2", kind: "Change", title: "VO-19 Plumbing reroute — Block B", projectId: "p_kanak", amount: 1_260_000, waitingOn: "Project Director", agingDays: 3, status: "pending", context: "Kanakpura · Block B wet areas · design response pending site measure" },
  { id: "a3", kind: "Document export", title: "JDA layout — original download", projectId: "p_kanak", waitingOn: "Four-eyes approver", agingDays: 1, status: "pending", refId: "exp_seed", context: "Restricted statutory · requested by R. Sharma · single-use grant" },
  { id: "a4", kind: "Vendor", title: "Activate Marwar Steel Traders", projectId: "p_baggad", waitingOn: "Managing Director", agingDays: 9, status: "pending", refId: "v2", context: "Onboarding complete · GSTIN on file · waiting on Managing Director" },
  { id: "a5", kind: "Payment", title: "RA-07 Shakti Earthworks", projectId: "p_kanak", amount: 6_400_000, waitingOn: "Finance Lead", agingDays: 2, status: "pending", context: "Against PO-1018 · excavation Tower B · company-accounts case linked" },
];

export const RFQS: Rfq[] = [
  { id: "rfq1", projectId: "p_kanak", title: "Lift package — 4 cars", package: "Vertical transport", due: "2026-08-05", status: "awarded", required: true },
  { id: "rfq2", projectId: "p_kanak", title: "Podium waterproofing membrane", package: "Waterproofing", due: "2026-08-28", status: "open", required: true },
  { id: "rfq3", projectId: "p_baggad", title: "Site grading & roads", package: "Civil earthworks", due: "2026-09-15", status: "open", required: false },
];

export const QUOTES: Quote[] = [
  { id: "q1", rfqId: "rfq1", vendorId: "v3", amount: 18_400_000, validity: "2026-09-30", exclusions: "Shaft civil by client; AMC year 2 optional", status: "selected", submittedAt: "2026-08-01" },
  { id: "q2", rfqId: "rfq1", vendorId: "v1", amount: 19_100_000, validity: "2026-09-15", exclusions: "Machine room fit-out excluded", status: "rejected", submittedAt: "2026-08-02" },
  { id: "q3", rfqId: "rfq1", vendorId: "v3", amount: 17_900_000, validity: "2026-08-20", exclusions: "Expired alternate — not selectable", status: "rejected", submittedAt: "2026-07-28" },
  { id: "q4", rfqId: "rfq2", vendorId: "v4", amount: 3_200_000, validity: "2026-09-30", exclusions: "Vendor not Active — cannot select", status: "submitted", submittedAt: "2026-08-18" },
  { id: "q5", rfqId: "rfq2", vendorId: "v1", amount: 2_950_000, validity: "2026-10-15", exclusions: "Trial bay included; 10yr warranty", status: "submitted", submittedAt: "2026-08-19" },
  { id: "q6", rfqId: "rfq3", vendorId: "v1", amount: 11_800_000, validity: "2026-10-01", exclusions: "Rock excavation provisional", status: "submitted", submittedAt: "2026-08-12" },
];

export const DIARIES: DiaryEntry[] = [
  { id: "dy1", projectId: "p_kanak", date: "2026-08-21", weather: "Clear, 38°C", labour: 142, work: "Tower A L12 slab shuttering; Tower B raft steel 60%.", materials: "TMT 18t received. Cement 420 bags consumed.", safety: "No incidents. Toolbox talk on edge protection.", author: "K. Rathore", deviceKey: "eng-a1-2026-08-21" },
  { id: "dy2", projectId: "p_kanak", date: "2026-08-20", weather: "Dust, 36°C", labour: 128, work: "Podium waterproofing trial bay. Block B plumbing chase.", materials: "Membrane 240 sqm issued.", safety: "Near-miss: unsecured ladder — closed same day.", author: "K. Rathore", deviceKey: "eng-a1-2026-08-20" },
  { id: "dy3", projectId: "p_mansar", date: "2026-08-21", weather: "Clear", labour: 46, work: "Snag close-out Tower C floors 3–5. Paint touch-up.", materials: "Touch-up paint 18 L.", safety: "Nil.", author: "K. Rathore", deviceKey: "eng-m1-2026-08-21" },
];

export const INSPECTIONS: Inspection[] = [
  { id: "i1", projectId: "p_kanak", template: "RCC pour — slab", location: "Tower A L12", result: "pending", date: "2026-08-22" },
  { id: "i2", projectId: "p_kanak", template: "Waterproofing", location: "Podium bay 2", result: "fail", date: "2026-08-19" },
  { id: "i3", projectId: "p_mansar", template: "Door & hardware", location: "C-304", result: "pass", date: "2026-08-18" },
];

export const CHANGES: ChangeItem[] = [
  { id: "ch1", projectId: "p_kanak", kind: "rfi", title: "Beam-column clash at grid C/4", status: "routed", slaHours: 18 },
  { id: "ch2", projectId: "p_kanak", kind: "ncr", title: "Hollow tiles — Tower A lobby", status: "corrective", severity: "medium" },
  { id: "ch3", projectId: "p_kanak", kind: "change", title: "VO-19 Plumbing reroute Block B", status: "review" },
  { id: "ch4", projectId: "p_mansar", kind: "ncr", title: "Window leak C-512", status: "reinspection", severity: "high" },
];

export const BOOKINGS: Booking[] = [
  { id: "b1", projectId: "p_kanak", unit: "A-1204", customer: "V. Agarwal", customerId: "cu1", value: 8_450_000, collected: 3_380_000, status: "active" },
  { id: "b2", projectId: "p_kanak", unit: "B-0302", customer: "N. Khandelwal", customerId: "cu2", value: 6_920_000, collected: 6_920_000, status: "active" },
  { id: "b3", projectId: "p_mansar", unit: "C-304", customer: "S. Bhargava", customerId: "cu3", value: 5_150_000, collected: 5_150_000, status: "possession" },
  { id: "b4", projectId: "p_baggad", unit: "P-101", customer: "G. Singh", customerId: "cu4", value: 11_200_000, collected: 1_120_000, status: "active" },
];

export const TALLY: TallyCase[] = [
  { id: "t1", entityId: "le_llp", title: "ERP invoice missing in company accounts — PO-1018 RA-06", amount: 1_840_000, status: "open" },
  { id: "t2", entityId: "le_homes", title: "Amount mismatch — customer receipt C-304", amount: 50_000, status: "review" },
  { id: "t3", entityId: "le_llp", title: "Wrong project allocation — cement bill Aug", amount: 312_000, status: "reconciled" },
];

export const DECISIONS: OwnerDecision[] = [
  { id: "ai_hosting", title: "AI hosting model", detail: "Self-hosted open-weight model, or a commercial API under a zero-retention DPA. Blocks live Phase 11 inference.", status: "recorded", note: "Self-hosted open-weight model. No commercial inference API." },
  { id: "kms", title: "Key management product", detail: "Self-hosted HSM / Vault versus cloud KMS with customer-managed keys.", status: "recorded", note: "Self-hosted HSM / Vault. Keys do not leave our control." },
  { id: "rto_rpo", title: "RTO / RPO targets", detail: "Proposed 4-hour RTO, 15-minute database RPO, 24-hour document RPO.", status: "recorded", note: "Accepted: 4-hour RTO, 15-minute database RPO, 24-hour document RPO." },
  { id: "break_glass", title: "Break-glass holder", detail: "Name the sealed secondary owner-console credential holder and brief them.", status: "recorded", note: "Sealed secondary owner-console holder: Bhagwan Ram Bagriya. Brief required before first production cutover." },
  { id: "warm_standby", title: "Warm-standby location", detail: "Second physical site, independent failure domain. Quarterly restore drill cannot start until this exists.", status: "recorded", note: "Warm standby: Jaipur. Sites — Aerovista and Acropolis. Treat as independent failure domains. First quarterly restore drill can be scheduled against these two." },
  { id: "crm", title: "CRM build vs integrate", detail: "Lead funnel and channel-partner commissions: build inside Atlas or integrate a third party.", status: "recorded", note: "Build inside Atlas. Lead funnel and channel-partner commissions are first-class Atlas modules, not a third-party CRM." },
];

export const AUDIT: AuditEvent[] = [
  { id: "au1", at: "2026-08-21T18:12:00+05:30", actor: "K. Rathore", action: "Created site diary", entity: "Kanakpura Residences" },
  { id: "au2", at: "2026-08-21T11:04:00+05:30", actor: "R. Sharma", action: "Submitted PO-1042 for approval", entity: "Lift package" },
  { id: "au3", at: "2026-08-20T16:40:00+05:30", actor: "S. Mehta", action: "Issued drawing revision R4", entity: "Tower A GA" },
];
