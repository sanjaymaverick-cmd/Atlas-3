import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Menu, Shield } from "lucide-react";
import { useState } from "react";
import { NAV } from "@/components/layout/nav";
import { useAtlas } from "@/lib/store";
import { cn } from "@/lib/utils";

export function AppShell() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, entities, projects, entityId, projectId, setEntity, setProject, signOut, approvals } =
    useAtlas();
  const [open, setOpen] = useState(false);
  const pending = approvals.filter((a) => a.status === "pending").length;
  const entityProjects = projects.filter((p) => p.entityId === entityId);
  const links = NAV.filter((n) => user && n.roles.includes(user.role));

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-sidebar text-sidebar-fg lg:flex">
        <div className="flex items-center gap-2 px-5 py-6">
          <span className="grid size-8 place-items-center rounded-sm bg-primary text-xs font-semibold text-primary-fg">
            A
          </span>
          <div>
            <p className="font-display text-lg leading-none">Atlas</p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-sidebar-muted">Private ERP</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
          {links.map((item) => {
            const active = item.end
              ? pathname === item.to
              : pathname === item.to || pathname.startsWith(`${item.to}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors",
                  active
                    ? "bg-white/10 text-sidebar-fg"
                    : "text-sidebar-muted hover:bg-white/10 hover:text-sidebar-fg",
                )}
              >
                <Icon className="size-4" />
                <span className="flex-1">{item.label}</span>
                {item.to === "/app/approvals" && pending > 0 ? (
                  <span className="rounded-full bg-primary-fg/15 px-1.5 text-[10px] tabular-nums">{pending}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4">
          <p className="text-sm">{user?.name}</p>
          <p className="text-xs text-sidebar-muted">{user?.title}</p>
          <button
            className="mt-3 text-xs text-sidebar-muted underline-offset-4 hover:text-sidebar-fg hover:underline"
            onClick={() => {
              signOut();
              navigate({ to: "/" });
            }}
          >
            End session
          </button>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur sm:px-6">
          <button
            className="grid size-11 place-items-center rounded-md border border-line bg-surface lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <select
            className="h-11 min-w-0 flex-1 rounded-md border border-line bg-surface px-3 text-sm lg:max-w-xs"
            value={entityId}
            onChange={(e) => setEntity(e.target.value)}
          >
            {entities.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          <select
            className="h-11 min-w-0 flex-1 rounded-md border border-line bg-surface px-3 text-sm lg:max-w-xs"
            value={projectId}
            onChange={(e) => setProject(e.target.value)}
          >
            <option value="all">All projects</option>
            {entityProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} · {p.name}
              </option>
            ))}
          </select>
          <div className="hidden items-center gap-1 text-xs text-muted sm:flex">
            <Shield className="size-3.5" />
            Local only
          </div>
        </header>

        {open ? (
          <div className="fixed inset-0 z-40 bg-ink/40 lg:hidden" onClick={() => setOpen(false)}>
            <div className="h-full w-64 bg-sidebar p-4 text-sidebar-fg" onClick={(e) => e.stopPropagation()}>
              <p className="mb-4 font-display text-xl">Atlas</p>
              <div className="space-y-1">
                {links.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="flex h-11 items-center rounded-md px-3 text-sm text-sidebar-fg hover:bg-white/10"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
