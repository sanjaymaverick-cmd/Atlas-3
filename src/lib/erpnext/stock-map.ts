/**
 * Atlas Stores is quantity on the project. ERPNext stock is books.
 * This map is a label only — Atlas never posts Stock Entry / GRN.
 */
import { ENTITY_TO_COMPANY, companyAbbr } from "./companies";

export function erpnextWarehouse(entityId: string): string {
  const company = ENTITY_TO_COMPANY[entityId];
  const abbr = company ? companyAbbr(company) : "";
  return abbr ? `Stores - ${abbr}` : "Stores (unmapped)";
}

export function erpnextItemCode(materialName: string): string {
  return materialName.trim();
}
