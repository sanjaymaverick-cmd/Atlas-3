import { createFileRoute, Link } from "@tanstack/react-router";
import { rolesForPath } from "@/components/layout/nav";
import { PageHeader } from "@/components/page-header";
import { ProjectTimeline } from "@/components/project-timeline";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { PHASES } from "@/lib/phases";
import { useAtlas } from "@/lib/store";

export const Route = createFileRoute("/app/phases")({ component: Phases });

function Phases() {
  const { user, projects, entityId, projectId } = useAtlas();
  const role = user?.role;
  const list = projects.filter(
    (p) => p.entityId === entityId && (projectId === "all" || p.id === projectId),
  );
  const allowed = PHASES.filter((p) => {
    const roles = rolesForPath(p.path);
    return role ? roles.includes(role) : false;
  });
  const showProgramme = role === "owner" || role === "pm";

  return (
    <div>
      <PageHeader
        kicker="Atlas 3"
        title={showProgramme ? "Programme" : "All phases"}
        description={
          showProgramme
            ? "Built vs calendar on live projects. Module cards below are only desks this seat can open."
            : "Only the desks this seat can open. Local only."
        }
      />
      {showProgramme ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Programme vs today</CardTitle>
          </CardHeader>
          <CardBody>
            <ProjectTimeline projects={list} />
          </CardBody>
        </Card>
      ) : null}
      <ol className="grid gap-3 md:grid-cols-2">
        {allowed.map((p) => (
          <li key={p.id}>
            <Link to={p.path as "/app"} className="block">
              <Card className="h-full p-5 transition-colors hover:bg-chip">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
                  Phase {p.id}
                </p>
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
