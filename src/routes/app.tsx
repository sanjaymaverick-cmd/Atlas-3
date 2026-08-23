import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/app-shell";
import { useHasMounted } from "@/lib/hydrated";
import { useAtlas } from "@/lib/store";

export const Route = createFileRoute("/app")({ component: AppGate });

function AppGate() {
  const mounted = useHasMounted();
  const user = useAtlas((s) => s.user);
  if (!mounted) return <div className="min-h-dvh bg-bg" />;
  if (!user) return <Navigate to="/" />;
  return <AppShell />;
}
