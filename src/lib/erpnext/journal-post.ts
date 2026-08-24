/**
 * Controlled Journal Entry post. Atlas never calls this except from Finance
 * with an explicit button. ERPNEXT_POSTING_ENABLED default false.
 */

export const ATLAS_OPS_PREFIX = "ATLAS-OPS";

export const COMPANY_ALLOWLIST = [
  "MOCK ATLAS3 LLP",
  "SATYAM BUILDCOM",
  "SATYAM CONSTRUCTION",
  "MGB PRIME ESTATES LLP",
] as const;

export interface AtlasJournalLine {
  account: string;
  debit?: number;
  credit?: number;
  costCenter?: string;
  partyType?: string;
  party?: string;
}

export interface AtlasJournalPost {
  sourceId: string;
  company: string;
  postingDate: string;
  userRemark?: string;
  lines: AtlasJournalLine[];
}

export function roundInr(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export function atlasOpsTitle(sourceId: string): string {
  return `${ATLAS_OPS_PREFIX} ${sourceId.trim()}`;
}

export function validateAtlasJournalPost(input: AtlasJournalPost): string | null {
  if (!input.sourceId?.trim()) return "sourceId is required (idempotency key).";
  if (!input.company?.trim()) return "company is required.";
  if (!COMPANY_ALLOWLIST.includes(input.company.trim() as (typeof COMPANY_ALLOWLIST)[number])) {
    return `Company "${input.company}" is not on the Atlas allowlist.`;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.postingDate ?? "")) return "postingDate must be YYYY-MM-DD.";
  if (!Array.isArray(input.lines) || input.lines.length < 2) return "At least two journal lines are required.";
  let debit = 0;
  let credit = 0;
  for (let i = 0; i < input.lines.length; i++) {
    const line = input.lines[i];
    if (!line.account?.trim()) return `Line ${i + 1}: account is required.`;
    const d = roundInr(Number(line.debit) || 0);
    const c = roundInr(Number(line.credit) || 0);
    if (d > 0 && c > 0) return `Line ${i + 1}: debit XOR credit — not both.`;
    if (d <= 0 && c <= 0) return `Line ${i + 1}: amount must be > 0 on debit or credit.`;
    debit += d;
    credit += c;
  }
  if (roundInr(debit) !== roundInr(credit)) {
    return `Journal is not balanced (debit ${roundInr(debit)} ≠ credit ${roundInr(credit)}).`;
  }
  return null;
}

export function toErpnextJournal(input: AtlasJournalPost) {
  const title = atlasOpsTitle(input.sourceId);
  const remark = input.userRemark?.trim() ? `${title} · ${input.userRemark.trim()}` : title;
  return {
    doctype: "Journal Entry",
    voucher_type: "Journal Entry",
    company: input.company.trim(),
    posting_date: input.postingDate,
    title,
    user_remark: remark,
    bill_no: input.sourceId.trim(),
    accounts: input.lines.map((line) => {
      const debit = roundInr(Number(line.debit) || 0);
      const credit = roundInr(Number(line.credit) || 0);
      const row: Record<string, unknown> = {
        account: line.account.trim(),
        debit_in_account_currency: debit,
        credit_in_account_currency: credit,
        debit,
        credit,
      };
      if (line.costCenter) row.cost_center = line.costCenter;
      if (line.partyType && line.party) {
        row.party_type = line.partyType;
        row.party = line.party;
      }
      return row;
    }),
  };
}

const mockPosted = new Map<string, string>();

export function mockJeName(sourceId: string): string {
  const key = sourceId.trim();
  const existing = mockPosted.get(key);
  if (existing) return existing;
  const name = `MOCK-JE-${key}`.slice(0, 140);
  mockPosted.set(key, name);
  return name;
}

export function peekMockJe(sourceId: string): string | undefined {
  return mockPosted.get(sourceId.trim());
}
