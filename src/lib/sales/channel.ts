import type { DailyReport } from "@/lib/types";
import { todayIso } from "@/lib/utils";

export function refuseDailyReport(reports: DailyReport[], agentId: string, date = todayIso()) {
  if (reports.some((d) => d.agentId === agentId && d.date === date)) {
    return "Today’s report is already filed for this agent.";
  }
  return null;
}

export function hasTodayReport(reports: DailyReport[], agentId: string, date = todayIso()) {
  return reports.some((d) => d.agentId === agentId && d.date === date);
}

export function refuseHoldWithoutReport(
  role: string | undefined,
  reports: DailyReport[],
  agentId: string,
) {
  if (role !== "channel" && role !== "channel_admin") return null;
  if (!hasTodayReport(reports, agentId)) return "File today’s daily report before placing a hold.";
  return null;
}
