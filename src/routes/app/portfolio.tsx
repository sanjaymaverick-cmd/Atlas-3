import { createFileRoute, Link } from "@tanstack/react-router";
import { EntityTable } from "@/components/entity-table";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { inr } from "@/lib/utils";
import { useAtlas } from "@/lib/store";

export const Route = createFileRoute("/app/portfolio")({ component: Portfolio });

function Portfolio() {
  const { projects, entityId, projectId, approvals, changes, exports, inspections, user } = useAtlas();
  const list = projects.filter((p) => p.entityId === entityId && (projectId === "all" || p.id === projectId));
  const ids = list.map((p) => p.id);
  const myApprovals = approvals.filter((a) => a.status === "pending" && ids.includes(a.projectId));
  const ncr = changes.filter((c) => c.kind === "ncr" && c.status !== "closed" && ids.includes(c.projectId));
  const grants = exports.filter((e) => e.status === "pending" || e.status === "granted");

  return (
    <div>
      <PageHeader
        kicker="Owners Hub"
        title="Open items and project health"
        description={`${user?.title ?? "This seat"} · concept land is not committed capital. Local only.`}
      />
      <h2 className="mb-3 font-display text-2xl">Open for this seat</h2>
      <ul className="mb-8 space-y-2 text-sm">
        <li className="rounded-md border border-line px-4 py-3">
          <Link to="/app/approvals" className="hover:underline">
            {myApprovals.length} approvals waiting
          </Link>
        </li>
        <li className="rounded-md border border-line px-4 py-3">
          <Link to="/app/documents" className="hover:underline">
            {grants.length} export grants pending or live
          </Link>
        </li>
        <li className="rounded-md border border-line px-4 py-3">
          <Link to="/app/changes" className="hover:underline">
            {ncr.length} NCRs open
          </Link>
        </li>
      </ul>
      <h2 className="mb-3 font-display text-2xl">Project health</h2>
      <EntityTable columns={["Project", "Stage", "Budget", "Spent", "Risk"]}>
        {list.map((p) => {
          const fail = inspections.some((i) => i.projectId === p.id && i.result === "fail");
          const overrun = p.budget > 0 && p.spent / p.budget > p.progress / 100 + 0.08;
          const risk = fail && overrun ? "elevated" : fail || overrun ? "watch" : "steady";
          return (
            <tr key={p.id} className="border-b border-line last:border-0">
              <td className="px-4 py-3">
                <Link to="/app/projects/$id" params={{ id: p.id }} className="hover:underline">
                  {p.code} · {p.name}
                </Link>
                {p.concept ? <p className="text-xs text-muted">Concept — not committed</p> : null}
              </td>
              <td className="px-4 py-3">
                <Status value={p.status} />
              </td>
              <td className="px-4 py-3 tabular-nums">{inr(p.budget, true)}</td>
              <td className="px-4 py-3 tabular-nums">{inr(p.spent, true)}</td>
              <td className="px-4 py-3">
                <Status value={risk === "elevated" ? "fail" : risk === "watch" ? "review" : "approved"} />
              </td>
            </tr>
          );
        })}
      </EntityTable>
    </div>
  );
}
