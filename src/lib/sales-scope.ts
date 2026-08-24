import type { DailyReport, InventoryUnit, Lead, Partner, Project, Role, SalesAgent, UnitHold, User } from "@/lib/types";

export function isThirdParty(role: Role | string | undefined) {
  return role === "channel" || role === "channel_admin";
}

export function myAgent(user: User | null, agents: SalesAgent[]) {
  if (!user) return undefined;
  return agents.find((a) => a.userId === user.id) ?? agents.find((a) => a.name === user.name);
}

/** Channel seats only see their own company. In-house seats see all. */
export function myCompanyId(user: User | null, agents: SalesAgent[]) {
  if (!isThirdParty(user?.role)) return undefined;
  return myAgent(user, agents)?.companyId;
}

export function companyAgentIds(agents: SalesAgent[], companyId?: string) {
  if (!companyId) return agents.map((a) => a.id);
  return agents.filter((a) => a.companyId === companyId).map((a) => a.id);
}

export function companyName(partners: Partner[], companyId?: string) {
  if (!companyId) return "In-house";
  return partners.find((p) => p.id === companyId)?.name ?? companyId;
}

/**
 * Projects this seat may list. Channel firms only see projects locked to them
 * (or still unlocked). In-house uses the header entity/project filter.
 */
export function scopedProjectIds(
  user: User | null,
  agents: SalesAgent[],
  projects: Project[],
  entityId: string,
  projectId: string | "all",
): string[] {
  const companyId = myCompanyId(user, agents);
  if (companyId) {
    return projects
      .filter((p) => !p.exclusivePartnerId || p.exclusivePartnerId === companyId)
      .map((p) => p.id);
  }
  return projects
    .filter((p) => p.entityId === entityId && (projectId === "all" || p.id === projectId))
    .map((p) => p.id);
}

export function scopedLeads(leads: Lead[], user: User | null, agents: SalesAgent[], projectIds: string[]): Lead[] {
  const companyId = myCompanyId(user, agents);
  const agentIds = companyAgentIds(agents, companyId);
  return leads.filter((l) => {
    if (!projectIds.includes(l.projectId)) return false;
    if (!companyId) return true;
    if (l.partnerId && l.partnerId !== companyId) return false;
    if (l.agentId && !agentIds.includes(l.agentId)) return false;
    return true;
  });
}

export function scopedUnits(
  units: InventoryUnit[],
  projectIds: string[],
  opts?: { thirdParty?: boolean; ownHeld?: Set<string> },
): InventoryUnit[] {
  return units.filter((u) => {
    if (!projectIds.includes(u.projectId)) return false;
    if (!opts?.thirdParty) return true;
    if (u.status === "available") return true;
    if (u.status === "held" && opts.ownHeld?.has(u.id)) return true;
    return false;
  });
}

export function scopedHolds(holds: UnitHold[], projectIds: string[], agentIds: string[]): UnitHold[] {
  return holds.filter((h) => h.status === "held" && projectIds.includes(h.projectId) && agentIds.includes(h.agentId));
}

export function scopedDailyReports(reports: DailyReport[], agentIds: string[]): DailyReport[] {
  return reports.filter((d) => agentIds.includes(d.agentId));
}

/** Strings a channel seat must never receive from scoped lists. */
export function channelIsolationLeaks(opts: {
  user: User | null;
  agents: SalesAgent[];
  partners: Partner[];
  projects: Project[];
  leads: Lead[];
  units: InventoryUnit[];
  holds: UnitHold[];
  reports: DailyReport[];
}): string[] {
  const companyId = myCompanyId(opts.user, opts.agents);
  if (!companyId) return [];
  const ids = scopedProjectIds(opts.user, opts.agents, opts.projects, "", "all");
  const agentIds = companyAgentIds(opts.agents, companyId);
  const firm = opts.partners.find((p) => p.id === companyId)?.name ?? "";
  const forbidden = opts.partners.filter((p) => p.id !== companyId).map((p) => p.name);
  const otherProjects = opts.projects.filter((p) => !ids.includes(p.id)).map((p) => p.name);
  const hits: string[] = [];
  const leadRows = scopedLeads(opts.leads, opts.user, opts.agents, ids);
  const unitRows = scopedUnits(opts.units, ids, { thirdParty: true });
  const holdRows = scopedHolds(opts.holds, ids, agentIds);
  const reportRows = scopedDailyReports(opts.reports, agentIds);
  const blob = [
    ...leadRows.map((l) => `${l.name} ${l.note ?? ""} ${l.partnerId ?? ""}`),
    ...unitRows.map((u) => u.projectId),
    ...holdRows.map((h) => h.customer),
    ...reportRows.map((r) => r.notes),
    ...ids.map((id) => opts.projects.find((p) => p.id === id)?.name ?? ""),
  ].join(" | ");
  for (const name of [...forbidden, ...otherProjects]) {
    if (name && blob.includes(name) && name !== firm) hits.push(name);
  }
  for (const u of unitRows) {
    if (!ids.includes(u.projectId)) hits.push(u.code);
  }
  return [...new Set(hits)];
}
