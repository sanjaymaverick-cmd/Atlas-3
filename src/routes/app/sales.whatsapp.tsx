import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { GateBanner } from "@/components/gate-banner";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { companyAgentIds, isThirdParty, myCompanyId } from "@/lib/sales-scope";
import { useAtlas } from "@/lib/store";

export const Route = createFileRoute("/app/sales/whatsapp")({ component: WhatsAppDesk });

function WhatsAppDesk() {
  const { waTemplates, waSends, leads, user, agents, sendWhatsApp, receiveWhatsApp } = useAtlas();
  const companyId = myCompanyId(user, agents);
  const agentIds = companyAgentIds(agents, companyId);
  const live = leads.filter((l) => {
    if (l.stage === "lost" || l.stage === "won") return false;
    if (!companyId) return true;
    return l.partnerId === companyId || (l.agentId ? agentIds.includes(l.agentId) : false);
  });
  const [leadId, setLeadId] = useState(live[0]?.id ?? "");
  const [reply, setReply] = useState("Yes, Sunday works. Budget around 80L.");
  const thread = waSends
    .filter((s) => s.leadId === leadId)
    .slice()
    .sort((a, b) => a.at.localeCompare(b.at));
  const marketingOk = !isThirdParty(user?.role);
  const visible = waTemplates.filter((t) => (marketingOk ? true : t.category === "utility"));

  return (
    <div>
      <PageHeader
        kicker="WhatsApp"
        title="Templates, thread, automation"
        description="Visit scheduled auto-sends the utility confirm. Inbound replies re-score and can qualify. Live WhatsApp Business API is an owner TODO. Local only."
      />
      <GateBanner>
        Meta rules on this desk: sequential variables with samples, no promotional copy in Utility,
        full URL in brochure, no sequential blast without consent.
      </GateBanner>

      <Card className="mb-6 p-5">
        <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-muted">Send to lead</p>
        <select
          className="h-11 w-full max-w-md rounded-md border border-line bg-surface px-3 text-sm"
          value={leadId}
          onChange={(e) => setLeadId(e.target.value)}
        >
          {live.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} · {l.phone} · consent {l.waConsent ? "yes" : "no"}
            </option>
          ))}
        </select>
      </Card>

      <Card className="mb-6 p-5">
        <h2 className="mb-3 font-display text-xl">Thread</h2>
        <ul className="mb-3 max-h-64 space-y-2 overflow-auto text-sm">
          {thread.map((s) => (
            <li
              key={s.id}
              className={
                s.direction === "in"
                  ? "rounded-md bg-chip px-3 py-2"
                  : "rounded-md border border-line px-3 py-2"
              }
            >
              <span className="text-[11px] uppercase tracking-[0.12em] text-muted">
                {s.direction}
              </span>
              <p>{s.body}</p>
            </li>
          ))}
          {thread.length === 0 ? <li className="text-muted">No messages on this lead.</li> : null}
        </ul>
        <Field label="Simulate inbound reply">
          <Input value={reply} onChange={(e) => setReply(e.target.value)} />
        </Field>
        <Button
          className="mt-3 h-11"
          variant="outline"
          onClick={() => {
            if (!leadId) return toast("Pick a lead.");
            const err = receiveWhatsApp(leadId, reply);
            toast(err ?? "Reply logged. Qualifier + re-score ran.");
          }}
        >
          Receive reply
        </Button>
      </Card>

      <div className="space-y-3">
        {visible.map((t) => (
          <Card key={t.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
                  {t.name} · {t.trigger} · {t.language}
                </p>
                <p className="mt-1 text-sm">{t.body}</p>
                <p className="mt-1 text-xs text-muted">Samples: {t.samples.join(" · ")}</p>
              </div>
              <div className="flex items-center gap-2">
                <Status value={t.category} />
                <Status value={t.status} />
                <Status value={t.quality} />
              </div>
            </div>
            <Button
              className="mt-3 h-11"
              variant="outline"
              onClick={() => {
                if (!leadId) return toast("Pick a lead.");
                const err = sendWhatsApp({ templateId: t.id, leadId });
                toast(err ?? "Logged as WhatsApp out. Lead re-scored. API send is owner TODO.");
              }}
            >
              Send (log)
            </Button>
          </Card>
        ))}
      </div>

      <h2 className="mb-3 mt-8 font-display text-2xl">Log</h2>
      <ul className="space-y-2 text-sm">
        {waSends.slice(0, 8).map((s) => (
          <li key={s.id} className="rounded-md border border-line px-4 py-3">
            {s.direction} · {s.at.slice(0, 16)} · {s.to} · {s.body}
          </li>
        ))}
        {waSends.length === 0 ? <li className="text-muted">No messages yet.</li> : null}
      </ul>
    </div>
  );
}
