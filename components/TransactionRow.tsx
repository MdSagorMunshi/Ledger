import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { getThemeColors } from "@/constants/colors";
import { Transaction, useLedger } from "@/context/LedgerContext";

interface TransactionRowProps {
  transaction: Transaction;
  formatAmount: (amount: number) => string;
  onDelete?: () => void;
  highlight?: boolean;
  showDelete?: boolean;
}

function getSubtypeDisplay(tx: Transaction, C: ReturnType<typeof getThemeColors>) {
  switch (tx.subtype) {
    case "savings_transfer":
      return { iconName: "archive" as const, label: "→ Savings", color: C.slateText };
    case "savings_withdrawal":
      return { iconName: "archive" as const, label: "← Savings", color: C.slateText };
    case "debt_repayment":
      return { iconName: "credit-card" as const, label: "Debt Repayment", color: C.debitRed };
    case "lend_returned":
      return { iconName: "corner-down-left" as const, label: "Lend Returned", color: C.creditGreen };
    default:
      return null;
  }
}

export function TransactionRow({
  transaction,
  formatAmount,
  onDelete,
  highlight,
  showDelete,
}: TransactionRowProps) {
  const { appSettings } = useLedger();
  const C = getThemeColors(appSettings.theme);
  const highlightAnim = useRef(new Animated.Value(0)).current;
  const isIncome = transaction.type === "income";

  const subtypeDisplay = getSubtypeDisplay(transaction, C);
  const amountColor = subtypeDisplay?.color ?? (isIncome ? C.creditGreen : C.debitRed);
  const prefix = subtypeDisplay
    ? subtypeDisplay.color === C.creditGreen
      ? "+"
      : "-"
    : isIncome
    ? "+"
    : "-";

  const iconName = subtypeDisplay
    ? subtypeDisplay.iconName
    : isIncome
    ? ("arrow-up-circle" as const)
    : ("arrow-down-circle" as const);

  useEffect(() => {
    if (highlight) {
      Animated.sequence([
        Animated.timing(highlightAnim, { toValue: 1, duration: 50, useNativeDriver: false }),
        Animated.timing(highlightAnim, { toValue: 0, duration: 400, useNativeDriver: false }),
      ]).start();
    }
  }, [highlight, highlightAnim]);

  const bgColor = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["transparent", "rgba(245,158,11,0.10)"],
  });

  return (
    <Animated.View style={[styles.row, { backgroundColor: bgColor, borderBottomColor: C.wireDim }]}>
      <Feather name={iconName} size={20} color={amountColor} style={styles.icon} />
      <View style={styles.info}>
        <View style={styles.categoryRow}>
          <Text style={[styles.category, { color: C.cipherWhite }]}>{transaction.category}</Text>
          {subtypeDisplay && (
            <View style={[styles.subtypeBadge, { borderColor: amountColor }]}>
              <Text style={[styles.subtypeBadgeText, { color: amountColor }]}>{subtypeDisplay.label}</Text>
            </View>
          )}
        </View>
        {!!transaction.note && (
          <Text style={[styles.note, { color: C.slateText }]} numberOfLines={1}>
            {transaction.note}
          </Text>
        )}
        <Text style={[styles.date, { color: C.ghostText }]}>
          {transaction.date}{transaction.time ? `  ·  ${transaction.time}` : ""}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, { color: amountColor }]}>
          {prefix}{formatAmount(transaction.amount)}
        </Text>
        {showDelete && onDelete && (
          <TouchableOpacity
            onPress={onDelete}
            style={styles.deleteBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="trash-2" size={14} color={C.ghostText} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  icon: { marginRight: 12 },
  info: { flex: 1, gap: 1 },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  category: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 13,
  },
  subtypeBadge: {
    borderWidth: 1,
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  subtypeBadgeText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 8,
    letterSpacing: 0.5,
  },
  note: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 11,
  },
  date: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 10,
  },
  right: {
    alignItems: "flex-end",
    gap: 6,
  },
  amount: {
    fontFamily: "JetBrainsMono_600SemiBold",
    fontSize: 14,
  },
  deleteBtn: { padding: 2 },
});
