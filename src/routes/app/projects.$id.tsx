import { createFileRoute, Link } from "@tanstack/react-router";
import { ElevationMark } from "@/components/elevation-mark";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Card } from "@/components/ui/card";
import { useAtlas } from "@/lib/store";
import { formatDate, inr } from "@/lib/utils";

export const Route = createFileRoute("/app/projects/$id")({ component: ProjectDetail });

function ProjectDetail() {
  const { id } = Route.useParams();
  const { projects, documents, bookings, diaries, changes } = useAtlas();
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
