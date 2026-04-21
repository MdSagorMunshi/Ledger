import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Alert,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { getThemeColors } from "@/constants/colors";
import { useLedger } from "@/context/LedgerContext";
import { useI18n } from "@/utils/i18n";
import { exportPlain, exportEncrypted } from "@/utils/export";

interface ExportModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ExportModal({ visible, onClose }: ExportModalProps) {
  const {
    transactions,
    savingsTransactions,
    savingsGoals,
    assetEntries,
    oweEntries,
    lendEntries,
    budgetEnvelopes,
    recurringTemplates,
    appSettings,
    currency,
    pin,
  } = useLedger();

  const [encrypting, setEncrypting] = useState(false);
  const C = getThemeColors(appSettings.theme);
  const { t } = useI18n();

  const buildState = () => ({
    transactions,
    savingsTransactions,
    savingsGoals,
    assetEntries,
    oweEntries,
    lendEntries,
    budgetEnvelopes,
    recurringTemplates,
    appSettings,
    currency,
  });

  const handlePlain = async () => {
    try {
      await exportPlain(buildState());
    } catch (e: any) {
      Alert.alert(t("export.error"), e?.message ?? t("export.failed"));
    } finally {
      onClose();
    }
  };

  const handleEncrypted = async () => {
    if (!pin) return;
    setEncrypting(true);
    try {
      await exportEncrypted(buildState(), pin);
    } catch (e: any) {
      Alert.alert(t("settings.error"), e?.message ?? t("export.encrypt_error"));
    } finally {
      setEncrypting(false);
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.modal, { backgroundColor: C.vaultDark, borderColor: C.wireGray }]}>
              <View style={styles.header}>
                <Text style={[styles.title, { color: C.cipherWhite }]}>{t("export.title")}</Text>
                <TouchableOpacity onPress={onClose}>
                  <Feather name="x" size={18} color={C.slateText} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.subtitle, { color: C.slateText }]}>
                {t("export.transactions_v1", { count: transactions.length })}
              </Text>

              <TouchableOpacity
                style={[styles.btn, { backgroundColor: C.inkSurface, borderColor: C.wireGray }]}
                onPress={handlePlain}
              >
                <Text style={[styles.btnLabel, { color: C.cipherWhite }]}>{t("export.plain_json")}</Text>
                <Text style={[styles.btnDesc, { color: C.slateText }]}>
                  {t("export.plain_desc")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.btn,
                  { backgroundColor: C.inkSurface, borderColor: C.amberSignal },
                ]}
                onPress={handleEncrypted}
                disabled={encrypting}
              >
                <Text style={[styles.btnLabel, { color: C.amberSignal }]}>
                  {encrypting ? t("export.encrypting") : t("export.encrypted")}
                </Text>
                <Text style={[styles.btnDesc, { color: C.slateText }]}>
                  {t("export.encrypted_desc")}
                </Text>
              </TouchableOpacity>
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
    borderWidth: 1,
    borderRadius: 8,
    padding: 20,
    width: "100%",
    maxWidth: 360,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  subtitle: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 11,
  },
  btn: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 14,
    gap: 4,
  },
  btnLabel: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  btnDesc: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 11,
  },
});
