import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { useAtlas } from "@/lib/store";
import { todayIso } from "@/lib/utils";

export const Route = createFileRoute("/app/site")({ component: Site });

function Site() {
  const { diaries, inspections, projects, entityId, projectId, addDiary, completeInspection, scheduleInspection } = useAtlas();
  const scoped = projects.filter((p) => p.entityId === entityId && (projectId === "all" || p.id === projectId));
  const ids = scoped.map((p) => p.id);
  const [pid, setPid] = useState(ids[0] ?? "");
  const [work, setWork] = useState("");
  const [labour, setLabour] = useState("80");
  const [weather, setWeather] = useState("Clear");

  const diaryRows = diaries.filter((d) => ids.includes(d.projectId));
  const insp = inspections.filter((i) => ids.includes(i.projectId));

  return (
    <div>
      <PageHeader
        kicker="Phase 5"
        title="Site & quality"
        description="Diary intake is idempotent per device and date. Built for a phone on a dusty afternoon."
      />

      <Card className="mb-6 p-5">
        <h2 className="font-display text-2xl">Today’s diary</h2>
        <p className="mt-1 text-sm text-muted">One primary action. Large targets for a phone on site.</p>
        <div className="mt-4 grid gap-3">
          <Field label="Project">
            <select
              className="h-11 rounded-md border border-line bg-surface px-3 text-sm"
              value={pid}
              onChange={(e) => setPid(e.target.value)}
            >
              {scoped.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Labour on site">
            <Input type="number" value={labour} onChange={(e) => setLabour(e.target.value)} />
          </Field>
          <Field label="Weather">
            <Input value={weather} onChange={(e) => setWeather(e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Major work">
              <Textarea value={work} onChange={(e) => setWork(e.target.value)} />
            </Field>
          </div>
        </div>
        <Button
          className="mt-4 h-12 w-full text-base"
          onClick={() => {
            const err = addDiary({
              projectId: pid,
              date: todayIso(),
              weather,
              labour: Number(labour) || 0,
              work: work || "Progress as planned.",
              materials: "See store.",
              safety: "Nil.",
              deviceKey: `demo-${pid}-${todayIso()}`,
            });
            if (err) toast(err);
            else toast("Diary sealed for today.");
          }}
        >
          Seal diary
        </Button>
      </Card>

      <h2 className="mb-3 font-display text-2xl">Recent diaries</h2>
      <div className="space-y-3">
        {diaryRows.map((d) => (
          <Card key={d.id} className="p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted">
                {d.date} · {d.author} · {d.weather}
              </p>
              <p className="text-sm tabular-nums">{d.labour} labour</p>
            </div>
            <p className="mt-2 text-sm">{d.work}</p>
            <p className="mt-1 text-xs text-muted">{d.safety}</p>
          </Card>
        ))}
      </div>

      <Card className="mb-4 mt-8 grid gap-3 p-5 sm:grid-cols-3">
        <Field label="Template"><Input id="tpl" defaultValue="RCC pour — slab" /></Field>
        <Field label="Location"><Input id="loc" defaultValue="Tower A L13" /></Field>
        <div className="flex items-end">
          <Button variant="outline" onClick={() => {
            const tpl = (document.getElementById("tpl") as HTMLInputElement)?.value || "Inspection";
            const loc = (document.getElementById("loc") as HTMLInputElement)?.value || "Site";
            scheduleInspection({ projectId: pid, template: tpl, location: loc });
            toast("Inspection scheduled.");
          }}>Schedule</Button>
        </div>
      </Card>
      <h2 className="mb-3 font-display text-2xl">Inspections</h2>
      <div className="space-y-3">
        {insp.map((i) => (
          <Card key={i.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{i.template}</p>
                <p className="text-sm text-muted">{i.location}</p>
              </div>
              <Status value={i.result} />
            </div>
            {i.result === "pending" ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button className="h-12" variant="outline" onClick={() => { completeInspection(i.id, "pass"); toast("Passed."); }}>
                  Pass
                </Button>
                <Button className="h-12" variant="outline" onClick={() => { completeInspection(i.id, "fail"); toast("Failed — NCR raised."); }}>
                  Fail
                </Button>
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
