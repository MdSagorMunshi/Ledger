import React from "react";
import { View, Text, StyleSheet } from "react-native";
import colors from "@/constants/colors";
import { Transaction } from "@/context/LedgerContext";

interface MonthData {
  month: string;
  income: number;
  expense: number;
}

interface BarChartProps {
  transactions: Transaction[];
  formatAmount: (amount: number) => string;
}

function getLast6Months(): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

function getMonthLabel(ym: string): string {
  const [year, month] = ym.split("-");
  const d = new Date(parseInt(year), parseInt(month) - 1, 1);
  return d.toLocaleString("en-US", { month: "short" }).toUpperCase();
}

export function BarChart({ transactions, formatAmount }: BarChartProps) {
  const months = getLast6Months();

  const data: MonthData[] = months.map((ym) => {
    const txsInMonth = transactions.filter((tx) =>
      tx.date.startsWith(ym)
    );
    const income = txsInMonth
      .filter((tx) => tx.type === "income")
      .reduce((sum, tx) => sum + tx.amount, 0);
    const expense = txsInMonth
      .filter((tx) => tx.type === "expense")
      .reduce((sum, tx) => sum + tx.amount, 0);
    return { month: getMonthLabel(ym), income, expense };
  });

  const distinctMonths = data.filter((d) => d.income > 0 || d.expense > 0).length;
  if (distinctMonths < 2) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          Add more entries to see your monthly trend
        </Text>
      </View>
    );
  }

  const maxValue = Math.max(...data.map((d) => Math.max(d.income, d.expense)), 1);
  const chartHeight = 100;

  return (
    <View>
      <View style={styles.chart}>
        {data.map((d, i) => {
          const incomeH = Math.max((d.income / maxValue) * chartHeight, d.income > 0 ? 2 : 0);
          const expenseH = Math.max((d.expense / maxValue) * chartHeight, d.expense > 0 ? 2 : 0);
          return (
            <View key={i} style={styles.monthCol}>
              <View style={[styles.barsContainer, { height: chartHeight }]}>
                <View style={styles.barPair}>
                  {d.income > 0 ? (
                    <View
                      style={[
                        styles.bar,
                        styles.incomeBar,
                        { height: incomeH },
                      ]}
                    />
                  ) : (
                    <View style={{ width: 10 }} />
                  )}
                  {d.expense > 0 ? (
                    <View
                      style={[
                        styles.bar,
                        styles.expenseBar,
                        { height: expenseH },
                      ]}
                    />
                  ) : (
                    <View style={{ width: 10 }} />
                  )}
                </View>
              </View>
              <Text style={styles.monthLabel}>{d.month}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.light.creditGreen }]} />
          <Text style={styles.legendText}>Income</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.light.debitRed }]} />
          <Text style={styles.legendText}>Expense</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    paddingVertical: 20,
    alignItems: "center",
  },
  placeholderText: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 12,
    color: colors.light.ghostText,
    textAlign: "center",
  },
  chart: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    paddingBottom: 8,
  },
  monthCol: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  barsContainer: {
    justifyContent: "flex-end",
  },
  barPair: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
  },
  bar: {
    width: 10,
    borderTopWidth: 1.5,
  },
  incomeBar: {
    backgroundColor: "rgba(34,197,94,0.20)",
    borderTopColor: colors.light.creditGreen,
  },
  expenseBar: {
    backgroundColor: "rgba(239,68,68,0.20)",
    borderTopColor: colors.light.debitRed,
  },
  monthLabel: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 9,
    color: colors.light.slateText,
    marginTop: 2,
  },
  legend: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8,
    justifyContent: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendText: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 11,
    color: colors.light.slateText,
  },
});
