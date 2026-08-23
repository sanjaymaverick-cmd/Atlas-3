import type { ReactNode } from "react";

export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-line bg-surface/60 px-5 py-10">
      <p className="font-display text-xl text-ink">{title}</p>
      <p className="max-w-md text-sm text-muted">{body}</p>
      {action}
    </div>
  );
}
