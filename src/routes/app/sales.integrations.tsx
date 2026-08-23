import { useEffect, useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { GateBanner } from "@/components/gate-banner";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { CONNECTORS, inboundTitle } from "@/lib/sales/integrations";
import { isThirdParty } from "@/lib/sales-scope";
import { useAtlas } from "@/lib/store";

export const Route = createFileRoute("/app/sales/integrations")({ component: Integrations });

type IngestConfig = {
  secret: string;
  secretHeader: string;
  signatureHeader: string;
  urls: Record<string, string>;
};

function Integrations() {
  const { inbound, user, acceptInbound, rejectInbound, pullPortalJournal } = useAtlas();
  const [cfg, setCfg] = useState<IngestConfig | null>(null);
  const [emailBody, setEmailBody] = useState(
    "Name: K. Mehta\nPhone: 98xxxx5510\nProject: Kanakpura Residences\nBudget: 8200000\nComment: 3 BHK west stack from email alert",
  );
  const [emailSubject, setEmailSubject] = useState("New enquiry from 99acres — Kanakpura");

  useEffect(() => {
    void fetch("/api/ingest/config")
      .then((r) => r.json())
      .then((j) => setCfg(j))
      .catch(() => setCfg(null));
    void pullPortalJournal();
  }, [pullPortalJournal]);

  if (isThirdParty(user?.role)) return <Navigate to="/app/sales/channel" />;

  async function copy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    toast(`${label} copied.`);
  }

  async function postSample(portal: "99acres" | "magicbricks" | "housing") {
    if (!cfg) return toast("Ingest API is not up. Restart Atlas with npm run dev.");
    const samples: Record<string, unknown> = {
      "99acres": {
        lead_id: `ac-${Date.now()}`,
        name: "R. Portal",
        mobile: `98xxxx${String(Date.now()).slice(-4)}`,
        project_name: "Kanakpura Residences",
        budget: 8_000_000,
        requirement: "3 BHK",
        comments: "Sample 99acres webhook from Integrations.",
      },
      magicbricks: {
        LeadId: `mb-${Date.now()}`,
        Name: "S. Bricks",
        Mobile: `97xxxx${String(Date.now()).slice(-4)}`,
        ProjectName: "Kanakpura Residences",
        Budget: 7_500_000,
        PropertyType: "Apartment",
        Comment: "Sample MagicBricks webhook from Integrations.",
      },
      housing: {
        id: `hs-${Date.now()}`,
        lead_name: "P. Housing",
        phone_number: `90xxxx${String(Date.now()).slice(-4)}`,
        project: "Kanakpura Residences",
        budget_max: 9_000_000,
        property_type: "flat",
        message: "Sample Housing.com webhook from Integrations.",
      },
    };
    const res = await fetch(cfg.urls[portal], {
      method: "POST",
      headers: { "content-type": "application/json", [cfg.secretHeader]: cfg.secret },
      body: JSON.stringify(samples[portal]),
    });
    const body = await res.json();
    if (!res.ok) return toast(body.error ?? `HTTP ${res.status}`);
    const pull = await pullPortalJournal();
    toast(body.duplicate ? "Duplicate webhook accepted (idempotent)." : `Queued. ${pull.pulled} applied to pipeline.`);
  }

  async function postEmail() {
    if (!cfg) return toast("Ingest API is not up.");
    const res = await fetch(cfg.urls.email, {
      method: "POST",
      headers: { "content-type": "application/json", [cfg.secretHeader]: cfg.secret },
      body: JSON.stringify({ subject: emailSubject, from: "leads@99acres.com", body: emailBody }),
    });
    const body = await res.json();
    if (!res.ok) return toast(body.error ?? `HTTP ${res.status}`);
    const pull = await pullPortalJournal();
    toast(body.duplicate ? "Duplicate email accepted." : `Email parsed. ${pull.pulled} applied to pipeline.`);
  }

  return (
    <div>
      <PageHeader
        kicker="Inbound"
        title="Live portal webhooks"
        description="99acres, MagicBricks and Housing.com POST into ingest → dedup → score → pipeline. Email is the fallback. Meta, Google, WhatsApp Business and payments stay designed-only. Atlas never posts Tally. Local only."
      />
      <GateBanner>
        Give Account Managers the URL + secret below. Same payload retried is idempotent. Docs: docs/sales/connectors/.
      </GateBanner>

      <h2 className="mb-3 font-display text-2xl">Connectors</h2>
      <div className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {CONNECTORS.map((c) => (
          <Card key={c.kind} className="p-3">
            <p className="text-sm font-medium">{c.label}</p>
            <p className="text-xs text-muted">{c.channel}</p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-muted">
              {c.live ? "Live webhook ready" : "Designed only"}
            </p>
          </Card>
        ))}
      </div>

      <h2 className="mb-3 font-display text-2xl">Account Manager pack</h2>
      <Card className="mb-6 space-y-3 p-5">
        {cfg ? (
          <>
            {(["99acres", "magicbricks", "housing"] as const).map((k) => (
              <div key={k} className="flex flex-wrap items-center justify-between gap-2">
                <code className="text-xs break-all">{cfg.urls[k]}</code>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-11" onClick={() => copy(cfg.urls[k], `${k} URL`)}>
                    Copy URL
                  </Button>
                  <Button size="sm" className="h-11" onClick={() => void postSample(k)}>
                    Send sample
                  </Button>
                </div>
              </div>
            ))}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
              <p className="text-sm">
                Header <span className="font-mono">{cfg.secretHeader}</span>
              </p>
              <Button size="sm" variant="outline" className="h-11" onClick={() => copy(cfg.secret, "Secret")}>
                Copy secret
              </Button>
            </div>
            <p className="font-mono text-xs text-muted">{cfg.secret}</p>
            <p className="text-xs text-muted">
              HMAC alternative: {cfg.signatureHeader} = sha256=HMAC_SHA256(secret, raw body). Override secret with
              ATLAS_INGEST_SECRET.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted">Waiting for ingest API…</p>
        )}
      </Card>

      <h2 className="mb-3 font-display text-2xl">Email fallback</h2>
      <Card className="mb-6 grid gap-3 p-5">
        <Field label="Subject">
          <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
        </Field>
        <Field label="Plain-text body">
          <Textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} />
        </Field>
        <Button className="h-12" onClick={() => void postEmail()}>
          Parse email into ingest
        </Button>
      </Card>

      <h2 className="mb-3 font-display text-2xl">Queued events</h2>
      <div className="space-y-3">
        {inbound.map((row) => (
          <Card key={row.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{row.kind}</p>
                <p className="font-medium">{inboundTitle(row)}</p>
                <p className="text-sm text-muted">{row.note}</p>
              </div>
              <Status value={row.status} />
            </div>
            {row.status === "queued" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button className="h-11" onClick={() => toast(acceptInbound(row.id) ?? "Applied. Audit recorded.")}>
                  Apply
                </Button>
                <Button size="sm" variant="outline" className="h-11" onClick={() => toast(rejectInbound(row.id) ?? "Rejected.")}>
                  Reject
                </Button>
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
