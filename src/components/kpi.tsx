import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "ok" | "warn" | "danger";
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
      {hint ? <p className="mt-auto pt-2 text-xs text-muted">{hint}</p> : null}
    </Card>
  );
}
