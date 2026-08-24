import { useAtlas } from "@/lib/store";

/** Shows which company + project a write will hit. */
export function EntityChip({ projectId }: { projectId?: string }) {
  const { entities, entityId, projects } = useAtlas();
  const entity = entities.find((e) => e.id === entityId);
  const project = projectId ? projects.find((p) => p.id === projectId) : undefined;
  const mismatch = project && project.entityId !== entityId;
  return (
    <p className={`text-xs ${mismatch ? "text-danger" : "text-muted"}`}>
      Filing on <span className="font-medium text-ink">{entity?.name ?? entityId}</span>
      {project ? (
        <>
          {" "}
          · {project.code} {project.name}
          {mismatch ? " — this project belongs to another company. Switch first." : null}
        </>
      ) : null}
    </p>
  );
}
