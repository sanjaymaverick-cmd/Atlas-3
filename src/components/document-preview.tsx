import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import type { Document } from "@/lib/types";
import { cn } from "@/lib/utils";

export function DocumentPreview({
  doc,
  actor,
  onClose,
  onRequestExport,
}: {
  doc: Document;
  actor: string;
  onClose: () => void;
  onRequestExport: () => void;
}) {
  const [left, setLeft] = useState(10 * 60);
  const stamp = useMemo(() => {
    const t = new Date();
    return `${actor} · ${t.toLocaleString("en-IN")} · grant ${doc.id.slice(-6)}`;
  }, [actor, doc.id]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          onClose();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [onClose]);

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  const overlay = (
    <div className="fixed inset-0 z-[80] flex flex-col bg-sidebar text-sidebar-fg">
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg">{doc.title}</p>
          <p className="text-[11px] uppercase tracking-[0.14em] text-sidebar-muted">
            {doc.sheet} · {doc.revision} · {doc.sha256.slice(0, 16)} · watermarked · {mm}:{ss}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="border-white/20 bg-transparent text-sidebar-fg"
          onClick={onRequestExport}
        >
          Request original
        </Button>
        <button
          className="grid size-11 place-items-center rounded-md hover:bg-white/10"
          onClick={onClose}
          aria-label="Close preview"
        >
          <X className="size-5" />
        </button>
      </header>
      <div className="relative flex-1 overflow-auto p-4 sm:p-8">
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden opacity-25"
          aria-hidden
        >
          {Array.from({ length: 18 }).map((_, i) => (
            <p
              key={i}
              className="whitespace-nowrap text-xs tracking-[0.4em] text-sidebar-fg"
              style={{ transform: `rotate(-24deg) translateY(${i * 48}px)` }}
            >
              {`${stamp}   `.repeat(8)}
            </p>
          ))}
        </div>
        <div className="relative mx-auto w-full max-w-4xl rounded-sm border border-white/20 bg-bg p-4 text-ink shadow-[var(--shadow-card)] sm:p-6">
          <SheetFace doc={doc} />
        </div>
      </div>
    </div>
  );
  return createPortal(overlay, document.body);
}

function SheetFace({ doc }: { doc: Document }) {
  if (doc.kind === "Drawing") return <PlanSheet doc={doc} />;
  if (doc.kind === "Statutory") return <CertificateSheet doc={doc} />;
  return <ReportSheet doc={doc} />;
}

function PlanSheet({ doc }: { doc: Document }) {
  return (
    <div>
      <div className="mb-3 flex items-end justify-between gap-3 border-b border-line pb-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted">General arrangement</p>
          <h2 className="font-display text-2xl">{doc.title}</h2>
        </div>
        <p className="font-mono text-xs tabular-nums">{doc.sheet}</p>
      </div>
      <svg viewBox="0 0 640 420" className="h-auto w-full text-ink">
        <rect
          x="8"
          y="8"
          width="624"
          height="404"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <rect
          x="40"
          y="36"
          width="220"
          height="320"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <rect x="48" y="48" width="92" height="70" fill="none" stroke="currentColor" />
        <rect x="156" y="48" width="92" height="70" fill="none" stroke="currentColor" />
        <rect x="48" y="132" width="200" height="88" fill="none" stroke="currentColor" />
        <rect x="48" y="236" width="92" height="108" fill="none" stroke="currentColor" />
        <rect x="156" y="236" width="92" height="108" fill="none" stroke="currentColor" />
        <rect x="280" y="36" width="28" height="320" fill="currentColor" opacity="0.08" />
        <rect x="280" y="36" width="28" height="320" fill="none" stroke="currentColor" />
        <text x="286" y="200" fontSize="9" fill="currentColor" transform="rotate(-90 294 200)">
          CORE / LIFTS
        </text>
        <rect
          x="328"
          y="36"
          width="220"
          height="320"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        {[0, 1, 2, 3].map((i) => (
          <rect
            key={i}
            x={340}
            y={48 + i * 76}
            width="196"
            height="64"
            fill="none"
            stroke="currentColor"
          />
        ))}
        <text x="40" y="380" fontSize="10" fill="currentColor">
          Grid A–D · 1:100 · Issued for construction
        </text>
      </svg>
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-2 font-mono text-[10px] text-muted">
        <p>SHA {doc.sha256}</p>
        <p>REV {doc.revision}</p>
        <p className="text-right">{doc.pages} sheets</p>
      </div>
    </div>
  );
}

function CertificateSheet({ doc }: { doc: Document }) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center px-6 py-10 text-center">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Controlled original</p>
      <h2 className="mt-3 max-w-md font-display text-3xl">{doc.title}</h2>
      <p className="mt-4 max-w-sm text-sm text-muted">
        This preview is a session-bound rendering. The statutory original is not transferred until a
        four-eyes export grant is consumed.
      </p>
      <p className="mt-8 font-mono text-xs tabular-nums text-muted">
        {doc.sheet} · {doc.revision} · {doc.sha256}
      </p>
    </div>
  );
}

function ReportSheet({ doc }: { doc: Document }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{doc.kind}</p>
      <h2 className="font-display text-3xl">{doc.title}</h2>
      <p className={cn("mt-4 max-w-prose text-sm leading-relaxed text-muted")}>
        Controlled excerpt. Body text of the registered file is not streamed to the browser; only a
        watermarked facsimile of the title sheet is shown. Integrity {doc.sha256}.
      </p>
      <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted">Sheet</dt>
          <dd className="font-mono text-xs">{doc.sheet}</dd>
        </div>
        <div>
          <dt className="text-muted">Pages</dt>
          <dd className="tabular-nums">{doc.pages}</dd>
        </div>
      </dl>
    </div>
  );
}
