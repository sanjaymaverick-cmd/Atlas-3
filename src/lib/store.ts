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
} from "./extra-seed";
import { COMMISSIONS, HOSTS, LEADS, PARTNERS, PAYMENTS, SNAGS } from "./crm-seed";
import type {
  Approval,
  AuditEvent,
  Booking,
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
  LeadStage,
  Commission,
  PaymentStep,
  Snag,
  HostSite,
  Rfq,
  Quote,
} from "./types";
import { todayIso, uid } from "./utils";
import type { CompanyDayReport } from "./company-day";

interface AtlasState {
  user: User | null;
  entityId: string;
  projectId: string | "all";
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
  audit: AuditEvent[];
  signIn: (role: Role) => void;
  signInLocal: (email: string, password: string) => string | null;
  signOut: () => void;
  setEntity: (id: string) => void;
  setProject: (id: string | "all") => void;
  createProject: (p: Omit<Project, "id" | "spent" | "progress" | "sold">) => void;
  addDiary: (entry: Omit<DiaryEntry, "id" | "author">) => string | null;
  decideApproval: (id: string, status: "approved" | "rejected") => string | null;
  advanceVendor: (id: string) => string | null;
  inviteVendor: (input: { name: string; trade: string; city: string; gstin: string }) => void;
  scheduleInspection: (input: { projectId: string; template: string; location: string }) => void;
  cancelBooking: (id: string) => string | null;
  createPO: (input: { projectId: string; vendorId: string; title: string; amount: number; quoteId?: string; rfqId?: string }) => string | null;
  createRfq: (input: { projectId: string; title: string; package: string; due: string; required?: boolean }) => void;
  submitQuote: (input: { rfqId: string; vendorId: string; amount: number; validity: string; exclusions: string }) => string | null;
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
  }) => void;
  clearQuarantine: (documentId: string) => string | null;
  issueDocument: (documentId: string) => string | null;
  addRevision: (documentId: string, notes: string) => string | null;
  requestExport: (documentId: string) => string | null;
  consumeExport: (grantId: string) => string | null;
  setDiligence: (id: string, status: DiligenceItem["status"]) => void;
  fileObligation: (id: string) => void;
  payEmi: (id: string) => string | null;
  acquireParcel: (id: string) => string | null;
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
  addLead: (input: Omit<Lead, "id" | "stage">) => void;
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
}

const VENDOR_NEXT: Record<string, Vendor["stage"] | undefined> = {
  invited: "kyc",
  kyc: "verified",
  verified: "bank",
  bank: "compliance",
  compliance: "approval",
  approval: "active",
};

function nextRev(current: string) {
  const n = Number(current.replace(/\D/g, "")) || 0;
  return `R${n + 1}`;
}

export const useAtlas = create<AtlasState>()(
  persist(
    (set, get) => ({
      user: null,
      entityId: "le_llp",
      projectId: "all",
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
      audit: AUDIT,
      companyDay: null,
      signIn: (role) => {
        const found = USERS.find((u) => u.role === role && u.id !== "u_test") ?? USERS[0];
        set({ user: { ...found, password: "" } });
        get().log("Signed in", found.title);
      },
      signInLocal: (email, password) => {
        const found = USERS.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
        if (!found || found.password !== password) return "Email or password is wrong. Local test accounts only.";
        set({ user: { ...found, password: "" } });
        get().log("Signed in (local test)", found.email);
        return null;
      },
      signOut: () => set({ user: null }),
      setEntity: (id) => set({ entityId: id, projectId: "all" }),
      setProject: (id) => set({ projectId: id }),
      log: (action, entity) => {
        const actor = get().user?.name ?? "System";
        const event: AuditEvent = {
          id: uid("au"),
          at: new Date().toISOString(),
          actor,
          action,
          entity,
        };
        set({ audit: [event, ...get().audit].slice(0, 80) });
      },
      createProject: (p) => {
        const project: Project = { ...p, id: uid("p"), spent: 0, progress: 0, sold: 0 };
        set({ projects: [project, ...get().projects] });
        get().log("Created project", project.name);
      },
      addDiary: (entry) => {
        const exists = get().diaries.some(
          (d) => d.projectId === entry.projectId && d.date === entry.date && d.deviceKey === entry.deviceKey,
        );
        if (exists) return "A diary for this device and date already exists.";
        const row: DiaryEntry = {
          ...entry,
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
            vendors: get().vendors.map((v) => (v.id === item.refId ? { ...v, stage: "active" } : v)),
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
              c.id === item.refId ? { ...c, status: status === "approved" ? "approved" : "rejected" } : c,
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
        get().log(status === "approved" ? "Approved" : "Rejected", item.title);
        return null;
      },
      advanceVendor: (id) => {
        const v = get().vendors.find((x) => x.id === id);
        if (!v) return "Vendor not found.";
        const next = VENDOR_NEXT[v.stage];
        if (!next) return "No further stage.";
        if (next === "verified" && (!v.gstin || v.gstin === "—")) {
          return "GSTIN is required before verification.";
        }
        if (next === "active") {
          const approval: Approval = {
            id: uid("a"),
            kind: "Vendor",
            title: `Activate ${v.name}`,
            projectId: get().projects[0]?.id ?? "p_kanak",
            waitingOn: "Managing Director",
            agingDays: 0,
            status: "pending",
            refId: v.id,
          };
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
        set({
          bookings: get().bookings.map((x) => (x.id === id ? { ...x, status: "cancelled" } : x)),
        });
        get().log("Cancelled booking", b.unit);
        return null;
      },
      createPO: (input) => {
        const vendor = get().vendors.find((v) => v.id === input.vendorId);
        if (!vendor || vendor.stage !== "active") {
          return "Purchase orders cannot be issued until the vendor is Active.";
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
        };
        set({ quotes: [row, ...get().quotes] });
        get().log("Quote submitted", `${vendor.name} · ${rfq.title}`);
        return null;
      },
      selectQuote: (quoteId) => {
        const q = get().quotes.find((x) => x.id === quoteId);
        if (!q) return "Quote not found.";
        const rfq = get().rfqs.find((r) => r.id === q.rfqId);
        if (!rfq || rfq.status !== "open") return "RFQ is not open.";
        const vendor = get().vendors.find((v) => v.id === q.vendorId);
        if (!vendor || vendor.stage !== "active") {
          return "Cannot select a quote from a vendor that is not Active.";
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
          rfqs: get().rfqs.map((r) => (r.id === q.rfqId ? { ...r, status: "awarded" as const } : r)),
        });
        get().log("Quote selected", vendor.name);
        return null;
      },
      createPOFromQuote: (quoteId) => {
        const q = get().quotes.find((x) => x.id === quoteId);
        if (!q) return "Quote not found.";
        if (q.status !== "selected") return "Select the quote before creating a PO.";
        if (get().pos.some((p) => p.quoteId === quoteId)) return "A PO already exists for this quote.";
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
        const clash = get().bookings.find(
          (x) => x.projectId === b.projectId && x.unit === b.unit && (x.status === "active" || x.status === "possession"),
        );
        if (clash) return `Unit ${b.unit} already has an active booking.`;
        const row: Booking = { ...b, id: uid("b"), collected: 0, status: "active" };
        set({ bookings: [row, ...get().bookings] });
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
          decisions: get().decisions.map((d) =>
            d.id === id ? { ...d, status: "open" } : d,
          ),
        });
      },
      registerDocument: (input) => {
        const actor = get().user?.name ?? "User";
        const payload = `${input.title}|${todayIso()}|${actor}`;
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
              notes: "Registered — in malware quarantine",
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
            e.id === grantId ? { ...e, status: "used", usedAt: new Date().toISOString() } : e,
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
      fileObligation: (id) => {
        const o = get().obligations.find((x) => x.id === id);
        if (!o) return;
        set({ obligations: get().obligations.map((x) => (x.id === id ? { ...x, status: "filed" } : x)) });
        get().log("Filed obligation", o.title);
      },
      payEmi: (id) => {
        const e = get().emis.find((x) => x.id === id);
        if (!e) return "Instalment not found.";
        if (e.status === "paid") return "Already paid.";
        set({ emis: get().emis.map((x) => (x.id === id ? { ...x, status: "paid" } : x)) });
        get().log("Recorded EMI (ops. ref — Tally remains books)", String(e.amount));
        return null;
      },
      acquireParcel: (id) => {
        const parcel = get().parcels.find((x) => x.id === id);
        if (!parcel) return "Parcel not found.";
        const open = get().diligence.filter((d) => d.parcelId === id && d.status !== "clear");
        if (open.length) return "All due-diligence items must be clear before acquisition.";
        set({ parcels: get().parcels.map((x) => (x.id === id ? { ...x, status: "acquired" } : x)) });
        get().log("Land acquired", parcel.name);
        return null;
      },
      executeContract: (id, evidenceId) => {
        const c = get().contracts.find((x) => x.id === id);
        if (!c) return "Contract not found.";
        if (c.status !== "approved" && c.status !== "execution") return "Contract must be Approved before execution.";
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
          materials: get().materials.map((x) => (x.id === id ? { ...x, received: x.received + qty } : x)),
        });
        get().log("Material received", `${m.name} +${qty}`);
      },
      issueMaterial: (id, qty) => {
        const m = get().materials.find((x) => x.id === id);
        if (!m) return "Material not found.";
        if (m.issued + qty > m.received) return "Cannot issue more than accepted receipts.";
        set({
          materials: get().materials.map((x) => (x.id === id ? { ...x, issued: x.issued + qty } : x)),
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
        if (b.collected < b.value) return "Possession requires the payment plan to be fully collected.";
        set({
          bookings: get().bookings.map((x) => (x.id === id ? { ...x, status: "possession" } : x)),
        });
        get().log("Possession recorded", b.unit);
        return null;
      },
      settleTally: (id, status) => {
        const row = get().tally.find((x) => x.id === id);
        if (!row) return;
        set({ tally: get().tally.map((x) => (x.id === id ? { ...x, status } : x)) });
        get().log(`Tally case ${status}`, row.title);
      },
      draftAdvice: (prompt) => {
        const hosting = get().decisions.find((d) => d.id === "ai_hosting");
        if (!hosting || hosting.status !== "recorded") {
          return "AI is fail-closed. Record the AI hosting decision before any draft is produced.";
        }
        const draft =
          `ADVISORY ONLY — not an approval.\n\nQuestion: ${prompt.trim()}\n\nRecommended next human step:\n1. Confirm evidence in Documents.\n2. If money or possession is involved, raise an Approval.\n3. Do not treat this note as a decision.\n\nAuthority: Level 2 drafting. Atlas will not pay, sign, send, or delete.`;
        const note: AssistantNote = {
          id: uid("ai"),
          at: new Date().toISOString(),
          prompt: prompt.trim(),
          draft,
          level: 2,
        };
        set({ notes: [note, ...get().notes] });
        get().log("AI draft created (advisory)", prompt.slice(0, 48));
        return null;
      },
      addLead: (input) => {
        const row: Lead = { ...input, id: uid("ld"), stage: "inquiry" };
        set({ leads: [row, ...get().leads] });
        get().log("Captured lead", row.name);
      },
      advanceLead: (id) => {
        const l = get().leads.find((x) => x.id === id);
        if (!l) return "Lead not found.";
        const next: Record<LeadStage, LeadStage | undefined> = {
          inquiry: "visit",
          visit: "negotiation",
          negotiation: "negotiation",
          won: undefined,
          lost: undefined,
        };
        const stage = next[l.stage];
        if (!stage || stage === l.stage) return "Convert to booking instead of advancing.";
        set({ leads: get().leads.map((x) => (x.id === id ? { ...x, stage } : x)) });
        get().log(`Lead moved to ${stage}`, l.name);
        return null;
      },
      loseLead: (id) => {
        const l = get().leads.find((x) => x.id === id);
        if (!l) return;
        set({ leads: get().leads.map((x) => (x.id === id ? { ...x, stage: "lost" } : x)) });
        get().log("Lead lost", l.name);
      },
      convertLead: (id, value) => {
        const l = get().leads.find((x) => x.id === id);
        if (!l) return "Lead not found.";
        if (l.stage === "lost" || l.stage === "won") return "This lead is closed.";
        if (!l.unit) return "Unit interest is required to convert.";
        const clash = get().bookings.find(
          (x) => x.projectId === l.projectId && x.unit === l.unit && (x.status === "active" || x.status === "possession"),
        );
        if (clash) return `Unit ${l.unit} already has an active booking.`;
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
        const steps: PaymentStep[] = [
          { id: uid("py"), bookingId: booking.id, label: "Booking token", due: todayIso(), amount: token, paid: 0 },
          { id: uid("py"), bookingId: booking.id, label: "Agreement", due: todayIso(), amount: token, paid: 0 },
          { id: uid("py"), bookingId: booking.id, label: "Construction", due: todayIso(), amount: Math.round(value * 0.4), paid: 0 },
          { id: uid("py"), bookingId: booking.id, label: "Possession", due: todayIso(), amount: value - token * 2 - Math.round(value * 0.4), paid: 0 },
        ];
        let commissions = get().commissions;
        const partner = l.partnerId ? get().partners.find((p) => p.id === l.partnerId) : undefined;
        if (partner && partner.status === "active") {
          commissions = [
            {
              id: uid("cm"),
              partnerId: partner.id,
              bookingId: booking.id,
              projectId: l.projectId,
              amount: Math.round((value * partner.rate) / 100),
              status: "accrued",
            },
            ...commissions,
          ];
        }
        set({
          bookings: [booking, ...get().bookings],
          leads: get().leads.map((x) => (x.id === id ? { ...x, stage: "won" } : x)),
          payments: [...steps, ...get().payments],
          commissions,
        });
        get().log("Converted lead to booking", `${l.name} · ${l.unit}`);
        return null;
      },
      addPartner: (input) => {
        const row: Partner = { id: uid("pt"), status: "invited", ...input };
        set({ partners: [row, ...get().partners] });
        get().log("Added channel partner", row.name);
      },
      activatePartner: (id) => {
        set({ partners: get().partners.map((p) => (p.id === id ? { ...p, status: "active" } : p)) });
        get().log("Activated partner", id);
      },
      requestCommission: (id) => {
        const c = get().commissions.find((x) => x.id === id);
        if (!c) return "Commission not found.";
        if (c.status !== "accrued") return "Only accrued commission can be sent for approval.";
        if (get().approvals.some((a) => a.kind === "Commission" && a.refId === id && a.status === "pending")) {
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
        set({ vendors: get().vendors.map((x) => (x.id === id ? { ...x, gstin: gstin.trim() } : x)) });
        get().log("Vendor GSTIN recorded", v.name);
        return null;
      },
      addSnag: (input) => {
        const row: Snag = { ...input, id: uid("sg"), status: "open" };
        set({ snags: [row, ...get().snags] });
        get().log("Raised snag", input.title);
      },
      closeSnag: (id) => {
        set({ snags: get().snags.map((s) => (s.id === id ? { ...s, status: "closed" } : s)) });
        get().log("Closed snag", id);
      },
      markHostReady: (id) => {
        set({ hosts: get().hosts.map((h) => (h.id === id ? { ...h, status: "ready" } : h)) });
        get().log("Host marked ready (local ops)", id);
      },
      runCompanyDay: async () => {
        const { executeCompanyDay } = await import("./company-day");
        const report = await executeCompanyDay();
        set({ companyDay: report });
        get().log("Company day (local test)", `${report.passed} passed · ${report.failed} failed · not live`);
        return report;
      },
    }),
    { name: "atlas3-company-day-v1" },
  ),
);
