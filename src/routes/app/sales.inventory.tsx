import { createFileRoute } from "@tanstack/react-router";
import { EntityTable } from "@/components/entity-table";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Button } from "@/components/ui/button";
import { companyAgentIds, isThirdParty, myCompanyId } from "@/lib/sales-scope";
import { useAtlas } from "@/lib/store";
import { inr } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/app/sales/inventory")({ component: Inventory });

function Inventory() {
  const { projects, entityId, projectId, units, towers, unitEvents, holds, agents, user, setUnitDispute } = useAtlas();
  const third = isThirdParty(user?.role);
  const companyId = myCompanyId(user, agents);
  const agentIds = companyAgentIds(agents, companyId);
  const ids = third
    ? projects.map((p) => p.id)
    : projects.filter((p) => p.entityId === entityId && (projectId === "all" || p.id === projectId)).map((p) => p.id);
  const ownHeld = new Set(
    holds.filter((h) => h.status === "held" && agentIds.includes(h.agentId)).map((h) => h.unitId),
  );
  const rows = units.filter((u) => {
    if (!ids.includes(u.projectId)) return false;
    if (!third) return true;
    if (u.status === "available") return true;
    if (u.status === "held" && ownHeld.has(u.id)) return true;
    return false;
  });
  const events = unitEvents.filter((e) => rows.some((u) => u.id === e.unitId)).slice(0, 8);

  return (
    <div>
      <PageHeader
        kicker="Sales · inventory"
        title={third ? "Available to hold" : "Units are the source of truth"}
        description={
          third
            ? "You see free units and your firm’s holds only. Place a hold from Channel desk. Local only."
            : "Available → Held → Booked → Sold. A hold or booking locks the unit. Dispute freezes it. Local only."
        }
      />
      <EntityTable columns={third ? ["Unit", "Kind", "Tower", "Price", "Status"] : ["Unit", "Kind", "Tower", "Price", "Status", ""]}>
        {rows.map((u) => (
          <tr key={u.id} className="border-b border-line last:border-0">
            <td className="px-4 py-3 font-medium">
              {u.code}
              <p className="text-xs text-muted">
                {u.floor} · {u.area}
              </p>
            </td>
            <td className="px-4 py-3">{u.kind}</td>
            <td className="px-4 py-3">{towers.find((t) => t.id === u.towerId)?.name}</td>
            <td className="px-4 py-3 tabular-nums">{inr(u.price, true)}</td>
            <td className="px-4 py-3">
              <Status value={u.status} />
            </td>
            {third ? null : (
              <td className="px-4 py-3">
                {u.status === "available" || u.status === "held" || u.status === "booked" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const err = setUnitDispute(u.id);
                      toast(err ?? "Marked dispute.");
                    }}
                  >
                    Dispute
                  </Button>
                ) : null}
              </td>
            )}
          </tr>
        ))}
      </EntityTable>
      {third ? null : (
        <>
          <h2 className="mb-3 mt-8 font-display text-2xl">Status history</h2>
          <ul className="space-y-2 text-sm">
            {events.map((e) => {
              const u = units.find((x) => x.id === e.unitId);
              return (
                <li key={e.id} className="rounded-md border border-line px-4 py-3">
                  {u?.code} · {e.from} → {e.to} · {e.note}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
