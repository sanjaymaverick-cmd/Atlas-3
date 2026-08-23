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
} from "lucide-react";
import { NAV_ROLES } from "@/lib/roles";
import type { Role } from "@/lib/types";

export const NAV: Array<{
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  roles: Role[];
}> = [
  { to: "/app", label: "Command", icon: LayoutDashboard, end: true, roles: NAV_ROLES.command },
  { to: "/app/phases", label: "All phases", icon: Map, roles: NAV_ROLES.phases },
  { to: "/app/testing", label: "Test pack", icon: ClipboardList, roles: NAV_ROLES.testing },
  { to: "/app/org", label: "Organization", icon: Building2, roles: NAV_ROLES.org },
  { to: "/app/approvals", label: "Approvals", icon: ListChecks, roles: NAV_ROLES.approvals },
  { to: "/app/projects", label: "Projects", icon: Building2, roles: NAV_ROLES.projects },
  { to: "/app/documents", label: "Documents", icon: FileStack, roles: NAV_ROLES.documents },
  { to: "/app/land", label: "Land & legal", icon: Landmark, roles: NAV_ROLES.land },
  { to: "/app/commercial", label: "Commercial", icon: Truck, roles: NAV_ROLES.commercial },
  { to: "/app/quotations", label: "Quotations", icon: FileSpreadsheet, roles: NAV_ROLES.quotations },
  { to: "/app/site", label: "Site & quality", icon: ClipboardCheck, roles: NAV_ROLES.site },
  { to: "/app/controls", label: "Controls", icon: Ruler, roles: NAV_ROLES.controls },
  { to: "/app/changes", label: "Change control", icon: GitBranch, roles: NAV_ROLES.changes },
  { to: "/app/customers", label: "Customers", icon: Users, roles: NAV_ROLES.customers },
  { to: "/app/crm", label: "CRM", icon: Handshake, roles: NAV_ROLES.crm },
  { to: "/app/finance", label: "Tally", icon: Scale, roles: NAV_ROLES.finance },
  { to: "/app/decisions", label: "Owner decisions", icon: Wallet, roles: NAV_ROLES.decisions },
  { to: "/app/audit", label: "Audit", icon: History, roles: NAV_ROLES.audit },
  { to: "/app/assistant", label: "Assistant", icon: MessageSquare, roles: NAV_ROLES.assistant },
];
