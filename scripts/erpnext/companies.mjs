/** Twin of src/lib/erpnext/companies.ts for operator scripts. */

export const GROUP_COMPANY = "DUKIA GROUP";

export const TRADING_COMPANIES = ["SATYAM BUILDCOM", "SATYAM CONSTRUCTION", "MGB PRIME ESTATES LLP"];

export const COMPANY_SPECS = [
  { name: GROUP_COMPANY, abbr: "DG", isGroup: true, role: "group" },
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
  { name: "MOCK ATLAS3 LLP", abbr: "MA3", isGroup: false, role: "mock" },
];

export const PROJECT_COST_CENTERS = [
  { company: "SATYAM BUILDCOM", name: "Aerovista" },
  { company: "SATYAM CONSTRUCTION", name: "Sunflower" },
  { company: "MGB PRIME ESTATES LLP", name: "Acropolis" },
];

export const FISCAL_YEARS = [
  { year: "2024-2025", year_start_date: "2024-04-01", year_end_date: "2025-03-31" },
  { year: "2025-2026", year_start_date: "2025-04-01", year_end_date: "2026-03-31" },
  { year: "2026-2027", year_start_date: "2026-04-01", year_end_date: "2027-03-31" },
  { year: "2027-2028", year_start_date: "2027-04-01", year_end_date: "2028-03-31" },
  { year: "2028-2029", year_start_date: "2028-04-01", year_end_date: "2029-03-31" },
];
