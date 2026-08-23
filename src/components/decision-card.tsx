import type { ReactNode } from "react";
import { Status } from "@/components/status";
import { Card } from "@/components/ui/card";

export function DecisionCard({
  kind,
  title,
  waitingOn,
  agingDays,
  amount,
  context,
  status,
  actions,
}: {
  kind: string;
  title: string;
  waitingOn: string;
  agingDays: number;
  amount?: string;
  context?: ReactNode;
  status?: string;
  actions?: ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{kind}</p>
        <p className="font-display text-xl">{title}</p>
        <p className="mt-1 text-sm text-muted">
          {waitingOn} · {agingDays} days waiting
          {amount ? ` · ${amount}` : ""}
        </p>
        {context ? <div className="mt-1 text-sm text-ink/80">{context}</div> : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {status ? <Status value={status} /> : null}
        {actions}
      </div>
    </Card>
  );
}
