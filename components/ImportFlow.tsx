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
  TextInput,
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { Feather } from "@expo/vector-icons";
import { getThemeColors } from "@/constants/colors";
import { Transaction, useLedger } from "@/context/LedgerContext";
import { isEncryptedPayload, decryptData } from "@/utils/crypto";
import { parseImport } from "@/utils/export";

interface ImportFlowProps {
  onImported: (txs: Transaction[], count: number, fullState?: any) => void;
}

async function pickAndReadFile(): Promise<string | null> {
  if (Platform.OS === "web") {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";
      input.onchange = async (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) { resolve(null); return; }
        try { resolve(await file.text()); } catch { resolve(null); }
      };
      input.click();
    });
  }

  // Mobile: use expo-document-picker
  try {
    const DocumentPicker = await import("expo-document-picker") as any;

    const result = await DocumentPicker.getDocumentAsync({
      type: "application/json",
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) return null;
    const asset = result.assets[0];

    const content = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return content;
  } catch (e) {
    console.warn("[Import] pickAndReadFile error:", e);
    return null;
  }
}

export function useImport({ onImported }: ImportFlowProps) {
  const { appSettings } = useLedger();
  const C = getThemeColors(appSettings.theme);
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [pendingEncrypted, setPendingEncrypted] = useState<object | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  const processRaw = (raw: unknown) => {
    try {
      const state = parseImport(raw);
      onImported(
        state.transactions ?? [],
        (state.transactions ?? []).length,
        state
      );
    } catch {
      Alert.alert("Error", "Invalid file format.");
    }
  };

  const triggerImport = async () => {
    const text = await pickAndReadFile();
    if (!text) return;

    try {
      const parsed = JSON.parse(text);
      if (isEncryptedPayload(parsed)) {
        setPendingEncrypted(parsed);
        setShowPinPrompt(true);
        setPinInput("");
        setPinError("");
      } else {
        processRaw(parsed);
      }
    } catch {
      Alert.alert("Error", "Failed to read file.");
    }
  };

  const submitPin = async () => {
    if (!pendingEncrypted) return;
    try {
      const decrypted = await decryptData(pendingEncrypted as any, pinInput);
      processRaw(decrypted);
      setShowPinPrompt(false);
      setPendingEncrypted(null);
    } catch {
      setPinError("Decryption failed — check your PIN");
    }
  };

  const PinPromptModal = (
    <Modal
      visible={showPinPrompt}
      transparent
      animationType="fade"
      onRequestClose={() => setShowPinPrompt(false)}
    >
      <TouchableWithoutFeedback onPress={() => setShowPinPrompt(false)}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.modal, { backgroundColor: C.vaultDark, borderColor: C.wireGray }]}>
              <View style={styles.header}>
                <Text style={[styles.title, { color: C.cipherWhite }]}>DECRYPT FILE</Text>
                <TouchableOpacity onPress={() => setShowPinPrompt(false)}>
                  <Feather name="x" size={18} color={C.slateText} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.desc, { color: C.slateText }]}>
                Enter the PIN used when exporting this file
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: C.forgeBlack,
                    borderColor: C.wireGray,
                    color: C.cipherWhite,
                  },
                ]}
                value={pinInput}
                onChangeText={setPinInput}
                placeholder="Enter PIN"
                placeholderTextColor={C.ghostText}
                keyboardType="numeric"
                secureTextEntry
                maxLength={6}
                onSubmitEditing={submitPin}
              />
              {!!pinError && <Text style={[styles.error, { color: C.debitRed }]}>{pinError}</Text>}
              <TouchableOpacity
                style={[styles.btn, { borderColor: C.amberSignal }]}
                onPress={submitPin}
              >
                <Text style={[styles.btnLabel, { color: C.amberSignal }]}>DECRYPT & IMPORT</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  return { triggerImport, PinPromptModal };
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
  desc: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 16,
  },
  error: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 11,
  },
  btn: {
    backgroundColor: "rgba(245,158,11,0.15)",
    borderWidth: 1,
    borderRadius: 6,
    padding: 14,
    alignItems: "center",
  },
  btnLabel: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
});
