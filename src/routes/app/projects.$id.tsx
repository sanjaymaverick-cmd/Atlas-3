import { createFileRoute, Link } from "@tanstack/react-router";
import { ElevationMark } from "@/components/elevation-mark";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Card } from "@/components/ui/card";
import { useAtlas } from "@/lib/store";
import { formatDate, inr } from "@/lib/utils";

function ProjectGates({ projectId }: { projectId: string }) {
  const { parcels, diligence, obligations, rfqs, pos, partners, fundingSanctions, units, projects } = useAtlas();
  const p = projects.find((x) => x.id === projectId);
  const parcel = parcels.find((x) => x.projectId === projectId);
  const openDd = parcel ? diligence.filter((d) => d.parcelId === parcel.id && d.status !== "clear").length : 0;
  const reraFiled = obligations.some((o) => o.projectId === projectId && o.kind === "rera" && o.status === "filed");
  const reraOpen = obligations.filter((o) => o.projectId === projectId && o.kind === "rera");
  const rfqRows = rfqs.filter((r) => r.projectId === projectId);
  const poRows = pos.filter((x) => x.projectId === projectId);
  const firm = partners.find((x) => x.id === p?.exclusivePartnerId);
  const fund = fundingSanctions.find((f) => f.projectId === projectId);
  const sold = units.filter((u) => u.projectId === projectId && (u.status === "booked" || u.status === "sold")).length;
  const free = units.filter((u) => u.projectId === projectId && u.status === "available").length;
  const landGate =
    !parcel ? "No parcel" : parcel.status === "acquired" ? "Land acquired" : openDd ? `Land checks open (${openDd})` : "Ready to acquire";
  return (
    <Card className="mt-6 grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Land</p>
        <p className="font-medium">{landGate}</p>
        <p className="text-xs text-muted">{parcel?.considerationInr ? inr(parcel.considerationInr, true) : "No ₹ on file"}</p>
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted">RERA</p>
        <p className="font-medium">{reraFiled ? "Filed" : "Target only — not registered yet"}</p>
        <p className="text-xs text-muted">
          {reraFiled ? reraOpen.find((o) => o.status === "filed")?.filedRef ?? parcel?.rera : `Target ${parcel?.rera ?? "—"}`}
        </p>
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted">RFQ / orders</p>
        <p className="font-medium">
          {rfqRows.length} price request{rfqRows.length === 1 ? "" : "s"} · {poRows.length} PO
        </p>
        <p className="text-xs text-muted">{fund ? `${fund.bank} ${fund.loanPct}/${fund.equityPct}` : "No sanction master"}</p>
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Sales</p>
        <p className="font-medium">
          {sold} sold · {free} free
        </p>
        <p className="text-xs text-muted">
          {firm ? `Exclusive: ${firm.name} ${firm.rate}%` : "No exclusive channel"}
          {p?.constructionStart ? ` · build ${p.constructionStart}` : ""}
        </p>
      </div>
    </Card>
  );
}

export const Route = createFileRoute("/app/projects/$id")({ component: ProjectDetail });

function ProjectDetail() {
  const { id } = Route.useParams();
  const { projects, documents, bookings, diaries, changes, drawings } = useAtlas();
  const p = projects.find((x) => x.id === id);

  if (!p) {
    return (
      <div>
        <PageHeader title="Project not found" />
        <Link to="/app/projects" className="text-sm underline">
          Back to projects
        </Link>
      </div>
    );
  }

  const docs = documents.filter((d) => d.projectId === p.id);
  const sold = bookings.filter((b) => b.projectId === p.id);
  const diary = diaries.filter((d) => d.projectId === p.id).slice(0, 3);
  const openChanges = changes.filter((c) => c.projectId === p.id);

  return (
    <div>
      <PageHeader
        kicker={p.code}
        title={p.name}
        description={`${p.city} · ${p.type} · possession ${formatDate(p.possession)}`}
        actions={
          <Link to="/app/projects" className="text-sm text-muted underline-offset-4 hover:underline">
            All projects
          </Link>
        }
      />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Status value={p.status} />
        <span className="text-sm text-muted">
          {inr(p.spent, true)} of {inr(p.budget, true)} · {p.progress}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-chip">
        <div className="h-full bg-primary" style={{ width: `${p.progress}%` }} />
      </div>
      <ProjectGates projectId={p.id} />
      <Card className="mt-6 overflow-hidden p-4">
        <ElevationMark className="w-full text-ink" />
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-display text-xl">Register</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3">
                <span className="truncate">{d.title}</span>
                <Status value={d.status} />
              </li>
            ))}
          </ul>
          <Link to="/app/documents" className="mt-4 inline-block text-xs text-muted underline-offset-4 hover:underline">
            Open document control
          </Link>
          <Link to="/app/drawings" className="mt-2 ml-4 inline-block text-xs text-muted underline-offset-4 hover:underline">
            Drawings ({drawings.filter((d) => d.projectId === p.id).length})
          </Link>
        </Card>
        <Card className="p-5">
          <h2 className="font-display text-xl">Bookings</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {sold.map((b) => (
              <li key={b.id} className="flex justify-between gap-3">
                <span>
                  {b.unit} · {b.customer}
                </span>
                <span className="tabular-nums">{inr(b.collected, true)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="font-display text-xl">Recent diaries</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {diary.map((d) => (
              <li key={d.id}>
                <p className="text-muted">{d.date}</p>
                <p>{d.work}</p>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="font-display text-xl">Open change items</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {openChanges.map((c) => (
              <li key={c.id} className="flex justify-between gap-3">
                <span>{c.title}</span>
                <Status value={c.status} />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
