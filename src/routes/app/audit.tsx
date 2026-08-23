import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { useAtlas } from "@/lib/store";

export const Route = createFileRoute("/app/audit")({ component: Audit });

export function Audit() {
  const { audit } = useAtlas();
  return (
    <div>
      <PageHeader
        kicker="Integrity"
        title="Audit trail"
        description="Append-only events from this session. Production Atlas hashes each row in the same transaction as the mutation."
      />
      <ol className="space-y-2">
        {audit.map((a) => (
          <li key={a.id} className="grid gap-1 rounded-xl border border-line bg-surface px-4 py-3 sm:grid-cols-[11rem_1fr]">
            <p className="font-mono text-[11px] tabular-nums text-muted">{a.at.replace("T", " ").slice(0, 19)}</p>
            <div>
              <p className="text-sm">
                <span className="font-medium">{a.actor}</span> {a.action}
              </p>
              <p className="text-xs text-muted">{a.entity}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
