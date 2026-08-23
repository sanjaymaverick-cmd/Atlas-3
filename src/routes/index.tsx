import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ElevationMark } from "@/components/elevation-mark";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { homeForRole } from "@/lib/roles";
import { USERS } from "@/lib/seed";
import { useAtlas } from "@/lib/store";

export const Route = createFileRoute("/")({ component: Gate });

function Gate() {
  const navigate = useNavigate();
  const signInLocal = useAtlas((s) => s.signInLocal);
  const [email, setEmail] = useState("md@atlas.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const err = signInLocal(email, password);
    if (err) {
      setError(err);
      return;
    }
    const user = useAtlas.getState().user;
    navigate({ to: homeForRole(user?.role ?? "owner") });
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-sidebar text-sidebar-fg">
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,rgba(243,239,230,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(243,239,230,0.05)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="relative mx-auto flex min-h-dvh max-w-5xl flex-col justify-between px-6 py-10 sm:py-16">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-sm bg-primary text-sm font-semibold text-primary-fg">
              A
            </span>
            <div>
              <p className="font-display text-xl leading-none">Atlas</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-sidebar-muted">Private real estate ERP</p>
            </div>
          </div>
          <p className="shrink-0 rounded-full border border-white/15 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-sidebar-muted">
            Local only · not live
          </p>
        </header>

        <section className="grid items-end gap-10 py-12 lg:grid-cols-2">
          <div className="max-w-xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-sidebar-muted">Local test host</p>
            <h1 className="mt-3 font-display text-5xl leading-[1.05] sm:text-6xl">
              Not live.
              <br />
              Build, then test.
              <br />
              Then decide go-live.
            </h1>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-sidebar-muted">
              Atlas stays on this machine until UAT is signed off. No production traffic, no passkeys, no
              customer data. Test with the local accounts below.
            </p>
          </div>
          <ElevationMark className="hidden w-full text-sidebar-fg/80 lg:block" />
        </section>

        <section className="grid gap-8 lg:grid-cols-2">
          <form onSubmit={submit} className="rounded-xl border border-white/10 bg-white/5 p-5">
            <p className="mb-4 text-[11px] uppercase tracking-[0.16em] text-sidebar-muted">Test login</p>
            <div className="space-y-3">
              <Field label="Email">
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  className="border-white/15 bg-sidebar text-sidebar-fg"
                />
              </Field>
              <Field label="Password">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="border-white/15 bg-sidebar text-sidebar-fg"
                />
              </Field>
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <Button type="submit">Enter local Atlas</Button>
            </div>
          </form>
          <div>
            <p className="mb-3 text-[11px] uppercase tracking-[0.16em] text-sidebar-muted">Local test accounts</p>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="text-[11px] uppercase tracking-[0.12em] text-sidebar-muted">
                  <tr className="border-b border-white/10">
                    <th className="px-3 py-2 font-medium">Seat</th>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Password</th>
                  </tr>
                </thead>
                <tbody>
                  {USERS.map((u) => (
                    <tr key={u.id} className="border-b border-white/10 last:border-0">
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="flex min-h-11 w-full items-center text-left hover:underline"
                          onClick={() => {
                            setEmail(u.email);
                            setPassword(u.password);
                            setError("");
                          }}
                        >
                          {u.title}
                        </button>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{u.email}</td>
                      <td className="px-3 py-2 font-mono text-xs">{u.password}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-sidebar-muted">Click a seat to fill the form. These passwords never leave this host.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
