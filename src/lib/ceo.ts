import { daysOverdue, daysUntil, todayIso } from "./utils";
import type {
  Approval,
  Booking,
  Commission,
  DiaryEntry,
  DiligenceItem,
  FundingSanction,
  InventoryUnit,
  LandParcel,
  Obligation,
  PaymentStep,
  Project,
  PurchaseOrder,
  Snag,
  UnitHold,
  Vendor,
} from "./types";

export interface CeoRisk {
  id: string;
  label: string;
  to: "/app" | "/app/land" | "/app/commercial" | "/app/approvals" | "/app/site" | "/app/customers" | "/app/finance" | "/app/sales/channel";
  count: number;
}

export interface CeoKpis {
  available: number;
  held: number;
  booked: number;
  possessed: number;
  availableInr: number;
  bookedInr: number;
  collectionsMtd: number;
  overdue61: number;
  overdue90: number;
  openDiligence: number;
  reraDue: number;
  ocWaiting: number;
  snagsOpen: number;
  commissionAccrued: number;
  capitalDeployed: number;
  openPoInr: number;
  vendorsApproval: number;
}

export interface CeoReport {
  asOf: string;
  kpis: CeoKpis;
  risks: CeoRisk[];
  brief: string[];
}

export interface CeoInput {
  projects: Project[];
  units: InventoryUnit[];
  bookings: Booking[];
  payments: PaymentStep[];
  holds: UnitHold[];
  parcels: LandParcel[];
  diligence: DiligenceItem[];
  obligations: Obligation[];
  snags: Snag[];
  commissions: Commission[];
  pos: PurchaseOrder[];
  vendors: Vendor[];
  diaries: DiaryEntry[];
  approvals: Approval[];
  fundingSanctions: FundingSanction[];
}

export function filterProjects(projects: Project[], scope: "group" | { entityId?: string; projectId?: string }) {
  if (scope === "group") return projects;
  return projects.filter((p) => {
    if (scope.projectId && scope.projectId !== "all") return p.id === scope.projectId;
    if (scope.entityId) return p.entityId === scope.entityId;
    return true;
  });
}

export function buildCeoReport(
  input: CeoInput,
  scope: "group" | { entityId?: string; projectId?: string },
  books?: { configured: boolean; reachable: boolean; posted: number },
): CeoReport {
  const asOf = todayIso();
  const month = asOf.slice(0, 7);
  const plist = filterProjects(input.projects, scope);
  const ids = new Set(plist.map((p) => p.id));
  const units = input.units.filter((u) => ids.has(u.projectId));
  const bookings = input.bookings.filter((b) => ids.has(b.projectId));
  const holds = input.holds.filter((h) => ids.has(h.projectId) && h.status === "held");
  const byStatus = (st: InventoryUnit["status"]) => units.filter((u) => u.status === st);
  const available = byStatus("available");
  const heldU = byStatus("held");
  const bookedU = units.filter((u) => u.status === "booked" || u.status === "sold");
  const possessed = bookings.filter((b) => b.status === "possession");
  const overdueDays = bookings.map((b) => {
    const next = input.payments.find((p) => p.bookingId === b.id && p.paid < p.amount);
    return next ? daysOverdue(next.due) : 0;
  });
  const collectionsMtd = input.payments
    .filter((p) => ids.has(bookings.find((b) => b.id === p.bookingId)?.projectId ?? "") && p.paid > 0 && p.due.startsWith(month))
    .reduce((s, p) => s + p.paid, 0);
  const openDiligence = input.diligence.filter((d) => {
    if (d.status === "clear") return false;
    const parcel = input.parcels.find((p) => p.id === d.parcelId);
    return parcel ? ids.has(parcel.projectId) : false;
  }).length;
  const reraOpen = input.obligations.filter((o) => ids.has(o.projectId) && o.kind === "rera" && o.status !== "filed");
  const reraDue = reraOpen.filter((o) => daysUntil(o.due) <= 7).length;
  const snagsOpen = input.snags.filter((s) => ids.has(s.projectId) && s.status === "open").length;
  const ocWaiting = bookings.filter((b) => b.status === "active").length;
  const commissionAccrued = input.commissions
    .filter((c) => ids.has(c.projectId) && c.status === "accrued")
    .reduce((s, c) => s + c.amount, 0);
  const capitalDeployed = input.parcels
    .filter((p) => ids.has(p.projectId) && p.status === "acquired")
    .reduce((s, p) => s + (p.considerationInr ?? 0), 0);
  const openPo = input.pos.filter((p) => ids.has(p.projectId) && p.status !== "rejected" && p.status !== "cancelled" && p.status !== "closed");
  const vendorsApproval = input.vendors.filter((v) => v.stage === "approval").length;
  const kpis: CeoKpis = {
    available: available.length,
    held: heldU.length,
    booked: bookedU.length,
    possessed: possessed.length,
    availableInr: available.reduce((s, u) => s + u.price, 0),
    bookedInr: bookedU.reduce((s, u) => s + u.price, 0),
    collectionsMtd,
    overdue61: overdueDays.filter((d) => d > 60 && d <= 90).length,
    overdue90: overdueDays.filter((d) => d > 90).length,
    openDiligence,
    reraDue,
    ocWaiting,
    snagsOpen,
    commissionAccrued,
    capitalDeployed,
    openPoInr: openPo.reduce((s, p) => s + p.amount, 0),
    vendorsApproval,
  };

  const risks: CeoRisk[] = [];
  const reraOverdue = reraOpen.filter((o) => daysUntil(o.due) < 0).length;
  if (reraOverdue || reraDue) {
    risks.push({
      id: "rera",
      label: reraOverdue ? `${reraOverdue} RERA filing(s) overdue` : `${reraDue} RERA filing(s) due in 7 days`,
      to: "/app/land",
      count: reraOverdue || reraDue,
    });
  }
  if (vendorsApproval) {
    risks.push({ id: "vendor", label: `${vendorsApproval} vendor(s) waiting to activate`, to: "/app/approvals", count: vendorsApproval });
  }
  const silentSite = plist.filter((p) => {
    if (!p.constructionStart || p.constructionStart > asOf) return false;
    if (p.constructionEnd && p.constructionEnd < asOf) return false;
    const last = input.diaries.filter((d) => d.projectId === p.id).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    if (!last) return true;
    return daysUntil(last.date) <= -3;
  }).length;
  if (silentSite) {
    risks.push({ id: "diary", label: `${silentSite} project(s) with no diary for 3+ days`, to: "/app/site", count: silentSite });
  }
  const expiring = holds.filter((h) => daysUntil(h.until) >= 0 && daysUntil(h.until) <= 3).length;
  if (expiring >= 1) {
    risks.push({ id: "holds", label: `${expiring} hold(s) expire within 3 days`, to: "/app/sales/channel", count: expiring });
  }
  if (kpis.overdue61 || kpis.overdue90) {
    risks.push({
      id: "collect",
      label: `${kpis.overdue61} in 61–90d · ${kpis.overdue90} in 90d+ overdue`,
      to: "/app/customers",
      count: kpis.overdue61 + kpis.overdue90,
    });
  }
  if (books && (!books.configured || !books.reachable)) {
    risks.push({
      id: "books",
      label: books.configured ? "Company accounts unreachable" : "Company accounts not configured",
      to: "/app/finance",
      count: 1,
    });
  }

  const brief: string[] = [];
  const sellout = kpis.available + kpis.booked;
  brief.push(
    sellout
      ? `Inventory: ${kpis.available} free (${kpis.availableInr ? Math.round(kpis.availableInr / 100000) / 10 + " Cr" : "—"}) · ${kpis.booked} booked/sold · ${kpis.held} on hold · ${kpis.possessed} possessed.`
      : "No inventory in this slice.",
  );
  brief.push(
    kpis.overdue90 || kpis.overdue61
      ? `Collections pressure: ${kpis.overdue61} files 61–90 days late, ${kpis.overdue90} past 90 days. Accrued this month ${kpis.collectionsMtd ? Math.round(kpis.collectionsMtd / 100000) / 10 + " Cr" : "₹0"}.`
      : `Collections: ${kpis.collectionsMtd ? Math.round(kpis.collectionsMtd / 100000) / 10 + " Cr" : "₹0"} booked against dues this month. Aging is clean in 61d+.`,
  );
  brief.push(
    kpis.openDiligence || kpis.reraDue || kpis.snagsOpen
      ? `Open gates: ${kpis.openDiligence} title checks, ${kpis.reraDue} RERA due in 7 days, ${kpis.snagsOpen} open defects, ${kpis.ocWaiting} still waiting keys.`
      : "No open title, RERA, or defect gates in this slice.",
  );
  brief.push(
    kpis.vendorsApproval || kpis.openPoInr
      ? `Supply: ${kpis.vendorsApproval} vendor(s) not Active. Open orders ${kpis.openPoInr ? Math.round(kpis.openPoInr / 100000) / 10 + " Cr" : "₹0"} (ops, not ERPNext).`
      : "No vendors stuck in activation. No open PO exposure in this slice.",
  );
  brief.push(
    books?.reachable
      ? `Books: ERPNext answered. Atlas posted ${books.posted} voucher(s). Posting stays off unless you turn it on.`
      : books?.configured
        ? "Books: ERPNext is configured but not reachable. Atlas still runs. Do not treat Home numbers as the P&L."
        : "Books: ERPNext not configured. Atlas still runs. P&L and balance sheet will be empty until posting is on.",
  );
  return { asOf, kpis, risks, brief };
}
