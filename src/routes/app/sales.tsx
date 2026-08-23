import { useEffect } from "react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useAtlas } from "@/lib/store";

export const Route = createFileRoute("/app/sales")({ component: SalesLayout });

function SalesLayout() {
  const pullPortalJournal = useAtlas((s) => s.pullPortalJournal);
  useEffect(() => {
    void pullPortalJournal();
    const t = window.setInterval(() => void pullPortalJournal(), 10000);
    return () => window.clearInterval(t);
  }, [pullPortalJournal]);
  return <Outlet />;
}
