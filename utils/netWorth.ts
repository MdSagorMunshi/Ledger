import {
  Transaction,
  SavingsTransaction,
  AssetEntry,
  OweEntry,
  LendEntry,
} from "@/context/LedgerContext";

export interface NetWorthResult {
  total: number;
  totalAssets: number;
  totalLiabilities: number;
  spendableBalance: number;
  savingsPool: number;
  manualAssets: number;
  outstandingLends: number;
  outstandingOwes: number;
  manualLiabilities: number;
}

export function computeNetWorth(state: {
  transactions: Transaction[];
  savingsTransactions: SavingsTransaction[];
  assetEntries: AssetEntry[];
  oweEntries: OweEntry[];
  lendEntries: LendEntry[];
}): NetWorthResult {
  const { transactions, savingsTransactions, assetEntries, oweEntries, lendEntries } = state;

  const spendableBalance =
    transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0) -
    transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const savingsPool =
    savingsTransactions.filter((s) => s.direction === "in").reduce((sum, s) => sum + s.amount, 0) -
    savingsTransactions.filter((s) => s.direction === "out").reduce((sum, s) => sum + s.amount, 0);

  const manualAssets = assetEntries
    .filter((a) => a.isManual && a.type === "asset")
    .reduce((s, a) => s + a.value, 0);

  const manualLiabilities = assetEntries
    .filter((a) => a.isManual && a.type === "liability")
    .reduce((s, a) => s + a.value, 0);

  const outstandingLends = lendEntries
    .filter((l) => l.status !== "returned" && l.countInNetWorth)
    .reduce((s, l) => s + l.remainingAmount, 0);

  const outstandingOwes = oweEntries
    .filter((o) => o.status !== "settled")
    .reduce((s, o) => s + o.remainingAmount, 0);

  const totalAssets = spendableBalance + savingsPool + manualAssets + outstandingLends;
  const totalLiabilities = outstandingOwes + manualLiabilities;
  const total = totalAssets - totalLiabilities;

  return {
    total,
    totalAssets,
    totalLiabilities,
    spendableBalance,
    savingsPool,
    manualAssets,
    outstandingLends,
    outstandingOwes,
    manualLiabilities,
  };
}
