import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { getThemeColors } from "@/constants/colors";
import { useLedger } from "@/context/LedgerContext";

interface SummaryCardProps {
  label: string;
  amount: string;
  color: string;
  flex?: number;
}

export function SummaryCard({ label, amount, color, flex = 1 }: SummaryCardProps) {
  const { appSettings } = useLedger();
  const C = getThemeColors(appSettings.theme);

  return (
    <View style={[styles.card, { flex, backgroundColor: C.vaultDark, borderColor: C.wireGray }]}>
      <Text style={[styles.label, { color: C.ghostText }]}>{label}</Text>
      <Text style={[styles.amount, { color }]}>{amount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
  },
  label: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  amount: {
    fontFamily: "JetBrainsMono_600SemiBold",
    fontSize: 20,
  },
});
