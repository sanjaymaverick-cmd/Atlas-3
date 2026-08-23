import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAtlas } from "@/lib/store";

export const Route = createFileRoute("/app/org")({ component: Org });

function Org() {
  const { users, entities, projects, user, audit, hosts, markHostReady } = useAtlas();
  return (
    <div>
      <PageHeader
        kicker="Phase 1"
        title="Identity & organization"
        description="People, legal entities, and the last audit events. Production uses passkeys — this demo is role entry only."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-display text-xl">People</h2>
          <ul className="mt-3 space-y-3">
            {users.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 border-b border-line pb-3 last:border-0">
                <div>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-xs text-muted">{u.title}</p>
                </div>
                {user?.id === u.id ? <Status value="active" /> : <span className="text-xs text-muted">{u.role}</span>}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="font-display text-xl">Legal entities</h2>
          <ul className="mt-3 space-y-3">
            {entities.map((e) => (
              <li key={e.id}>
                <p className="font-medium">{e.name}</p>
                <p className="font-mono text-xs text-muted">
                  {e.kind} · {e.gstin} · {projects.filter((p) => p.entityId === e.id).length} projects
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <h2 className="mb-3 mt-8 font-display text-2xl">Local hosts (not live)</h2>
      <div className="mb-8 grid gap-3 md:grid-cols-2">
        {hosts.map((h) => (
          <Card key={h.id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{h.name}</p>
              <p className="text-xs text-muted">{h.city} · {h.role}</p>
            </div>
            <div className="flex items-center gap-2">
              <Status value={h.status} />
              {h.status !== "ready" ? (
                <Button size="sm" variant="outline" onClick={() => markHostReady(h.id)}>Mark ready</Button>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
      <h2 className="mb-3 font-display text-2xl">Latest audit</h2>
      <ol className="space-y-2">
        {audit.slice(0, 6).map((a) => (
          <li key={a.id} className="rounded-md border border-line px-4 py-3 text-sm">
            {a.actor} — {a.action}
            <span className="block text-xs text-muted">{a.entity}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
