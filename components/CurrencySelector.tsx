import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import colors from "@/constants/colors";
import { CURRENCIES, Currency, useLedger } from "@/context/LedgerContext";

interface CurrencySelectorProps {
  visible: boolean;
  onClose: () => void;
}

export function CurrencySelector({ visible, onClose }: CurrencySelectorProps) {
  const { currency, setCurrency } = useLedger();

  const handleSelect = (c: Currency) => {
    setCurrency(c);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modal}>
              <View style={styles.header}>
                <Text style={styles.title}>CURRENCY</Text>
                <TouchableOpacity onPress={onClose}>
                  <Feather name="x" size={18} color={colors.light.slateText} />
                </TouchableOpacity>
              </View>
              {CURRENCIES.map((c) => (
                <TouchableOpacity
                  key={c.code}
                  style={[
                    styles.item,
                    c.code === currency.code && styles.itemActive,
                  ]}
                  onPress={() => handleSelect(c)}
                >
                  <Text style={styles.symbol}>{c.symbol}</Text>
                  <Text style={styles.code}>{c.code}</Text>
                  {c.code === currency.code && (
                    <Feather
                      name="check"
                      size={14}
                      color={colors.light.amberSignal}
                      style={{ marginLeft: "auto" }}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(7,9,14,0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modal: {
    backgroundColor: colors.light.vaultDark,
    borderWidth: 1,
    borderColor: colors.light.wireGray,
    borderRadius: 8,
    padding: 20,
    width: "100%",
    maxWidth: 280,
    gap: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 12,
    color: colors.light.cipherWhite,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "transparent",
  },
  itemActive: {
    borderColor: colors.light.amberSignal,
    backgroundColor: "rgba(245,158,11,0.08)",
  },
  symbol: {
    fontFamily: "JetBrainsMono_600SemiBold",
    fontSize: 16,
    color: colors.light.amberSignal,
    width: 24,
    textAlign: "center",
  },
  code: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 13,
    color: colors.light.cipherWhite,
  },
});
