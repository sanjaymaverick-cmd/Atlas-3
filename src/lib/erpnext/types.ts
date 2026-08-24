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

export interface BooksCompanyStatus {
  name: string;
  present: boolean;
  abbr?: string;
  isGroup?: boolean;
  parent?: string;
  role: "group" | "trading" | "mock";
  project?: string;
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
  companies?: BooksCompanyStatus[];
  dukiaReady?: boolean;
  accounts?: Array<{ name: string; isGroup?: boolean }>;
  costCenters?: Array<{ name: string; company?: string }>;
}

export interface BooksBackend {
  name: "erpnext";
  health(): Promise<BooksResult>;
  baselineCount(): Promise<BooksResult>;
  journal(limit?: number): Promise<BooksResult>;
  /** Explicit Finance post only. Refuses unless ERPNEXT_POSTING_ENABLED=true. */
  postJournal(input: Record<string, unknown>): Promise<BooksResult>;
}

export interface BooksActionPayload {
  action?: string;
  journal?: unknown;
  sourceId?: string;
  company?: string;
  postingDate?: string;
  userRemark?: string;
  lines?: unknown;
  limit?: number;
  [key: string]: unknown;
}
