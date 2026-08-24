/**
 * Group consolidation is a finance process, not an Atlas ledger.
 * Entity GLs keep IC balances. Elimination is for the group pack only.
 * Atlas never posts elim JEs onto SATYAM BUILDCOM / CONSTRUCTION / MGB.
 */
import { companyAbbr, TRADING_COMPANIES, type TradingCompany } from "./companies";

export interface IcPair {
  a: TradingCompany;
  b: TradingCompany;
  /** Leaf names the operator should add on each sister CoA — not third-party debtors. */
  dueFromA: string;
  dueToB: string;
  dueFromB: string;
  dueToA: string;
  feeIncomeA: string;
  feeExpenseB: string;
}

export const IC_CLOSE_STEPS = [
  "All IC JE pairs submitted on both companies",
  "Due-from / due-to matched per sister pair",
  "IC income/expense matched if any",
  "Entity trial balances locked",
  "Aggregate consolidated numbers",
  "Post elim worksheet (or consol JEs) — not on entity books",
  "Group BS/P&L for MD / silent partners",
  "Keep entity packs for statutory / partners per LLP",
] as const;

/** Three sisters → three undirected pairs. */
export function icPairs(names: readonly TradingCompany[] = TRADING_COMPANIES): IcPair[] {
  const pairs: IcPair[] = [];
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = names[i];
      const b = names[j];
      const aa = companyAbbr(a);
      const ba = companyAbbr(b);
      pairs.push({
        a,
        b,
        dueFromA: `Due from ${b} - ${aa}`,
        dueToB: `Due to ${a} - ${ba}`,
        dueFromB: `Due from ${a} - ${ba}`,
        dueToA: `Due to ${b} - ${aa}`,
        feeIncomeA: `IC management fee income - ${aa}`,
        feeExpenseB: `IC management fee expense - ${ba}`,
      });
    }
  }
  return pairs;
}

export const DUKIA_IC_PAIRS = icPairs();

export const ELIM_EXAMPLE = {
  a: "SATYAM BUILDCOM" as TradingCompany,
  b: "SATYAM CONSTRUCTION" as TradingCompany,
  amountInr: 500_000,
  note: "Standalone both correct. Sum without elim overstates assets and liabilities by ₹5 L. Group elim nets to zero.",
};

export interface IcPairBalances {
  dueFromA: number;
  dueToB: number;
  dueFromB: number;
  dueToA: number;
  feeIncomeA?: number;
  feeExpenseB?: number;
}

export interface ElimLine {
  account: string;
  debit: number;
  credit: number;
  note: string;
}

export interface ElimPairResult {
  pair: IcPair;
  matchedAr: boolean;
  matchedFee: boolean;
  issues: string[];
  lines: ElimLine[];
  overstatedAssets: number;
}

function roundInr(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/** Group-pack lines only. Never post these onto entity companies. */
export function eliminatePair(pair: IcPair, balances: IcPairBalances): ElimPairResult {
  const dueFromA = roundInr(balances.dueFromA);
  const dueToB = roundInr(balances.dueToB);
  const dueFromB = roundInr(balances.dueFromB);
  const dueToA = roundInr(balances.dueToA);
  const feeIn = roundInr(balances.feeIncomeA ?? 0);
  const feeEx = roundInr(balances.feeExpenseB ?? 0);
  const issues: string[] = [];
  const lines: ElimLine[] = [];
  const matchedAr = dueFromA === dueToB && dueFromB === dueToA;
  if (dueFromA !== dueToB) {
    issues.push(`${pair.dueFromA} ₹${dueFromA} ≠ ${pair.dueToB} ₹${dueToB} — fix entity books first`);
  } else if (dueFromA > 0) {
    lines.push({
      account: pair.dueToB,
      debit: dueFromA,
      credit: 0,
      note: "Group elim · IC payable",
    });
    lines.push({
      account: pair.dueFromA,
      debit: 0,
      credit: dueFromA,
      note: "Group elim · IC receivable",
    });
  }
  if (dueFromB !== dueToA) {
    issues.push(`${pair.dueFromB} ₹${dueFromB} ≠ ${pair.dueToA} ₹${dueToA} — fix entity books first`);
  } else if (dueFromB > 0) {
    lines.push({
      account: pair.dueToA,
      debit: dueFromB,
      credit: 0,
      note: "Group elim · IC payable",
    });
    lines.push({
      account: pair.dueFromB,
      debit: 0,
      credit: dueFromB,
      note: "Group elim · IC receivable",
    });
  }
  const matchedFee = feeIn === feeEx;
  if (feeIn !== feeEx) {
    issues.push(`IC fee income ₹${feeIn} ≠ expense ₹${feeEx}`);
  } else if (feeIn > 0) {
    lines.push({
      account: pair.feeIncomeA,
      debit: feeIn,
      credit: 0,
      note: "Group elim · IC income",
    });
    lines.push({
      account: pair.feeExpenseB,
      debit: 0,
      credit: feeEx,
      note: "Group elim · IC expense",
    });
  }
  return {
    pair,
    matchedAr,
    matchedFee,
    issues,
    lines,
    overstatedAssets: dueFromA + dueFromB,
  };
}

export function buildElimWorksheet(pairs: IcPair[], balances: IcPairBalances[]): {
  results: ElimPairResult[];
  lines: ElimLine[];
  unmatched: number;
  overstatedAssets: number;
} {
  const results = pairs.map((pair, i) =>
    eliminatePair(pair, balances[i] ?? { dueFromA: 0, dueToB: 0, dueFromB: 0, dueToA: 0 }),
  );
  return {
    results,
    lines: results.flatMap((r) => r.lines),
    unmatched: results.filter((r) => r.issues.length).length,
    overstatedAssets: results.reduce((s, r) => s + (r.matchedAr ? r.overstatedAssets : 0), 0),
  };
}
