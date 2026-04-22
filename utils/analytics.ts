import { Transaction } from "@/context/LedgerContext";

function getMonthKey(date: string): string {
  return date.slice(0, 7);
}

function getDayOfWeek(date: string): number {
  const d = new Date(date + "T00:00:00");
  return d.getDay();
}

const regularExpenses = (txs: Transaction[]) =>
  txs.filter(
    (t) =>
      t.type === "expense" &&
      t.subtype !== "savings_transfer" &&
      t.subtype !== "savings_withdrawal"
  );

const regularIncome = (txs: Transaction[]) =>
  txs.filter(
    (t) =>
      t.type === "income" &&
      t.subtype !== "savings_transfer" &&
      t.subtype !== "savings_withdrawal" &&
      t.subtype !== "asset_withdrawal"
  );

export interface SpendingVelocityResult {
  thisMonthDaily: number;
  lastMonthDaily: number;
  hasEnoughData: boolean;
  direction: "up" | "down" | "flat";
  diffPerDay: number;
}

export function computeSpendingVelocity(transactions: Transaction[]): SpendingVelocityResult {
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth();
  const daysElapsed = now.getDate();

  const lastMonthDate = new Date(thisYear, thisMonth - 1, 1);
  const lastYear = lastMonthDate.getFullYear();
  const lastMonth = lastMonthDate.getMonth();
  const daysInLastMonth = new Date(lastYear, lastMonth + 1, 0).getDate();

  const thisMonthKey = `${thisYear}-${String(thisMonth + 1).padStart(2, "0")}`;
  const lastMonthKey = `${lastYear}-${String(lastMonth + 1).padStart(2, "0")}`;

  const expenses = regularExpenses(transactions);
  const thisMonthExpenses = expenses.filter((t) => getMonthKey(t.date) === thisMonthKey);
  const lastMonthExpenses = expenses.filter((t) => getMonthKey(t.date) === lastMonthKey);

  const allDates = transactions.map((t) => t.date).sort();
  const hasEnoughData =
    allDates.length > 0 &&
    new Date(allDates[0]).getTime() < now.getTime() - 7 * 24 * 60 * 60 * 1000;

  const thisMonthTotal = thisMonthExpenses.reduce((s, t) => s + t.amount, 0);
  const lastMonthTotal = lastMonthExpenses.reduce((s, t) => s + t.amount, 0);

  const thisMonthDaily = daysElapsed > 0 ? thisMonthTotal / daysElapsed : 0;
  const lastMonthDaily = daysInLastMonth > 0 ? lastMonthTotal / daysInLastMonth : 0;

  const diff = thisMonthDaily - lastMonthDaily;
  const threshold = lastMonthDaily * 0.05;
  let direction: "up" | "down" | "flat" = "flat";
  if (Math.abs(diff) <= threshold) direction = "flat";
  else if (diff > 0) direction = "up";
  else direction = "down";

  return {
    thisMonthDaily,
    lastMonthDaily,
    hasEnoughData,
    direction,
    diffPerDay: Math.abs(diff),
  };
}

export interface DayOfWeekData {
  day: number;
  label: string;
  average: number;
  hasData: boolean;
}

export function computeDayOfWeekHeatmap(transactions: Transaction[]): DayOfWeekData[] {
  const labels = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const expenses = regularExpenses(transactions);
  const daySums: number[] = [0, 0, 0, 0, 0, 0, 0];
  const dayCounts: number[] = [0, 0, 0, 0, 0, 0, 0];
  const weekSets: Set<string>[] = [
    new Set(), new Set(), new Set(), new Set(), new Set(), new Set(), new Set(),
  ];

  expenses.forEach((t) => {
    const dow = getDayOfWeek(t.date);
    daySums[dow] += t.amount;
    const d = new Date(t.date + "T00:00:00");
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    weekSets[dow].add(weekStart.toISOString().slice(0, 10));
  });

  for (let i = 0; i < 7; i++) {
    dayCounts[i] = weekSets[i].size;
  }

  return labels.map((label, i) => ({
    day: i,
    label,
    average: dayCounts[i] > 0 ? daySums[i] / dayCounts[i] : 0,
    hasData: dayCounts[i] > 0,
  }));
}

export interface CategoryTrendData {
  category: string;
  monthlyTotals: number[];
  months: string[];
  trend: "up" | "down" | "flat";
}

export function computeCategoryTrends(transactions: Transaction[]): CategoryTrendData[] {
  const expenses = regularExpenses(transactions);
  if (expenses.length === 0) return [];

  const now = new Date();
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const cats = Array.from(new Set(expenses.map((t) => t.category)));
  return cats
    .map((cat) => {
      const catTxs = expenses.filter((t) => t.category === cat);
      const monthlyTotals = months.map((m) =>
        catTxs.filter((t) => getMonthKey(t.date) === m).reduce((s, t) => s + t.amount, 0)
      );
      const recent = monthlyTotals[5];
      const threeAgo = monthlyTotals[2];
      let trend: "up" | "down" | "flat" = "flat";
      if (recent > threeAgo * 1.05) trend = "up";
      else if (recent < threeAgo * 0.95) trend = "down";
      return { category: cat, monthlyTotals, months, trend };
    })
    .filter((c) => c.monthlyTotals.some((v) => v > 0));
}

export interface IncomeStabilityResult {
  score: number;
  label: "HIGHLY STABLE" | "MODERATELY STABLE" | "HIGH VARIANCE";
  hasEnoughData: boolean;
  cv: number;
}

export function computeIncomeStability(transactions: Transaction[]): IncomeStabilityResult {
  const income = regularIncome(transactions);
  const monthMap: Record<string, number> = {};
  income.forEach((t) => {
    const mk = getMonthKey(t.date);
    monthMap[mk] = (monthMap[mk] || 0) + t.amount;
  });
  const values = Object.values(monthMap);
  if (values.length < 3) {
    return { score: 0, label: "HIGH VARIANCE", hasEnoughData: false, cv: 0 };
  }
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  if (mean === 0) return { score: 0, label: "HIGH VARIANCE", hasEnoughData: true, cv: 0 };
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / mean;
  const score = Math.max(0, Math.min(100, Math.round((1 - Math.min(cv, 0.5) / 0.5) * 100)));
  let label: IncomeStabilityResult["label"];
  if (score >= 75) label = "HIGHLY STABLE";
  else if (score >= 40) label = "MODERATELY STABLE";
  else label = "HIGH VARIANCE";
  return { score, label, hasEnoughData: true, cv };
}

export function computeBudgetProgress(
  transactions: Transaction[],
  category: string
): number {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return regularExpenses(transactions)
    .filter((t) => t.category === category && getMonthKey(t.date) === monthKey)
    .reduce((s, t) => s + t.amount, 0);
}

export function getMonthTransactions(
  transactions: Transaction[],
  year: number,
  month: number
): Transaction[] {
  const key = `${year}-${String(month + 1).padStart(2, "0")}`;
  return transactions.filter((t) => getMonthKey(t.date) === key);
}

export function getAvailableMonths(transactions: Transaction[]): string[] {
  const months = new Set(transactions.map((t) => t.date.slice(0, 7)));
  return Array.from(months).sort().reverse();
}
