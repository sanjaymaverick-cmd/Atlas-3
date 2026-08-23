import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { useAtlas } from "@/lib/store";

export const Route = createFileRoute("/app/assistant")({ component: Assistant });

function Assistant() {
  const { decisions, notes, draftAdvice } = useAtlas();
  const hosting = decisions.find((d) => d.id === "ai_hosting");
  const closed = hosting?.status !== "recorded";
  const [prompt, setPrompt] = useState("Draft a site instruction for the Tower B raft quantity variance.");

  return (
    <div>
      <PageHeader
        kicker="Phase 11"
        title="Assistant"
        description="Four-level authority. Atlas may inform, draft, recommend, or create draft tasks. It never approves, pays, signs, or deletes."
      />
      {closed ? (
        <Card className="p-5">
          <h2 className="font-display text-2xl">Fail-closed</h2>
          <p className="mt-2 max-w-xl text-sm text-muted">
            No inference provider is wired. Record the AI hosting decision under Owner decisions if you want
            Level-2 drafts in this demo. Until then, every request is refused.
          </p>
        </Card>
      ) : (
        <Card className="p-5">
          <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          <Button
            className="mt-3"
            onClick={() => {
              const err = draftAdvice(prompt);
              toast(err ?? "Draft stored. A human must still approve.");
            }}
          >
            Draft (Level 2)
          </Button>
        </Card>
      )}
      <div className="mt-6 space-y-3">
        {notes.map((n) => (
          <Card key={n.id} className="p-5">
            <p className="text-xs text-muted">
              Level {n.level} · {n.at}
            </p>
            <p className="mt-2 text-sm font-medium">{n.prompt}</p>
            <pre className="mt-3 whitespace-pre-wrap font-sans text-sm text-muted">{n.draft}</pre>
          </Card>
        ))}
      </div>
    </div>
  );
}
