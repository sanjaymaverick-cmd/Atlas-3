import { Link } from "@tanstack/react-router";
import type { Project } from "@/lib/types";

function pct(start: string, end: string, now = Date.now()) {
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (!a || !b || b <= a) return 0;
  return Math.min(100, Math.max(0, ((now - a) / (b - a)) * 100));
}

export function ProjectTimeline({ projects }: { projects: Project[] }) {
  return (
    <div className="space-y-4">
      {projects.map((p) => {
        const t = pct(p.start, p.possession);
        return (
          <Link
            key={p.id}
            to="/app/projects/$id"
            params={{ id: p.id }}
            className="block hover:opacity-90"
          >
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <p className="truncate text-sm font-medium">{p.name}</p>
              <p className="shrink-0 font-mono text-[10px] tabular-nums text-muted">
                {p.start.slice(0, 7)} → {p.possession.slice(0, 7)}
              </p>
            </div>
            <div className="relative h-7 overflow-hidden rounded-md bg-chip">
              <div
                className="absolute inset-y-0 left-0 bg-primary/25"
                style={{ width: `${p.progress}%` }}
              />
              <div
                className="absolute top-0 h-full w-px bg-ink"
                style={{ left: `${t}%` }}
                title="Today"
              />
              <span className="relative z-10 px-2 text-[11px] leading-7 text-ink/80">
                {p.progress}% built · {Math.round(t)}% of calendar
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
