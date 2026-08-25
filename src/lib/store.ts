import { create } from "zustand";
import { persist } from "zustand/middleware";
import { sha256demo } from "./hash";
import {
  APPROVALS,
  AUDIT,
  BOOKINGS,
  CHANGES,
  CONTRACTS,
  DECISIONS,
  DIARIES,
  DOCUMENTS,
  ENTITIES,
  EXPORTS_SEED,
  INSPECTIONS,
  POS,
  PROJECTS,
  QUOTES,
  RFQS,
  TALLY,
  USERS,
  VENDORS,
} from "./seed";
import {
  BUDGET_LINES,
  DILIGENCE,
  EMIS,
  MATERIALS,
  NOTES,
  OBLIGATIONS,
  PARCELS,
  QUANTITIES,
  OWNER_TODOS,
  FUNDING,
} from "./extra-seed";
import { COMMISSIONS, HOSTS, LEADS, PARTNERS, PAYMENTS, SNAGS } from "./crm-seed";
import {
  AGENTS,
  CUSTOMERS,
  BOOKING_DOCS,
  DAILY_REPORTS,
  HANDOVERS,
  HOLDS,
  LEAD_ACTIVITIES,
  LEAD_FEATURES,
  SCORE_HISTORY,
  SCORE_MODELS,
  SITE_VISITS,
  TOWERS,
  UNIT_EVENTS,
  UNITS,
  INBOUND,
  WA_TEMPLATES,
  WA_SENDS,
} from "./sales-seed";
import { scoreLead } from "./sales-score";
import { score as scoreNative } from "./sales/scoring";
import { refuseBook, refuseHold } from "./sales/inventory";
import { refuseDailyReport, refuseHoldWithoutReport } from "./sales/channel";
import { findDuplicate, ingestErrorToResult, normalizePhone } from "./sales/ingest";
import type { IngestRequest, IngestResult } from "./sales/ingest";
import { STAGE_NEXT } from "./sales/stages";
import {
  fillTemplate,
  leadValues,
  readReply,
  refuseSend,
  templateByTrigger,
} from "./sales/whatsapp";
import type {
  Approval,
  AuditEvent,
  Booking,
  Customer,
  ChangeItem,
  Contract,
  DecisionId,
  DiaryEntry,
  DocClass,
  DocKind,
  Document,
  ExportGrant,
  Inspection,
  LegalEntity,
  OwnerDecision,
  Project,
  PurchaseOrder,
  Role,
  TallyCase,
  User,
  Vendor,
  LandParcel,
  DiligenceItem,
  Obligation,
  Emi,
  BudgetLine,
  MaterialItem,
  QuantityItem,
  AssistantNote,
  Partner,
  Lead,
  Commission,
  PaymentStep,
  Snag,
  HostSite,
  Rfq,
  Quote,
  OwnerTodo,
  InventoryUnit,
  Tower,
  SalesAgent,
  DailyReport,
  UnitHold,
  LeadActivity,
  HandoverCase,
  UnitEvent,
  UnitStatus,
  ScoringModel,
  LeadFeatureRow,
  LeadScoreHistory,
  SiteVisit,
  BookingDoc,
  ScoreModelKind,
  ScoreBand,
  InboundEvent,
  WaTemplate,
  WaSend,
  SalesNotice,
  FundingSanction,
  ParcelAcquireDetails,
  Drawing,
  QuoteSource,
} from "./types";
import { STANDARD_DILIGENCE } from "./diligence-pack";
import { PO_VENDOR_NOT_ACTIVE, CHALLAN_REQUIRED } from "./gates";
import { pickNextUnit } from "./unit-pick";
import { ensureVendorActivationCards, VENDOR_NEXT, vendorApprovalCard } from "./vendor-flow";
import { addDaysIso, nowIso, registerClock, todayIso, uid } from "./utils";
import type { CompanyDayReport } from "./company-day";

interface AtlasState {
  user: User | null;
  /** Company-trial clock. `null` = real time. ISO `YYYY-MM-DD` pins every "today". */
  simDate: string | null;
  entityId: string;
  projectId: string | "all";
  entityByUser: Record<string, string>;
  fundingSanctions: FundingSanction[];
  drawings: Drawing[];
  users: User[];
  entities: LegalEntity[];
  projects: Project[];
  documents: Document[];
  exports: ExportGrant[];
  parcels: LandParcel[];
  diligence: DiligenceItem[];
  obligations: Obligation[];
  emis: Emi[];
  budgetLines: BudgetLine[];
  materials: MaterialItem[];
  quantities: QuantityItem[];
  notes: AssistantNote[];
  partners: Partner[];
  leads: Lead[];
  commissions: Commission[];
  payments: PaymentStep[];
  snags: Snag[];
  hosts: HostSite[];
  towers: Tower[];
  units: InventoryUnit[];
  unitEvents: UnitEvent[];
  agents: SalesAgent[];
  customers: Customer[];
  dailyReports: DailyReport[];
  holds: UnitHold[];
  leadActivities: LeadActivity[];
  handovers: HandoverCase[];
  scoreModels: ScoringModel[];
  leadFeatures: LeadFeatureRow[];
  scoreHistory: LeadScoreHistory[];
  siteVisits: SiteVisit[];
  bookingDocs: BookingDoc[];
  activeScoreModel: ScoreModelKind;
  inbound: InboundEvent[];
  waTemplates: WaTemplate[];
  waSends: WaSend[];
  notices: SalesNotice[];
  vendors: Vendor[];
  rfqs: Rfq[];
  quotes: Quote[];
  pos: PurchaseOrder[];
  contracts: Contract[];
  approvals: Approval[];
  diaries: DiaryEntry[];
  inspections: Inspection[];
  changes: ChangeItem[];
  bookings: Booking[];
  tally: TallyCase[];
  decisions: OwnerDecision[];
  ownerTodos: OwnerTodo[];
  audit: AuditEvent[];
  signIn: (role: Role) => void;
  signInLocal: (email: string, password: string) => string | null;
  signOut: () => void;
  setSimDate: (iso: string | null) => void;
  setEntity: (id: string) => void;
  setProject: (id: string | "all") => void;
  createProject: (p: Omit<Project, "id" | "spent" | "progress" | "sold">) => void;
  addDiary: (entry: Omit<DiaryEntry, "id" | "author">) => string | null;
  decideApproval: (id: string, status: "approved" | "rejected") => string | null;
  advanceVendor: (id: string) => string | null;
  inviteVendor: (input: { name: string; trade: string; city: string; gstin: string }) => void;
  scheduleInspection: (input: { projectId: string; template: string; location: string }) => void;
  cancelBooking: (id: string) => string | null;
  createPO: (input: {
    projectId: string;
    vendorId: string;
    title: string;
    amount: number;
    quoteId?: string;
    rfqId?: string;
  }) => string | null;
  createRfq: (input: {
    projectId: string;
    title: string;
    package: string;
    due: string;
    required?: boolean;
  }) => string | null;
  submitQuote: (input: {
    rfqId: string;
    vendorId: string;
    amount: number;
    validity: string;
    exclusions: string;
    source?: QuoteSource;
    taxAmount?: number;
    fileName?: string;
    fileKind?: string;
    fileSize?: number;
    fileDataUrl?: string;
    sha256?: string;
  }) => string | null;
  addDrawing: (input: {
    projectId: string;
    title: string;
    kind: Drawing["kind"];
    revision: string;
    status?: Drawing["status"];
    towerId?: string;
    fileName?: string;
    fileKind?: string;
    fileSize?: number;
    fileDataUrl?: string;
    sha256?: string;
  }) => string | null;
  selectQuote: (quoteId: string) => string | null;
  createPOFromQuote: (quoteId: string) => string | null;
  raiseChange: (item: Omit<ChangeItem, "id">) => void;
  addBooking: (b: Omit<Booking, "id" | "collected" | "status">) => string | null;
  collect: (bookingId: string, amount: number) => string | null;
  recordDecision: (id: DecisionId, note: string) => void;
  reopenDecision: (id: DecisionId) => void;
  registerDocument: (input: {
    projectId: string;
    title: string;
    kind: DocKind;
    classification: DocClass;
    sheet: string;
    fileName?: string;
  }) => void;
  clearQuarantine: (documentId: string) => string | null;
  issueDocument: (documentId: string) => string | null;
  addRevision: (documentId: string, notes: string) => string | null;
  requestExport: (documentId: string) => string | null;
  consumeExport: (grantId: string) => string | null;
  setDiligence: (id: string, status: DiligenceItem["status"]) => void;
  addDiligence: (input: { parcelId: string; title: string }) => string | null;
  fileObligation: (id: string, ack: string) => string | null;
  addParcel: (input: {
    projectId: string;
    name: string;
    khasra: string;
    area: string;
    rera: string;
  }) => string | null;
  addObligation: (input: {
    projectId: string;
    kind: Obligation["kind"];
    title: string;
    due: string;
  }) => string | null;
  payEmi: (id: string) => string | null;
  acquireParcel: (id: string, details?: ParcelAcquireDetails) => string | null;
  recordParcelDeed: (id: string, details: ParcelAcquireDetails) => string | null;
  startDiligencePack: (parcelId: string) => string | null;
  clearDiligencePack: (parcelId: string) => string | null;
  addFundingSanction: (
    input: Omit<FundingSanction, "id" | "status"> & { status?: FundingSanction["status"] },
  ) => string | null;
  bookNextAvailable: (
    projectId: string,
    opts?: { prefix?: string; towerId?: string; config?: string; customer?: string },
  ) => string | null;
  copyForwardDiary: (projectId: string) => string | null;
  setProjectLaunch: (
    projectId: string,
    input?: { exclusivePartnerId?: string; freezePrices?: boolean },
  ) => string | null;
  executeContract: (id: string, evidenceId: string) => string | null;
  receiveMaterial: (id: string, qty: number) => void;
  issueMaterial: (id: string, qty: number) => string | null;
  completeInspection: (id: string, result: "pass" | "fail") => string | null;
  respondChange: (id: string, response: string) => string | null;
  closeNcr: (id: string) => string | null;
  approveQuantity: (id: string) => string | null;
  markPossession: (id: string) => string | null;
  settleTally: (id: string, status: "reconciled" | "exception") => void;
  draftAdvice: (prompt: string) => string | null;
  addLead: (input: Omit<Lead, "id" | "stage">) => string | null;
  advanceLead: (id: string) => string | null;
  loseLead: (id: string) => void;
  convertLead: (id: string, value: number) => string | null;
  addPartner: (input: { name: string; city: string; gstin: string; rate: number }) => void;
  activatePartner: (id: string) => void;
  requestCommission: (id: string) => string | null;
  setVendorGstin: (id: string, gstin: string) => string | null;
  addSnag: (input: { projectId: string; unit: string; title: string }) => void;
  closeSnag: (id: string) => void;
  markHostReady: (id: string) => void;
  log: (action: string, entity: string) => void;
  companyDay: CompanyDayReport | null;
  runCompanyDay: () => Promise<CompanyDayReport>;
  holdUnit: (input: {
    unitId: string;
    agentId: string;
    customer: string;
    until: string;
  }) => string | null;
  releaseHold: (holdId: string) => string | null;
  bookHold: (holdId: string, value: number) => string | null;
  fileDailyReport: (input: {
    agentId: string;
    calls: number;
    visits: number;
    leads: number;
    holds?: number;
    bookings?: number;
    cancellations?: number;
    notes: string;
  }) => string | null;
  ingestLead: (
    input: Omit<Lead, "id" | "stage" | "score" | "band" | "scoreReasons" | "scoreModel">,
  ) => string | null;
  ingestFromRequest: (input: IngestRequest) => IngestResult;
  pullPortalJournal: () => Promise<{ pulled: number; errors: string[] }>;
  assignLead: (leadId: string, agentId: string) => string | null;
  rescoreLead: (leadId: string, activity?: string) => string | null;
  setUnitDispute: (unitId: string) => string | null;
  advanceHandover: (id: string) => string | null;
  setScoreModel: (kind: ScoreModelKind) => void;
  scheduleVisit: (input: { leadId: string; scheduled: string; note: string }) => string | null;
  completeVisit: (id: string, result: "done" | "no-show") => string | null;
  toggleBookingDoc: (id: string) => string | null;
  setHandoverOc: (id: string) => string | null;
  setHandoverOcForProject: (projectId: string) => string | null;
  acceptInbound: (id: string) => string | null;
  rejectInbound: (id: string) => string | null;
  inviteAgent: (input: { name: string; phone: string; companyId: string }) => string | null;
  setAgentStatus: (id: string, status: "active" | "suspended") => string | null;
  sendWhatsApp: (input: { templateId: string; leadId: string }) => string | null;
  fireWaTrigger: (trigger: WaTemplate["trigger"], leadId: string) => string | null;
  receiveWhatsApp: (leadId: string, text: string) => string | null;
  toggleWaConsent: (leadId: string) => string | null;
  nurtureLead: (id: string) => void;
}

function nextRev(current: string) {
  const n = Number(current.replace(/\D/g, "")) || 0;
  return `R${n + 1}`;
}

function projectEntityError(
  state: Pick<AtlasState, "projects" | "entities" | "entityId">,
  projectId: string,
): string | null {
  const p = state.projects.find((x) => x.id === projectId);
  if (!p) return "Project not found.";
  if (p.entityId !== state.entityId) {
    const name = state.entities.find((e) => e.id === p.entityId)?.name ?? p.entityId;
    return `This project belongs to ${name}. Switch company in the header before filing.`;
  }
  return null;
}

function exclusiveChannelError(
  state: Pick<AtlasState, "projects" | "partners">,
  projectId: string,
  partnerId?: string,
): string | null {
  const p = state.projects.find((x) => x.id === projectId);
  if (!p?.exclusivePartnerId) return null;
  if (!partnerId) return null;
  if (partnerId === p.exclusivePartnerId) return null;
  const firm =
    state.partners.find((x) => x.id === p.exclusivePartnerId)?.name ?? p.exclusivePartnerId;
  return `This project is locked to ${firm}.`;
}

const PROJECT_EXTRAS: Record<string, Partial<Project>> = {
  p_av: {
    constructionStart: "2024-10-01",
    constructionEnd: "2026-10-31",
    exclusivePartnerId: "pt_ap",
  },
  p_sf: {
    constructionStart: "2025-04-01",
    constructionEnd: "2026-06-14",
    exclusivePartnerId: "pt_sy",
  },
  p_ac: {
    constructionStart: "2025-06-02",
    constructionEnd: "2027-10-31",
    exclusivePartnerId: "pt_sbg",
  },
};

function migratePersisted(state: unknown) {
  const s = (state ?? {}) as Partial<AtlasState>;
  const projects = (s.projects ?? []).map((p) => {
    const extra = PROJECT_EXTRAS[p.id] ?? {};
    return {
      ...p,
      constructionStart: p.constructionStart ?? extra.constructionStart,
      constructionEnd: p.constructionEnd ?? extra.constructionEnd,
      exclusivePartnerId: p.exclusivePartnerId ?? extra.exclusivePartnerId,
    };
  });
  const parcels = (s.parcels ?? []).map((p) => ({
    ...p,
    considerationInr: p.considerationInr ?? 0,
    saleDeedNo: p.saleDeedNo ?? "",
    saleDeedDate: p.saleDeedDate ?? "",
    advocateName: p.advocateName ?? "",
  }));
  const gradeOf = (id?: string, grade?: User["grade"]) =>
    grade ?? (id === "u_md" ? "md" : id === "u_dir1" || id === "u_dir2" ? "director" : undefined);
  const users = (s.users ?? []).map((u) => ({ ...u, grade: gradeOf(u.id, u.grade) }));
  const user = s.user ? { ...s.user, grade: gradeOf(s.user.id, s.user.grade) } : s.user;
  return {
    ...s,
    projects,
    parcels,
    users,
    user,
    approvals: ensureVendorActivationCards(s.vendors ?? [], s.approvals ?? [], projects),
    fundingSanctions: (() => {
      const have = new Set((s.fundingSanctions ?? []).map((f) => f.projectId));
      const extra = FUNDING.filter((f) => !have.has(f.projectId));
      return [...(s.fundingSanctions ?? []), ...extra];
    })(),
    drawings: s.drawings ?? [],
    entityByUser: s.entityByUser ?? {},
  };
}

function moveUnit(
  units: InventoryUnit[],
  events: UnitEvent[],
  unitId: string,
  to: UnitStatus,
  note: string,
) {
  const u = units.find((x) => x.id === unitId);
  if (!u) return { units, events };
  const ev: UnitEvent = {
    id: uid("ue"),
    unitId,
    at: nowIso(),
    from: u.status,
    to,
    note,
  };
  return {
    units: units.map((x) => (x.id === unitId ? { ...x, status: to } : x)),
    events: [ev, ...events],
  };
}

function accrueCommission(
  commissions: Commission[],
  partners: Partner[],
  booking: Booking,
  value: number,
) {
  const partner = booking.partnerId ? partners.find((p) => p.id === booking.partnerId) : undefined;
  if (!partner || partner.status !== "active") return commissions;
  if (commissions.some((c) => c.bookingId === booking.id)) return commissions;
  return [
    {
      id: uid("cm"),
      partnerId: partner.id,
      bookingId: booking.id,
      projectId: booking.projectId,
      amount: Math.round((value * partner.rate) / 100),
      status: "accrued" as const,
    },
    ...commissions,
  ];
}

function upsertCustomer(customers: Customer[], name: string, phone?: string, source?: string) {
  const hit =
    (phone ? customers.find((c) => c.phone === phone) : undefined) ??
    customers.find((c) => c.name === name);
  if (hit) return { customers, id: hit.id };
  const row: Customer = {
    id: uid("cu"),
    name,
    phone: phone ?? "",
    source,
    createdAt: nowIso(),
  };
  return { customers: [row, ...customers], id: row.id };
}

function expireHolds(units: InventoryUnit[], events: UnitEvent[], holds: UnitHold[]) {
  const today = todayIso();
  let nextUnits = units;
  let nextEvents = events;
  const nextHolds = holds.map((h) => {
    if (h.status !== "held" || h.until >= today) return h;
    const moved = moveUnit(nextUnits, nextEvents, h.unitId, "available", "Hold expired");
    nextUnits = moved.units;
    nextEvents = moved.events;
    return { ...h, status: "expired" as const };
  });
  return { units: nextUnits, events: nextEvents, holds: nextHolds };
}

function ensureHandover(handovers: HandoverCase[], projectId: string, unit: string) {
  if (!unit || handovers.some((h) => h.unit === unit)) return handovers;
  const row: HandoverCase = {
    id: uid("ho"),
    projectId,
    unit,
    oc: "pending",
    snagsOpen: 0,
    status: "snagging",
  };
  return [row, ...handovers];
}

function rememberScore(
  leadId: string,
  scored: ReturnType<typeof scoreLead>,
  history: LeadScoreHistory[],
  features: LeadFeatureRow[],
  modelId: string,
  triggerType: string,
  triggerDetail: string,
) {
  const at = nowIso();
  const row: LeadScoreHistory = {
    id: uid("sh"),
    leadId,
    modelId,
    at,
    scoredAt: at,
    score: scored.score,
    band: scored.band as ScoreBand,
    probability: scored.probability ?? scored.score / 100,
    model: scored.model,
    reasons: scored.reasons,
    topReasons: scored.reasons,
    shapValues: scored.shapValues ?? {},
    triggerType,
    triggerDetail,
  };
  return {
    history: [row, ...history].slice(0, 1000),
    features: [
      { id: uid("lf"), leadId, at, features: scored.features },
      ...features.filter((f) => f.leadId !== leadId),
    ],
    stamp: {
      score: scored.score,
      band: scored.band,
      scoreReasons: scored.reasons,
      scoreModel: scored.model,
      currentScore: scored.score,
      currentBand: scored.band,
      currentProbability: row.probability,
      currentScoreReasons: scored.reasons,
      currentModelId: modelId,
      lastScoredAt: at,
    },
  };
}

/** Native CatBoost when that model is active. Hybrid stays the sync path. */
function queueNativeScore(leadId: string, triggerType: string, triggerDetail: string) {
  const state = useAtlas.getState();
  const model = state.scoreModels.find((m) => m.active) ?? state.scoreModels[0];
  if ((model?.algorithm ?? model?.kind) !== "catboost") return;
  const l = state.leads.find((x) => x.id === leadId);
  if (!l) return;
  const unit = state.units.find((u) => u.code === l.unit);
  const acts = state.leadActivities.filter((a) => a.leadId === leadId);
  void scoreNative({ lead: l, unit, activities: acts, model, triggerType, triggerDetail }).then(
    (scored) => {
      if (scored.servedBy !== "catboost") return;
      const latest = useAtlas.getState();
      const mem = rememberScore(
        leadId,
        scored,
        latest.scoreHistory,
        latest.leadFeatures,
        model.id,
        triggerType,
        triggerDetail,
      );
      useAtlas.setState({
        leads: latest.leads.map((x) => (x.id === leadId ? { ...x, ...mem.stamp } : x)),
        scoreHistory: mem.history,
        leadFeatures: mem.features,
      });
      latest.log("CatBoost native applied", `${l.name} · ${scored.score}`);
    },
  );
}

export const useAtlas = create<AtlasState>()(
  persist(
    (set, get) => ({
      user: null,
      simDate: null,
      entityId: "le_sbc",
      projectId: "all",
      entityByUser: {},
      fundingSanctions: FUNDING,
      drawings: [],
      users: USERS,
      entities: ENTITIES,
      projects: PROJECTS,
      documents: DOCUMENTS,
      exports: EXPORTS_SEED,
      parcels: PARCELS,
      diligence: DILIGENCE,
      obligations: OBLIGATIONS,
      emis: EMIS,
      budgetLines: BUDGET_LINES,
      materials: MATERIALS,
      quantities: QUANTITIES,
      notes: NOTES,
      partners: PARTNERS,
      leads: LEADS,
      commissions: COMMISSIONS,
      payments: PAYMENTS,
      snags: SNAGS,
      hosts: HOSTS,
      towers: TOWERS,
      units: UNITS,
      unitEvents: UNIT_EVENTS,
      agents: AGENTS,
      customers: CUSTOMERS,
      dailyReports: DAILY_REPORTS,
      holds: HOLDS,
      leadActivities: LEAD_ACTIVITIES,
      handovers: HANDOVERS,
      scoreModels: SCORE_MODELS,
      leadFeatures: LEAD_FEATURES,
      scoreHistory: SCORE_HISTORY,
      siteVisits: SITE_VISITS,
      bookingDocs: BOOKING_DOCS,
      inbound: INBOUND,
      waTemplates: WA_TEMPLATES,
      waSends: WA_SENDS,
      notices: [],
      activeScoreModel: "catboost",
      vendors: VENDORS,
      rfqs: RFQS,
      quotes: QUOTES,
      pos: POS,
      contracts: CONTRACTS,
      approvals: APPROVALS,
      diaries: DIARIES,
      inspections: INSPECTIONS,
      changes: CHANGES,
      bookings: BOOKINGS,
      tally: TALLY,
      decisions: DECISIONS,
      ownerTodos: OWNER_TODOS,
      audit: AUDIT,
      companyDay: null,
      signIn: (role) => {
        const found = USERS.find((u) => u.role === role && u.id !== "u_test") ?? USERS[0];
        set({ user: { ...found, password: "" } });
        get().log("Signed in", found.title);
      },
      signInLocal: (email, password) => {
        const found = USERS.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
        if (!found || found.password !== password)
          return "Email or password is wrong. Local test accounts only.";
        const remembered = get().entityByUser[found.id];
        set({
          user: { ...found, password: "" },
          entityId:
            remembered && get().entities.some((e) => e.id === remembered)
              ? remembered
              : get().entityId,
        });
        get().log("Signed in (local test)", found.email);
        return null;
      },
      signOut: () => set({ user: null }),
      setSimDate: (iso) => {
        set({ simDate: iso });
        get().log("Trial clock set", iso ?? "real time");
      },
      setEntity: (id) => {
        const uidKey = get().user?.id;
        set({
          entityId: id,
          projectId: "all",
          entityByUser: uidKey ? { ...get().entityByUser, [uidKey]: id } : get().entityByUser,
        });
      },
      setProject: (id) => set({ projectId: id }),
      log: (action, entity) => {
        const actor = get().user?.name ?? "System";
        const event: AuditEvent = {
          id: uid("au"),
          at: nowIso(),
          actor,
          action,
          entity,
        };
        set({ audit: [event, ...get().audit].slice(0, 5000) });
      },
      createProject: (p) => {
        const project: Project = {
          ...p,
          id: uid("p"),
          spent: 0,
          progress: 0,
          sold: 0,
          forecast: p.forecast ?? 0,
          concept: p.concept ?? p.status === "planning",
        };
        set({ projects: [project, ...get().projects] });
        get().log("Created project", project.name);
      },
      addDiary: (entry) => {
        const exists = get().diaries.some(
          (d) =>
            d.projectId === entry.projectId &&
            d.date === entry.date &&
            d.deviceKey === entry.deviceKey,
        );
        if (exists) return "A diary for this device and date already exists.";
        const trades =
          (entry.labourCivil ?? 0) + (entry.labourMep ?? 0) + (entry.labourFinish ?? 0);
        const row: DiaryEntry = {
          ...entry,
          labour: entry.labour || trades,
          id: uid("dy"),
          author: get().user?.name ?? "Site",
        };
        set({ diaries: [row, ...get().diaries] });
        get().log("Created site diary", entry.date);
        return null;
      },
      decideApproval: (id, status) => {
        const item = get().approvals.find((a) => a.id === id);
        if (!item) return "Approval not found.";
        if (item.kind === "Vendor" && item.refId && status === "approved") {
          const vendor = get().vendors.find((v) => v.id === item.refId);
          if (!vendor || vendor.stage !== "approval") {
            return "Vendor can only be activated from the approval stage. Complete onboarding first.";
          }
        }
        set({
          approvals: get().approvals.map((a) => (a.id === id ? { ...a, status } : a)),
        });
        if (item.kind === "Purchase order" && item.refId && status === "approved") {
          set({
            pos: get().pos.map((p) => (p.id === item.refId ? { ...p, status: "approved" } : p)),
          });
        }
        if (item.kind === "Vendor" && item.refId && status === "approved") {
          set({
            vendors: get().vendors.map((v) =>
              v.id === item.refId ? { ...v, stage: "active" } : v,
            ),
          });
        }
        if (item.kind === "Document export" && item.refId) {
          set({
            exports: get().exports.map((e) =>
              e.id === item.refId
                ? { ...e, status: status === "approved" ? "granted" : "rejected" }
                : e,
            ),
          });
        }
        if (item.kind === "Change" && item.refId) {
          set({
            changes: get().changes.map((c) =>
              c.id === item.refId
                ? { ...c, status: status === "approved" ? "approved" : "rejected" }
                : c,
            ),
          });
        }
        if (item.kind === "Commission" && item.refId) {
          set({
            commissions: get().commissions.map((c) =>
              c.id === item.refId
                ? { ...c, status: status === "approved" ? "approved" : "rejected" }
                : c,
            ),
          });
        }
        if (item.kind === "Hold booking" && item.refId) {
          if (status === "approved") {
            const err = get().bookHold(item.refId, item.amount ?? 0);
            if (err && !/already/i.test(err)) return err;
          } else {
            set({
              holds: get().holds.map((h) =>
                h.id === item.refId
                  ? { ...h, bookingRequested: false, bookingValue: undefined }
                  : h,
              ),
            });
          }
        }
        get().log(status === "approved" ? "Approved" : "Rejected", item.title);
        return null;
      },
      advanceVendor: (id) => {
        const v = get().vendors.find((x) => x.id === id);
        if (!v) return "Vendor not found.";
        if (v.stage === "active") return "Vendor is already Active.";
        if (v.stage === "suspended") return "Suspended vendors cannot be advanced.";
        if (v.stage === "approval") {
          const existing = get().approvals.find(
            (a) => a.kind === "Vendor" && a.refId === id && a.status === "pending",
          );
          if (existing) return "Waiting on Managing Director to activate.";
          const approval = vendorApprovalCard(v, get().projects[0]?.id ?? "p_av", uid("a"));
          set({ approvals: [approval, ...get().approvals] });
          get().log("Vendor sent for activation approval", v.name);
          return null;
        }
        const next = VENDOR_NEXT[v.stage];
        if (!next) return "No further stage.";
        if ((next === "verified" || next === "approval") && (!v.gstin || v.gstin === "—")) {
          return "GSTIN is required before verification.";
        }
        if (next === "approval") {
          const approval = vendorApprovalCard(v, get().projects[0]?.id ?? "p_av", uid("a"));
          set({
            vendors: get().vendors.map((x) => (x.id === id ? { ...x, stage: "approval" } : x)),
            approvals: [approval, ...get().approvals],
          });
          get().log("Vendor sent for activation approval", v.name);
          return null;
        }
        set({
          vendors: get().vendors.map((x) => (x.id === id ? { ...x, stage: next } : x)),
        });
        get().log(`Vendor moved to ${next}`, v.name);
        return null;
      },
      inviteVendor: (input) => {
        const v: Vendor = {
          id: uid("v"),
          name: input.name,
          trade: input.trade,
          city: input.city,
          gstin: input.gstin || "—",
          stage: "invited",
        };
        set({ vendors: [v, ...get().vendors] });
        get().log("Invited vendor", v.name);
      },
      scheduleInspection: (input) => {
        const row: Inspection = {
          id: uid("i"),
          projectId: input.projectId,
          template: input.template,
          location: input.location,
          result: "pending",
          date: todayIso(),
        };
        set({ inspections: [row, ...get().inspections] });
        get().log("Scheduled inspection", input.location);
      },
      cancelBooking: (id) => {
        const b = get().bookings.find((x) => x.id === id);
        if (!b) return "Booking not found.";
        if (b.status === "possession") return "Possessed units cannot be cancelled here.";
        const inv = get().units.find((u) => u.projectId === b.projectId && u.code === b.unit);
        const moved = inv
          ? moveUnit(get().units, get().unitEvents, inv.id, "available", "Booking cancelled")
          : { units: get().units, events: get().unitEvents };
        set({
          bookings: get().bookings.map((x) => (x.id === id ? { ...x, status: "cancelled" } : x)),
          units: moved.units,
          unitEvents: moved.events,
        });
        get().log("Cancelled booking", b.unit);
        return null;
      },
      createPO: (input) => {
        const entityErr = projectEntityError(get(), input.projectId);
        if (entityErr) return entityErr;
        const vendor = get().vendors.find((v) => v.id === input.vendorId);
        if (!vendor || vendor.stage !== "active") {
          return PO_VENDOR_NOT_ACTIVE;
        }
        const po: PurchaseOrder = {
          id: uid("po"),
          ...input,
          status: "submitted",
          createdAt: todayIso(),
        };
        const quoteCount = input.rfqId
          ? get().quotes.filter((q) => q.rfqId === input.rfqId).length
          : 0;
        const approval: Approval = {
          id: uid("a"),
          kind: "Purchase order",
          title: `${po.id.toUpperCase()} ${po.title}`,
          projectId: po.projectId,
          amount: po.amount,
          waitingOn: "Managing Director",
          agingDays: 0,
          status: "pending",
          refId: po.id,
          context: input.quoteId
            ? `Selected quote · ${vendor.name}${quoteCount ? ` · ${quoteCount} quotes on RFQ` : ""}`
            : `Vendor ${vendor.name} · no RFQ linked`,
        };
        set({
          pos: [po, ...get().pos],
          approvals: [approval, ...get().approvals],
        });
        get().log("Submitted purchase order", po.title);
        return null;
      },
      createRfq: (input) => {
        const entityErr = projectEntityError(get(), input.projectId);
        if (entityErr) return entityErr;
        const row: Rfq = {
          id: uid("rfq"),
          projectId: input.projectId,
          title: input.title,
          package: input.package,
          due: input.due,
          status: "open",
          required: input.required ?? true,
        };
        set({ rfqs: [row, ...get().rfqs] });
        get().log("Raised RFQ", row.title);
        return null;
      },
      submitQuote: (input) => {
        const rfq = get().rfqs.find((r) => r.id === input.rfqId);
        if (!rfq) return "RFQ not found.";
        if (rfq.status !== "open") return "RFQ is closed for new quotes.";
        const vendor = get().vendors.find((v) => v.id === input.vendorId);
        if (!vendor) return "Vendor not found.";
        const row: Quote = {
          id: uid("q"),
          rfqId: input.rfqId,
          vendorId: input.vendorId,
          amount: input.amount,
          validity: input.validity,
          exclusions: input.exclusions || "—",
          status: "submitted",
          submittedAt: todayIso(),
          source: input.source ?? "portal",
          taxAmount: input.taxAmount,
          fileName: input.fileName,
          fileKind: input.fileKind,
          fileSize: input.fileSize,
          fileDataUrl: input.fileDataUrl,
          sha256: input.sha256,
        };
        set({ quotes: [row, ...get().quotes] });
        get().log(
          "Quote submitted",
          `${vendor.name} · ${rfq.title}${input.source === "paper" ? " · paper" : ""}`,
        );
        return null;
      },
      addDrawing: (input) => {
        const entityErr = projectEntityError(get(), input.projectId);
        if (entityErr) return entityErr;
        if (!input.title.trim()) return "Title required.";
        const row: Drawing = {
          id: uid("dr"),
          projectId: input.projectId,
          title: input.title.trim(),
          kind: input.kind,
          towerId: input.towerId,
          revision: input.revision.trim() || "R0",
          status: input.status ?? "draft",
          fileName: input.fileName,
          fileKind: input.fileKind,
          fileSize: input.fileSize,
          fileDataUrl: input.fileDataUrl,
          sha256: input.sha256,
          uploadedAt: todayIso(),
          uploadedBy: get().user?.name ?? "Docs",
        };
        set({ drawings: [row, ...get().drawings] });
        get().log("Registered drawing", `${row.title} · ${row.revision}`);
        return null;
      },
      selectQuote: (quoteId) => {
        const q = get().quotes.find((x) => x.id === quoteId);
        if (!q) return "Quote not found.";
        const rfq = get().rfqs.find((r) => r.id === q.rfqId);
        if (!rfq || rfq.status !== "open") return "RFQ is not open.";
        const vendor = get().vendors.find((v) => v.id === q.vendorId);
        if (!vendor || vendor.stage !== "active") {
          return PO_VENDOR_NOT_ACTIVE;
        }
        set({
          quotes: get().quotes.map((x) => {
            if (x.rfqId !== q.rfqId) return x;
            if (x.id === quoteId) return { ...x, status: "selected" as const };
            if (x.status === "submitted" || x.status === "selected") {
              return { ...x, status: "rejected" as const };
            }
            return x;
          }),
          rfqs: get().rfqs.map((r) =>
            r.id === q.rfqId ? { ...r, status: "awarded" as const } : r,
          ),
        });
        get().log("Quote selected", vendor.name);
        return null;
      },
      createPOFromQuote: (quoteId) => {
        const q = get().quotes.find((x) => x.id === quoteId);
        if (!q) return "Quote not found.";
        if (q.status !== "selected") return "Select the quote before creating a PO.";
        if (get().pos.some((p) => p.quoteId === quoteId))
          return "A PO already exists for this quote.";
        const rfq = get().rfqs.find((r) => r.id === q.rfqId);
        if (!rfq) return "RFQ not found.";
        return get().createPO({
          projectId: rfq.projectId,
          vendorId: q.vendorId,
          title: rfq.title,
          amount: q.amount,
          quoteId: q.id,
          rfqId: rfq.id,
        });
      },
      raiseChange: (item) => {
        const row: ChangeItem = { ...item, id: uid("ch") };
        if (item.kind === "change") {
          const approval: Approval = {
            id: uid("a"),
            kind: "Change",
            title: row.title,
            projectId: row.projectId,
            waitingOn: "Project Director",
            agingDays: 0,
            status: "pending",
            refId: row.id,
          };
          set({
            changes: [row, ...get().changes],
            approvals: [approval, ...get().approvals],
          });
        } else {
          set({ changes: [row, ...get().changes] });
        }
        get().log(`Raised ${item.kind.toUpperCase()}`, item.title);
      },
      addBooking: (b) => {
        const entityErr = projectEntityError(get(), b.projectId);
        if (entityErr) return entityErr;
        const lock = exclusiveChannelError(get(), b.projectId, b.partnerId);
        if (lock) return lock;
        const inv = get().units.find((u) => u.projectId === b.projectId && u.code === b.unit);
        const locked = refuseBook(inv, get().bookings, b.projectId, b.unit);
        if (locked) return locked;
        const cu = upsertCustomer(get().customers, b.customer, undefined, "booking");
        const row: Booking = {
          ...b,
          id: uid("b"),
          collected: 0,
          status: "active",
          customerId: cu.id,
        };
        const moved = inv
          ? moveUnit(get().units, get().unitEvents, inv.id, "booked", `Booking ${row.id}`)
          : { units: get().units, events: get().unitEvents };
        const commissions = accrueCommission(get().commissions, get().partners, row, row.value);
        const docs: BookingDoc[] = [
          { id: uid("bd"), bookingId: row.id, title: "PAN / Aadhaar KYC", status: "open" },
          { id: uid("bd"), bookingId: row.id, title: "Allotment letter", status: "open" },
          { id: uid("bd"), bookingId: row.id, title: "Agreement for sale", status: "open" },
        ];
        set({
          bookings: [row, ...get().bookings],
          units: moved.units,
          unitEvents: moved.events,
          commissions,
          bookingDocs: [...docs, ...get().bookingDocs],
          customers: cu.customers,
          handovers: ensureHandover(get().handovers, row.projectId, row.unit),
        });
        get().log("Created booking", `${b.unit} · ${b.customer}`);
        return null;
      },
      collect: (bookingId, amount) => {
        const b = get().bookings.find((x) => x.id === bookingId);
        if (!b) return "Booking not found.";
        if (b.status === "cancelled") return "Cancelled booking cannot collect.";
        if (b.collected + amount > b.value) return "Collection would over-allocate this plan.";
        let left = amount;
        const payments = get().payments.map((p) => {
          if (p.bookingId !== bookingId || left <= 0) return p;
          const gap = p.amount - p.paid;
          if (gap <= 0) return p;
          const take = Math.min(gap, left);
          left -= take;
          return { ...p, paid: p.paid + take };
        });
        set({
          bookings: get().bookings.map((x) =>
            x.id === bookingId ? { ...x, collected: x.collected + amount } : x,
          ),
          payments,
        });
        get().log("Recorded collection", b.unit);
        const next = get().bookings.find((x) => x.id === bookingId);
        if (next && next.collected < next.value) {
          const lead = get().leads.find((l) => l.name === b.customer || l.unit === b.unit);
          if (lead) get().fireWaTrigger("payment_due", lead.id);
        }
        return null;
      },
      recordDecision: (id, note) => {
        set({
          decisions: get().decisions.map((d) =>
            d.id === id ? { ...d, status: "recorded", note } : d,
          ),
        });
        get().log("Recorded owner decision", id);
      },
      reopenDecision: (id) => {
        set({
          decisions: get().decisions.map((d) => (d.id === id ? { ...d, status: "open" } : d)),
        });
      },
      registerDocument: (input) => {
        const actor = get().user?.name ?? "User";
        const payload = `${input.title}|${input.fileName ?? ""}|${todayIso()}|${actor}`;
        const hash = sha256demo(payload);
        const doc: Document = {
          id: uid("d"),
          projectId: input.projectId,
          title: input.title,
          kind: input.kind,
          classification: input.classification,
          revision: "R0",
          status: "quarantine",
          uploadedAt: todayIso(),
          sha256: hash,
          pages: 1,
          sheet: input.sheet || "NEW-01",
          revisions: [
            {
              id: uid("rv"),
              revision: "R0",
              sha256: hash,
              uploadedAt: todayIso(),
              uploadedBy: actor,
              notes: input.fileName
                ? `Local demo hash of ${input.fileName} — file is not stored`
                : "Registered — in malware quarantine",
            },
          ],
        };
        set({ documents: [doc, ...get().documents] });
        get().log("Registered document (quarantine)", doc.title);
      },
      clearQuarantine: (documentId) => {
        const doc = get().documents.find((d) => d.id === documentId);
        if (!doc) return "Document not found.";
        if (doc.status !== "quarantine") return "Not in quarantine.";
        set({
          documents: get().documents.map((d) =>
            d.id === documentId ? { ...d, status: "review" } : d,
          ),
        });
        get().log("Malware scan cleared", doc.title);
        return null;
      },
      issueDocument: (documentId) => {
        const doc = get().documents.find((d) => d.id === documentId);
        if (!doc) return "Document not found.";
        if (doc.status === "quarantine") return "Cannot issue a quarantined file.";
        set({
          documents: get().documents.map((d) =>
            d.id === documentId ? { ...d, status: "issued" } : d,
          ),
        });
        get().log("Issued document", doc.title);
        return null;
      },
      addRevision: (documentId, notes) => {
        const doc = get().documents.find((d) => d.id === documentId);
        if (!doc) return "Document not found.";
        if (doc.status === "quarantine") return "Clear quarantine before a new revision.";
        const revision = nextRev(doc.revision);
        const actor = get().user?.name ?? "User";
        const hash = sha256demo(`${doc.id}|${revision}|${notes}|${Date.now()}`);
        const rev = {
          id: uid("rv"),
          revision,
          sha256: hash,
          uploadedAt: todayIso(),
          uploadedBy: actor,
          notes: notes || "Revision uploaded",
        };
        set({
          documents: get().documents.map((d) =>
            d.id === documentId
              ? {
                  ...d,
                  revision,
                  sha256: hash,
                  uploadedAt: todayIso(),
                  status: "review",
                  revisions: [...d.revisions, rev],
                }
              : d,
          ),
        });
        get().log(`Uploaded ${revision}`, doc.title);
        return null;
      },
      requestExport: (documentId) => {
        const doc = get().documents.find((d) => d.id === documentId);
        if (!doc) return "Document not found.";
        if (doc.status === "quarantine") return "Quarantined files cannot be exported.";
        const existing = get().exports.find(
          (e) => e.documentId === documentId && (e.status === "pending" || e.status === "granted"),
        );
        if (existing) return "An export request is already open for this file.";
        const grant: ExportGrant = {
          id: uid("exp"),
          documentId,
          revision: doc.revision,
          status: "pending",
          requestedBy: get().user?.name ?? "User",
          createdAt: todayIso(),
        };
        const approval: Approval = {
          id: uid("a"),
          kind: "Document export",
          title: `${doc.title} — original ${doc.revision}`,
          projectId: doc.projectId,
          waitingOn: "Four-eyes approver",
          agingDays: 0,
          status: "pending",
          refId: grant.id,
        };
        set({
          exports: [grant, ...get().exports],
          approvals: [approval, ...get().approvals],
        });
        get().log("Requested original export", doc.title);
        return null;
      },
      consumeExport: (grantId) => {
        const g = get().exports.find((e) => e.id === grantId);
        if (!g) return "Grant not found.";
        if (g.status !== "granted") return "This download is not authorised.";
        set({
          exports: get().exports.map((e) =>
            e.id === grantId ? { ...e, status: "used", usedAt: nowIso() } : e,
          ),
        });
        const doc = get().documents.find((d) => d.id === g.documentId);
        get().log("Consumed single-use original", doc?.title ?? grantId);
        return null;
      },
      setDiligence: (id, status) => {
        const item = get().diligence.find((d) => d.id === id);
        if (!item) return;
        set({ diligence: get().diligence.map((d) => (d.id === id ? { ...d, status } : d)) });
        get().log(`Due diligence ${status}`, item.title);
      },
      addDiligence: (input) => {
        if (!input.title.trim()) return "Title required.";
        const parcel = get().parcels.find((p) => p.id === input.parcelId);
        if (!parcel) return "Parcel not found.";
        const row: DiligenceItem = {
          id: uid("dd"),
          parcelId: input.parcelId,
          title: input.title.trim(),
          status: "open",
        };
        set({
          diligence: [row, ...get().diligence],
          parcels: get().parcels.map((p) =>
            p.id === input.parcelId && p.status === "identified"
              ? { ...p, status: "diligence" }
              : p,
          ),
        });
        get().log("Added diligence item", row.title);
        return null;
      },
      fileObligation: (id, ack) => {
        const o = get().obligations.find((x) => x.id === id);
        if (!o) return "Obligation not found.";
        const ref = ack.trim();
        if (!ref) return CHALLAN_REQUIRED;
        set({
          obligations: get().obligations.map((x) =>
            x.id === id ? { ...x, status: "filed", filedRef: ref } : x,
          ),
        });
        get().log("Filed obligation", `${o.title} · ${ref}`);
        return null;
      },
      addParcel: (input) => {
        if (!input.name.trim() || !input.khasra.trim()) return "Name and khasra required.";
        const entityErr = projectEntityError(get(), input.projectId);
        if (entityErr) return entityErr;
        const row: LandParcel = {
          id: uid("lp"),
          projectId: input.projectId,
          name: input.name.trim(),
          khasra: input.khasra.trim(),
          area: input.area.trim() || "—",
          status: "identified",
          rera: input.rera.trim() || "—",
          loan: 0,
        };
        set({ parcels: [row, ...get().parcels] });
        get().log("Added land parcel", row.name);
        return null;
      },
      addObligation: (input) => {
        if (!input.title.trim() || !input.due) return "Title and due date required.";
        const row: Obligation = {
          id: uid("ob"),
          projectId: input.projectId,
          kind: input.kind,
          title: input.title.trim(),
          due: input.due,
          status: "open",
        };
        set({ obligations: [row, ...get().obligations] });
        get().log("Added statutory obligation", row.title);
        return null;
      },
      payEmi: (id) => {
        const e = get().emis.find((x) => x.id === id);
        if (!e) return "Instalment not found.";
        if (e.status === "paid") return "Already paid.";
        set({ emis: get().emis.map((x) => (x.id === id ? { ...x, status: "paid" } : x)) });
        get().log("Recorded EMI (ops. ref — ERPNext remains books)", String(e.amount));
        return null;
      },
      acquireParcel: (id, details) => {
        const parcel = get().parcels.find((x) => x.id === id);
        if (!parcel) return "Parcel not found.";
        const entityErr = projectEntityError(get(), parcel.projectId);
        if (entityErr) return entityErr;
        const open = get().diligence.filter((d) => d.parcelId === id && d.status !== "clear");
        if (open.length) return "All due-diligence items must be clear before acquisition.";
        const consideration = details?.considerationInr ?? parcel.considerationInr ?? 0;
        const saleDeedNo = (details?.saleDeedNo ?? parcel.saleDeedNo ?? "").trim();
        if (!consideration || consideration <= 0)
          return "Consideration (₹) is required to acquire the parcel.";
        if (!saleDeedNo) return "Sale deed number is required to acquire the parcel.";
        set({
          parcels: get().parcels.map((x) =>
            x.id === id
              ? {
                  ...x,
                  status: "acquired",
                  considerationInr: consideration,
                  saleDeedNo,
                  saleDeedDate: details?.saleDeedDate ?? x.saleDeedDate ?? todayIso(),
                  advocateName: details?.advocateName ?? x.advocateName,
                }
              : x,
          ),
        });
        get().log("Land acquired", `${parcel.name} · ${consideration} · ${saleDeedNo}`);
        return null;
      },
      recordParcelDeed: (id, details) => {
        const parcel = get().parcels.find((x) => x.id === id);
        if (!parcel) return "Parcel not found.";
        if (parcel.status !== "acquired") return "Acquire the parcel first.";
        const entityErr = projectEntityError(get(), parcel.projectId);
        if (entityErr) return entityErr;
        if (!details.considerationInr || details.considerationInr <= 0)
          return "Consideration (₹) is required.";
        if (!details.saleDeedNo.trim()) return "Sale deed number is required.";
        set({
          parcels: get().parcels.map((x) =>
            x.id === id
              ? {
                  ...x,
                  considerationInr: details.considerationInr,
                  saleDeedNo: details.saleDeedNo.trim(),
                  saleDeedDate: details.saleDeedDate ?? x.saleDeedDate ?? todayIso(),
                  advocateName: details.advocateName ?? x.advocateName,
                }
              : x,
          ),
        });
        get().log("Recorded sale deed / consideration", `${parcel.name} · ${details.saleDeedNo}`);
        return null;
      },
      startDiligencePack: (parcelId) => {
        const parcel = get().parcels.find((x) => x.id === parcelId);
        if (!parcel) return "Parcel not found.";
        const existing = new Set(
          get()
            .diligence.filter((d) => d.parcelId === parcelId)
            .map((d) => d.title.toLowerCase()),
        );
        const added: DiligenceItem[] = [];
        for (const title of STANDARD_DILIGENCE) {
          if (existing.has(title.toLowerCase())) continue;
          added.push({ id: uid("dd"), parcelId, title, status: "open" });
        }
        if (!added.length) return "Standard title pack is already on this parcel.";
        set({
          diligence: [...added, ...get().diligence],
          parcels: get().parcels.map((p) =>
            p.id === parcelId && p.status === "identified" ? { ...p, status: "diligence" } : p,
          ),
        });
        get().log("Opened standard title pack", parcel.name);
        return null;
      },
      clearDiligencePack: (parcelId) => {
        const parcel = get().parcels.find((x) => x.id === parcelId);
        if (!parcel) return "Parcel not found.";
        const open = get().diligence.filter((d) => d.parcelId === parcelId && d.status !== "clear");
        if (!open.length) return "Nothing left to clear.";
        set({
          diligence: get().diligence.map((d) =>
            d.parcelId === parcelId && d.status !== "clear" ? { ...d, status: "clear" } : d,
          ),
        });
        get().log("Cleared diligence pack", parcel.name);
        return null;
      },
      addFundingSanction: (input) => {
        const entityErr = projectEntityError(get(), input.projectId);
        if (entityErr) return entityErr;
        if (!input.bank.trim() || !input.sanctionNo.trim())
          return "Bank and sanction number required.";
        if (input.loanPct + input.equityPct !== 100)
          return "Loan % and partner/equity % must add to 100.";
        const row: FundingSanction = {
          id: uid("fs"),
          projectId: input.projectId,
          bank: input.bank.trim(),
          sanctionNo: input.sanctionNo.trim(),
          loanPct: input.loanPct,
          equityPct: input.equityPct,
          amount: input.amount,
          status: input.status ?? "sanctioned",
          sanctionedAt: input.sanctionedAt ?? todayIso(),
          validUntil: input.validUntil,
        };
        set({ fundingSanctions: [row, ...get().fundingSanctions] });
        get().log("Recorded funding sanction", `${row.bank} · ${row.sanctionNo}`);
        return null;
      },
      bookNextAvailable: (projectId, opts) => {
        const entityErr = projectEntityError(get(), projectId);
        if (entityErr) return entityErr;
        const unit = pickNextUnit(get().units, get().towers, projectId, opts);
        if (!unit) return "no available unit";
        const customer = opts?.customer ?? `Buyer ${unit.code}`;
        const leadErr = get().addLead({
          projectId,
          name: customer,
          phone: `97${unit.code.replace(/\D/g, "").slice(0, 8).padEnd(8, "0")}`,
          source: "walk-in",
          unit: unit.code,
          note: "next available",
          budget: unit.price,
          kind: "flat",
        });
        const lead = get().leads.find(
          (l) => l.unit === unit.code && l.stage !== "won" && l.stage !== "lost",
        );
        return leadErr || (lead ? get().convertLead(lead.id, unit.price) : "lead missing");
      },
      copyForwardDiary: (projectId) => {
        const last = get()
          .diaries.filter((d) => d.projectId === projectId)
          .slice()
          .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
        if (!last) return "No previous diary to copy.";
        return get().addDiary({
          projectId,
          date: todayIso(),
          weather: last.weather,
          labour: last.labour,
          labourCivil: last.labourCivil,
          labourMep: last.labourMep,
          labourFinish: last.labourFinish,
          work: last.work,
          materials: last.materials,
          safety: last.safety,
          deviceKey: `demo-${projectId}-${todayIso()}`,
        });
      },
      setProjectLaunch: (projectId, input) => {
        const p = get().projects.find((x) => x.id === projectId);
        if (!p) return "Project not found.";
        const entityErr = projectEntityError(get(), projectId);
        if (entityErr) return entityErr;
        set({
          projects: get().projects.map((x) =>
            x.id === projectId
              ? {
                  ...x,
                  launchedAt: todayIso(),
                  exclusivePartnerId: input?.exclusivePartnerId ?? x.exclusivePartnerId,
                  priceListFrozen: input?.freezePrices ?? true,
                }
              : x,
          ),
        });
        get().log("Sales launch", p.name);
        return null;
      },
      executeContract: (id, evidenceId) => {
        const c = get().contracts.find((x) => x.id === id);
        if (!c) return "Contract not found.";
        if (c.status !== "approved" && c.status !== "execution")
          return "Contract must be Approved before execution.";
        const doc = get().documents.find((d) => d.id === evidenceId);
        if (!doc) return "Execution evidence must be a Documents record.";
        set({
          contracts: get().contracts.map((x) =>
            x.id === id ? { ...x, status: "executed", evidenceId } : x,
          ),
        });
        get().log("Contract executed with evidence", c.title);
        return null;
      },
      receiveMaterial: (id, qty) => {
        const m = get().materials.find((x) => x.id === id);
        if (!m || qty <= 0) return;
        set({
          materials: get().materials.map((x) =>
            x.id === id ? { ...x, received: x.received + qty } : x,
          ),
        });
        get().log("Material received", `${m.name} +${qty}`);
      },
      issueMaterial: (id, qty) => {
        const m = get().materials.find((x) => x.id === id);
        if (!m) return "Material not found.";
        if (m.issued + qty > m.received) return "Cannot issue more than accepted receipts.";
        set({
          materials: get().materials.map((x) =>
            x.id === id ? { ...x, issued: x.issued + qty } : x,
          ),
        });
        get().log("Material issued", `${m.name} ${qty}`);
        return null;
      },
      completeInspection: (id, result) => {
        const i = get().inspections.find((x) => x.id === id);
        if (!i) return "Inspection not found.";
        set({
          inspections: get().inspections.map((x) => (x.id === id ? { ...x, result } : x)),
        });
        if (result === "fail") {
          const ncr: ChangeItem = {
            id: uid("ch"),
            projectId: i.projectId,
            kind: "ncr",
            title: `NCR from ${i.template} @ ${i.location}`,
            status: "corrective",
            severity: "medium",
          };
          set({ changes: [ncr, ...get().changes] });
          get().log("Inspection failed — NCR raised", i.location);
        } else {
          get().log("Inspection passed", i.location);
        }
        return null;
      },
      respondChange: (id, response) => {
        const c = get().changes.find((x) => x.id === id);
        if (!c) return "Item not found.";
        const status = c.kind === "rfi" ? "closed" : "review";
        set({
          changes: get().changes.map((x) => (x.id === id ? { ...x, status, response } : x)),
        });
        get().log(`Responded to ${c.kind.toUpperCase()}`, c.title);
        return null;
      },
      closeNcr: (id) => {
        const c = get().changes.find((x) => x.id === id);
        if (!c) return "NCR not found.";
        if (c.kind !== "ncr") return "Not an NCR.";
        set({
          changes: get().changes.map((x) => (x.id === id ? { ...x, status: "closed" } : x)),
        });
        get().log("NCR closed after re-inspection", c.title);
        return null;
      },
      approveQuantity: (id) => {
        const q = get().quantities.find((x) => x.id === id);
        if (!q) return "Quantity item not found.";
        set({
          quantities: get().quantities.map((x) => (x.id === id ? { ...x, status: "approved" } : x)),
        });
        get().log("Quantity approved", q.name);
        return null;
      },
      markPossession: (id) => {
        const b = get().bookings.find((x) => x.id === id);
        if (!b) return "Booking not found.";
        if (b.collected < b.value)
          return "Possession requires the payment plan to be fully collected.";
        const inv = get().units.find((u) => u.projectId === b.projectId && u.code === b.unit);
        const moved = inv
          ? moveUnit(get().units, get().unitEvents, inv.id, "sold", "Possession")
          : { units: get().units, events: get().unitEvents };
        set({
          bookings: get().bookings.map((x) => (x.id === id ? { ...x, status: "possession" } : x)),
          units: moved.units,
          unitEvents: moved.events,
        });
        get().log("Possession recorded", b.unit);
        return null;
      },
      settleTally: (id, status) => {
        const row = get().tally.find((x) => x.id === id);
        if (!row) return;
        set({ tally: get().tally.map((x) => (x.id === id ? { ...x, status } : x)) });
        get().log(`Company-accounts case ${status}`, row.title);
      },
      draftAdvice: (prompt) => {
        const hosting = get().decisions.find((d) => d.id === "ai_hosting");
        if (!hosting || hosting.status !== "recorded") {
          return "AI is fail-closed. Record the AI hosting decision before any draft is produced.";
        }
        const draft = `ADVISORY ONLY — not an approval.\n\nQuestion: ${prompt.trim()}\n\nRecommended next human step:\n1. Confirm evidence in Documents.\n2. If money or possession is involved, raise an Approval.\n3. Do not treat this note as a decision.\n\nAuthority: Level 2 drafting. Atlas will not pay, sign, send, or delete.`;
        const note: AssistantNote = {
          id: uid("ai"),
          at: nowIso(),
          prompt: prompt.trim(),
          draft,
          level: 2,
        };
        set({ notes: [note, ...get().notes] });
        get().log("AI draft created (advisory)", prompt.slice(0, 48));
        return null;
      },
      addLead: (input) => {
        return get().ingestLead(input);
      },
      advanceLead: (id) => {
        const l = get().leads.find((x) => x.id === id);
        if (!l) return "Lead not found.";
        const stage = STAGE_NEXT[l.stage];
        if (!stage) return "Convert to booking instead of advancing.";
        const unit = get().units.find((u) => u.code === l.unit);
        const acts = get().leadActivities.filter((a) => a.leadId === id);
        const model = get().scoreModels.find((m) => m.active) ?? get().scoreModels[0];
        const scored = scoreLead({ ...l, stage }, unit, acts, get().activeScoreModel);
        const mem = rememberScore(
          id,
          scored,
          get().scoreHistory,
          get().leadFeatures,
          model?.id ?? "m_hybrid",
          "stage_change",
          stage,
        );
        set({
          leads: get().leads.map((x) => (x.id === id ? { ...x, stage, ...mem.stamp } : x)),
          scoreHistory: mem.history,
          leadFeatures: mem.features,
        });
        get().log(`Lead moved to ${stage}`, l.name);
        queueNativeScore(id, "stage_change", stage);
        return null;
      },
      assignLead: (leadId, agentId) => {
        const l = get().leads.find((x) => x.id === leadId);
        if (!l) return "Lead not found.";
        const ag = get().agents.find((a) => a.id === agentId);
        if (!ag || ag.status !== "active") return "Active agent required.";
        if (!ag.inHouse && (!l.partnerId || ag.companyId !== l.partnerId)) {
          return "Agent is not on this desk.";
        }
        set({ leads: get().leads.map((x) => (x.id === leadId ? { ...x, agentId } : x)) });
        get().log("Lead assigned", `${l.name} · ${ag.name}`);
        return null;
      },
      loseLead: (id) => {
        const l = get().leads.find((x) => x.id === id);
        if (!l) return;
        set({ leads: get().leads.map((x) => (x.id === id ? { ...x, stage: "lost" } : x)) });
        get().log("Lead lost", l.name);
      },
      nurtureLead: (id) => {
        const l = get().leads.find((x) => x.id === id);
        if (!l) return;
        set({ leads: get().leads.map((x) => (x.id === id ? { ...x, stage: "nurture" } : x)) });
        get().log("Lead to nurture", l.name);
      },
      convertLead: (id, value) => {
        const l = get().leads.find((x) => x.id === id);
        if (!l) return "Lead not found.";
        if (l.stage === "lost" || l.stage === "won") return "This lead is closed.";
        if (!l.unit) return "Unit interest is required to convert.";
        const entityErr = projectEntityError(get(), l.projectId);
        if (entityErr) return entityErr;
        const lock = exclusiveChannelError(get(), l.projectId, l.partnerId);
        if (lock) return lock;
        const clash = get().bookings.find(
          (x) =>
            x.projectId === l.projectId &&
            x.unit === l.unit &&
            (x.status === "active" || x.status === "possession"),
        );
        if (clash) return `Unit ${l.unit} already has an active booking.`;
        const inv = get().units.find((u) => u.projectId === l.projectId && u.code === l.unit);
        if (inv && inv.status !== "available" && inv.status !== "held") {
          return `Unit ${l.unit} is ${inv.status} and cannot be booked.`;
        }
        const booking: Booking = {
          id: uid("b"),
          projectId: l.projectId,
          unit: l.unit,
          customer: l.name,
          value,
          collected: 0,
          status: "active",
          partnerId: l.partnerId,
        };
        const token = Math.round(value * 0.1);
        const today = todayIso();
        const possessionDue =
          get().projects.find((p) => p.id === l.projectId)?.possession ?? addDaysIso(today, 365);
        const steps: PaymentStep[] = [
          {
            id: uid("py"),
            bookingId: booking.id,
            label: "Booking token",
            due: today,
            amount: token,
            paid: 0,
          },
          {
            id: uid("py"),
            bookingId: booking.id,
            label: "Agreement",
            due: addDaysIso(today, 15),
            amount: token,
            paid: 0,
          },
          {
            id: uid("py"),
            bookingId: booking.id,
            label: "Construction",
            due: addDaysIso(today, 90),
            amount: Math.round(value * 0.4),
            paid: 0,
          },
          {
            id: uid("py"),
            bookingId: booking.id,
            label: "Possession",
            due: possessionDue,
            amount: value - token * 2 - Math.round(value * 0.4),
            paid: 0,
          },
        ];
        const cu = upsertCustomer(get().customers, l.name, l.phone, l.source);
        booking.customerId = cu.id;
        const commissions = accrueCommission(get().commissions, get().partners, booking, value);
        const moved = inv
          ? moveUnit(get().units, get().unitEvents, inv.id, "booked", `Lead convert ${booking.id}`)
          : { units: get().units, events: get().unitEvents };
        const docs: BookingDoc[] = [
          { id: uid("bd"), bookingId: booking.id, title: "PAN / Aadhaar KYC", status: "open" },
          { id: uid("bd"), bookingId: booking.id, title: "Allotment letter", status: "open" },
          { id: uid("bd"), bookingId: booking.id, title: "Agreement for sale", status: "open" },
        ];
        set({
          bookings: [booking, ...get().bookings],
          leads: get().leads.map((x) =>
            x.id === id ? { ...x, stage: "won", customerId: cu.id } : x,
          ),
          payments: [...steps, ...get().payments],
          units: moved.units,
          unitEvents: moved.events,
          commissions,
          bookingDocs: [...docs, ...get().bookingDocs],
          customers: cu.customers,
          handovers: ensureHandover(get().handovers, l.projectId, l.unit),
        });
        get().log("Converted lead to booking", `${l.name} · ${l.unit}`);
        if (l.waConsent) get().fireWaTrigger("document_request", id);
        return null;
      },
      addPartner: (input) => {
        const row: Partner = { id: uid("pt"), status: "invited", ...input };
        set({ partners: [row, ...get().partners] });
        get().log("Added channel partner", row.name);
      },
      activatePartner: (id) => {
        set({
          partners: get().partners.map((p) => (p.id === id ? { ...p, status: "active" } : p)),
        });
        get().log("Activated partner", id);
      },
      requestCommission: (id) => {
        const c = get().commissions.find((x) => x.id === id);
        if (!c) return "Commission not found.";
        if (c.status !== "accrued") return "Only accrued commission can be sent for approval.";
        if (
          get().approvals.some(
            (a) => a.kind === "Commission" && a.refId === id && a.status === "pending",
          )
        ) {
          return "This commission is already waiting in Approvals.";
        }
        const partner = get().partners.find((p) => p.id === c.partnerId);
        const approval: Approval = {
          id: uid("a"),
          kind: "Commission",
          title: `Partner commission · ${partner?.name ?? c.partnerId}`,
          projectId: c.projectId,
          amount: c.amount,
          waitingOn: "Managing Director",
          agingDays: 0,
          status: "pending",
          refId: c.id,
        };
        set({ approvals: [approval, ...get().approvals] });
        get().log("Commission sent for approval", String(c.amount));
        return null;
      },
      setVendorGstin: (id, gstin) => {
        const v = get().vendors.find((x) => x.id === id);
        if (!v) return "Vendor not found.";
        if (!gstin.trim()) return "GSTIN required.";
        set({
          vendors: get().vendors.map((x) => (x.id === id ? { ...x, gstin: gstin.trim() } : x)),
        });
        get().log("Vendor GSTIN recorded", v.name);
        return null;
      },
      addSnag: (input) => {
        const row: Snag = { ...input, id: uid("sg"), status: "open" };
        set({ snags: [row, ...get().snags] });
        get().log("Raised snag", input.title);
      },
      closeSnag: (id) => {
        const snag = get().snags.find((s) => s.id === id);
        set({
          snags: get().snags.map((s) => (s.id === id ? { ...s, status: "closed" } : s)),
          handovers: snag
            ? get().handovers.map((h) =>
                h.unit === snag.unit ? { ...h, snagsOpen: Math.max(0, h.snagsOpen - 1) } : h,
              )
            : get().handovers,
        });
        get().log("Closed snag", id);
      },
      markHostReady: (id) => {
        set({ hosts: get().hosts.map((h) => (h.id === id ? { ...h, status: "ready" } : h)) });
        get().log("Host marked ready (local ops)", id);
      },
      holdUnit: (input) => {
        const stale = get().holds.some((h) => h.status === "held" && h.until < todayIso());
        if (stale) {
          const expired = expireHolds(get().units, get().unitEvents, get().holds);
          set({ units: expired.units, unitEvents: expired.events, holds: expired.holds });
        }
        const gated = refuseHoldWithoutReport(get().user?.role, get().dailyReports, input.agentId);
        if (gated) return gated;
        const unit = get().units.find((u) => u.id === input.unitId);
        const locked = refuseHold(unit);
        if (locked || !unit) return locked ?? "Unit not found.";
        const entityErr = projectEntityError(get(), unit.projectId);
        if (entityErr) return entityErr;
        const agent = get().agents.find((a) => a.id === input.agentId);
        const lock = exclusiveChannelError(get(), unit.projectId, agent?.companyId);
        if (lock) return lock;
        const hold: UnitHold = {
          id: uid("hd"),
          unitId: unit.id,
          projectId: unit.projectId,
          agentId: input.agentId,
          customer: input.customer,
          until: input.until,
          status: "held",
        };
        const moved = moveUnit(get().units, get().unitEvents, unit.id, "held", `Hold ${hold.id}`);
        set({ holds: [hold, ...get().holds], units: moved.units, unitEvents: moved.events });
        get().log("Unit held", `${unit.code} · ${input.customer}`);
        return null;
      },
      releaseHold: (holdId) => {
        const h = get().holds.find((x) => x.id === holdId);
        if (!h || h.status !== "held") return "Hold not active.";
        const moved = moveUnit(
          get().units,
          get().unitEvents,
          h.unitId,
          "available",
          "Hold released",
        );
        set({
          holds: get().holds.map((x) => (x.id === holdId ? { ...x, status: "released" } : x)),
          units: moved.units,
          unitEvents: moved.events,
        });
        get().log("Hold released", h.unitId);
        return null;
      },
      bookHold: (holdId, value) => {
        const h = get().holds.find((x) => x.id === holdId);
        if (!h || h.status !== "held") return "Hold not active.";
        const unit = get().units.find((u) => u.id === h.unitId);
        if (!unit) return "Unit not found.";
        const agent = get().agents.find((a) => a.id === h.agentId);
        const needsApproval = Boolean(agent && !agent.inHouse);
        const pending = get().approvals.some(
          (a) => a.kind === "Hold booking" && a.refId === holdId && a.status === "pending",
        );
        if (needsApproval && !h.bookingRequested) {
          if (pending) return "This hold is already waiting in Approvals.";
          const approval: Approval = {
            id: uid("a"),
            kind: "Hold booking",
            title: `Hold → booking · ${unit.code} · ${h.customer}`,
            projectId: h.projectId,
            amount: value,
            waitingOn: "Sales Manager / MD",
            agingDays: 0,
            status: "pending",
            refId: holdId,
            context: `${agent?.name ?? "Agent"} requested booking at ${value}. Unit stays locked until approved.`,
          };
          set({
            approvals: [approval, ...get().approvals],
            holds: get().holds.map((x) =>
              x.id === holdId ? { ...x, bookingRequested: true, bookingValue: value } : x,
            ),
          });
          get().log("Hold booking sent for approval", unit.code);
          return null;
        }
        const err = get().addBooking({
          projectId: h.projectId,
          unit: unit.code,
          customer: h.customer,
          value: value || h.bookingValue || 0,
          partnerId: agent?.companyId,
        });
        if (err) return err;
        set({
          holds: get().holds.map((x) =>
            x.id === holdId ? { ...x, status: "booked", bookingRequested: false } : x,
          ),
        });
        get().log("Hold converted to booking", unit.code);
        return null;
      },
      fileDailyReport: (input) => {
        const exists = refuseDailyReport(get().dailyReports, input.agentId);
        if (exists) return exists;
        const row: DailyReport = {
          id: uid("dr"),
          date: todayIso(),
          holds: 0,
          bookings: 0,
          cancellations: 0,
          ...input,
        };
        set({ dailyReports: [row, ...get().dailyReports] });
        get().log("Daily sales report", input.agentId);
        return null;
      },
      ingestLead: (input) => {
        const entityErr = projectEntityError(get(), input.projectId);
        if (entityErr) return entityErr;
        const lock = exclusiveChannelError(get(), input.projectId, input.partnerId);
        if (lock) return lock;
        const phone = normalizePhone(input.phone);
        const dup = findDuplicate(get().leads, phone, input.projectId);
        if (dup) return `Duplicate lead on ${dup.phone} — already ${dup.stage}.`;
        const unit = get().units.find((u) => u.code === input.unit);
        const model = get().scoreModels.find((m) => m.active) ?? get().scoreModels[0];
        const scored = scoreLead({ ...input, stage: "inquiry" }, unit, [], get().activeScoreModel);
        const cu = upsertCustomer(get().customers, input.name, phone, input.source);
        const row: Lead = {
          ...input,
          phone,
          id: uid("ld"),
          stage: "inquiry",
          customerId: cu.id,
          score: scored.score,
          band: scored.band,
          scoreReasons: scored.reasons,
          scoreModel: scored.model,
        };
        const mem = rememberScore(
          row.id,
          scored,
          get().scoreHistory,
          get().leadFeatures,
          model?.id ?? "m_hybrid",
          "arrival",
          input.source,
        );
        set({
          leads: [{ ...row, ...mem.stamp }, ...get().leads],
          scoreHistory: mem.history,
          leadFeatures: mem.features,
          customers: cu.customers,
        });
        get().log("Ingested lead", `${row.name} · ${row.band} ${row.score}`);
        queueNativeScore(row.id, "arrival", input.source);
        return null;
      },
      ingestFromRequest: (input) => {
        const phone = normalizePhone(input.phone);
        const dup = findDuplicate(get().leads, phone, input.projectId);
        const err = get().ingestLead({
          projectId: input.projectId,
          name: input.name,
          phone,
          source: input.source,
          unit: input.unit ?? "",
          note: input.note ?? "",
          budget: input.budget,
          partnerId: input.partnerId,
          agentId: input.agentId,
          kind: input.kind,
        });
        if (!err) {
          const lead = get().leads.find(
            (l) => normalizePhone(l.phone) === phone && l.projectId === input.projectId,
          );
          return { ok: true, leadId: lead?.id };
        }
        return ingestErrorToResult(err, dup?.id);
      },
      pullPortalJournal: async () => {
        try {
          const res = await fetch("/api/ingest/journal");
          if (!res.ok) return { pulled: 0, errors: [`journal HTTP ${res.status}`] };
          const body = (await res.json()) as {
            events?: Array<{
              id: string;
              at: string;
              portal: string;
              ingest?: IngestRequest;
            }>;
          };
          const events = body.events ?? [];
          const acked: string[] = [];
          const errors: string[] = [];
          let pulled = 0;
          for (const ev of events) {
            if (!ev.ingest) continue;
            const r = get().ingestFromRequest(ev.ingest);
            const kind = (
              ["99acres", "magicbricks", "housing", "email"].includes(ev.ingest.source)
                ? ev.ingest.source
                : ev.portal
            ) as InboundEvent["kind"];
            const row: InboundEvent = {
              id: ev.id,
              at: ev.at,
              kind,
              status: r.ok || r.duplicateOf ? "applied" : "queued",
              projectId: ev.ingest.projectId,
              phone: ev.ingest.phone,
              name: ev.ingest.name,
              note: ev.ingest.note ?? "",
              leadId: r.leadId ?? r.duplicateOf,
            };
            set({ inbound: [row, ...get().inbound.filter((x) => x.id !== row.id)] });
            if (r.ok || r.duplicateOf) {
              acked.push(ev.id);
              pulled += 1;
            } else if (r.error) errors.push(r.error);
          }
          if (acked.length) {
            await fetch("/api/ingest/ack", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ ids: acked }),
            });
          }
          if (pulled) get().log("Portal journal pulled", `${pulled} event(s)`);
          return { pulled, errors };
        } catch (err) {
          return {
            pulled: 0,
            errors: [err instanceof Error ? err.message : "journal pull failed"],
          };
        }
      },
      rescoreLead: (leadId, activity) => {
        const l = get().leads.find((x) => x.id === leadId);
        if (!l) return "Lead not found.";
        const unit = get().units.find((u) => u.code === l.unit);
        const act: LeadActivity | undefined = activity
          ? {
              id: uid("la"),
              leadId,
              at: nowIso(),
              kind: activity,
              note: `${activity} engagement`,
            }
          : undefined;
        const acts = act
          ? [act, ...get().leadActivities.filter((a) => a.leadId === leadId)]
          : get().leadActivities.filter((a) => a.leadId === leadId);
        const model = get().scoreModels.find((m) => m.active) ?? get().scoreModels[0];
        const scored = scoreLead(l, unit, acts, get().activeScoreModel);
        const mem = rememberScore(
          leadId,
          scored,
          get().scoreHistory,
          get().leadFeatures,
          model?.id ?? "m_hybrid",
          "engagement",
          activity || "rescore",
        );
        set({
          leads: get().leads.map((x) => (x.id === leadId ? { ...x, ...mem.stamp } : x)),
          leadActivities: act ? [act, ...get().leadActivities] : get().leadActivities,
          scoreHistory: mem.history,
          leadFeatures: mem.features,
        });
        get().log("Lead re-scored", `${l.name} · ${scored.band}`);
        queueNativeScore(leadId, "engagement", activity || "rescore");
        return null;
      },
      setUnitDispute: (unitId) => {
        const u = get().units.find((x) => x.id === unitId);
        if (!u) return "Unit not found.";
        const moved = moveUnit(get().units, get().unitEvents, unitId, "dispute", "Marked dispute");
        set({ units: moved.units, unitEvents: moved.events });
        get().log("Unit dispute", u.code);
        return null;
      },
      advanceHandover: (id) => {
        const h = get().handovers.find((x) => x.id === id);
        if (!h) return "Handover not found.";
        if (h.status === "snagging") {
          if (h.oc !== "received") return "OC/CC must be received before possession.";
          const open = get().snags.filter((s) => s.unit === h.unit && s.status === "open").length;
          if (open > 0) return `${open} snag(s) still open — close them before possession.`;
        }
        const next: Record<HandoverCase["status"], HandoverCase["status"] | undefined> = {
          snagging: "possession",
          possession: "society",
          society: "defect",
          defect: undefined,
        };
        const status = next[h.status];
        if (!status) return "Handover already at last stage.";
        set({ handovers: get().handovers.map((x) => (x.id === id ? { ...x, status } : x)) });
        get().log(`Handover ${status}`, h.unit);
        return null;
      },
      setScoreModel: (kind) => {
        set({
          activeScoreModel: kind,
          scoreModels: get().scoreModels.map((m) => ({
            ...m,
            active: m.algorithm === kind || m.kind === kind,
            isActive: m.algorithm === kind || m.kind === kind,
          })),
        });
        get().log("Scoring model selected", kind);
        if (kind === "catboost") {
          get()
            .leads.filter((l) => l.stage !== "won" && l.stage !== "lost")
            .forEach((l) => queueNativeScore(l.id, "model_switch", "catboost"));
        }
      },
      scheduleVisit: (input) => {
        const l = get().leads.find((x) => x.id === input.leadId);
        if (!l) return "Lead not found.";
        const row: SiteVisit = {
          id: uid("sv"),
          leadId: l.id,
          projectId: l.projectId,
          unit: l.unit,
          scheduled: input.scheduled,
          status: "scheduled",
          note: input.note,
        };
        set({ siteVisits: [row, ...get().siteVisits] });
        get().log("Site visit scheduled", `${l.name} · ${row.scheduled}`);
        get().fireWaTrigger("visit_scheduled", l.id);
        return null;
      },
      completeVisit: (id, result) => {
        const v = get().siteVisits.find((x) => x.id === id);
        if (!v) return "Visit not found.";
        set({
          siteVisits: get().siteVisits.map((x) => (x.id === id ? { ...x, status: result } : x)),
        });
        if (result === "done") {
          const l = get().leads.find((x) => x.id === v.leadId);
          if (l && (l.stage === "inquiry" || l.stage === "contacted" || l.stage === "qualified")) {
            get().advanceLead(l.id);
          }
          get().rescoreLead(v.leadId, "visit");
        }
        get().log(`Site visit ${result}`, v.leadId);
        return null;
      },
      toggleBookingDoc: (id) => {
        const d = get().bookingDocs.find((x) => x.id === id);
        if (!d) return "Checklist item not found.";
        const status = d.status === "open" ? "received" : "open";
        set({ bookingDocs: get().bookingDocs.map((x) => (x.id === id ? { ...x, status } : x)) });
        get().log(`Booking document ${status}`, d.title);
        return null;
      },
      setHandoverOc: (id) => {
        const h = get().handovers.find((x) => x.id === id);
        if (!h) return "Handover not found.";
        set({
          handovers: get().handovers.map((x) => (x.id === id ? { ...x, oc: "received" } : x)),
        });
        get().log("OC/CC received", h.unit);
        return null;
      },
      setHandoverOcForProject: (projectId) => {
        const rows = get().handovers.filter(
          (h) => h.projectId === projectId && h.oc !== "received",
        );
        if (!rows.length)
          return "Every unit on this project already has permission to live, or none are in handover.";
        set({
          handovers: get().handovers.map((h) =>
            h.projectId === projectId ? { ...h, oc: "received" } : h,
          ),
        });
        get().log("OC/CC received for project", `${projectId} · ${rows.length} units`);
        return null;
      },
      acceptInbound: (id) => {
        const row = get().inbound.find((x) => x.id === id);
        if (!row) return "Inbound event not found.";
        if (row.status !== "queued") return "Already processed.";
        if (row.kind === "whatsapp") {
          const lead = row.leadId
            ? get().leads.find((l) => l.id === row.leadId)
            : get().leads.find((l) => l.phone === row.phone);
          if (!lead) return "No matching lead for this WhatsApp reply.";
          const err = get().receiveWhatsApp(lead.id, row.note);
          if (err) return err;
        } else if (row.kind === "razorpay") {
          if (!row.bookingId) return "Payment event has no booking.";
          const err = get().collect(row.bookingId, 84_500);
          if (err) return err;
        } else if (row.kind === "esign") {
          const doc = get().bookingDocs.find(
            (d) =>
              d.bookingId === row.bookingId && d.title.includes("Agreement") && d.status === "open",
          );
          if (!doc) return "No open agreement to mark e-signed.";
          const err = get().toggleBookingDoc(doc.id);
          if (err) return err;
        } else {
          const source = row.kind === "email" || row.kind === "webhook" ? "website" : row.kind;
          const err = get().ingestLead({
            projectId: row.projectId ?? "p_av",
            name: row.name ?? "Portal lead",
            phone: row.phone ?? uid("ph"),
            source,
            unit: "",
            note: row.note,
          });
          if (err) return err;
        }
        const lead = get().leads.find((l) => l.phone === row.phone);
        set({
          inbound: get().inbound.map((x) =>
            x.id === id ? { ...x, status: "applied", leadId: lead?.id ?? x.leadId } : x,
          ),
        });
        get().log("Inbound applied", row.kind);
        return null;
      },
      rejectInbound: (id) => {
        const row = get().inbound.find((x) => x.id === id);
        if (!row) return "Inbound event not found.";
        set({
          inbound: get().inbound.map((x) => (x.id === id ? { ...x, status: "rejected" } : x)),
        });
        get().log("Inbound rejected", row.kind);
        return null;
      },
      inviteAgent: (input) => {
        if (!input.name.trim() || !input.phone.trim()) return "Name and phone required.";
        const row: SalesAgent = {
          id: uid("ag"),
          name: input.name.trim(),
          phone: input.phone.trim(),
          companyId: input.companyId,
          inHouse: false,
          status: "invited",
        };
        set({ agents: [row, ...get().agents] });
        get().log("Invited channel agent", row.name);
        return null;
      },
      setAgentStatus: (id, status) => {
        const a = get().agents.find((x) => x.id === id);
        if (!a) return "Agent not found.";
        set({ agents: get().agents.map((x) => (x.id === id ? { ...x, status } : x)) });
        get().log(`Agent ${status}`, a.name);
        return null;
      },
      sendWhatsApp: (input) => {
        const tpl = get().waTemplates.find((t) => t.id === input.templateId);
        const lead = get().leads.find((l) => l.id === input.leadId);
        const gated = refuseSend(tpl, lead, Boolean(lead?.waConsent));
        if (gated || !tpl || !lead) return gated ?? "Cannot send.";
        const body = fillTemplate(tpl.body, leadValues(lead, tpl.samples.slice(2)));
        const row: WaSend = {
          id: uid("wa"),
          templateId: tpl.id,
          to: lead.phone,
          at: nowIso(),
          body,
          leadId: lead.id,
          direction: "out",
        };
        const notice: SalesNotice = {
          id: uid("nt"),
          at: row.at,
          title: `WhatsApp out · ${tpl.name} · ${lead.name}`,
          to: "/app/sales/whatsapp",
        };
        set({ waSends: [row, ...get().waSends], notices: [notice, ...get().notices].slice(0, 20) });
        get().rescoreLead(lead.id, tpl.trigger === "brochure" ? "brochure" : "whatsapp");
        get().log(`WhatsApp ${tpl.name}`, lead.phone);
        return null;
      },
      fireWaTrigger: (trigger, leadId) => {
        const tpl = templateByTrigger(get().waTemplates, trigger);
        if (!tpl) return "No approved template for this trigger.";
        return get().sendWhatsApp({ templateId: tpl.id, leadId });
      },
      receiveWhatsApp: (leadId, text) => {
        const lead = get().leads.find((l) => l.id === leadId);
        if (!lead) return "Lead not found.";
        const row: WaSend = {
          id: uid("wa"),
          templateId: "in",
          to: lead.phone,
          at: nowIso(),
          body: text.trim(),
          leadId: lead.id,
          direction: "in",
        };
        const notice: SalesNotice = {
          id: uid("nt"),
          at: row.at,
          title: `WhatsApp in · ${lead.name}`,
          to: "/app/sales/whatsapp",
        };
        set({ waSends: [row, ...get().waSends], notices: [notice, ...get().notices].slice(0, 20) });
        const kind = readReply(text);
        if (
          kind === "confirm" &&
          (lead.stage === "inquiry" || lead.stage === "contacted" || lead.stage === "qualified")
        ) {
          get().advanceLead(lead.id);
        }
        if (kind === "qualify" && (lead.stage === "inquiry" || lead.stage === "contacted")) {
          get().advanceLead(lead.id);
        }
        get().rescoreLead(lead.id, "whatsapp");
        get().log("WhatsApp inbound", `${lead.name} · ${kind}`);
        return null;
      },
      toggleWaConsent: (leadId) => {
        const l = get().leads.find((x) => x.id === leadId);
        if (!l) return "Lead not found.";
        set({
          leads: get().leads.map((x) => (x.id === leadId ? { ...x, waConsent: !x.waConsent } : x)),
        });
        get().log(l.waConsent ? "WhatsApp consent withdrawn" : "WhatsApp consent recorded", l.name);
        return null;
      },
      runCompanyDay: async () => {
        const { executeCompanyDay } = await import("./company-day");
        const report = await executeCompanyDay();
        set({ companyDay: report });
        get().log(
          "Company day (local test)",
          `${report.passed} passed · ${report.failed} failed · not live`,
        );
        return report;
      },
    }),
    {
      name: "atlas3-dukia-v1",
      version: 5,
      migrate: (persisted) => migratePersisted(persisted),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AtlasState>;
        return {
          ...current,
          ...p,
          fundingSanctions: (() => {
            const cur = p.fundingSanctions?.length
              ? p.fundingSanctions
              : (current.fundingSanctions ?? []);
            const have = new Set(cur.map((f) => f.projectId));
            return [...cur, ...FUNDING.filter((f) => !have.has(f.projectId))];
          })(),
          drawings: p.drawings ?? current.drawings ?? [],
          entityByUser: p.entityByUser ?? current.entityByUser ?? {},
        };
      },
    },
  ),
);

/**
 * Point the app's clock at the trial date. Keeps real time-of-day so events
 * within a simulated day still order correctly.
 */
registerClock(() => {
  const sim = useAtlas.getState().simDate;
  if (!sim) return new Date();
  return new Date(`${sim}T${new Date().toISOString().slice(11)}`);
});

/**
 * Dev-only bridge for the company-trial harness (`scripts/trial/session.mjs`),
 * which drives the clock and asserts continuity between seats. Stripped from
 * production builds by the `import.meta.env.DEV` guard.
 */
if (typeof window !== "undefined" && import.meta.env.DEV) {
  (window as unknown as { __atlasStore?: typeof useAtlas }).__atlasStore = useAtlas;
}
