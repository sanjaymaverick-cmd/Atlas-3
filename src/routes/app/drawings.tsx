import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { GateBanner } from "@/components/gate-banner";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { readAttachment } from "@/lib/attach";
import { isThirdParty } from "@/lib/sales-scope";
import { useAtlas } from "@/lib/store";
import type { Drawing } from "@/lib/types";

export const Route = createFileRoute("/app/drawings")({ component: DrawingsDesk });

function DrawingsDesk() {
  const { drawings, projects, towers, entityId, projectId, user, addDrawing } = useAtlas();
  const scoped = projects.filter((p) => p.entityId === entityId && (projectId === "all" || p.id === projectId));
  const ids = scoped.map((p) => p.id);
  const rows = drawings.filter((d) => ids.includes(d.projectId));
  const [pid, setPid] = useState(ids[0] ?? "");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<Drawing["kind"]>("floor");
  const [rev, setRev] = useState("R0");
  const [status, setStatus] = useState<Drawing["status"]>("draft");
  const [towerId, setTowerId] = useState("");
  const [file, setFile] = useState<File | null>(null);

  if (isThirdParty(user?.role)) return <Navigate to="/app/sales/channel" />;

  return (
    <div>
      <PageHeader
        title="Drawings and plans"
        description="A light register: title, type, revision, PDF or a small DWG/IFC file. Not a BIM viewer, not AutoCAD, not Aconex. Channel seats cannot open this desk."
      />
      <GateBanner>
        Local demo: the file copy stays in this browser (about 1.2 MB max). DWG/IFC is stored, not opened in 3D. Originals for issue still go through Documents if you need four-eyes export.
      </GateBanner>
      <Card className="mb-6 grid gap-3 p-5 sm:grid-cols-2">
        <Field label="Project">
          <select className="h-11 rounded-md border border-line bg-surface px-3 text-sm" value={pid} onChange={(e) => setPid(e.target.value)}>
            {scoped.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Type">
          <select className="h-11 rounded-md border border-line bg-surface px-3 text-sm" value={kind} onChange={(e) => setKind(e.target.value as Drawing["kind"])}>
            <option value="master">Master</option>
            <option value="floor">Floor</option>
            <option value="structural">Structural</option>
            <option value="mep">MEP</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tower A typical floor" />
        </Field>
        <Field label="Revision">
          <Input value={rev} onChange={(e) => setRev(e.target.value)} />
        </Field>
        <Field label="Status">
          <select className="h-11 rounded-md border border-line bg-surface px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value as Drawing["status"])}>
            <option value="draft">Draft</option>
            <option value="ifc">IFC issued</option>
            <option value="as-built">As-built</option>
          </select>
        </Field>
        <Field label="Tower (optional)">
          <select className="h-11 rounded-md border border-line bg-surface px-3 text-sm" value={towerId} onChange={(e) => setTowerId(e.target.value)}>
            <option value="">All / none</option>
            {towers
              .filter((t) => t.projectId === pid)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="PDF / DWG / IFC (register only)">
          <Input
            type="file"
            accept="application/pdf,.pdf,.dwg,.dxf,.ifc,application/acad,model/ifc"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </Field>
        <div className="flex items-end">
          <Button
            onClick={async () => {
              let meta: { fileName?: string; fileKind?: string; fileSize?: number; fileDataUrl?: string; sha256?: string } = {};
              if (file) {
                const read = await readAttachment(file);
                if ("error" in read) return toast(read.error);
                meta = read;
              }
              const err = addDrawing({
                projectId: pid,
                title,
                kind,
                revision: rev,
                status,
                towerId: towerId || undefined,
                ...meta,
              });
              toast(err ?? "Drawing registered.");
              if (!err) setTitle("");
            }}
          >
            Register drawing
          </Button>
        </div>
      </Card>
      <div className="space-y-2">
        {rows.length === 0 ? <p className="text-sm text-muted">No drawings on this company slice.</p> : null}
        {rows.map((d) => {
          const p = projects.find((x) => x.id === d.projectId);
          return (
            <Card key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
                  {p?.code} · {d.kind} · {d.revision}
                </p>
                <p className="font-medium">{d.title}</p>
                <p className="text-xs text-muted">
                  {d.fileName ?? "No file"} · {d.uploadedBy} · {d.uploadedAt}
                  {d.sha256 ? ` · ${d.sha256.slice(0, 8)}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Status value={d.status === "ifc" ? "issued" : d.status} />
                {d.fileDataUrl ? (
                  <a href={d.fileDataUrl} download={d.fileName} className="text-sm underline-offset-4 hover:underline">
                    Open PDF
                  </a>
                ) : (
                  <Link to="/app/projects/$id" params={{ id: d.projectId }} className="text-sm underline-offset-4 hover:underline">
                    Project
                  </Link>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
