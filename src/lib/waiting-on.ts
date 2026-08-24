/**
 * Named waiter on an approval. Adding a value here without a `WAITING_ON_ROLES`
 * row in `roles.ts` is a compile error. Do not key routing on free text.
 */
export const WAITING_ON = [
  "Managing Director",
  "Project Director",
  "Finance Lead",
  "Sales Manager",
  "Sales Manager / MD",
  "Commercial Manager",
  "Four-eyes approver",
] as const;

export type WaitingOn = (typeof WAITING_ON)[number];
