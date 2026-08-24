import type { WaitingOn } from "./waiting-on";

export type { WaitingOn };

export type Role =
  | "owner"
  | "pm"
  | "engineer"
  | "supervisor"
  | "accountant"
  | "commercial"
  | "sales"
  | "legal"
  | "docs"
  | "stores"
  | "channel"
  | "channel_admin";

export type WorkflowStatus =
  | "draft"
  | "submitted"
  | "review"
  | "clarification"
  | "approved"
  | "execution"
  | "executed"
  | "closed"
  | "rejected"
  | "cancelled";

export type VendorStage =
  | "invited"
  | "kyc"
  | "verified"
  | "bank"
  | "compliance"
  | "approval"
  | "active"
  | "suspended";

export type DecisionId =
  | "ai_hosting"
  | "kms"
  | "rto_rpo"
  | "break_glass"
  | "warm_standby"
  | "crm";

export type DocKind = "Drawing" | "Statutory" | "Report" | "Spec" | "Contract";
export type DocClass = "internal" | "confidential" | "restricted";
export type DocStatus = "quarantine" | "review" | "approved" | "issued" | "superseded";

export interface User {
  id: string;
  name: string;
  role: Role;
  title: string;
  email: string;
  password: string;
  /** Distinguishes MD from group Directors who share the owner role. */
  grade?: "md" | "director";
}

export interface LegalEntity {
  id: string;
  name: string;
  kind: string;
  gstin: string;
}

export interface Project {
  id: string;
  entityId: string;
  name: string;
  code: string;
  city: string;
  type: "residential" | "commercial" | "mixed";
  status: "planning" | "construction" | "handover" | "closed";
  budget: number;
  spent: number;
  progress: number;
  units: number;
  sold: number;
  start: string;
  possession: string;
  /** Remaining work still expected (not yet in JTD spent). */
  forecast: number;
  /** Concept / land — planned is not committed capital until acquire/approve. */
  concept: boolean;
  constructionStart?: string;
  constructionEnd?: string;
  /** Channel firm locked to this project. Other brokers cannot hold or book. */
  exclusivePartnerId?: string;
  launchedAt?: string;
  priceListFrozen?: boolean;
}

export interface FundingSanction {
  id: string;
  projectId: string;
  bank: string;
  sanctionNo: string;
  loanPct: number;
  equityPct: number;
  amount: number;
  status: "draft" | "sanctioned" | "disbursing" | "closed";
}

export interface ParcelAcquireDetails {
  considerationInr: number;
  saleDeedNo: string;
  saleDeedDate?: string;
  advocateName?: string;
}

export interface OwnerTodo {
  id: string;
  title: string;
  detail: string;
  status: "open" | "recorded";
}

export interface DocumentRevision {
  id: string;
  revision: string;
  sha256: string;
  uploadedAt: string;
  uploadedBy: string;
  notes: string;
}

export interface Document {
  id: string;
  projectId: string;
  title: string;
  kind: DocKind;
  revision: string;
  classification: DocClass;
  status: DocStatus;
  uploadedAt: string;
  sha256: string;
  pages: number;
  sheet: string;
  revisions: DocumentRevision[];
}

export interface ExportGrant {
  id: string;
  documentId: string;
  revision: string;
  status: "pending" | "granted" | "used" | "rejected" | "expired";
  requestedBy: string;
  createdAt: string;
  usedAt?: string;
}

export interface Vendor {
  id: string;
  name: string;
  trade: string;
  stage: VendorStage;
  gstin: string;
  city: string;
}

export interface PurchaseOrder {
  id: string;
  projectId: string;
  vendorId: string;
  title: string;
  amount: number;
  status: WorkflowStatus;
  createdAt: string;
  quoteId?: string;
  rfqId?: string;
}

export type RfqStatus = "open" | "awarded" | "cancelled";
export type QuoteStatus = "submitted" | "selected" | "rejected";

export interface Rfq {
  id: string;
  projectId: string;
  title: string;
  package: string;
  due: string;
  status: RfqStatus;
  required: boolean;
}

export interface Quote {
  id: string;
  rfqId: string;
  vendorId: string;
  amount: number;
  validity: string;
  exclusions: string;
  status: QuoteStatus;
  submittedAt: string;
}

export interface Contract {
  id: string;
  projectId: string;
  vendorId: string;
  title: string;
  value: number;
  status: WorkflowStatus;
  evidenceId?: string;
}

export interface Approval {
  id: string;
  kind: string;
  title: string;
  projectId: string;
  amount?: number;
  waitingOn: WaitingOn;
  agingDays: number;
  status: "pending" | "approved" | "rejected";
  refId?: string;
  context?: string;
}

export interface DiaryEntry {
  id: string;
  projectId: string;
  date: string;
  weather: string;
  labour: number;
  labourCivil?: number;
  labourMep?: number;
  labourFinish?: number;
  work: string;
  materials: string;
  safety: string;
  author: string;
  deviceKey: string;
}

export interface Inspection {
  id: string;
  projectId: string;
  template: string;
  location: string;
  result: "pass" | "fail" | "pending";
  date: string;
}

export interface ChangeItem {
  id: string;
  projectId: string;
  kind: "rfi" | "ncr" | "change";
  title: string;
  status: string;
  slaHours?: number;
  severity?: "low" | "medium" | "high" | "critical";
  response?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  pan?: string;
  source?: string;
  createdAt: string;
}

export interface Booking {
  id: string;
  projectId: string;
  unit: string;
  customer: string;
  customerId?: string;
  value: number;
  collected: number;
  status: "active" | "cancelled" | "possession";
  partnerId?: string;
}

export interface TallyCase {
  id: string;
  entityId: string;
  title: string;
  amount: number;
  status: "open" | "review" | "reconciled" | "exception";
}

export interface OwnerDecision {
  id: DecisionId;
  title: string;
  detail: string;
  status: "open" | "recorded";
  note: string;
}

export interface AuditEvent {
  id: string;
  at: string;
  actor: string;
  action: string;
  entity: string;
}

export interface LandParcel {
  id: string;
  projectId: string;
  name: string;
  khasra: string;
  area: string;
  status: "identified" | "diligence" | "acquired" | "closed";
  rera: string;
  loan: number;
  considerationInr?: number;
  saleDeedNo?: string;
  saleDeedDate?: string;
  advocateName?: string;
}

export interface DiligenceItem {
  id: string;
  parcelId: string;
  title: string;
  status: "open" | "clear" | "flagged";
}

export interface Obligation {
  id: string;
  projectId: string;
  kind: "rera" | "labour" | "insurance" | "tax";
  title: string;
  due: string;
  status: "open" | "filed" | "overdue";
  filedRef?: string;
}

export interface Emi {
  id: string;
  parcelId: string;
  due: string;
  amount: number;
  status: "due" | "paid";
}

export interface BudgetLine {
  id: string;
  projectId: string;
  code: string;
  name: string;
  budget: number;
  committed: number;
}

export interface MaterialItem {
  id: string;
  projectId: string;
  name: string;
  unit: string;
  received: number;
  issued: number;
}

export interface QuantityItem {
  id: string;
  projectId: string;
  wbs: string;
  name: string;
  bimQty: number;
  siteQty: number;
  status: "provisional" | "variance" | "approved";
}

export interface AssistantNote {
  id: string;
  at: string;
  prompt: string;
  draft: string;
  level: 1 | 2 | 3 | 4;
}

export interface Partner {
  id: string;
  name: string;
  city: string;
  gstin: string;
  status: "invited" | "active" | "suspended";
  rate: number;
}

export type LeadStage =
  | "inquiry"
  | "contacted"
  | "qualified"
  | "visit"
  | "negotiation"
  | "documentation"
  | "handover"
  | "won"
  | "lost"
  | "nurture";

export type LeadSource =
  | "walk-in"
  | "website"
  | "partner"
  | "99acres"
  | "magicbricks"
  | "housing"
  | "meta"
  | "google";

export type ScoreBand = "hot" | "warm" | "cold";
export type ScoreModelKind = "hybrid" | "xgboost" | "lightgbm" | "catboost";
export type UnitKind = "flat" | "shop" | "plot";
export type UnitStatus = "available" | "held" | "booked" | "sold" | "cancelled" | "dispute";

export interface Lead {
  id: string;
  projectId: string;
  name: string;
  phone: string;
  source: string;
  partnerId?: string;
  agentId?: string;
  customerId?: string;
  stage: LeadStage;
  unit: string;
  note: string;
  budget?: number;
  kind?: UnitKind;
  score?: number;
  band?: ScoreBand;
  scoreReasons?: string[];
  scoreModel?: string;
  currentScore?: number;
  currentBand?: ScoreBand;
  currentProbability?: number;
  currentScoreReasons?: string[];
  currentModelId?: string;
  lastScoredAt?: string;
  waConsent?: boolean;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  at: string;
  kind: string;
  note: string;
}

export interface Tower {
  id: string;
  projectId: string;
  name: string;
  kind: "tower" | "phase" | "pocket";
}

export interface InventoryUnit {
  id: string;
  projectId: string;
  towerId: string;
  code: string;
  kind: UnitKind;
  floor: string;
  area: string;
  price: number;
  status: UnitStatus;
}

export interface UnitEvent {
  id: string;
  unitId: string;
  at: string;
  from: UnitStatus;
  to: UnitStatus;
  note: string;
}

export interface SalesAgent {
  id: string;
  name: string;
  phone: string;
  companyId?: string;
  userId?: string;
  inHouse: boolean;
  status: "active" | "invited" | "suspended";
}

export interface ScoringModel {
  id: string;
  name: string;
  algorithm: ScoreModelKind;
  kind: ScoreModelKind;
  version: string;
  trainedAt?: string;
  metrics: Record<string, number>;
  featureList: string[];
  active: boolean;
  isActive?: boolean;
  createdAt: string;
  notes: string;
  note: string;
}

export interface LeadFeatureRow {
  id: string;
  leadId: string;
  at: string;
  features: Record<string, number>;
}

export interface LeadScoreHistory {
  id: string;
  leadId: string;
  modelId: string;
  at: string;
  scoredAt: string;
  score: number;
  band: ScoreBand;
  probability: number;
  model: string;
  reasons: string[];
  topReasons: string[];
  shapValues: Record<string, number>;
  triggerType: string;
  triggerDetail: string;
}

export interface SiteVisit {
  id: string;
  leadId: string;
  projectId: string;
  unit: string;
  scheduled: string;
  status: "scheduled" | "done" | "no-show";
  note: string;
}

export interface BookingDoc {
  id: string;
  bookingId: string;
  title: string;
  status: "open" | "received";
}

export type InboundKind =
  | "99acres"
  | "magicbricks"
  | "housing"
  | "meta"
  | "google"
  | "whatsapp"
  | "email"
  | "webhook"
  | "razorpay"
  | "esign";

export interface InboundEvent {
  id: string;
  at: string;
  kind: InboundKind;
  status: "queued" | "applied" | "rejected";
  projectId?: string;
  phone?: string;
  name?: string;
  note: string;
  leadId?: string;
  bookingId?: string;
}

export type WaCategory = "utility" | "marketing";
export type WaTrigger =
  | "visit_scheduled"
  | "visit_reminder"
  | "payment_due"
  | "document_request"
  | "construction"
  | "brochure"
  | "channel_broadcast"
  | "launch";

export interface WaTemplate {
  id: string;
  name: string;
  category: WaCategory;
  language: "en" | "hi";
  status: "draft" | "pending" | "approved" | "paused";
  body: string;
  variables: string[];
  samples: string[];
  trigger: WaTrigger;
  quality: "high" | "medium" | "low";
}

export interface WaSend {
  id: string;
  templateId: string;
  to: string;
  at: string;
  body: string;
  leadId?: string;
  direction: "in" | "out";
}

export interface SalesNotice {
  id: string;
  at: string;
  title: string;
  to: string;
}

export interface DailyReport {
  id: string;
  agentId: string;
  date: string;
  calls: number;
  visits: number;
  leads: number;
  holds: number;
  bookings: number;
  cancellations: number;
  notes: string;
}

export interface UnitHold {
  id: string;
  unitId: string;
  projectId: string;
  agentId: string;
  customer: string;
  until: string;
  status: "held" | "booked" | "expired" | "released";
  bookingRequested?: boolean;
  bookingValue?: number;
}

export interface HandoverCase {
  id: string;
  projectId: string;
  unit: string;
  oc: "pending" | "received";
  snagsOpen: number;
  status: "snagging" | "possession" | "society" | "defect";
}

export interface Commission {
  id: string;
  partnerId: string;
  bookingId: string;
  projectId: string;
  amount: number;
  status: "accrued" | "approved" | "paid" | "rejected";
}

export interface PaymentStep {
  id: string;
  bookingId: string;
  label: string;
  due: string;
  amount: number;
  paid: number;
}

export interface Snag {
  id: string;
  projectId: string;
  unit: string;
  title: string;
  status: "open" | "closed";
}

export interface HostSite {
  id: string;
  name: string;
  city: string;
  role: "primary" | "standby";
  status: "named" | "ready" | "drill-due";
}
