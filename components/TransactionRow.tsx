import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import colors from "@/constants/colors";
import { Transaction } from "@/context/LedgerContext";

interface TransactionRowProps {
  transaction: Transaction;
  formatAmount: (amount: number) => string;
  onDelete?: () => void;
  highlight?: boolean;
  showDelete?: boolean;
}

function getSubtypeDisplay(tx: Transaction) {
  switch (tx.subtype) {
    case "savings_transfer":
      return { iconName: "archive" as const, label: "→ Savings", color: colors.light.slateText };
    case "savings_withdrawal":
      return { iconName: "archive" as const, label: "← Savings", color: colors.light.slateText };
    case "debt_repayment":
      return { iconName: "credit-card" as const, label: "Debt Repayment", color: colors.light.debitRed };
    case "lend_returned":
      return { iconName: "corner-down-left" as const, label: "Lend Returned", color: colors.light.creditGreen };
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
  const highlightAnim = useRef(new Animated.Value(0)).current;
  const isIncome = transaction.type === "income";

  const subtypeDisplay = getSubtypeDisplay(transaction);
  const amountColor = subtypeDisplay?.color ?? (isIncome ? colors.light.creditGreen : colors.light.debitRed);
  const prefix = subtypeDisplay
    ? subtypeDisplay.color === colors.light.creditGreen
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
    <Animated.View style={[styles.row, { backgroundColor: bgColor }]}>
      <Feather name={iconName} size={20} color={amountColor} style={styles.icon} />
      <View style={styles.info}>
        <View style={styles.categoryRow}>
          <Text style={styles.category}>{transaction.category}</Text>
          {subtypeDisplay && (
            <View style={[styles.subtypeBadge, { borderColor: amountColor }]}>
              <Text style={[styles.subtypeBadgeText, { color: amountColor }]}>{subtypeDisplay.label}</Text>
            </View>
          )}
        </View>
        {!!transaction.note && (
          <Text style={styles.note} numberOfLines={1}>{transaction.note}</Text>
        )}
        <Text style={styles.date}>
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
            <Feather name="trash-2" size={14} color={colors.light.ghostText} />
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
    borderBottomColor: colors.light.wireDim,
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
    color: colors.light.cipherWhite,
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
    color: colors.light.slateText,
  },
  date: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 10,
    color: colors.light.ghostText,
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
