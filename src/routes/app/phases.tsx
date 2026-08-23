import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { PHASES } from "@/lib/phases";

export const Route = createFileRoute("/app/phases")({ component: Phases });

function Phases() {
  return (
    <div>
      <PageHeader
        kicker="Atlas 3"
        title="All phases"
        description="Eleven operating modules. Each one is live with its invariant. Owner decisions stay open until you record them."
      />
      <ol className="grid gap-3 md:grid-cols-2">
        {PHASES.map((p) => (
          <li key={p.id}>
            <Link to={p.path as "/app"} className="block">
              <Card className="h-full p-5 transition-colors hover:bg-chip">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">Phase {p.id}</p>
                <h2 className="mt-1 font-display text-2xl">{p.title}</h2>
                <p className="mt-2 text-sm text-muted">{p.rule}</p>
              </Card>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
