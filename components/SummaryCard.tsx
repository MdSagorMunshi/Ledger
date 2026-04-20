import React from "react";
import { View, Text, StyleSheet } from "react-native";
import colors from "@/constants/colors";

interface SummaryCardProps {
  label: string;
  amount: string;
  color: string;
  flex?: number;
}

export function SummaryCard({ label, amount, color, flex = 1 }: SummaryCardProps) {
  return (
    <View style={[styles.card, { flex }]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.amount, { color }]}>{amount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.light.vaultDark,
    borderWidth: 1,
    borderColor: colors.light.wireGray,
    borderRadius: 8,
    padding: 16,
  },
  label: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 10,
    color: colors.light.ghostText,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  amount: {
    fontFamily: "JetBrainsMono_600SemiBold",
    fontSize: 20,
  },
});
