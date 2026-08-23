import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function Kpi({
  label,
  value,
  hint,
  tone,
  vs,
  trend,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "ok" | "warn" | "danger";
  vs?: string;
  trend?: "up" | "down" | "flat";
}) {
  return (
    <Card className="flex min-h-[7.5rem] flex-col p-4 sm:p-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">{label}</p>
      <p
        className={cn(
          "mt-3 font-display text-2xl leading-none tabular-nums tracking-tight",
          tone === "ok" && "text-ok",
          tone === "warn" && "text-warn",
          tone === "danger" && "text-danger",
          !tone && "text-ink",
        )}
      >
        {value}
      </p>
      {vs || hint || trend ? (
        <p className="mt-auto pt-2 text-xs text-muted">
          {vs ? <span>{vs}</span> : null}
          {vs && hint ? " · " : null}
          {hint}
          {trend === "up" ? " ↑" : trend === "down" ? " ↓" : ""}
        </p>
      ) : null}
    </Card>
  );
}

/** Alias — value + target + trend on the same card (CLT: no split attention). */
export const KpiCard = Kpi;
