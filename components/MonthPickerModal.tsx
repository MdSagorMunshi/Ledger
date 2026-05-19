import React, { useMemo } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLedger } from "@/context/LedgerContext";
import { getThemeColors } from "@/constants/colors";
import { useI18n } from "@/utils/i18n";

interface MonthPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectMonth: (monthKey: string) => void;
  selectedMonth: string;
}

export function MonthPickerModal({
  visible,
  onClose,
  onSelectMonth,
  selectedMonth,
}: MonthPickerModalProps) {
  const { appSettings, transactions, formatAmount } = useLedger();
  const { t } = useI18n();
  const C = getThemeColors(appSettings.theme);

  // Calculate history for each month
  const history = useMemo(() => {
    const data: Record<string, { income: number; expense: number }> = {};
    
    // Always include selected month even if empty
    data[selectedMonth] = { income: 0, expense: 0 };
    
    transactions.forEach((tx) => {
      if (tx.date && tx.date.length >= 7) {
        const key = tx.date.substring(0, 7);
        if (!data[key]) data[key] = { income: 0, expense: 0 };
        
        if (
          tx.subtype !== "savings_transfer" &&
          tx.subtype !== "savings_withdrawal" &&
          tx.subtype !== "asset_withdrawal"
        ) {
          if (tx.type === "income") data[key].income += tx.amount;
          else if (tx.type === "expense") data[key].expense += tx.amount;
        }
      }
    });

    const sortedKeys = Object.keys(data).sort().reverse();
    return sortedKeys.map((key) => {
      const [year, month] = key.split("-").map(Number);
      const d = new Date(year, month - 1, 1);
      const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      
      return {
        key,
        label,
        ...data[key],
      };
    });
  }, [transactions, selectedMonth]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContent, { backgroundColor: C.vaultDark, borderColor: C.wireGray }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: C.cipherWhite }]}>
              {t("dashboard.select_month")}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={C.ghostText} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {history.map((item) => {
              const isSelected = item.key === selectedMonth;
              const balance = item.income - item.expense;
              const balanceColor = balance >= 0 ? C.creditGreen : C.debitRed;
              
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.monthItem,
                    { 
                      borderColor: isSelected ? C.amberSignal : C.wireGray,
                      backgroundColor: isSelected ? `${C.amberSignal}15` : "transparent"
                    }
                  ]}
                  onPress={() => {
                    onSelectMonth(item.key);
                    onClose();
                  }}
                >
                  <View style={styles.itemHeader}>
                    <Text style={[styles.itemLabel, { color: isSelected ? C.amberSignal : C.cipherWhite }]}>
                      {item.label}
                    </Text>
                    {isSelected && <Feather name="check-circle" size={14} color={C.amberSignal} />}
                  </View>
                  
                  <View style={styles.itemStats}>
                    <View style={styles.statBox}>
                      <Text style={[styles.statTitle, { color: C.ghostText }]}>Income</Text>
                      <Text style={[styles.statValue, { color: C.creditGreen }]}>
                        {formatAmount(item.income)}
                      </Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={[styles.statTitle, { color: C.ghostText }]}>Expense</Text>
                      <Text style={[styles.statValue, { color: C.debitRed }]}>
                        {formatAmount(item.expense)}
                      </Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={[styles.statTitle, { color: C.ghostText }]}>Balance</Text>
                      <Text style={[styles.statValue, { color: balanceColor }]}>
                        {formatAmount(balance)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxHeight: "80%",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  title: {
    fontFamily: "Syne_700Bold",
    fontSize: 18,
    letterSpacing: 1,
  },
  closeBtn: {
    padding: 4,
  },
  list: {
    flexShrink: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  monthItem: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  itemLabel: {
    fontFamily: "Syne_700Bold",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  itemStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statBox: {
    flex: 1,
  },
  statTitle: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 10,
    textTransform: "uppercase",
  },
  statValue: {
    fontFamily: "JetBrainsMono_600SemiBold",
    fontSize: 12,
    marginTop: 2,
  },
});
