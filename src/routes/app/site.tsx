import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { EntityChip } from "@/components/entity-chip";
import { GateBanner } from "@/components/gate-banner";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { useAtlas } from "@/lib/store";
import { todayIso } from "@/lib/utils";

export const Route = createFileRoute("/app/site")({ component: Site });

function Site() {
  const { diaries, inspections, projects, entityId, projectId, snags, pos, rfqs, vendors, quotes, user, addDiary, copyForwardDiary, completeInspection, scheduleInspection, closeSnag, submitQuote } = useAtlas();
  const scoped = projects.filter((p) => p.entityId === entityId && (projectId === "all" || p.id === projectId));
  const ids = scoped.map((p) => p.id);
  const [pid, setPid] = useState(ids[0] ?? "");
  const [work, setWork] = useState("");
  const [labour, setLabour] = useState("80");
  const [civil, setCivil] = useState("");
  const [mep, setMep] = useState("");
  const [finish, setFinish] = useState("");
  const [weather, setWeather] = useState("Clear");
  const [paperVendor, setPaperVendor] = useState(vendors[0]?.id ?? "");
  const [paperAmt, setPaperAmt] = useState("");
  const openRfqs = rfqs.filter((r) => ids.includes(r.projectId) && r.status === "open");
  const noPo = Boolean(pid) && !pos.some((p) => p.projectId === pid && (p.status === "approved" || p.status === "execution" || p.status === "executed"));

  const diaryRows = diaries.filter((d) => ids.includes(d.projectId));
  const insp = inspections.filter((i) => ids.includes(i.projectId));
  const openSnags = snags.filter((s) => s.status === "open" && ids.includes(s.projectId));
  const storesSeat = user?.role === "stores";

  return (
    <div>
      <PageHeader
        kicker="Phase 5"
        title="Site & quality"
        description="One diary per phone per day. Seal once. Built for a dusty afternoon. Local only."
      />

      {storesSeat ? (
        <p className="mb-6 text-sm text-muted">Stores can read diaries. Seal and Pass/Fail stay with site seats.</p>
      ) : (
      <Card className="mb-6 p-5">
        <h2 className="font-display text-2xl">Today’s diary</h2>
        <p className="mt-1 text-sm text-muted">
          One primary action. Large targets for a phone on site.
          {projects.find((p) => p.id === pid)?.constructionStart
            ? ` Build window ${projects.find((p) => p.id === pid)?.constructionStart} → ${projects.find((p) => p.id === pid)?.constructionEnd ?? "—"}.`
            : ""}
        </p>
        <div className="mt-2">
          <EntityChip projectId={pid} />
        </div>
        {noPo ? (
          <GateBanner>
            No approved purchase order on this project yet. You can still seal a diary — the civil package is not in the books.
          </GateBanner>
        ) : null}
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
          <Field label="Labour on site (total)">
            <Input type="number" value={labour} onChange={(e) => setLabour(e.target.value)} />
          </Field>
          <Field label="Civil">
            <Input type="number" value={civil} onChange={(e) => setCivil(e.target.value)} placeholder="optional" />
          </Field>
          <Field label="MEP">
            <Input type="number" value={mep} onChange={(e) => setMep(e.target.value)} placeholder="optional" />
          </Field>
          <Field label="Finishing">
            <Input type="number" value={finish} onChange={(e) => setFinish(e.target.value)} placeholder="optional" />
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
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button
          variant="outline"
          className="h-12 w-full text-base sm:w-auto"
          onClick={() => {
            const err = copyForwardDiary(pid);
            toast(err ?? "Copied the last diary and sealed it for today.");
          }}
        >
          Copy last diary
        </Button>
        <Button
          className="h-12 w-full text-base"
          onClick={() => {
            const err = addDiary({
              projectId: pid,
              date: todayIso(),
              weather,
              labour: Number(labour) || Number(civil) + Number(mep) + Number(finish) || 0,
              labourCivil: civil ? Number(civil) : undefined,
              labourMep: mep ? Number(mep) : undefined,
              labourFinish: finish ? Number(finish) : undefined,
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
        </div>
      </Card>
      )}

      {openRfqs.length > 0 && (user?.role === "engineer" || user?.role === "supervisor") ? (
        <Card className="mb-6 grid gap-3 p-5 sm:grid-cols-2">
          <h2 className="font-display text-xl sm:col-span-2">Register a paper quote</h2>
          <p className="sm:col-span-2 text-sm text-muted">Vendor has no login. Amount goes on the open price request. Select/PO still needs Active.</p>
          <Field label="Open price request">
            <select className="h-11 rounded-md border border-line bg-surface px-3 text-sm" id="paper-rfq" defaultValue={openRfqs[0]?.id}>
              {openRfqs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Vendor">
            <select className="h-11 rounded-md border border-line bg-surface px-3 text-sm" value={paperVendor} onChange={(e) => setPaperVendor(e.target.value)}>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.stage})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Amount (₹)">
            <Input type="number" value={paperAmt} onChange={(e) => setPaperAmt(e.target.value)} />
          </Field>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                const rfqId = (document.getElementById("paper-rfq") as HTMLSelectElement)?.value;
                const err = submitQuote({
                  rfqId,
                  vendorId: paperVendor,
                  amount: Number(paperAmt) || 0,
                  validity: todayIso(),
                  exclusions: "paper quote from site",
                  source: "paper",
                });
                toast(err ?? `Paper quote recorded (${quotes.length + (err ? 0 : 1)} on file).`);
              }}
            >
              Register paper quote
            </Button>
          </div>
        </Card>
      ) : null}

      <h2 className="mb-3 font-display text-2xl">Recent diaries</h2>
      <div className="space-y-3">
        {diaryRows.map((d) => (
          <Card key={d.id} className="p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted">
                {d.date} · {d.author} · {d.weather}
              </p>
              <p className="text-sm tabular-nums">
                {d.labour} labour
                {d.labourCivil || d.labourMep || d.labourFinish
                  ? ` · civil ${d.labourCivil ?? 0} / MEP ${d.labourMep ?? 0} / finish ${d.labourFinish ?? 0}`
                  : ""}
              </p>
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
      <h2 className="mb-3 mt-8 font-display text-2xl">Open defects</h2>
      <div className="mb-8 space-y-3">
        {openSnags.length === 0 ? <p className="text-sm text-muted">No open defects on this project.</p> : null}
        {openSnags.map((s) => (
          <Card key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{s.unit}</p>
              <p className="text-sm text-muted">{s.title}</p>
            </div>
            {storesSeat ? (
              <Status value={s.status} />
            ) : (
              <Button
                className="h-12"
                variant="outline"
                onClick={() => {
                  closeSnag(s.id);
                  toast("Snag closed.");
                }}
              >
                Close defect
              </Button>
            )}
          </Card>
        ))}
      </div>
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
            {i.result === "pending" && !storesSeat ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button className="h-12" variant="outline" onClick={() => { completeInspection(i.id, "pass"); toast("Passed."); }}>
                  Pass
                </Button>
                <Button className="h-12" variant="outline" onClick={() => { completeInspection(i.id, "fail"); toast("Failed — a failed work report was raised."); }}>
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
