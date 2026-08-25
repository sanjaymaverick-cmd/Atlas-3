import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DocumentPreview } from "@/components/document-preview";
import { GateBanner } from "@/components/gate-banner";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { useAtlas } from "@/lib/store";
import type { DocClass, DocKind, Document } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

export const Route = createFileRoute("/app/documents")({ component: DocumentsPage });

const KINDS: Array<DocKind | "all"> = ["all", "Drawing", "Statutory", "Report", "Spec", "Contract"];

function DocumentsPage() {
  const store = useAtlas();
  const {
    documents,
    projects,
    entityId,
    projectId,
    user,
    exports,
    registerDocument,
    clearQuarantine,
    issueDocument,
    addRevision,
    requestExport,
    consumeExport,
  } = store;
  const [kind, setKind] = useState<DocKind | "all">("all");
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Document | null>(null);
  const [title, setTitle] = useState("");
  const [sheet, setSheet] = useState("A-NEW-01");
  const [newKind, setNewKind] = useState<DocKind>("Drawing");
  const [klass, setKlass] = useState<DocClass>("internal");
  const [pid, setPid] = useState(projects.find((p) => p.entityId === entityId)?.id ?? "");
  const [revNotes, setRevNotes] = useState<Record<string, string>>({});
  const [fileName, setFileName] = useState("");

  const rows = useMemo(() => {
    return documents.filter((d) => {
      const p = projects.find((x) => x.id === d.projectId);
      if (!p || p.entityId !== entityId) return false;
      if (projectId !== "all" && d.projectId !== projectId) return false;
      if (kind !== "all" && d.kind !== kind) return false;
      return true;
    });
  }, [documents, projects, entityId, projectId, kind]);

  const scopedProjects = projects.filter((p) => p.entityId === entityId);

  return (
    <div>
      <PageHeader
        kicker="Phase 2"
        title="Documents"
        description="Immutable revisions. Preview is session-bound and watermarked. Originals need four-eyes export."
        actions={
          <Button onClick={() => setOpen((v) => !v)}>{open ? "Close" : "Register file"}</Button>
        }
      />
      <GateBanner>
        New files start in virus scan — a file-safety hold, not a legal hold. Local demo: Atlas
        stores a hash and metadata, not the binary.
      </GateBanner>

      {open ? (
        <Card className="mb-6 grid gap-3 p-5 sm:grid-cols-2">
          <Field label="Project">
            <select
              className="h-11 rounded-md border border-line bg-surface px-3 text-sm"
              value={pid}
              onChange={(e) => setPid(e.target.value)}
            >
              {scopedProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Kind">
            <select
              className="h-11 rounded-md border border-line bg-surface px-3 text-sm"
              value={newKind}
              onChange={(e) => setNewKind(e.target.value as DocKind)}
            >
              {KINDS.filter((k) => k !== "all").map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Sheet">
            <Input value={sheet} onChange={(e) => setSheet(e.target.value)} />
          </Field>
          <Field label="File (hash only)">
            <Input type="file" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")} />
          </Field>
          <Field label="Classification">
            <select
              className="h-11 rounded-md border border-line bg-surface px-3 text-sm"
              value={klass}
              onChange={(e) => setKlass(e.target.value as DocClass)}
            >
              <option value="internal">internal</option>
              <option value="confidential">confidential</option>
              <option value="restricted">restricted</option>
            </select>
          </Field>
          <div className="flex items-end">
            <Button
              onClick={() => {
                if (!title) return toast("Title required.");
                registerDocument({
                  projectId: pid,
                  title,
                  kind: newKind,
                  classification: klass,
                  sheet,
                  fileName: fileName || undefined,
                });
                toast(
                  fileName
                    ? `Quarantine · hashed ${fileName} (not stored).`
                    : "Held in malware quarantine — no file attached.",
                );
                setTitle("");
                setOpen(false);
              }}
            >
              Register
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={cn(
              "h-9 rounded-full px-3 text-xs font-medium",
              kind === k ? "bg-ink text-primary-fg" : "bg-chip text-ink",
            )}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {rows.map((d) => {
          const grant = exports.find((e) => e.documentId === d.id);
          return (
            <Card key={d.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
                    {d.kind} · {d.sheet}
                  </p>
                  <h2 className="font-display text-2xl">{d.title}</h2>
                  <p className="mt-1 font-mono text-[11px] text-muted">
                    {d.revision} · {d.sha256} · {formatDate(d.uploadedAt)}
                  </p>
                  {d.status === "quarantine" ? (
                    <p className="mt-2 text-sm text-warn">
                      Hold:{" "}
                      {d.revisions.at(-1)?.notes ||
                        "Malware scan. Not usable on site until cleared."}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Status value={d.classification} />
                  <Status value={d.status} />
                </div>
              </div>
              <ol className="mt-4 space-y-1 border-t border-line pt-3 text-xs text-muted">
                {d.revisions.map((r) => (
                  <li key={r.id} className="flex flex-wrap gap-x-3">
                    <span className="font-mono text-ink">{r.revision}</span>
                    <span>{r.notes}</span>
                    <span>{r.uploadedBy}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-4 flex flex-wrap gap-2">
                {d.status === "quarantine" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const err = clearQuarantine(d.id);
                      toast(err ?? "Scan clear. File is in review.");
                    }}
                  >
                    Clear scan
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setPreview(d)}>
                    Watermarked preview
                  </Button>
                )}
                {d.status === "review" || d.status === "approved" ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      const err = issueDocument(d.id);
                      toast(err ?? "Issued.");
                    }}
                  >
                    Issue
                  </Button>
                ) : null}
                {d.status !== "quarantine" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const err = requestExport(d.id);
                      toast(err ?? "Four-eyes export queued in Approvals.");
                    }}
                  >
                    Request original
                  </Button>
                ) : null}
                {grant?.status === "granted" ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      const err = consumeExport(grant.id);
                      if (err) toast(err);
                      else toast("Original delivered once. Grant is now used.");
                    }}
                  >
                    Download original (single-use)
                  </Button>
                ) : grant?.status === "pending" ? (
                  <span className="self-center text-xs text-warn">Export waiting approval</span>
                ) : grant?.status === "used" ? (
                  <span className="self-center text-xs text-muted">Grant consumed</span>
                ) : null}
              </div>
              {d.status !== "quarantine" && user ? (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Input
                    placeholder="Revision notes"
                    value={revNotes[d.id] ?? ""}
                    onChange={(e) => setRevNotes((n) => ({ ...n, [d.id]: e.target.value }))}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const err = addRevision(d.id, revNotes[d.id] ?? "");
                      toast(
                        err ?? "New revision registered. Previous revision remains in history.",
                      );
                    }}
                  >
                    New revision
                  </Button>
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>

      {preview && user ? (
        <DocumentPreview
          doc={preview}
          actor={user.name}
          onClose={() => setPreview(null)}
          onRequestExport={() => {
            const err = requestExport(preview.id);
            toast(err ?? "Four-eyes export queued.");
            setPreview(null);
          }}
        />
      ) : null}
    </div>
  );
}
