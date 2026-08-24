/**
 * Channel isolation at selectors (not only painted UI).
 * Aadhaar agent must not receive Square and Yard / SBG / sister-project rows.
 *
 *   node scripts/trial/probes/isolation-selectors.mjs
 */
import { openTrial, signIn, signOut, closeTrial } from "../session.mjs";

const FORBIDDEN = ["Square and Yard", "SBG Sales Group", "Sunflower", "Acropolis", "R. Shekhawat", "P. Rathi"];

const { context, page } = await openTrial({ reset: false });
try {
  await signIn(page, "agap1");
  const r = await page.evaluate((forbidden) => {
    const s = window.__atlasStore.getState();
    const user = s.user;
    const me = s.agents.find((a) => a.userId === user?.id) ?? s.agents.find((a) => a.name === user?.name);
    const companyId = me?.companyId;
    const agentIds = s.agents.filter((a) => a.companyId === companyId).map((a) => a.id);
    const projectIds = s.projects
      .filter((p) => !p.exclusivePartnerId || p.exclusivePartnerId === companyId)
      .map((p) => p.id);
    const leads = s.leads.filter((l) => {
      if (!projectIds.includes(l.projectId)) return false;
      if (l.partnerId && l.partnerId !== companyId) return false;
      if (l.agentId && !agentIds.includes(l.agentId)) return false;
      return true;
    });
    const units = s.units.filter((u) => projectIds.includes(u.projectId));
    const holds = s.holds.filter((h) => h.status === "held" && projectIds.includes(h.projectId) && agentIds.includes(h.agentId));
    const reports = s.dailyReports.filter((d) => agentIds.includes(d.agentId));
    const blob = [
      ...leads.map((l) => `${l.name} ${l.note ?? ""} ${l.partnerId ?? ""}`),
      ...units.map((u) => s.projects.find((p) => p.id === u.projectId)?.name ?? ""),
      ...holds.map((h) => h.customer),
      ...reports.map((d) => d.notes),
      ...projectIds.map((id) => s.projects.find((p) => p.id === id)?.name ?? ""),
    ].join(" | ");
    const hits = forbidden.filter((f) => blob.includes(f));
    const sisterIds = s.projects.filter((p) => p.id !== "p_av").map((p) => p.id);
    const unitLeak = units.filter((u) => sisterIds.includes(u.projectId)).map((u) => u.code);
    return {
      companyId,
      projectIds,
      leads: leads.length,
      units: units.length,
      hits,
      unitLeak,
    };
  }, FORBIDDEN);
  const ok = r.hits.length === 0 && r.unitLeak.length === 0 && r.projectIds.includes("p_av") && !r.projectIds.includes("p_sf");
  console.log(ok ? "PASS" : "FAIL", JSON.stringify(r));
  if (!ok) process.exitCode = 1;
  await signOut(page);
} finally {
  await closeTrial(context);
}
