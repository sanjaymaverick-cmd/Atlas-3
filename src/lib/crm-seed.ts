import type { Commission, HostSite, Lead, PaymentStep, Snag } from "./types";

export { DUKIA_PARTNERS as PARTNERS } from "./dukia-seed";

export const LEADS: Lead[] = [];
export const COMMISSIONS: Commission[] = [];
export const PAYMENTS: PaymentStep[] = [];
export const SNAGS: Snag[] = [];

export const HOSTS: HostSite[] = [
  { id: "hs1", name: "DUKIA House", city: "Jaipur", role: "primary", status: "named" },
  { id: "hs2", name: "Muhana site office", city: "Jaipur", role: "standby", status: "named" },
];
