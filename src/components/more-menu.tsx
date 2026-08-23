import type { ReactNode } from "react";

export function MoreMenu({ label = "More", children }: { label?: string; children: ReactNode }) {
  return (
    <details className="relative">
      <summary className="flex h-11 cursor-pointer list-none items-center rounded-md border border-line bg-surface px-3 text-sm marker:content-none [&::-webkit-details-marker]:hidden">
        {label}
      </summary>
      <div className="absolute right-0 z-20 mt-1 flex min-w-44 flex-col gap-0.5 rounded-md border border-line bg-surface p-1 shadow-md">
        {children}
      </div>
    </details>
  );
}
