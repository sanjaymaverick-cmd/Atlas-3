export interface TallyPostResult {
  ok: boolean;
  live: false;
  action?: string;
  company?: string;
  detail: string;
  created?: number;
  posted?: unknown[];
}

export async function tallyAgent(action: string, extra: Record<string, unknown> = {}): Promise<TallyPostResult> {
  try {
    const res = await fetch("/api/tally", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = (await res.json()) as TallyPostResult;
    return {
      ok: Boolean(data.ok),
      live: false,
      action,
      company: data.company,
      detail: data.detail || (res.ok ? "ok" : `HTTP ${res.status}`),
      created: data.created,
      posted: data.posted,
    };
  } catch (err) {
    return {
      ok: false,
      live: false,
      action,
      detail: err instanceof Error ? err.message : "Tally agent unreachable",
    };
  }
}
