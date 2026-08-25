import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GateBanner } from "@/components/gate-banner";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import {
  companyAgentIds,
  myAgent,
  myCompanyId,
  scopedDailyReports,
  scopedHolds,
  scopedProjectIds,
  scopedUnits,
} from "@/lib/sales-scope";
import { useAtlas } from "@/lib/store";
import { holdExpiryLabel, todayIso } from "@/lib/utils";
import { inr } from "@/lib/utils";

export const Route = createFileRoute("/app/sales/channel")({ component: ChannelDesk });

function ChannelDesk() {
  const {
    projects,
    entityId,
    projectId,
    units,
    agents,
    holds,
    dailyReports,
    partners,
    user,
    holdUnit,
    releaseHold,
    bookHold,
    fileDailyReport,
  } = useAtlas();
  const companyId = myCompanyId(user, agents);
  const ids = scopedProjectIds(user, agents, projects, entityId, projectId);
  const mine = companyId
    ? agents.filter((a) => a.companyId === companyId)
    : agents.filter((a) => !a.inHouse);
  const agentIds = companyAgentIds(agents, companyId);
  const self = myAgent(user, agents);
  const [agentId, setAgentId] = useState(self?.id ?? mine[0]?.id ?? "");
  const fieldAgent = user?.role === "channel";
  const free = scopedUnits(units, ids, { thirdParty: Boolean(companyId) }).filter(
    (u) => u.status === "available",
  );
  const liveHolds = scopedHolds(holds, ids, agentIds);
  const reports = scopedDailyReports(dailyReports, agentIds);
  const reportedToday = reports.some((d) => d.agentId === agentId && d.date === todayIso());
  const [unitId, setUnitId] = useState(free[0]?.id ?? "");
  const [customer, setCustomer] = useState("");
  const [until, setUntil] = useState(todayIso());
  const [calls, setCalls] = useState("8");
  const [visits, setVisits] = useState("1");
  const [leadsN, setLeadsN] = useState("2");
  const [holdsN, setHoldsN] = useState("0");
  const [booksN, setBooksN] = useState("0");
  const [cancN, setCancN] = useState("0");
  const [notes, setNotes] = useState("");
  const [bookValue, setBookValue] = useState("6500000");
  const [moreFields, setMoreFields] = useState(false);
  const partner = companyId ? partners.find((p) => p.id === companyId) : undefined;
  const firm = partner?.name ?? "All channel firms";

  useEffect(() => {
    const pre = sessionStorage.getItem("atlas-hold-unit");
    if (pre) {
      setUnitId(pre);
      sessionStorage.removeItem("atlas-hold-unit");
    }
  }, []);

  return (
    <div>
      <PageHeader
        title="Today’s work, then hold, then book"
        description={`${firm}. You cannot see another company’s desk. A hold locks the unit for a few days. Commission is counted on booking — Atlas does not pay it.`}
      />
      {reportedToday ? null : (
        <GateBanner>
          Mandatory daily activity report — hold is refused until today’s report is filed.
        </GateBanner>
      )}

      {reportedToday ? null : (
        <Card className="mb-6 grid gap-3 p-5 sm:grid-cols-2">
          <h2 className="font-display text-xl sm:col-span-2">1 · Today’s report</h2>
          {fieldAgent ? null : (
            <Field label="Agent">
              <select
                className="h-11 rounded-md border border-line bg-surface px-3 text-sm"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
              >
                {mine.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Calls">
            <Input
              type="number"
              inputMode="numeric"
              value={calls}
              onChange={(e) => setCalls(e.target.value)}
            />
          </Field>
          <Field label="Site visits">
            <Input
              type="number"
              inputMode="numeric"
              value={visits}
              onChange={(e) => setVisits(e.target.value)}
            />
          </Field>
          <Field label="Notes">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          {moreFields ? (
            <>
              <Field label="Leads worked">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={leadsN}
                  onChange={(e) => setLeadsN(e.target.value)}
                />
              </Field>
              <Field label="Holds">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={holdsN}
                  onChange={(e) => setHoldsN(e.target.value)}
                />
              </Field>
              <Field label="Bookings">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={booksN}
                  onChange={(e) => setBooksN(e.target.value)}
                />
              </Field>
              <Field label="Cancellations">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={cancN}
                  onChange={(e) => setCancN(e.target.value)}
                />
              </Field>
            </>
          ) : (
            <button
              type="button"
              className="text-left text-sm text-muted underline-offset-4 hover:underline"
              onClick={() => setMoreFields(true)}
            >
              More fields
            </button>
          )}
          <div className="sm:col-span-2">
            <Button
              className="h-12 w-full"
              onClick={() => {
                const err = fileDailyReport({
                  agentId,
                  calls: Number(calls) || 0,
                  visits: Number(visits) || 0,
                  leads: Number(leadsN) || 0,
                  holds: Number(holdsN) || 0,
                  bookings: Number(booksN) || 0,
                  cancellations: Number(cancN) || 0,
                  notes,
                });
                toast(err ?? "Daily report filed.");
              }}
            >
              File daily report
            </Button>
          </div>
        </Card>
      )}

      <h2 className="mb-3 font-display text-2xl">2 · Hold a unit</h2>
      <Card className="mb-6 grid gap-3 p-5 sm:grid-cols-2">
        <Field label="Available unit">
          <select
            className="h-11 rounded-md border border-line bg-surface px-3 text-sm"
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
          >
            {free.map((u) => (
              <option key={u.id} value={u.id}>
                {u.code} · {u.kind} · {inr(u.price, true)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Customer">
          <Input value={customer} onChange={(e) => setCustomer(e.target.value)} />
        </Field>
        <Field label="Hold until">
          <Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
        </Field>
        <div className="flex items-end">
          <Button
            className="h-12 w-full sm:w-auto"
            onClick={() => {
              if (!customer) return toast("Customer name required.");
              const err = holdUnit({ unitId, agentId, customer, until });
              toast(err ?? "Unit locked on hold.");
            }}
          >
            Place hold
          </Button>
        </div>
      </Card>

      <h2 className="mb-3 font-display text-2xl">3 · Live holds</h2>
      {partner?.rate != null ? (
        <p className="mb-3 text-sm text-muted">
          This firm earns {partner.rate}% on convert. Atlas accrues it; it does not pay.
        </p>
      ) : null}
      <div className="space-y-3">
        {liveHolds.map((h) => {
          const u = units.find((x) => x.id === h.unitId);
          const ag = agents.find((a) => a.id === h.agentId);
          return (
            <Card key={h.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">
                  {u?.code} · {h.customer}
                </p>
                <p className="text-xs text-muted">
                  {ag?.name} · {holdExpiryLabel(h.until)} ·{" "}
                  {partners.find((p) => p.id === ag?.companyId)?.name}
                  {partners.find((p) => p.id === ag?.companyId)?.rate != null
                    ? ` · commission ${partners.find((p) => p.id === (companyId ?? ag?.companyId))?.rate}% (accrued, not paid)`
                    : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Status value={h.status} />
                <Input
                  className="h-11 w-32"
                  type="number"
                  value={bookValue}
                  onChange={(e) => setBookValue(e.target.value)}
                />
                <Button
                  size="sm"
                  className="h-11"
                  variant="outline"
                  onClick={() => {
                    const err = bookHold(h.id, Number(bookValue) || 0);
                    toast(
                      err ??
                        (h.bookingRequested
                          ? "Still waiting in Approvals."
                          : "Partner booking waits in Approvals. Unit stays locked."),
                    );
                  }}
                >
                  {h.bookingRequested ? "Waiting in Approvals" : "Request booking"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-11"
                  onClick={() => toast(releaseHold(h.id) ?? "Released.")}
                >
                  Release
                </Button>
              </div>
            </Card>
          );
        })}
        {liveHolds.length === 0 ? (
          <p className="text-sm text-muted">No live holds for this firm.</p>
        ) : null}
      </div>

      <h2 className="mb-3 mt-8 font-display text-2xl">Recent daily reports</h2>
      <ul className="space-y-2 text-sm">
        {reports.slice(0, 8).map((d) => (
          <li key={d.id} className="rounded-md border border-line px-4 py-3">
            {d.date} · {agents.find((a) => a.id === d.agentId)?.name} · {d.calls} calls · {d.visits}{" "}
            visits · {d.leads} leads
          </li>
        ))}
      </ul>
    </div>
  );
}
