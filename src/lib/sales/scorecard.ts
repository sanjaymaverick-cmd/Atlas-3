import type { Booking, Commission, DailyReport, SalesAgent, UnitHold } from "@/lib/types";

export function agentScorecard(
  agent: SalesAgent,
  input: {
    dailyReports: DailyReport[];
    holds: UnitHold[];
    bookings: Booking[];
    commissions: Commission[];
  },
) {
  const reps = input.dailyReports.filter((d) => d.agentId === agent.id);
  const calls = reps.reduce((s, d) => s + d.calls, 0);
  const visits = reps.reduce((s, d) => s + d.visits, 0);
  const leads = reps.reduce((s, d) => s + d.leads, 0);
  const liveHolds = input.holds.filter((h) => h.agentId === agent.id && h.status === "held").length;
  const booked = input.holds.filter((h) => h.agentId === agent.id && h.status === "booked").length;
  const accrued = input.commissions
    .filter((c) => c.partnerId === agent.companyId && c.status === "accrued")
    .reduce((s, c) => s + c.amount, 0);
  const conv = leads ? Math.round((booked / Math.max(leads, 1)) * 100) : 0;
  return { reps: reps.length, calls, visits, leads, liveHolds, booked, accrued, conv };
}
