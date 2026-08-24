import {
  Building2,
  ClipboardCheck,
  FileStack,
  GitBranch,
  Landmark,
  LayoutDashboard,
  ListChecks,
  Ruler,
  Scale,
  History,
  Map,
  ClipboardList,
  MessageSquare,
  Truck,
  FileSpreadsheet,
  Users,
  Handshake,
  Wallet,
  Table2,
  Layers,
  Target,
  BarChart3,
  Workflow,
  KeyRound,
  Plug,
  Contact,
  MessageCircle,
} from "lucide-react";
import { NAV_ROLES } from "@/lib/roles";
import type { Role } from "@/lib/types";

export type NavGroup = "today" | "build" | "sell" | "books" | "more";

export const NAV_GROUP_LABEL: Record<NavGroup, string> = {
  today: "Today",
  build: "Site and buying",
  sell: "Selling",
  books: "Accounts",
  more: "More",
};

export const NAV: Array<{
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  roles: Role[];
  group: NavGroup;
}> = [
  { to: "/app", label: "Home", icon: LayoutDashboard, end: true, roles: NAV_ROLES.command, group: "today" },
  { to: "/app/approvals", label: "Approvals", icon: ListChecks, roles: NAV_ROLES.approvals, group: "today" },
  { to: "/app/portfolio", label: "Open items", icon: Layers, roles: NAV_ROLES.portfolio, group: "today" },
  { to: "/app/capital", label: "Company money", icon: Table2, roles: NAV_ROLES.capital, group: "books" },
  { to: "/app/projects", label: "Projects", icon: Building2, roles: NAV_ROLES.projects, group: "build" },
  { to: "/app/documents", label: "Documents", icon: FileStack, roles: NAV_ROLES.documents, group: "build" },
  { to: "/app/land", label: "Land & acquisition", icon: Landmark, roles: NAV_ROLES.land, group: "build" },
  { to: "/app/commercial", label: "Vendors and orders", icon: Truck, roles: NAV_ROLES.commercial, group: "build" },
  { to: "/app/quotations", label: "Price quotes", icon: FileSpreadsheet, roles: NAV_ROLES.quotations, group: "build" },
  { to: "/app/site", label: "Site diary", icon: ClipboardCheck, roles: NAV_ROLES.site, group: "build" },
  { to: "/app/controls", label: "Materials", icon: Ruler, roles: NAV_ROLES.controls, group: "build" },
  { to: "/app/changes", label: "Site questions and quality", icon: GitBranch, roles: NAV_ROLES.changes, group: "build" },
  { to: "/app/customers", label: "Customers", icon: Users, roles: NAV_ROLES.customers, group: "sell" },
  { to: "/app/crm", label: "Sales partners", icon: Handshake, roles: NAV_ROLES.crm, group: "sell" },
  { to: "/app/sales", label: "Sales", icon: Target, end: true, roles: NAV_ROLES.sales, group: "sell" },
  { to: "/app/sales/inventory", label: "Flats and shops", icon: Layers, roles: NAV_ROLES.salesInventory, group: "sell" },
  { to: "/app/sales/channel", label: "Agent daily work", icon: Handshake, roles: NAV_ROLES.salesChannel, group: "sell" },
  { to: "/app/sales/company", label: "Agency office", icon: Contact, roles: NAV_ROLES.salesCompany, group: "sell" },
  { to: "/app/sales/pipeline", label: "Buyer leads", icon: Workflow, roles: NAV_ROLES.salesPipeline, group: "sell" },
  { to: "/app/sales/handover", label: "Give keys", icon: KeyRound, roles: NAV_ROLES.salesHandover, group: "sell" },
  { to: "/app/sales/analytics", label: "Sales numbers", icon: BarChart3, roles: NAV_ROLES.salesAnalytics, group: "sell" },
  { to: "/app/sales/integrations", label: "Incoming leads", icon: Plug, roles: NAV_ROLES.salesIntegrations, group: "sell" },
  { to: "/app/sales/whatsapp", label: "WhatsApp", icon: MessageCircle, roles: NAV_ROLES.salesWhatsApp, group: "sell" },
  { to: "/app/sales/people", label: "Buyer file", icon: Users, roles: NAV_ROLES.salesPeople, group: "sell" },
  { to: "/app/finance", label: "Company accounts", icon: Scale, roles: NAV_ROLES.finance, group: "books" },
  { to: "/app/decisions", label: "Owner choices", icon: Wallet, roles: NAV_ROLES.decisions, group: "books" },
  { to: "/app/org", label: "People and companies", icon: Building2, roles: NAV_ROLES.org, group: "more" },
  { to: "/app/phases", label: "All desks", icon: Map, roles: NAV_ROLES.phases, group: "more" },
  { to: "/app/testing", label: "Test checklist", icon: ClipboardList, roles: NAV_ROLES.testing, group: "more" },
  { to: "/app/audit", label: "What changed", icon: History, roles: NAV_ROLES.audit, group: "more" },
  { to: "/app/assistant", label: "Help draft", icon: MessageSquare, roles: NAV_ROLES.assistant, group: "more" },
];

export const GROUP_ORDER: NavGroup[] = ["today", "build", "sell", "books", "more"];

export function rolesForPath(pathname: string): Role[] {
  const ranked = [...NAV].sort((a, b) => b.to.length - a.to.length);
  for (const item of ranked) {
    if (item.end) {
      if (pathname === item.to) return item.roles;
      continue;
    }
    if (pathname === item.to || pathname.startsWith(`${item.to}/`)) return item.roles;
  }
  return [];
}

export const BOTTOM_NAV: Partial<Record<Role, Array<{ to: string; label: string }>>> = {
  channel: [
    { to: "/app/sales/channel", label: "Today" },
    { to: "/app/sales/inventory", label: "Units" },
    { to: "/app/sales/whatsapp", label: "Chat" },
  ],
  channel_admin: [
    { to: "/app/sales/company", label: "Office" },
    { to: "/app/sales/channel", label: "Today" },
    { to: "/app/sales/inventory", label: "Units" },
  ],
  engineer: [
    { to: "/app/site", label: "Diary" },
    { to: "/app/controls", label: "Store" },
    { to: "/app/changes", label: "Quality" },
  ],
  supervisor: [
    { to: "/app/site", label: "Diary" },
    { to: "/app/controls", label: "Store" },
    { to: "/app/changes", label: "Quality" },
  ],
  stores: [
    { to: "/app/controls", label: "Store" },
    { to: "/app/site", label: "Site" },
  ],
};
