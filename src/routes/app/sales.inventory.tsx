import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MoreMenu } from "@/components/more-menu";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { companyAgentIds, isThirdParty, myAgent, myCompanyId } from "@/lib/sales-scope";
import { useAtlas } from "@/lib/store";
import { inr } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/app/sales/inventory")({ component: Inventory });

function Inventory() {
  const navigate = useNavigate();
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
  const towerOpts = towers.filter((t) => rows.some((u) => u.towerId === t.id));
  const [towerId, setTowerId] = useState(towerOpts[0]?.id ?? "");
  const [filter, setFilter] = useState<"all" | "available" | "held">("all");
  const visible = rows.filter((u) => {
    if (towerId && u.towerId !== towerId) return false;
    if (filter === "available") return u.status === "available";
    if (filter === "held") return u.status === "held";
    return true;
  });
  const floors = useMemo(() => {
    const set = new Set(visible.map((u) => u.floor));
    return Array.from(set);
  }, [visible]);
  const events = unitEvents.filter((e) => rows.some((u) => u.id === e.unitId)).slice(0, 8);
  const self = myAgent(user, agents);

  return (
    <div>
      <PageHeader
        kicker="Sales · inventory"
        title={third ? "Available to hold" : "Units are the source of truth"}
        description={
          third
            ? "Free units and your firm’s holds. Hold from a cell or Channel desk. Local only."
            : "Available → Held → Booked → Sold. Hold locks the unit. Dispute is overflow. Local only."
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {towerOpts.map((t) => (
          <Button key={t.id} size="sm" variant={towerId === t.id ? "default" : "outline"} onClick={() => setTowerId(t.id)}>
            {t.name}
          </Button>
        ))}
        <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
          All
        </Button>
        <Button size="sm" variant={filter === "available" ? "default" : "outline"} onClick={() => setFilter("available")}>
          Available
        </Button>
        <Button size="sm" variant={filter === "held" ? "default" : "outline"} onClick={() => setFilter("held")}>
          Held
        </Button>
      </div>
      <div className="space-y-4">
        {floors.map((floor) => (
          <div key={floor}>
            <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-muted">Floor {floor}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {visible
                .filter((u) => u.floor === floor)
                .map((u) => (
                  <Card key={u.id} className="p-3">
                    <p className="font-medium">{u.code}</p>
                    <p className="text-xs text-muted">
                      {u.kind} · {inr(u.price, true)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Status value={u.status} />
                      {u.status === "available" ? (
                        <Button
                          size="sm"
                          className="h-11"
                          onClick={() => {
                            if (self) sessionStorage.setItem("atlas-hold-unit", u.id);
                            navigate({ to: "/app/sales/channel" });
                          }}
                        >
                          Hold
                        </Button>
                      ) : null}
                      {!third ? (
                        <MoreMenu label="⋯">
                          {u.status === "available" || u.status === "held" || u.status === "booked" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-11 w-full justify-start"
                              onClick={() => {
                                const err = setUnitDispute(u.id);
                                toast(err ?? "Marked dispute.");
                              }}
                            >
                              Dispute
                            </Button>
                          ) : null}
                        </MoreMenu>
                      ) : null}
                    </div>
                  </Card>
                ))}
            </div>
          </div>
        ))}
      </div>
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
