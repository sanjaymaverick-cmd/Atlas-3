import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { useAtlas } from "@/lib/store";
import type { DecisionId } from "@/lib/types";

export const Route = createFileRoute("/app/decisions")({ component: Decisions });

function Decisions() {
  const { decisions, ownerTodos, recordDecision, reopenDecision, user } = useAtlas();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const owner = user?.role === "owner";

  return (
    <div>
      <PageHeader
        kicker="Blueprint §25"
        title="Owner decisions"
        description="Recorded policy stays here. Open TODOs are owner decisions — they do not block local testing."
      />
      <h2 className="mb-3 font-display text-2xl">Open TODOs (do not block)</h2>
      <ul className="mb-8 space-y-2">
        {ownerTodos.map((t) => (
          <li key={t.id} className="rounded-xl border border-line bg-surface px-4 py-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{t.title}</p>
              <Status value={t.status === "open" ? "pending" : "recorded"} />
            </div>
            <p className="mt-1 text-muted">{t.detail}</p>
          </li>
        ))}
      </ul>
      <h2 className="mb-3 font-display text-2xl">Recorded policy</h2>
      <div className="space-y-4">
        {decisions.map((d) => (
          <Card key={d.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="font-display text-2xl">{d.title}</h2>
              <Status value={d.status} />
            </div>
            <p className="mt-2 text-sm text-muted">{d.detail}</p>
            {d.status === "recorded" && d.note ? (
              <p className="mt-3 rounded-md bg-chip px-3 py-2 text-sm">{d.note}</p>
            ) : null}
            {owner && d.status === "open" ? (
              <div className="mt-4 space-y-2">
                <Textarea
                  placeholder="Your decision, in your words."
                  value={notes[d.id] ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [d.id]: e.target.value }))}
                />
                <Button
                  onClick={() => {
                    const note = (notes[d.id] ?? "").trim();
                    if (!note) {
                      toast("Write the decision before recording it.");
                      return;
                    }
                    recordDecision(d.id as DecisionId, note);
                    toast("Recorded.");
                  }}
                >
                  Record decision
                </Button>
              </div>
            ) : null}
            {owner && d.status === "recorded" ? (
              <Button
                className="mt-3"
                size="sm"
                variant="ghost"
                onClick={() => reopenDecision(d.id as DecisionId)}
              >
                Reopen
              </Button>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
