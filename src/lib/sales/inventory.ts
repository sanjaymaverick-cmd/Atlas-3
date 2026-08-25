import type { Booking, InventoryUnit } from "@/lib/types";

/** Inventory is the lock. Hold and book must refuse a non-available unit. */
export function refuseHold(unit: InventoryUnit | undefined): string | null {
  if (!unit) return "Unit not found.";
  if (unit.status !== "available") return `Unit ${unit.code} is ${unit.status} — hold refused.`;
  return null;
}

export function refuseBook(
  unit: InventoryUnit | undefined,
  bookings: Booking[],
  projectId: string,
  code: string,
) {
  const clash = bookings.find(
    (x) =>
      x.projectId === projectId &&
      x.unit === code &&
      (x.status === "active" || x.status === "possession"),
  );
  if (clash) return `Unit ${code} already has an active booking.`;
  if (unit && unit.status !== "available" && unit.status !== "held") {
    return `Unit ${code} is ${unit.status} and cannot be booked.`;
  }
  return null;
}
