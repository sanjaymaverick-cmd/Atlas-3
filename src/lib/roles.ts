import type { Role } from "@/lib/types";

/** Every operating seat a local real-estate developer needs to run Atlas. */
export const ROLE_HOME: Record<Role, "/app" | "/app/approvals" | "/app/site" | "/app/finance" | "/app/commercial" | "/app/crm" | "/app/land" | "/app/documents" | "/app/controls"> =
  {
    owner: "/app/approvals",
    pm: "/app",
    engineer: "/app/site",
    supervisor: "/app/site",
    accountant: "/app/finance",
    commercial: "/app/commercial",
    sales: "/app/crm",
    legal: "/app/land",
    docs: "/app/documents",
    stores: "/app/controls",
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
];

const OFFICE: Role[] = ["owner", "pm", "accountant", "commercial", "sales", "legal", "docs"];
const SITE: Role[] = ["owner", "pm", "engineer", "supervisor", "stores"];
const EVERY: Role[] = ALL_ROLES;

export const NAV_ROLES = {
  command: EVERY,
  phases: EVERY,
  testing: ["owner"] as Role[],
  org: ["owner", "pm", "accountant"] as Role[],
  approvals: ["owner", "pm", "accountant"] as Role[],
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
};

export function canSeeTally(role: Role | undefined) {
  return role === "owner" || role === "accountant";
}

export function canDecideApprovals(role: Role | undefined) {
  return role === "owner" || role === "pm" || role === "accountant";
}

export function homeForRole(role: Role | string | undefined) {
  if (role && role in ROLE_HOME) return ROLE_HOME[role as Role];
  return "/app" as const;
}
