/** Workdays Mon–Sat, skip Sundays and listed Jaipur closures. */

const FESTIVALS = new Set([
  "2024-08-15",
  "2024-10-02",
  "2024-11-01",
  "2024-12-25",
  "2025-01-26",
  "2025-03-14",
  "2025-08-15",
  "2025-10-02",
  "2025-10-21",
  "2025-12-25",
  "2026-01-26",
  "2026-03-03",
  "2026-08-15",
  "2026-10-02",
  "2026-11-08",
  "2026-12-25",
  "2027-01-26",
  "2027-03-22",
  "2027-08-15",
  "2027-10-02",
  "2027-10-29",
  "2027-12-25",
  "2028-01-26",
  "2028-03-11",
  "2028-08-15",
  "2028-10-02",
  "2028-10-17",
  "2028-12-25",
]);

export function iso(d) {
  return d.toISOString().slice(0, 10);
}

export function parseIso(s) {
  return new Date(`${s}T12:00:00+05:30`);
}

export function isWorkday(s) {
  const d = parseIso(s);
  if (d.getDay() === 0) return false;
  if (FESTIVALS.has(s)) return false;
  return true;
}

export function workdays(from, to) {
  const out = [];
  const d = parseIso(from);
  const end = parseIso(to);
  while (d <= end) {
    const s = iso(d);
    if (isWorkday(s)) out.push(s);
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export function quarterEnd(s) {
  return /-(03-31|06-30|09-30|12-31)$/.test(s);
}

export function isWed(s) {
  return parseIso(s).getDay() === 3;
}
