export interface ErpnextConfig {
  /** Empty when ERPNEXT_URL is unset — Atlas still boots. */
  url: string;
  apiKey: string;
  apiSecret: string;
  company: string;
  postingEnabled: boolean;
  /** True only when URL + key + secret are all set. */
  configured: boolean;
}

export interface BooksResult {
  name: "erpnext";
  ok: boolean;
  configured: boolean;
  reachable: boolean;
  live: false;
  action?: string;
  company?: string;
  detail: string;
  postingEnabled?: boolean;
  baselineCount?: number;
  journal?: Array<{ name: string; posting_date?: string; remarks?: string }>;
  posted?: unknown[];
}

export interface BooksBackend {
  name: "erpnext";
  health(): Promise<BooksResult>;
  baselineCount(): Promise<BooksResult>;
  journal(limit?: number): Promise<BooksResult>;
  /** Exists for Phase 2. Refuses unless ERPNEXT_POSTING_ENABLED=true. */
  postJournal(input: Record<string, unknown>): Promise<BooksResult>;
}

export interface BooksActionPayload {
  action?: string;
  [key: string]: unknown;
}
