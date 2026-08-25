import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { NAV } from "@/components/layout/nav";
import { useAtlas } from "@/lib/store";

export function CommandPalette() {
  const navigate = useNavigate();
  const { user, projects, units, approvals } = useAtlas();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const items = useMemo(() => {
    if (!user) return [];
    const needle = q.trim().toLowerCase();
    const nav = NAV.filter((n) => n.roles.includes(user.role)).map((n) => ({
      key: n.to,
      label: n.label,
      hint: "Go",
      run: () => navigate({ to: n.to }),
    }));
    const proj = projects.map((p) => ({
      key: `p-${p.id}`,
      label: `${p.code} · ${p.name}`,
      hint: "Project",
      run: () => navigate({ to: "/app/projects/$id", params: { id: p.id } }),
    }));
    const unitRows = units.map((u) => ({
      key: `u-${u.id}`,
      label: `${u.code} · ${u.status}`,
      hint: "Unit",
      run: () => navigate({ to: "/app/sales/inventory" }),
    }));
    const gates = approvals
      .filter((a) => a.status === "pending")
      .map((a) => ({
        key: `a-${a.id}`,
        label: a.title,
        hint: "Approval",
        run: () => navigate({ to: "/app/approvals" }),
      }));
    return [...nav, ...proj, ...unitRows, ...gates].filter(
      (row) =>
        !needle ||
        row.label.toLowerCase().includes(needle) ||
        row.hint.toLowerCase().includes(needle),
    );
  }, [user, q, projects, units, approvals, navigate]);

  if (!open || !user) return null;

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 p-4" onClick={() => setOpen(false)}>
      <div
        className="mx-auto mt-[10vh] max-w-lg overflow-hidden rounded-xl border border-line bg-surface shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Jump to a screen, project, unit…"
          className="h-12 w-full border-b border-line bg-transparent px-4 text-sm outline-none"
        />
        <ul className="max-h-80 overflow-y-auto p-2">
          {items.slice(0, 20).map((row) => (
            <li key={row.key}>
              <button
                type="button"
                className="flex h-11 w-full items-center justify-between rounded-md px-3 text-left text-sm hover:bg-chip"
                onClick={() => {
                  row.run();
                  setOpen(false);
                  setQ("");
                }}
              >
                <span>{row.label}</span>
                <span className="text-[10px] uppercase tracking-[0.12em] text-muted">
                  {row.hint}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="border-t border-line px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-muted">
          Ctrl/⌘ K · Esc
        </p>
      </div>
    </div>
  );
}
