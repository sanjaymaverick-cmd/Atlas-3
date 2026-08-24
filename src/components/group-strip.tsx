import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { useAtlas } from "@/lib/store";
import { inr } from "@/lib/utils";

/** MD / Director: three sister companies without switching the header. */
export function GroupStrip() {
  const { entities, projects, parcels, units, bookings, approvals, fundingSanctions } = useAtlas();
  return (
    <div className="mb-6 grid gap-3 md:grid-cols-3">
      {entities.map((e) => {
        const plist = projects.filter((p) => p.entityId === e.id);
        const ids = new Set(plist.map((p) => p.id));
        const land = parcels
          .filter((p) => ids.has(p.projectId) && p.status === "acquired")
          .reduce((s, p) => s + (p.considerationInr ?? 0), 0);
        const sold = units.filter((u) => ids.has(u.projectId) && (u.status === "booked" || u.status === "sold")).length;
        const available = units.filter((u) => ids.has(u.projectId) && u.status === "available").length;
        const pending = approvals.filter((a) => a.status === "pending" && ids.has(a.projectId)).length;
        const funding = fundingSanctions.filter((f) => ids.has(f.projectId));
        return (
          <Card key={e.id} className="p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{e.kind}</p>
            <p className="font-display text-xl leading-tight">{e.name}</p>
            <ul className="mt-3 space-y-1 text-sm">
              {plist.map((p) => (
                <li key={p.id}>
                  <Link to="/app/projects/$id" params={{ id: p.id }} className="underline-offset-4 hover:underline">
                    {p.code} {p.name}
                  </Link>
                  <span className="text-muted"> · {p.status}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm tabular-nums">
              {sold} sold · {available} free
              {land ? ` · land ${inr(land, true)}` : " · land ₹ —"}
            </p>
            <p className="text-xs text-muted">
              {pending} waiting for a yes
              {funding[0] ? ` · ${funding[0].bank} ${funding[0].loanPct}/${funding[0].equityPct}` : " · no sanction on file"}
            </p>
            <p className="mt-2 text-xs">
              {bookings.filter((b) => ids.has(b.projectId)).length} bookings ·{" "}
              <Link to="/app/finance" className="underline-offset-4 hover:underline">
                Open books
              </Link>
            </p>
          </Card>
        );
      })}
    </div>
  );
}
