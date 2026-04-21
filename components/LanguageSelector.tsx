import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { getThemeColors } from "@/constants/colors";
import { useLedger, type AppLanguage } from "@/context/LedgerContext";
import { SUPPORTED_LANGUAGES, useI18n } from "@/utils/i18n";

interface LanguageSelectorProps {
  visible: boolean;
  onClose: () => void;
}

export function LanguageSelector({ visible, onClose }: LanguageSelectorProps) {
  const { appSettings, updateAppSettings } = useLedger();
  const { t } = useI18n();
  const C = getThemeColors(appSettings.theme);

  const handleSelect = (language: AppLanguage) => {
    updateAppSettings({ language });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.modal, { backgroundColor: C.vaultDark, borderColor: C.wireGray }]}>
              <View style={styles.header}>
                <Text style={[styles.title, { color: C.cipherWhite }]}>{t("settings.select_language")}</Text>
                <TouchableOpacity onPress={onClose}>
                  <Feather name="x" size={18} color={C.slateText} />
                </TouchableOpacity>
              </View>
              {SUPPORTED_LANGUAGES.map((language) => (
                <TouchableOpacity
                  key={language.code}
                  style={[
                    styles.item,
                    appSettings.language === language.code && {
                      borderColor: C.amberSignal,
                      backgroundColor: `${C.amberSignal}14`,
                    },
                  ]}
                  onPress={() => handleSelect(language.code)}
                >
                  <View style={{ gap: 2 }}>
                    <Text style={[styles.nativeName, { color: C.cipherWhite }]}>{language.nativeName}</Text>
                    <Text style={[styles.englishName, { color: C.slateText }]}>{language.englishName}</Text>
                  </View>
                  {appSettings.language === language.code && (
                    <Feather
                      name="check"
                      size={14}
                      color={C.amberSignal}
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
    borderWidth: 1,
    borderRadius: 8,
    padding: 20,
    width: "100%",
    maxWidth: 320,
    gap: 6,
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
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "transparent",
  },
  nativeName: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 13,
  },
  englishName: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 11,
  },
});
