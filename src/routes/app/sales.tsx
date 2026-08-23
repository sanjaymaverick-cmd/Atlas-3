import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/app/sales")({ component: SalesLayout });

function SalesLayout() {
  return <Outlet />;
}
