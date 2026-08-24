import { Link, Navigate, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Menu, Shield } from "lucide-react";
import { useLayoutEffect, useMemo, useState } from "react";
import { CommandPalette } from "@/components/command-palette";
import { Hint } from "@/components/hint";
import { BOTTOM_NAV, GROUP_ORDER, NAV, NAV_GROUP_LABEL, rolesForPath, type NavGroup } from "@/components/layout/nav";
import { homeForRole } from "@/lib/roles";
import { isThirdParty, myCompanyId } from "@/lib/sales-scope";
import { useAtlas } from "@/lib/store";
import { cn } from "@/lib/utils";

export function AppShell() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, entities, projects, entityId, projectId, setEntity, setProject, signOut, approvals, agents, partners } =
    useAtlas();
  const [open, setOpen] = useState(false);
  const pending = approvals.filter((a) => a.status === "pending").length;
  const entityProjects = projects.filter((p) => p.entityId === entityId);
  const links = NAV.filter((n) => user && n.roles.includes(user.role));
  const channel = isThirdParty(user?.role);
  const firmName = partners.find((p) => p.id === myCompanyId(user, agents))?.name ?? "Channel";
  const bottom = user ? (BOTTOM_NAV[user.role] ?? []) : [];
  const allowed = rolesForPath(pathname);
  const blocked = Boolean(user && (allowed.length === 0 || !allowed.includes(user.role)));
  const defaultOpen = useMemo(() => {
    const role = user?.role;
    if (role === "sales" || role === "channel" || role === "channel_admin") return new Set<NavGroup>(["today", "sell"]);
    if (role === "engineer" || role === "supervisor" || role === "stores") return new Set<NavGroup>(["today", "build"]);
    if (role === "legal" || role === "docs") return new Set<NavGroup>(["today", "build"]);
    if (role === "accountant" || role === "commercial") return new Set<NavGroup>(["today", "books", "build"]);
    return new Set<NavGroup>(["today", "books"]);
  }, [user?.role]);
  const [openGroups, setOpenGroups] = useState<Set<NavGroup>>(defaultOpen);

  useLayoutEffect(() => {
    if (!user) return;
    const allow = rolesForPath(pathname);
    if (allow.length === 0 || !allow.includes(user.role)) {
      void navigate({ to: homeForRole(user.role, pending) });
    }
  }, [pathname, user, pending, navigate]);

  if (blocked && user) {
    return <Navigate to={homeForRole(user.role, pending)} />;
  }

  function toggleGroup(g: NavGroup) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  }

  function NavLinks({ onPick, grouped }: { onPick?: () => void; grouped: boolean }) {
    if (!grouped) {
      return (
        <>
          {links.map((item) => {
            const active = item.end
              ? pathname === item.to
              : pathname === item.to || pathname.startsWith(`${item.to}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onPick}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors",
                  active
                    ? "bg-white/10 text-sidebar-fg"
                    : "text-sidebar-muted hover:bg-white/10 hover:text-sidebar-fg",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="flex-1">
                  <Hint term={item.label} captureClick={false}>
                    {item.label}
                  </Hint>
                </span>
                {item.to === "/app/approvals" && pending > 0 ? (
                  <span className="rounded-full bg-primary-fg/15 px-1.5 text-[10px] tabular-nums">{pending}</span>
                ) : null}
              </Link>
            );
          })}
        </>
      );
    }
    return (
      <>
        {GROUP_ORDER.map((g) => {
          const items = links.filter((l) => l.group === g);
          if (!items.length) return null;
          const shown = openGroups.has(g);
          return (
            <div key={g} className="mb-2">
              <button
                type="button"
                className="flex h-8 w-full items-center justify-between px-3 text-[10px] uppercase tracking-[0.16em] text-sidebar-muted"
                onClick={() => toggleGroup(g)}
              >
                {NAV_GROUP_LABEL[g]}
                <span>{shown ? "–" : "+"}</span>
              </button>
              {shown
                ? items.map((item) => {
                    const active = item.end
                      ? pathname === item.to
                      : pathname === item.to || pathname.startsWith(`${item.to}/`);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={onPick}
                        className={cn(
                          "flex h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors",
                          active
                            ? "bg-white/10 text-sidebar-fg"
                            : "text-sidebar-muted hover:bg-white/10 hover:text-sidebar-fg",
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="flex-1">
                          <Hint term={item.label} captureClick={false}>
                            {item.label}
                          </Hint>
                        </span>
                        {item.to === "/app/approvals" && pending > 0 ? (
                          <span className="rounded-full bg-primary-fg/15 px-1.5 text-[10px] tabular-nums">{pending}</span>
                        ) : null}
                      </Link>
                    );
                  })
                : null}
            </div>
          );
        })}
      </>
    );
  }

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <CommandPalette />
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
          <NavLinks grouped />
        </nav>
        <div className="border-t border-white/10 p-4">
          <p className="text-sm">{user?.name}</p>
          <p className="text-xs text-sidebar-muted">{user?.title}</p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-sidebar-muted">Ctrl/⌘ K to jump</p>
          <button
            className="mt-3 flex h-11 w-full items-center rounded-md px-3 text-sm text-sidebar-muted hover:bg-white/10 hover:text-sidebar-fg"
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
          {channel ? (
            <p className="min-w-0 flex-1 truncate text-sm text-muted">{firmName}</p>
          ) : (
            <>
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
            </>
          )}
          <div className="flex shrink-0 items-center gap-1 rounded-full border border-line px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-muted sm:px-3">
            <Shield className="size-3.5" />
            <span>Local only · not live</span>
          </div>
          <button
            type="button"
            className="inline-flex h-11 shrink-0 items-center rounded-md border border-line px-3 text-sm text-muted hover:bg-chip"
            onClick={() => {
              signOut();
              navigate({ to: "/" });
            }}
          >
            End session
          </button>
        </header>

        {open ? (
          <div className="fixed inset-0 z-40 bg-ink/40 lg:hidden" onClick={() => setOpen(false)}>
            <div className="h-full w-64 overflow-y-auto bg-sidebar p-4 text-sidebar-fg" onClick={(e) => e.stopPropagation()}>
              <p className="mb-1 font-display text-xl">Atlas</p>
              <p className="mb-4 text-xs text-sidebar-muted">
                {user?.name} · {user?.title}
              </p>
              <div className="space-y-1">
                <NavLinks grouped={false} onPick={() => setOpen(false)} />
                <button
                  type="button"
                  className="mt-2 flex h-11 w-full items-center rounded-md px-3 text-sm text-sidebar-muted hover:bg-white/10 hover:text-sidebar-fg"
                  onClick={() => {
                    setOpen(false);
                    signOut();
                    navigate({ to: "/" });
                  }}
                >
                  End session
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <main className={cn("px-4 py-6 sm:px-6 lg:px-8", bottom.length ? "pb-24 lg:pb-8" : "")}>
          <Outlet />
        </main>
      </div>

      {bottom.length ? (
        <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface lg:hidden">
          {bottom.map((item) => {
            const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex h-14 flex-1 items-center justify-center text-sm",
                  active ? "text-primary" : "text-muted",
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            className="flex h-14 flex-1 items-center justify-center text-sm text-muted"
            onClick={() => setOpen(true)}
          >
            More
          </button>
        </nav>
      ) : null}
    </div>
  );
}
