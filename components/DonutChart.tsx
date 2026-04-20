import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { getThemeColors } from "@/constants/colors";
import { Transaction, useLedger } from "@/context/LedgerContext";

interface DonutChartProps {
  transactions: Transaction[];
  formatAmount: (amount: number) => string;
}

interface Segment {
  category: string;
  amount: number;
  color: string;
}

export function DonutChart({ transactions, formatAmount }: DonutChartProps) {
  const { appSettings } = useLedger();
  const C = getThemeColors(appSettings.theme);
  const expenses = transactions.filter((tx) => tx.type === "expense");
  if (expenses.length === 0) return null;

  const byCategory: Record<string, number> = {};
  expenses.forEach((tx) => {
    byCategory[tx.category] = (byCategory[tx.category] || 0) + tx.amount;
  });

  const total = Object.values(byCategory).reduce((s, v) => s + v, 0);
  const chartColors = C.chartColors;

  const segments: Segment[] = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([cat, amount], i) => ({
      category: cat,
      amount,
      color: chartColors[i % chartColors.length],
    }));

  const SIZE = 140;
  const RADIUS = 50;
  const INNER = 32;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const circumference = 2 * Math.PI * RADIUS;

  let offset = 0;
  const arcs = segments.map((seg) => {
    const frac = seg.amount / total;
    const dashLength = frac * circumference;
    const startOffset = circumference - offset;
    offset += dashLength;
    return { ...seg, dashLength, startOffset };
  });

  return (
    <View style={styles.container}>
      <View style={styles.donutWrapper}>
        <Svg width={SIZE} height={SIZE}>
          <G rotation="-90" origin={`${CX},${CY}`}>
            {arcs.map((arc, i) => (
              <Circle
                key={i}
                cx={CX}
                cy={CY}
                r={RADIUS}
                fill="none"
                stroke={arc.color}
                strokeWidth={RADIUS - INNER}
                strokeDasharray={`${arc.dashLength} ${circumference - arc.dashLength}`}
                strokeDashoffset={arc.startOffset}
              />
            ))}
          </G>
        </Svg>
      </View>
      <View style={styles.legend}>
        {segments.map((seg, i) => (
          <View key={i} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: seg.color }]} />
            <Text style={[styles.catName, { color: C.slateText }]} numberOfLines={1}>
              {seg.category}
            </Text>
            <Text style={[styles.catAmount, { color: C.cipherWhite }]}>
              {formatAmount(seg.amount)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  donutWrapper: {
    width: 140,
    height: 140,
    flexShrink: 0,
  },
  legend: {
    flex: 1,
    gap: 6,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 2,
    flexShrink: 0,
  },
  catName: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 12,
    flex: 1,
  },
  catAmount: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 12,
    textAlign: "right",
  },
});
