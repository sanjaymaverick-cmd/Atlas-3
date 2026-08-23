export const PHASES = [
  {
    id: 1,
    title: "Identity & organization",
    path: "/app/org",
    rule: "Every mutation is scoped to a legal entity and written to the audit trail.",
  },
  {
    id: 2,
    title: "Documents",
    path: "/app/documents",
    rule: "Revisions are immutable. Originals need four-eyes. Previews are watermarked.",
  },
  {
    id: 3,
    title: "Land & legal",
    path: "/app/land",
    rule: "Acquisition is blocked until due diligence is clear. EMI is operations, not Tally.",
  },
  {
    id: 4,
    title: "Commercial",
    path: "/app/quotations",
    rule: "RFQ → compare → select → PO. No PO until vendor is Active. Execution needs document evidence.",
  },
  {
    id: 5,
    title: "Site & quality",
    path: "/app/site",
    rule: "One diary per device per date. A failed inspection raises an NCR.",
  },
  {
    id: 6,
    title: "Project controls",
    path: "/app/controls",
    rule: "Material issue cannot exceed accepted receipts.",
  },
  {
    id: 7,
    title: "Change control",
    path: "/app/changes",
    rule: "RFIs, NCRs, and VOs are separate objects. A VO waits in Approvals.",
  },
  {
    id: 8,
    title: "Customers & CRM",
    path: "/app/crm",
    rule: "Leads convert to bookings. Partner commission accrues, never self-pays. One active booking per unit.",
  },
  {
    id: 9,
    title: "Tally",
    path: "/app/finance",
    rule: "Atlas never posts a voucher. Exceptions are accepted, not rewritten. Tally remains the books.",
  },
  {
    id: 10,
    title: "Command",
    path: "/app",
    rule: "Cash, time, quality, and gates on one screen.",
  },
  {
    id: 11,
    title: "Assistant",
    path: "/app/assistant",
    rule: "Fail-closed until hosting is decided. Drafts only — never pay, sign, or delete.",
  },
] as const;
