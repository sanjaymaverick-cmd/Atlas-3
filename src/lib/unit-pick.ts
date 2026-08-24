import type { InventoryUnit, Tower } from "./types";

export type UnitConfig = "2BHK" | "3BHK" | "";

export function unitConfig(unit: InventoryUnit, towers: Tower[]): UnitConfig {
  const name = towers.find((t) => t.id === unit.towerId)?.name ?? "";
  if (/2\s*bhk/i.test(name) || /^[A-Z]{2,3}A/i.test(unit.code)) return "2BHK";
  if (/3\s*bhk/i.test(name) || /^[A-Z]{2,3}B/i.test(unit.code)) return "3BHK";
  return "";
}

export function pickNextUnit(
  units: InventoryUnit[],
  towers: Tower[],
  projectId: string,
  opts?: { prefix?: string; towerId?: string; config?: string },
): InventoryUnit | undefined {
  let pool = units.filter((u) => u.projectId === projectId && u.status === "available");
  if (opts?.towerId) pool = pool.filter((u) => u.towerId === opts.towerId);
  if (opts?.config) {
    const want = opts.config.replace(/\s+/g, "").toUpperCase();
    const matched = pool.filter((u) => unitConfig(u, towers).replace(/\s+/g, "").toUpperCase() === want);
    if (matched.length) pool = matched;
  }
  if (opts?.prefix) {
    const pref = pool.filter((u) => u.code.startsWith(opts.prefix!));
    if (pref.length) return pref[0];
  }
  return pool[0];
}
