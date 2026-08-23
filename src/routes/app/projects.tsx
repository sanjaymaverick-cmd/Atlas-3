import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { useAtlas } from "@/lib/store";
import { inr } from "@/lib/utils";

export const Route = createFileRoute("/app/projects")({ component: Projects });

function Projects() {
  const { projects, entityId, createProject, user } = useAtlas();
  const rows = projects.filter((p) => p.entityId === entityId);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [city, setCity] = useState("Jaipur");
  const [units, setUnits] = useState("48");
  const [budget, setBudget] = useState("120000000");

  return (
    <div>
      <PageHeader
        kicker="Organization"
        title="Projects"
        description="Legal-entity scoped. Mutations write an audit event in the same action."
        actions={
          user?.role === "owner" || user?.role === "pm" ? (
            <Button onClick={() => setOpen((v) => !v)}>{open ? "Close" : "New project"}</Button>
          ) : null
        }
      />

      {open ? (
        <Card className="mb-6 grid gap-3 p-5 sm:grid-cols-2">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Code">
            <Input value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
          <Field label="City">
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </Field>
          <Field label="Units">
            <Input type="number" value={units} onChange={(e) => setUnits(e.target.value)} />
          </Field>
          <Field label="Budget (INR)">
            <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} />
          </Field>
          <div className="flex items-end">
            <Button
              onClick={() => {
                if (!name || !code) {
                  toast("Name and code are required.");
                  return;
                }
                createProject({
                  entityId,
                  name,
                  code,
                  city,
                  type: "residential",
                  status: "planning",
                  budget: Number(budget) || 0,
                  units: Number(units) || 0,
                  start: new Date().toISOString().slice(0, 10),
                  possession: "2028-12-31",
                  forecast: 0,
                  concept: true,
                });
                toast("Project created.");
                setOpen(false);
                setName("");
              }}
            >
              Create
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((p) => (
          <Card key={p.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{p.code}</p>
                <h2 className="font-display text-2xl">
                  <Link to="/app/projects/$id" params={{ id: p.id }} className="hover:underline">
                    {p.name}
                  </Link>
                </h2>
                <p className="text-sm text-muted">
                  {p.city} · {p.type}
                </p>
              </div>
              <Status value={p.status} />
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted">Budget</dt>
                <dd className="tabular-nums">{inr(p.budget, true)}</dd>
              </div>
              <div>
                <dt className="text-muted">Spent</dt>
                <dd className="tabular-nums">{inr(p.spent, true)}</dd>
              </div>
              <div>
                <dt className="text-muted">Progress</dt>
                <dd className="tabular-nums">{p.progress}%</dd>
              </div>
              <div>
                <dt className="text-muted">Sold</dt>
                <dd className="tabular-nums">
                  {p.sold}/{p.units}
                </dd>
              </div>
            </dl>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-chip">
              <div className="h-full bg-primary" style={{ width: `${p.progress}%` }} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
