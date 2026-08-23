import type { ReactNode } from "react";

export function GateBanner({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 rounded-md border border-warn/30 bg-warn/8 px-4 py-3 text-sm text-ink">{children}</div>
  );
}
