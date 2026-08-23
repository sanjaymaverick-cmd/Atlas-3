export type Role = "owner" | "pm" | "engineer" | "accountant";

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
  waitingOn: string;
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

export interface Booking {
  id: string;
  projectId: string;
  unit: string;
  customer: string;
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

export type LeadStage = "inquiry" | "visit" | "negotiation" | "won" | "lost";

export interface Lead {
  id: string;
  projectId: string;
  name: string;
  phone: string;
  source: string;
  partnerId?: string;
  stage: LeadStage;
  unit: string;
  note: string;
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
