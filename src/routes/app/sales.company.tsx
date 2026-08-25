import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Kpi } from "@/components/kpi";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { companyAgentIds, isThirdParty, myCompanyId } from "@/lib/sales-scope";
import { agentScorecard } from "@/lib/sales/scorecard";
import { useAtlas } from "@/lib/store";
import { inr } from "@/lib/utils";

export const Route = createFileRoute("/app/sales/company")({ component: CompanyAdmin });

function CompanyAdmin() {
  const {
    user,
    agents,
    partners,
    dailyReports,
    holds,
    bookings,
    commissions,
    inviteAgent,
    setAgentStatus,
  } = useAtlas();
  const scopedCompany = myCompanyId(user, agents);
  const companyId = scopedCompany ?? "pt1";
  const firm = scopedCompany ? partners.find((p) => p.id === scopedCompany) : undefined;
  const ids = companyAgentIds(agents, isThirdParty(user?.role) ? companyId : undefined).filter(
    (id) => {
      const a = agents.find((x) => x.id === id);
      return a && !a.inHouse;
    },
  );
  const rows = agents.filter(
    (a) =>
      ids.includes(a.id) && (isThirdParty(user?.role) ? a.companyId === companyId : !a.inHouse),
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  if (user?.role === "channel") return <Navigate to="/app/sales/channel" />;

  return (
    <div>
      <PageHeader
        kicker="Third-party company"
        title={firm?.name ?? "Channel firms"}
        description="Company admin sees only this firm’s agents, reports and holds. Invite does not create a login until go-live. Local only."
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Agents" value={String(rows.length)} />
        <Kpi
          label="Calls (all reports)"
          value={String(
            rows.reduce(
              (s, a) => s + agentScorecard(a, { dailyReports, holds, bookings, commissions }).calls,
              0,
            ),
          )}
        />
        <Kpi
          label="Live holds"
          value={String(
            holds.filter((h) => h.status === "held" && rows.some((a) => a.id === h.agentId)).length,
          )}
        />
        <Kpi
          label="Commission accrued"
          value={inr(
            commissions
              .filter(
                (c) => (!scopedCompany || c.partnerId === scopedCompany) && c.status === "accrued",
              )
              .reduce((s, c) => s + c.amount, 0),
            true,
          )}
          hint="Never self-pays"
          tone="warn"
        />
      </div>
      <details className="mb-6">
        <summary className="cursor-pointer text-sm text-muted">
          Invite agent (does not create a login until go-live)
        </summary>
        <Card className="mt-3 grid gap-3 p-5 sm:grid-cols-2">
          <Field label="Agent name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Button
              className="h-12"
              onClick={() => {
                const err = inviteAgent({ name, phone, companyId });
                toast(err ?? "Agent invited.");
                if (!err) {
                  setName("");
                  setPhone("");
                }
              }}
            >
              Invite agent
            </Button>
          </div>
        </Card>
      </details>
      <div className="space-y-3">
        {rows.map((a) => {
          const sc = agentScorecard(a, { dailyReports, holds, bookings, commissions });
          return (
            <Card key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{a.name}</p>
                <p className="text-xs text-muted">
                  {a.phone} · {sc.calls} calls · {sc.visits} visits · {sc.liveHolds} holds ·{" "}
                  {sc.booked} booked · {partners.find((p) => p.id === a.companyId)?.name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Status value={a.status} />
                {a.status === "active" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast(setAgentStatus(a.id, "suspended") ?? "Suspended.")}
                  >
                    Suspend
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast(setAgentStatus(a.id, "active") ?? "Active.")}
                  >
                    Activate
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
