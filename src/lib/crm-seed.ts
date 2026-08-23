import type { Commission, HostSite, Lead, Partner, PaymentStep, Snag } from "./types";

export const PARTNERS: Partner[] = [
  { id: "pt1", name: "Pink City Channel", city: "Jaipur", gstin: "08AAPCC2211H1Z4", status: "active", rate: 2.5 },
  { id: "pt2", name: "Agarwal Associates", city: "Jaipur", gstin: "08AAAGA9090B1Z8", status: "invited", rate: 2 },
];

export const LEADS: Lead[] = [
  { id: "ld1", projectId: "p_kanak", name: "M. Saxena", phone: "98xxxx2101", source: "walk-in", partnerId: "pt1", stage: "visit", unit: "A-0802", note: "Wants west stack, 3 BHK" },
  { id: "ld2", projectId: "p_kanak", name: "R. Yadav", phone: "97xxxx4412", source: "partner", partnerId: "pt1", stage: "negotiation", unit: "B-1104", note: "Asked for extra car park" },
  { id: "ld3", projectId: "p_baggad", name: "S. Rathi", phone: "90xxxx1188", source: "website", stage: "inquiry", unit: "P-204", note: "First call 18 Aug" },
  { id: "ld4", projectId: "p_mansar", name: "K. Sharma", phone: "93xxxx7700", source: "walk-in", stage: "lost", unit: "C-201", note: "Bought elsewhere" },
];

export const COMMISSIONS: Commission[] = [
  { id: "cm1", partnerId: "pt1", bookingId: "b1", projectId: "p_kanak", amount: 211_250, status: "accrued" },
];

export const PAYMENTS: PaymentStep[] = [
  { id: "py1", bookingId: "b1", label: "Booking token", due: "2025-11-01", amount: 845_000, paid: 845_000 },
  { id: "py2", bookingId: "b1", label: "10% agreement", due: "2025-12-15", amount: 845_000, paid: 845_000 },
  { id: "py3", bookingId: "b1", label: "On foundation", due: "2026-04-01", amount: 1_690_000, paid: 1_690_000 },
  { id: "py4", bookingId: "b1", label: "On slab 12", due: "2026-09-30", amount: 1_690_000, paid: 0 },
  { id: "py5", bookingId: "b1", label: "Possession", due: "2027-03-01", amount: 3_380_000, paid: 0 },
  { id: "py6", bookingId: "b2", label: "Full (collected)", due: "2026-01-10", amount: 6_920_000, paid: 6_920_000 },
  { id: "py7", bookingId: "b4", label: "Token", due: "2026-06-01", amount: 1_120_000, paid: 1_120_000 },
  { id: "py8", bookingId: "b4", label: "Balance", due: "2027-01-15", amount: 10_080_000, paid: 0 },
];

export const SNAGS: Snag[] = [
  { id: "sg1", projectId: "p_mansar", unit: "C-304", title: "Paint touch-up living wall", status: "open" },
  { id: "sg2", projectId: "p_mansar", unit: "C-512", title: "Window leak (linked NCR)", status: "open" },
  { id: "sg3", projectId: "p_kanak", unit: "B-0302", title: "Kitchen hob alignment", status: "closed" },
];

export const HOSTS: HostSite[] = [
  { id: "hs1", name: "Aerovista", city: "Jaipur", role: "primary", status: "named" },
  { id: "hs2", name: "Acropolis", city: "Jaipur", role: "standby", status: "named" },
];
