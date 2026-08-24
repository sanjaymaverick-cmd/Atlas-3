import { daysOverdue, daysUntil, todayIso } from "./utils";
import { unitConfig } from "./unit-pick";
import type {
  Approval,
  Booking,
  Commission,
  DiaryEntry,
  DiligenceItem,
  FundingSanction,
  InventoryUnit,
  LandParcel,
  Lead,
  LegalEntity,
  Obligation,
  PaymentStep,
  Project,
  PurchaseOrder,
  Snag,
  Tower,
  UnitHold,
  Vendor,
} from "./types";

export interface CeoRisk {
  id: string;
  label: string;
  to: "/app" | "/app/land" | "/app/commercial" | "/app/approvals" | "/app/site" | "/app/customers" | "/app/finance" | "/app/sales/channel" | "/app/org";
  count: number;
  severity: "high" | "medium" | "low";
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
  mdWaiting: number;
  weeklyVelocity: number;
  weeksToSellout: number | null;
  funnel: Array<{ stage: string; count: number }>;
  channelMix: { inHouse: number; channel: number };
  bhk: Array<{ config: string; available: number; booked: number }>;
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
  leads: Lead[];
  towers: Tower[];
  entities: LegalEntity[];
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
  currentEntityId?: string,
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
      severity: reraOverdue ? "high" : "medium",
    });
  }
  if (vendorsApproval) {
    risks.push({
      id: "vendor",
      label: `${vendorsApproval} vendor(s) waiting to activate`,
      to: "/app/approvals",
      count: vendorsApproval,
      severity: "high",
    });
  }
  const silentSite = plist.filter((p) => {
    if (!p.constructionStart || p.constructionStart > asOf) return false;
    if (p.constructionEnd && p.constructionEnd < asOf) return false;
    const last = input.diaries.filter((d) => d.projectId === p.id).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    if (!last) return true;
    return daysUntil(last.date) <= -3;
  }).length;
  if (silentSite) {
    risks.push({
      id: "diary",
      label: `${silentSite} project(s) with no diary for 3+ days`,
      to: "/app/site",
      count: silentSite,
      severity: "medium",
    });
  }
  const expiring = holds.filter((h) => daysUntil(h.until) >= 0 && daysUntil(h.until) <= 3).length;
  if (expiring >= 1) {
    risks.push({
      id: "holds",
      label: `${expiring} hold(s) expire within 3 days`,
      to: "/app/sales/channel",
      count: expiring,
      severity: "medium",
    });
  }
  if (kpis.overdue61 || kpis.overdue90) {
    risks.push({
      id: "collect",
      label: `${kpis.overdue61} in 61–90d · ${kpis.overdue90} in 90d+ overdue`,
      to: "/app/customers",
      count: kpis.overdue61 + kpis.overdue90,
      severity: kpis.overdue90 ? "high" : "medium",
    });
  }
  if (books && (!books.configured || !books.reachable)) {
    risks.push({
      id: "books",
      label: books.configured ? "Company accounts unreachable" : "Company accounts not configured",
      to: "/app/finance",
      count: 1,
      severity: books.configured ? "high" : "low",
    });
  }
  if ((input.entities?.length ?? 0) > 1 && currentEntityId) {
    const header = input.entities.find((e) => e.id === currentEntityId)?.name ?? currentEntityId;
    risks.push({
      id: "entity",
      label: `Header company is ${header}. Switch before filing a sister company.`,
      to: "/app/org",
      count: input.entities.length,
      severity: "medium",
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
  const mdWaiting = input.approvals.filter(
    (a) => a.status === "pending" && a.waitingOn === "Managing Director" && (ids.size === 0 || ids.has(a.projectId)),
  ).length;
  const starts = plist.map((p) => p.start).filter(Boolean).sort();
  const weeksElapsed = starts[0]
    ? Math.max(1, Math.round((new Date(`${asOf}T12:00:00`).getTime() - new Date(`${starts[0]}T12:00:00`).getTime()) / (7 * 86_400_000)))
    : 12;
  const weeklyVelocity = kpis.booked > 0 ? Math.round((kpis.booked / weeksElapsed) * 10) / 10 : 0;
  const weeksToSellout = weeklyVelocity > 0 ? Math.round((kpis.available / weeklyVelocity) * 10) / 10 : null;
  const leads = (input.leads ?? []).filter((l) => ids.has(l.projectId));
  const stages = ["inquiry", "contacted", "qualified", "visit", "negotiation", "won"] as const;
  const funnel = stages.map((stage) => ({ stage, count: leads.filter((l) => l.stage === stage).length }));
  const channelMix = {
    inHouse: bookings.filter((b) => !b.partnerId).length,
    channel: bookings.filter((b) => Boolean(b.partnerId)).length,
  };
  const bhkMap = new Map<string, { available: number; booked: number }>();
  for (const u of units) {
    const cfg = unitConfig(u, input.towers ?? []) || "other";
    const row = bhkMap.get(cfg) ?? { available: 0, booked: 0 };
    if (u.status === "available") row.available += 1;
    if (u.status === "booked" || u.status === "sold") row.booked += 1;
    bhkMap.set(cfg, row);
  }
  const bhk = [...bhkMap.entries()].map(([config, row]) => ({ config, ...row }));
  brief[0] =
    weeksToSellout != null
      ? `${brief[0]} Sellout pace ~${weeklyVelocity}/week · ${weeksToSellout} weeks at this rate.`
      : brief[0];
  brief.push(
    books?.reachable
      ? `Books: ERPNext answered. Atlas posted ${books.posted} voucher(s). Group tiles are ops — not P&L after IC elimination.`
      : books?.configured
        ? "Books: ERPNext is configured but not reachable. Atlas still runs. Do not treat Home numbers as the P&L."
        : "Books: ERPNext not configured. Atlas still runs. Entity P&L is in ERPNext; group elim is a Finance close step.",
  );
  const five = brief.slice(0, 5);
  while (five.length < 5) five.push("No further signal in this slice.");
  return {
    asOf,
    kpis,
    risks,
    brief: five,
    mdWaiting,
    weeklyVelocity,
    weeksToSellout,
    funnel,
    channelMix,
    bhk,
  };
}
