import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { PHASES } from "@/lib/phases";
import { USERS } from "@/lib/seed";

export const Route = createFileRoute("/app/testing")({ component: Testing });

const SCRIPTS = [
  "Sign in as MD, then as Site Engineer. Confirm nav hides Tally for engineer.",
  "Documents: register a file, clear quarantine, request original, approve as MD, download once.",
  "Land: refuse acquisition on Baggad, clear diligence, then acquire.",
  "Commercial: invite vendor without GSTIN, try Advance to verified — must refuse. Add GSTIN path via invite with GSTIN.",
  "PO against a non-active vendor must refuse. PO against Active vendor lands in Approvals.",
  "Site: seal today’s diary twice — second must refuse. Fail an inspection — NCR appears in Change control.",
  "Controls: issue material past receipts — must refuse.",
  "Customers: double-book a unit — refuse. Possession before full collection — refuse.",
  "Tally: reconcile one case. Confirm Atlas did not invent a voucher.",
  "Assistant: Level-2 draft only. Must not claim it approved anything.",
  "CRM: convert a partner lead — booking + accrued commission. Send commission for approval. Atlas must not pay.",
  "Quotations: open RFQ waterproofing, submit/select Active vendor quote, Create PO — appears in Approvals with quote context.",
  "Role home: engineer lands on Site; MD on Approvals; finance on Tally.",
  "Organization: Aerovista and Acropolis listed. Mark ready is local ops only — Atlas is not live.",
];


function Testing() {
  return (
    <div>
      <PageHeader
        kicker="UAT"
        title="Local test pack"
        description="Atlas is not live. Run these scripts on this host. Go-live is a later decision, after this pack is signed."
      />
      <Card className="mb-6 p-5">
        <h2 className="font-display text-xl">Accounts</h2>
        <ul className="mt-3 space-y-1 font-mono text-sm">
          {USERS.map((u) => (
            <li key={u.id}>
              {u.email} · {u.password} · {u.title}
            </li>
          ))}
        </ul>
      </Card>
      <h2 className="mb-3 font-display text-2xl">Scripts</h2>
      <ol className="space-y-2">
        {SCRIPTS.map((s, i) => (
          <li key={i} className="rounded-xl border border-line bg-surface px-4 py-3 text-sm">
            <span className="font-mono text-xs text-muted">{i + 1}.</span> {s}
          </li>
        ))}
      </ol>
      <h2 className="mb-3 mt-8 font-display text-2xl">Phase coverage</h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {PHASES.map((p) => (
          <li key={p.id} className="rounded-md border border-line px-4 py-3 text-sm">
            Phase {p.id} · {p.title}
          </li>
        ))}
      </ul>
    </div>
  );
}
