import type { Role } from "@/lib/types";

/** Every operating seat a local real-estate developer needs to run Atlas. */
export const ROLE_HOME: Record<
  Role,
  | "/app"
  | "/app/approvals"
  | "/app/site"
  | "/app/finance"
  | "/app/commercial"
  | "/app/crm"
  | "/app/land"
  | "/app/documents"
  | "/app/controls"
  | "/app/sales"
  | "/app/sales/channel"
  | "/app/sales/company"
> =
  {
    owner: "/app/approvals",
    pm: "/app",
    engineer: "/app/site",
    supervisor: "/app/site",
    accountant: "/app/finance",
    commercial: "/app/commercial",
    sales: "/app/sales",
    legal: "/app/land",
    docs: "/app/documents",
    stores: "/app/controls",
    channel: "/app/sales/channel",
    channel_admin: "/app/sales/company",
  };

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Managing Director",
  pm: "Project Director",
  engineer: "Site Engineer",
  supervisor: "Site Supervisor",
  accountant: "Finance Lead",
  commercial: "Commercial Manager",
  sales: "Sales Manager",
  legal: "Land & Legal",
  docs: "Document Controller",
  stores: "Stores / QS",
  channel: "Channel agent",
  channel_admin: "Channel company admin",
};

export const ALL_ROLES: Role[] = [
  "owner",
  "pm",
  "engineer",
  "supervisor",
  "accountant",
  "commercial",
  "sales",
  "legal",
  "docs",
  "stores",
  "channel",
  "channel_admin",
];

const OFFICE: Role[] = ["owner", "pm", "accountant", "commercial", "sales", "legal", "docs"];
const SITE: Role[] = ["owner", "pm", "engineer", "supervisor", "stores"];
const EVERY: Role[] = ALL_ROLES;

export const NAV_ROLES = {
  command: EVERY,
  phases: EVERY,
  testing: ["owner"] as Role[],
  org: ["owner", "pm", "accountant"] as Role[],
  approvals: ["owner", "pm", "accountant", "sales"] as Role[],
  projects: EVERY,
  documents: ["owner", "pm", "engineer", "docs", "legal"] as Role[],
  land: ["owner", "pm", "accountant", "legal"] as Role[],
  commercial: ["owner", "pm", "accountant", "commercial"] as Role[],
  quotations: ["owner", "pm", "accountant", "commercial"] as Role[],
  site: SITE,
  controls: SITE,
  changes: ["owner", "pm", "engineer", "supervisor"] as Role[],
  customers: ["owner", "pm", "accountant", "sales"] as Role[],
  crm: ["owner", "pm", "accountant", "sales"] as Role[],
  finance: ["owner", "accountant"] as Role[],
  decisions: ["owner"] as Role[],
  audit: EVERY,
  assistant: [...OFFICE, "engineer", "supervisor", "stores"] as Role[],
  portfolio: ["owner", "pm", "accountant"] as Role[],
  capital: ["owner", "pm", "accountant"] as Role[],
  sales: ["owner", "pm", "sales", "accountant", "channel", "channel_admin"] as Role[],
  salesInventory: ["owner", "pm", "sales", "channel", "channel_admin"] as Role[],
  salesChannel: ["owner", "pm", "sales", "channel", "channel_admin"] as Role[],
  salesCompany: ["owner", "pm", "sales", "channel_admin"] as Role[],
  salesPipeline: ["owner", "sales"] as Role[],
  salesHandover: ["owner", "pm", "sales"] as Role[],
  salesAnalytics: ["owner", "pm", "sales", "accountant"] as Role[],
  salesIntegrations: ["owner", "sales"] as Role[],
  salesWhatsApp: ["owner", "sales", "channel", "channel_admin"] as Role[],
  salesPeople: ["owner", "sales"] as Role[],
};

export function canSeeTally(role: Role | undefined) {
  return role === "owner" || role === "accountant";
}

export function canDecideApprovals(role: Role | undefined) {
  return role === "owner" || role === "pm" || role === "accountant" || role === "sales";
}

const WAITING_ON_ROLES: Record<string, Role[]> = {
  "Managing Director": ["owner"],
  "Project Director": ["pm"],
  "Finance Lead": ["accountant"],
  "Sales Manager": ["sales"],
  "Four-eyes approver": ["owner", "pm"],
};

/** Approve/Reject only if this seat is the named waiter. MD can always act. */
export function canActOnApproval(role: Role | undefined, waitingOn: string, kind = "") {
  if (!role || !canDecideApprovals(role)) return false;
  if (role === "owner") return true;
  const mapped = WAITING_ON_ROLES[waitingOn];
  if (mapped?.includes(role)) return true;
  if (role === "sales" && /book|commission|hold|partner/i.test(`${waitingOn} ${kind}`)) return true;
  return false;
}

export function homeForRole(role: Role | string | undefined, pendingApprovals = 0) {
  if (role === "owner") return pendingApprovals > 0 ? "/app/approvals" : "/app";
  if (role && role in ROLE_HOME) return ROLE_HOME[role as Role];
  return "/app" as const;
}
