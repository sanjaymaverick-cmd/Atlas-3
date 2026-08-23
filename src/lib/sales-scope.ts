import type { Partner, Role, SalesAgent, User } from "@/lib/types";

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
