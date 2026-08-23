import { Link } from "@tanstack/react-router";

export function QueueStrip({
  items,
}: {
  items: Array<{ to: string; label: string; count: number | string }>;
}) {
  return (
    <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Link
          key={item.to + item.label}
          // Registered app paths only; keep the strip data-driven.
          to={item.to as "/app"}
          className="rounded-xl border border-line bg-surface px-4 py-3 hover:bg-chip"
        >
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{item.label}</p>
          <p className="font-display text-2xl tabular-nums">{item.count}</p>
        </Link>
      ))}
    </div>
  );
}
