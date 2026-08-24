/**
 * DUKIA + MOCK companies Atlas may name on a Journal Entry.
 * Names must match ERPNext Company.name character-for-character.
 */

export const COMPANY_ALLOWLIST = [
  "MOCK ATLAS3 LLP",
  "SATYAM BUILDCOM",
  "SATYAM CONSTRUCTION",
  "MGB PRIME ESTATES LLP",
] as const;

export type AtlasCompany = (typeof COMPANY_ALLOWLIST)[number];

export const GROUP_COMPANY = "DUKIA GROUP";

/** Transaction companies that need their own books. MOCK is smoke-only. */
export const TRADING_COMPANIES = [
  "SATYAM BUILDCOM",
  "SATYAM CONSTRUCTION",
  "MGB PRIME ESTATES LLP",
] as const;

export type TradingCompany = (typeof TRADING_COMPANIES)[number];

export interface CompanySpec {
  name: string;
  abbr: string;
  isGroup: boolean;
  parent?: string;
  /** Atlas entity id, when this is a trading sister. */
  entityId?: string;
  gstin?: string;
  project?: string;
  role: "group" | "trading" | "mock";
}

/**
 * Abbrs become the suffix on ERPNext accounts (`Cash - SBC`).
 * MOCK already exists in the local desk as MA3 (setup wizard).
 */
export const COMPANY_SPECS: CompanySpec[] = [
  {
    name: GROUP_COMPANY,
    abbr: "DG",
    isGroup: true,
    role: "group",
  },
  {
    name: "SATYAM BUILDCOM",
    abbr: "SBC",
    isGroup: false,
    parent: GROUP_COMPANY,
    entityId: "le_sbc",
    gstin: "08AASCS2222B1Z6",
    project: "Aerovista",
    role: "trading",
  },
  {
    name: "SATYAM CONSTRUCTION",
    abbr: "SCN",
    isGroup: false,
    parent: GROUP_COMPANY,
    entityId: "le_scn",
    gstin: "08AASCS3333C1Z7",
    project: "Sunflower",
    role: "trading",
  },
  {
    name: "MGB PRIME ESTATES LLP",
    abbr: "MGB",
    isGroup: false,
    parent: GROUP_COMPANY,
    entityId: "le_mgb",
    gstin: "08AAGCM1111A1Z5",
    project: "Acropolis",
    role: "trading",
  },
  {
    name: "MOCK ATLAS3 LLP",
    abbr: "MA3",
    isGroup: false,
    role: "mock",
  },
];

export const ENTITY_TO_COMPANY: Record<string, TradingCompany> = {
  le_sbc: "SATYAM BUILDCOM",
  le_scn: "SATYAM CONSTRUCTION",
  le_mgb: "MGB PRIME ESTATES LLP",
};

export const PROJECT_COST_CENTERS: Array<{ company: TradingCompany; name: string }> = [
  { company: "SATYAM BUILDCOM", name: "Aerovista" },
  { company: "SATYAM CONSTRUCTION", name: "Sunflower" },
  { company: "MGB PRIME ESTATES LLP", name: "Acropolis" },
];

export function isAllowlistedCompany(name: string): name is AtlasCompany {
  return (COMPANY_ALLOWLIST as readonly string[]).includes(name);
}

export function specFor(name: string): CompanySpec | undefined {
  return COMPANY_SPECS.find((c) => c.name === name);
}

export function companyAbbr(name: string): string {
  return specFor(name)?.abbr ?? "";
}

/** Names that exist on the Standard COA ERPNext creates (`Cash - SBC`). */
export function cashAccount(company: string): string {
  const abbr = companyAbbr(company);
  return abbr ? `Cash - ${abbr}` : "";
}

export function expenseAccount(company: string): string {
  const abbr = companyAbbr(company);
  return abbr ? `Administrative Expenses - ${abbr}` : "";
}

export function capitalAccount(company: string): string {
  const abbr = companyAbbr(company);
  return abbr ? `Capital Stock - ${abbr}` : "";
}

/** Leaf P&L cost centre. `{Company} - ABBR` is the group — do not post to it. */
export function mainCostCenter(company: string): string {
  const abbr = companyAbbr(company);
  return abbr ? `Main - ${abbr}` : "";
}

const PNL_HINT = /expense|income|sales|rent|depreciation|commission|cost of goods|administrative|marketing|legal|entertainment|miscellaneous expenses|bank charges|interest expense|office maintenance/i;
const STOCK_HINT = /stock in hand|stock adjustment|stock received/i;

export function looksLikePnlAccount(account: string): boolean {
  return PNL_HINT.test(account);
}

export function looksLikeStockAccount(account: string): boolean {
  return STOCK_HINT.test(account);
}
