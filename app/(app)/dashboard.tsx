import React, { useMemo, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useLedger } from "@/context/LedgerContext";
import { SummaryCard } from "@/components/SummaryCard";
import { TransactionRow } from "@/components/TransactionRow";
import { BarChart } from "@/components/BarChart";
import { DonutChart } from "@/components/DonutChart";
import { computeBudgetProgress } from "@/utils/analytics";
import { computeNetWorth } from "@/utils/netWorth";
import { getThemeColors } from "@/constants/colors";

function SectionLabel({ label, C }: { label: string; C: ReturnType<typeof getThemeColors> }) {
  return <Text style={[styles.sectionLabel, { color: C.ghostText }]}>{label}</Text>;
}

function BudgetAlert({ category, pct, remaining, C }: {
  category: string;
  pct: number;
  remaining: number;
  C: ReturnType<typeof getThemeColors>;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(4600),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);
  const color = pct >= 1 ? C.debitRed : C.amberSignal;
  return (
    <Animated.View style={[styles.budgetAlert, { borderColor: color, opacity }]}>
      <Feather name="alert-triangle" size={11} color={color} />
      <Text style={[styles.budgetAlertText, { color }]}>
        ⚑ {category.toUpperCase()} BUDGET AT {Math.round(pct * 100)}%
        {remaining < 0 ? ` — ${Math.abs(remaining).toFixed(0)} OVER` : ` — ${remaining.toFixed(0)} REMAINING`}
      </Text>
    </Animated.View>
  );
}

export default function Dashboard() {
  const {
    transactions,
    savingsTransactions,
    assetEntries,
    oweEntries,
    lendEntries,
    budgetEnvelopes,
    formatAmount,
    lastAddedId,
    appSettings,
  } = useLedger();

  const C = getThemeColors(appSettings.theme);

  const regularTxs = transactions.filter(
    (t) => t.subtype !== "savings_transfer" && t.subtype !== "savings_withdrawal"
  );

  const { totalIncome, totalExpense, balance } = useMemo(() => {
    const totalIncome = regularTxs
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    const totalExpense = regularTxs
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
    return { totalIncome, totalExpense, balance: totalIncome - totalExpense };
  }, [regularTxs]);

  const nw = useMemo(
    () =>
      computeNetWorth({
        transactions,
        savingsTransactions,
        assetEntries,
        oweEntries,
        lendEntries,
      }),
    [transactions, savingsTransactions, assetEntries, oweEntries, lendEntries]
  );

  const recentFive = transactions.slice(0, 5);
  const isEmpty = transactions.length === 0;

  const envelopeAlerts = useMemo(() => {
    return budgetEnvelopes
      .map((env) => {
        const spent = computeBudgetProgress(transactions, env.category);
        const pct = env.monthlyLimit > 0 ? spent / env.monthlyLimit : 0;
        const remaining = env.monthlyLimit - spent;
        return { env, pct, remaining };
      })
      .filter(({ pct }) => pct >= 0.8);
  }, [transactions, budgetEnvelopes]);

  const [alertsShown, setAlertsShown] = useState<string[]>([]);
  const triggeredAlerts = useMemo(
    () => envelopeAlerts.filter((a) => alertsShown.includes(a.env.id)),
    [envelopeAlerts, alertsShown]
  );

  const prevLastAddedId = useRef<string | null>(null);
  useEffect(() => {
    if (lastAddedId && lastAddedId !== prevLastAddedId.current) {
      prevLastAddedId.current = lastAddedId;
      const newAlerts = envelopeAlerts.map((a) => a.env.id);
      setAlertsShown(newAlerts);
      if (newAlerts.length > 0) {
        setTimeout(() => setAlertsShown([]), 5000);
      }
    }
  }, [lastAddedId, envelopeAlerts]);

  if (isEmpty) {
    return (
      <View style={[styles.emptyState, { backgroundColor: C.forgeBlack }]}>
        <Text style={[styles.emptySymbol, { color: C.ghostText }]}>◈</Text>
        <Text style={[styles.emptyLabel, { color: C.ghostText }]}>NO TRANSACTIONS YET</Text>
        <TouchableOpacity
          style={[styles.emptyBtn, { borderColor: C.amberSignal, backgroundColor: `${C.amberSignal}15` }]}
          onPress={() => router.navigate("/(app)/add")}
        >
          <Text style={[styles.emptyBtnText, { color: C.amberSignal }]}>+ ADD FIRST ENTRY</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const balanceColor =
    balance >= 0 ? C.creditGreen : C.debitRed;
  const nwColor = nw.total >= 0 ? C.creditGreen : C.debitRed;

  const expenseCatMap: Record<string, number> = {};
  regularTxs.filter((t) => t.type === "expense").forEach((t) => {
    expenseCatMap[t.category] = (expenseCatMap[t.category] || 0) + t.amount;
  });

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: C.forgeBlack }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* BUDGET ALERTS */}
      {triggeredAlerts.length > 0 && (
        <View style={styles.alertsContainer}>
          {triggeredAlerts.map(({ env, pct, remaining }) => (
            <BudgetAlert key={env.id} category={env.category} pct={pct} remaining={remaining} C={C} />
          ))}
        </View>
      )}

      <View style={styles.summaryRow}>
        <SummaryCard label="BALANCE" amount={formatAmount(Math.abs(balance))} color={balanceColor} flex={1.3} />
        <SummaryCard label="INCOME" amount={formatAmount(totalIncome)} color={C.creditGreen} />
        <SummaryCard label="EXPENSES" amount={formatAmount(totalExpense)} color={C.debitRed} />
      </View>

      {/* NET WORTH MINI CARD */}
      <View style={[styles.nwMini, { backgroundColor: C.vaultDark, borderColor: C.wireGray }]}>
        <Text style={[styles.nwMiniLabel, { color: C.ghostText }]}>NET WORTH</Text>
        <Text style={[styles.nwMiniValue, { color: nwColor }]}>{formatAmount(nw.total)}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: C.vaultDark, borderColor: C.wireGray }]}>
        <SectionLabel label="MONTHLY OVERVIEW" C={C} />
        <BarChart transactions={regularTxs} formatAmount={formatAmount} />
      </View>

      {regularTxs.some((t) => t.type === "expense") && (
        <View style={[styles.card, { backgroundColor: C.vaultDark, borderColor: C.wireGray }]}>
          <SectionLabel label="EXPENSE BREAKDOWN" C={C} />
          <DonutChart transactions={regularTxs} formatAmount={formatAmount} />
          {/* BUDGET ENVELOPE INDICATORS */}
          {budgetEnvelopes.length > 0 && (
            <View style={styles.envelopeList}>
              {budgetEnvelopes.map((env) => {
                const catTotal = expenseCatMap[env.category] || 0;
                const pct = Math.min(1, env.monthlyLimit > 0 ? catTotal / env.monthlyLimit : 0);
                const barColor = pct >= 1 ? C.debitRed : pct >= 0.8 ? C.amberSignal : C.ghostText;
                return (
                  <View key={env.id} style={styles.envelopeItem}>
                    <Text style={[styles.envelopeCat, { color: C.slateText }]}>{env.category}</Text>
                    <View style={[styles.envelopeBar, { backgroundColor: C.wireGray }]}>
                      <View style={[styles.envelopeFill, { width: `${pct * 100}%` as any, backgroundColor: barColor }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      <View style={[styles.card, { backgroundColor: C.vaultDark, borderColor: C.wireGray }]}>
        <SectionLabel label="RECENT ENTRIES" C={C} />
        {recentFive.map((tx) => (
          <TransactionRow
            key={tx.id}
            transaction={tx}
            formatAmount={formatAmount}
            highlight={tx.id === lastAddedId}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  summaryRow: { flexDirection: "row", gap: 8 },
  card: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  sectionLabel: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  nwMini: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nwMiniLabel: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 10,
    letterSpacing: 1.5,
  },
  nwMiniValue: {
    fontFamily: "JetBrainsMono_600SemiBold",
    fontSize: 18,
  },
  alertsContainer: { gap: 6 },
  budgetAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  budgetAlertText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 9,
    letterSpacing: 0.8,
    flex: 1,
  },
  envelopeList: { gap: 8, marginTop: 4 },
  envelopeItem: { gap: 4 },
  envelopeCat: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 10,
  },
  envelopeBar: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  envelopeFill: {
    height: "100%",
    borderRadius: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
  },
  emptySymbol: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 48,
  },
  emptyLabel: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  emptyBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyBtnText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
});
