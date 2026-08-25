import type { InventoryUnit, Tower } from "./types";

export type UnitConfig = "2BHK" | "3BHK" | "";

export function unitConfig(unit: InventoryUnit, towers: Tower[]): UnitConfig {
  const name = towers.find((t) => t.id === unit.towerId)?.name ?? "";
  if (/2\s*bhk/i.test(name) || /^[A-Z]{2,3}A/i.test(unit.code)) return "2BHK";
  if (/3\s*bhk/i.test(name) || /^[A-Z]{2,3}B/i.test(unit.code)) return "3BHK";
  return "";
}

/** Available units for a project. Primary book-next path is this list — not typing AVA-/SFA-/ACA-. */
export function availableUnitsFor(
  units: InventoryUnit[],
  towers: Tower[],
  projectId: string,
  opts?: { towerId?: string; config?: string },
): InventoryUnit[] {
  let pool = units.filter((u) => u.projectId === projectId && u.status === "available");
  if (opts?.towerId) pool = pool.filter((u) => u.towerId === opts.towerId);
  if (opts?.config) {
    const want = opts.config.replace(/\s+/g, "").toUpperCase();
    const matched = pool.filter(
      (u) => unitConfig(u, towers).replace(/\s+/g, "").toUpperCase() === want,
    );
    if (matched.length) pool = matched;
  }
  return pool;
}

export function pickNextUnit(
  units: InventoryUnit[],
  towers: Tower[],
  projectId: string,
  opts?: { prefix?: string; towerId?: string; config?: string },
): InventoryUnit | undefined {
  const pool = availableUnitsFor(units, towers, projectId, opts);
  if (opts?.prefix) {
    const pref = pool.filter((u) => u.code.startsWith(opts.prefix!));
    if (pref.length) return pref[0];
  }
  return pool[0];
}
