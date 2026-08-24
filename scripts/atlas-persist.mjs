/**
 * Zustand persist keys. Match the `atlas3-sales-` prefix so a version bump
 * cannot leave a stale company silently loaded (FIX-THIS B11).
 */
export function clearAtlasPersist() {
  for (const k of Object.keys(localStorage)) {
    if (k.startsWith("atlas3-")) localStorage.removeItem(k);
  }
  localStorage.removeItem("atlas3-company-day-v1");
  localStorage.removeItem("atlas3-clt-v1");
}
