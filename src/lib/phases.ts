export const PHASES = [
  {
    id: 1,
    title: "People and companies",
    path: "/app/org",
    rule: "Every change is tied to one legal company and written in the history list.",
  },
  {
    id: 2,
    title: "Documents",
    path: "/app/documents",
    rule: "Old drawing versions stay. Originals need two people. Preview has a watermark.",
  },
  {
    id: 3,
    title: "Land papers",
    path: "/app/land",
    rule: "You cannot buy land until checks are clear. Loan instalments here are only a reminder — accounts stay in Tally.",
  },
  {
    id: 4,
    title: "Vendors and orders",
    path: "/app/quotations",
    rule: "Ask for prices, compare, pick a vendor, then raise a purchase order. No order until the vendor is Active.",
  },
  {
    id: 5,
    title: "Site diary",
    path: "/app/site",
    rule: "One diary per phone per day. A failed inspection raises a failed work report.",
  },
  {
    id: 6,
    title: "Materials and quantities",
    path: "/app/controls",
    rule: "You cannot issue more material than was received.",
  },
  {
    id: 7,
    title: "Site questions and quality",
    path: "/app/changes",
    rule: "Questions to design, failed work, and paid extra work are separate. Paid extra work waits for a yes.",
  },
  {
    id: 8,
    title: "Customers and partners",
    path: "/app/crm",
    rule: "Leads become bookings. Partner commission is counted, never paid by itself. One live booking per unit.",
  },
  {
    id: 9,
    title: "Company accounts",
    path: "/app/finance",
    rule: "Atlas never writes a voucher. We only match or flag a mismatch. Tally remains the books.",
  },
  {
    id: 10,
    title: "Home",
    path: "/app",
    rule: "Cash, time, quality, and what needs a yes — on one screen.",
  },
  {
    id: 11,
    title: "Help draft",
    path: "/app/assistant",
    rule: "Drafts only — never pay, sign, or delete.",
  },
] as const;
