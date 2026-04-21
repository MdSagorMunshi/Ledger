import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Animated,
  Modal,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  useLedger,
  BudgetEnvelope,
  RecurringTemplate,
  EXPENSE_CATEGORIES,
} from "@/context/LedgerContext";
import { getThemeColors } from "@/constants/colors";
import { computeBudgetProgress } from "@/utils/analytics";
import { ExportModal } from "@/components/ExportModal";
import { useImport } from "@/components/ImportFlow";
import { ReportCard } from "@/components/ReportCard";
import { CurrencySelector } from "@/components/CurrencySelector";
import { LanguageSelector } from "@/components/LanguageSelector";
import { pickBackupFolder, defaultBackupPath, performAutoBackup } from "@/utils/autoBackup";
import { getLanguageLabel, useI18n } from "@/utils/i18n";

function SectionHeader({ label }: { label: string }) {
  return <Text style={styles.sectionHeader}>{label}</Text>;
}

function PillGroup<T extends string | null>({
  options,
  value,
  onChange,
  C,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  C: ReturnType<typeof getThemeColors>;
}) {
  return (
    <View style={styles.pillGroup}>
      {options.map((opt) => (
        <TouchableOpacity
          key={String(opt.value)}
          style={[
            styles.pill,
            { borderColor: value === opt.value ? C.amberSignal : C.wireGray },
            value === opt.value && { backgroundColor: `${C.amberSignal}18` },
          ]}
          onPress={() => onChange(opt.value)}
        >
          <Text
            style={[
              styles.pillText,
              { color: value === opt.value ? C.amberSignal : C.slateText },
            ]}
          >
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/* ─── Change PIN Modal ─── */
function ChangePinModal({
  visible,
  onClose,
  currentPin,
  onChanged,
  C,
}: {
  visible: boolean;
  onClose: () => void;
  currentPin: string;
  onChanged: (newPin: string) => void;
  C: ReturnType<typeof getThemeColors>;
}) {
  const { t } = useI18n();
  const [step, setStep] = useState<"current" | "new" | "confirm">("current");
  const [input, setInput] = useState("");
  const [newPin, setNewPin] = useState("");
  const [error, setError] = useState("");

  const reset = () => {
    setStep("current");
    setInput("");
    setNewPin("");
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleDigit = (d: string) => {
    if (input.length >= 4) return;
    const next = input + d;
    setInput(next);
    setError("");
    if (next.length === 4) {
      setTimeout(() => advance(next), 160);
    }
  };

  const handleBack = () => {
    setInput((p) => p.slice(0, -1));
    setError("");
  };

  const advance = (val: string) => {
    if (step === "current") {
      if (val !== currentPin) {
        setError(t("settings.incorrect_pin"));
        setInput("");
        return;
      }
      setStep("new");
      setInput("");
    } else if (step === "new") {
      setNewPin(val);
      setStep("confirm");
      setInput("");
    } else {
      if (val !== newPin) {
        setError(t("settings.pins_do_not_match"));
        setStep("new");
        setNewPin("");
        setInput("");
        return;
      }
      onChanged(val);
      reset();
      onClose();
    }
  };

  const labels: Record<string, string> = {
    current: t("settings.change_pin_current"),
    new: t("settings.change_pin_new"),
    confirm: t("settings.change_pin_confirm"),
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.pinBox, { backgroundColor: C.vaultDark, borderColor: C.wireGray }]}>
          <View style={styles.pinHeader}>
            <Text style={[styles.pinTitle, { color: C.cipherWhite }]}>{labels[step]}</Text>
            <TouchableOpacity onPress={handleClose}>
              <Feather name="x" size={18} color={C.ghostText} />
            </TouchableOpacity>
          </View>
          <View style={styles.pinDots}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.pinDot,
                  {
                    backgroundColor:
                      i < input.length ? C.amberSignal : "transparent",
                    borderColor: i < input.length ? C.amberSignal : C.wireGray,
                  },
                ]}
              />
            ))}
          </View>
          {!!error && (
            <Text style={[styles.pinError, { color: C.debitRed }]}>{error}</Text>
          )}
          <View style={styles.pinGrid}>
            {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((key) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.pinKey,
                  { borderColor: C.wireGray, backgroundColor: C.inkSurface },
                  !key && { opacity: 0 },
                ]}
                onPress={() => {
                  if (!key) return;
                  if (key === "⌫") handleBack();
                  else handleDigit(key);
                }}
                disabled={!key}
              >
                <Text style={[styles.pinKeyText, { color: C.cipherWhite }]}>{key}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ─── Backup Password Modal ─── */
function BackupPasswordModal({
  visible,
  currentPassword,
  onSave,
  onClose,
  C,
}: {
  visible: boolean;
  currentPassword: string | null;
  onSave: (pw: string | null) => void;
  onClose: () => void;
  C: ReturnType<typeof getThemeColors>;
}) {
  const { t } = useI18n();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [useDefault, setUseDefault] = useState(!currentPassword);

  const handleSave = () => {
    if (useDefault) {
      onSave(null);
      onClose();
      return;
    }
    if (pw.length < 4) { setError(t("settings.min_chars", { count: 4 })); return; }
    if (pw !== confirm) { setError(t("settings.pins_do_not_match")); return; }
    onSave(pw);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalBox, { backgroundColor: C.vaultDark, borderColor: C.wireGray }]}>
          <Text style={[styles.modalTitle, { color: C.cipherWhite }]}>{t("settings.backup_password_title")}</Text>
          <TouchableOpacity
            style={[styles.checkRow]}
            onPress={() => { setUseDefault((p) => !p); setPw(""); setConfirm(""); setError(""); }}
          >
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: useDefault ? C.amberSignal : C.wireGray,
                  backgroundColor: useDefault ? `${C.amberSignal}20` : "transparent",
                },
              ]}
            >
              {useDefault && <Feather name="check" size={10} color={C.amberSignal} />}
            </View>
            <Text style={[styles.checkLabel, { color: C.cipherWhite }]}>
              {t("settings.use_screen_lock_pin")}
            </Text>
          </TouchableOpacity>
          {!useDefault && (
            <View style={{ gap: 8, marginTop: 6 }}>
              <TextInput
                style={[styles.formInput, { borderColor: C.wireGray, color: C.cipherWhite, backgroundColor: C.forgeBlack }]}
                value={pw}
                onChangeText={(value) => { setPw(value); setError(""); }}
                placeholder={t("settings.custom_password_placeholder")}
                placeholderTextColor={C.ghostText}
                secureTextEntry
              />
              <TextInput
                style={[styles.formInput, { borderColor: C.wireGray, color: C.cipherWhite, backgroundColor: C.forgeBlack }]}
                value={confirm}
                onChangeText={(value) => { setConfirm(value); setError(""); }}
                placeholder={t("settings.confirm_password_placeholder")}
                placeholderTextColor={C.ghostText}
                secureTextEntry
              />
              {!!error && <Text style={[styles.pinError, { color: C.debitRed }]}>{error}</Text>}
            </View>
          )}
          <View style={[styles.formBtns, { marginTop: 12 }]}>
            <TouchableOpacity style={[styles.formBtn, { borderColor: C.wireGray }]} onPress={onClose}>
              <Text style={[styles.formBtnText, { color: C.slateText }]}>{t("common.cancel")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.formBtn, { flex: 1, borderColor: C.amberSignal, backgroundColor: `${C.amberSignal}18` }]}
              onPress={handleSave}
            >
              <Text style={[styles.formBtnText, { color: C.amberSignal }]}>{t("common.save")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ─── Wipe Confirm Modal ─── */
function WipeModal({
  visible,
  onConfirm,
  onClose,
  C,
}: {
  visible: boolean;
  onConfirm: () => void;
  onClose: () => void;
  C: ReturnType<typeof getThemeColors>;
}) {
  const { t } = useI18n();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalBox, { backgroundColor: C.vaultDark, borderColor: C.debitRed }]}>
          <View style={[styles.modalIconRow, { backgroundColor: `${C.debitRed}18` }]}>
            <Feather name="trash-2" size={24} color={C.debitRed} />
          </View>
          <Text style={[styles.modalTitle, { color: C.debitRed }]}>{t("settings.wipe_title")}</Text>
          <Text style={[styles.modalBody, { color: C.cipherWhite }]}>
            {t("settings.wipe_body")}
          </Text>
          <Text style={[styles.modalBodySub, { color: C.slateText }]}>
            {t("settings.wipe_body_sub")}
          </Text>
          <View style={[styles.formBtns, { marginTop: 12 }]}>
            <TouchableOpacity
              style={[styles.formBtn, { flex: 1, borderColor: C.wireGray }]}
              onPress={onClose}
            >
              <Text style={[styles.formBtnText, { color: C.slateText }]}>{t("common.cancel")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.formBtn, { flex: 1, borderColor: C.debitRed, backgroundColor: `${C.debitRed}18` }]}
              onPress={onConfirm}
            >
              <Text style={[styles.formBtnText, { color: C.debitRed }]}>{t("common.wipe")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function formatBackupFolderLabel(uri: string | null, fallback: string): string {
  if (!uri) return fallback;

  const decoded = decodeURIComponent(uri);
  const source = decoded.includes("%") ? uri : decoded;
  const colonSplit = source.split(":");
  const tail = colonSplit[colonSplit.length - 1]?.replace(/\/+$/, "") ?? "";
  const segments = tail.split("/").filter(Boolean);
  const label = segments[segments.length - 1] ?? tail;
  return label || fallback;
}

function BackupFolderModal({
  visible,
  onClose,
  onChoose,
  currentFolderLabel,
  isPicking,
  enableAfterPick,
  C,
}: {
  visible: boolean;
  onClose: () => void;
  onChoose: () => void;
  currentFolderLabel: string;
  isPicking: boolean;
  enableAfterPick: boolean;
  C: ReturnType<typeof getThemeColors>;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalBox, { backgroundColor: C.vaultDark, borderColor: C.wireGray }]}>
          <View style={[styles.modalIconRow, { backgroundColor: `${C.amberSignal}18` }]}>
            <Feather name="hard-drive" size={24} color={C.amberSignal} />
          </View>
          <Text style={[styles.modalTitle, { color: C.amberSignal }]}>SELECT BACKUP FOLDER</Text>
          <Text style={[styles.modalBody, { color: C.cipherWhite }]}>
            Choose a folder in your file manager where encrypted `.ledger` snapshots will be stored.
          </Text>
          <View style={[styles.folderPreview, { backgroundColor: C.forgeBlack, borderColor: C.wireGray }]}>
            <Text style={[styles.folderPreviewLabel, { color: C.ghostText }]}>CURRENT TARGET</Text>
            <Text style={[styles.folderPreviewValue, { color: C.cipherWhite }]}>
              {currentFolderLabel}
            </Text>
          </View>
          <Text style={[styles.modalBodySub, { color: C.slateText }]}>
            {enableAfterPick
              ? "After you choose a folder, auto backup will turn on immediately and create the first backup."
              : "This opens Android's folder picker so you can choose a location you recognize later."}
          </Text>
          <View style={styles.formBtns}>
            <TouchableOpacity
              style={[styles.formBtn, { flex: 1, borderColor: C.wireGray }]}
              onPress={onClose}
              disabled={isPicking}
            >
              <Text style={[styles.formBtnText, { color: C.slateText }]}>LATER</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.formBtn,
                styles.primaryFolderBtn,
                { flex: 1.35, borderColor: C.amberSignal, backgroundColor: `${C.amberSignal}18` },
              ]}
              onPress={onChoose}
              disabled={isPicking}
            >
              {isPicking ? (
                <ActivityIndicator size="small" color={C.amberSignal} />
              ) : (
                <Text style={[styles.formBtnText, { color: C.amberSignal }]}>OPEN FILE MANAGER</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ─── Main Screen ─── */
export default function SettingsScreen() {
  const {
    appSettings,
    updateAppSettings,
    budgetEnvelopes,
    addBudgetEnvelope,
    deleteBudgetEnvelope,
    recurringTemplates,
    toggleRecurringTemplate,
    deleteRecurringTemplate,
    currency,
    transactions,
    loadFullState,
    formatAmount,
    pin,
    changePin,
    biometricEnabled,
    setBiometricEnabled,
    autoBackupEnabled,
    setAutoBackupEnabled,
    autoBackupFolderUri,
    setAutoBackupFolderUri,
    autoBackupPassword,
    setAutoBackupPassword,
    lastBackupTime,
    lastBackupPath,
    wipeData,
    savingsTransactions,
    savingsGoals,
    assetEntries,
    oweEntries,
    lendEntries,
    recordBackupResult,
  } = useLedger();

  const C = getThemeColors(appSettings.theme);
  const { t, tf, tc } = useI18n();

  const [showExport, setShowExport] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showCurrency, setShowCurrency] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const [showChangePin, setShowChangePin] = useState(false);
  const [showBackupPassword, setShowBackupPassword] = useState(false);
  const [showBackupFolderModal, setShowBackupFolderModal] = useState(false);
  const [showWipe, setShowWipe] = useState(false);
  const [isPickingBackupFolder, setIsPickingBackupFolder] = useState(false);
  const [enableAutoBackupAfterPick, setEnableAutoBackupAfterPick] = useState(false);

  const [showAddEnvelope, setShowAddEnvelope] = useState(false);
  const [envCategory, setEnvCategory] = useState(EXPENSE_CATEGORIES[0] as string);
  const [envLimit, setEnvLimit] = useState("");

  const [importBanner, setImportBanner] = useState("");
  const bannerOpacity = useRef(new Animated.Value(0)).current;

  const showBanner = (msg: string) => {
    setImportBanner(msg);
    Animated.sequence([
      Animated.timing(bannerOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2800),
      Animated.timing(bannerOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setImportBanner(""));
  };

  const { triggerImport, PinPromptModal } = useImport({
    onImported: (txs, count, fullState) => {
      if (fullState) loadFullState(fullState);
      else loadFullState({ transactions: txs });
      showBanner(t("settings.imported_entries", { count }));
    },
  });

  const handleAddEnvelope = () => {
    const limit = parseFloat(envLimit);
    if (!envLimit || isNaN(limit) || limit <= 0) return;
    addBudgetEnvelope({ category: envCategory, monthlyLimit: limit, appliesTo: "expense" as const });
    setEnvLimit("");
    setShowAddEnvelope(false);
  };

  const runAutoBackupNow = async (folderUri: string | null) => {
    const pw = autoBackupPassword || pin || "0000";
    const result = await performAutoBackup(
      {
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
      },
      pw,
      folderUri
    );
    if (result.ok) {
      recordBackupResult(result.time, result.path);
      return true;
    }
    Alert.alert(t("settings.backup_error"), result.reason || t("settings.backup_failed"));
    return false;
  };

  const openBackupFolderModal = (enableAfterPick: boolean) => {
    if (Platform.OS !== "android") return;
    setEnableAutoBackupAfterPick(enableAfterPick);
    setShowBackupFolderModal(true);
  };

  const chooseBackupFolder = async (enableAfterPick: boolean) => {
    if (Platform.OS !== "android" || isPickingBackupFolder) return;

    setShowBackupFolderModal(false);
    setIsPickingBackupFolder(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 180));
      const uri = await pickBackupFolder();
      if (!uri) return;

      setAutoBackupFolderUri(uri);

      if (enableAfterPick) {
        setAutoBackupEnabled(true);
        await runAutoBackupNow(uri);
      }
    } finally {
      setIsPickingBackupFolder(false);
      setEnableAutoBackupAfterPick(false);
    }
  };

  const handlePickFolder = () => {
    if (Platform.OS !== "android") return;
    openBackupFolderModal(false);
  };

  // Auto backup toggle: require folder selection first
  const handleAutoBackupToggle = async (wantsEnabled: boolean) => {
    if (Platform.OS === "web") return;
    if (!wantsEnabled) {
      setAutoBackupEnabled(false);
      return;
    }
    if (!autoBackupFolderUri && Platform.OS === "android") {
      openBackupFolderModal(true);
      return;
    }

    setAutoBackupEnabled(true);
    await runAutoBackupNow(autoBackupFolderUri);
  };

  const handleBiometricToggle = async (wantsEnabled: boolean) => {
    if (!wantsEnabled) {
      setBiometricEnabled(false);
      return;
    }
    if (Platform.OS === "web") {
      Alert.alert(t("settings.not_supported"), t("settings.native_required"));
      return;
    }
    try {
      const LocalAuth = await import("expo-local-authentication");
      const hasHardware = await LocalAuth.hasHardwareAsync();
      const isEnrolled = await LocalAuth.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        Alert.alert(
          t("settings.biometrics_unavailable"),
          t("settings.biometrics_unavailable_desc")
        );
        return;
      }
      const result = await LocalAuth.authenticateAsync({
        promptMessage: t("settings.confirm_enable_biometrics"),
        cancelLabel: t("common.cancel"),
        disableDeviceFallback: true,
      });
      if (result.success) {
        setBiometricEnabled(true);
      }
    } catch {
      Alert.alert(t("settings.error"), t("settings.biometrics_error"));
    }
  };

  const handleWipe = () => {
    wipeData();
    setShowWipe(false);
    showBanner(t("settings.all_data_wiped"));
  };

  const lockOptions: { label: string; value: number | null }[] = [
    { label: t("settings.never"), value: null },
    { label: t("settings.min_1"), value: 1 },
    { label: t("settings.min_5"), value: 5 },
    { label: t("settings.min_15"), value: 15 },
  ];

  const themeOptions: { label: string; value: "dark" | "dim" | "oled" }[] = [
    { label: t("settings.dark"), value: "dark" },
    { label: t("settings.dim"), value: "dim" },
    { label: t("settings.oled"), value: "oled" },
  ];

  const lastBackupLabel = lastBackupTime
    ? new Date(lastBackupTime).toLocaleString()
    : t("settings.no_backups_yet");
  const backupFolderLabel = Platform.OS === "web"
    ? "N/A — not supported on web"
    : Platform.OS === "android"
    ? formatBackupFolderLabel(autoBackupFolderUri, defaultBackupPath())
    : defaultBackupPath();

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: C.forgeBlack }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {!!importBanner && (
        <Animated.View
          style={[styles.banner, { backgroundColor: C.inkSurface, borderColor: C.wireGray, opacity: bannerOpacity }]}
        >
          <Text style={[styles.bannerText, { color: C.creditGreen }]}>{importBanner}</Text>
        </Animated.View>
      )}

      {/* ── DATA ── */}
      <View style={[styles.section, { backgroundColor: C.vaultDark, borderColor: C.wireGray }]}>
        <SectionHeader label={t("settings.data")} />

        {/* Session entries count */}
        <View style={[styles.row, { borderTopColor: C.wireGray }]}>
          <View style={[styles.iconBox, { backgroundColor: `${C.amberSignal}18` }]}>
            <Feather name="database" size={14} color={C.amberSignal} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: C.cipherWhite }]}>{t("settings.stored_entries")}</Text>
            <Text style={[styles.rowSub, { color: C.slateText }]}>
              {t("settings.saved_locally", {
                count: transactions.length,
                suffix: transactions.length !== 1 ? "s" : "",
              })}
            </Text>
          </View>
        </View>

        {/* Monthly Report */}
        <TouchableOpacity
          style={[styles.row, { borderTopColor: C.wireGray, borderTopWidth: 1 }]}
          onPress={() => setShowReport(true)}
        >
          <View style={[styles.iconBox, { backgroundColor: `${C.amberSignal}18` }]}>
            <Feather name="file-text" size={14} color={C.amberSignal} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: C.cipherWhite }]}>{t("settings.monthly_report")}</Text>
            <Text style={[styles.rowSub, { color: C.slateText }]}>{t("settings.print_ready_summary")}</Text>
          </View>
          <Feather name="chevron-right" size={14} color={C.ghostText} />
        </TouchableOpacity>

        {/* Export */}
        <TouchableOpacity
          style={[styles.row, { borderTopColor: C.wireGray, borderTopWidth: 1 }]}
          onPress={() => setShowExport(true)}
        >
          <View style={[styles.iconBox, { backgroundColor: `${C.amberSignal}18` }]}>
            <Feather name="upload" size={14} color={C.amberSignal} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: C.cipherWhite }]}>{t("settings.export_ledger")}</Text>
            <Text style={[styles.rowSub, { color: C.slateText }]}>{t("settings.export_desc")}</Text>
          </View>
          <Feather name="chevron-right" size={14} color={C.ghostText} />
        </TouchableOpacity>

        {/* Import */}
        <TouchableOpacity
          style={[styles.row, { borderTopColor: C.wireGray, borderTopWidth: 1 }]}
          onPress={triggerImport}
        >
          <View style={[styles.iconBox, { backgroundColor: `${C.amberSignal}18` }]}>
            <Feather name="download" size={14} color={C.amberSignal} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: C.cipherWhite }]}>{t("settings.import_ledger")}</Text>
            <Text style={[styles.rowSub, { color: C.slateText }]}>{t("settings.import_desc")}</Text>
          </View>
          <Feather name="chevron-right" size={14} color={C.ghostText} />
        </TouchableOpacity>

        {/* Wipe All Data */}
        <TouchableOpacity
          style={[styles.row, { borderTopColor: C.wireGray, borderTopWidth: 1 }]}
          onPress={() => setShowWipe(true)}
        >
          <View style={[styles.iconBox, { backgroundColor: `${C.debitRed}18` }]}>
            <Feather name="trash-2" size={14} color={C.debitRed} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: C.debitRed }]}>{t("settings.wipe_all_data")}</Text>
            <Text style={[styles.rowSub, { color: C.slateText }]}>{t("settings.wipe_desc")}</Text>
          </View>
          <Feather name="chevron-right" size={14} color={C.debitRed} />
        </TouchableOpacity>
      </View>

      {/* ── AUTO BACKUP ── */}
      <View style={[styles.section, { backgroundColor: C.vaultDark, borderColor: C.wireGray }]}>
        <SectionHeader label={t("settings.auto_backup")} />

        <View style={[styles.row, { borderTopColor: C.wireGray }]}>
          <View style={[styles.iconBox, { backgroundColor: `${C.amberSignal}18` }]}>
            <Feather name="hard-drive" size={14} color={C.amberSignal} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: C.cipherWhite }]}>{t("settings.auto_backup")}</Text>
            <Text style={[styles.rowSub, { color: C.slateText }]}>
              {Platform.OS === "web" ? t("settings.requires_native") : t("settings.saves_every_change")}
            </Text>
          </View>
          <Switch
            value={autoBackupEnabled}
            onValueChange={handleAutoBackupToggle}
            disabled={Platform.OS === "web"}
            trackColor={{ false: C.wireGray, true: `${C.amberSignal}60` }}
            thumbColor={autoBackupEnabled ? C.amberSignal : C.slateText}
          />
        </View>

        <TouchableOpacity
          style={[styles.row, { borderTopColor: C.wireGray, borderTopWidth: 1 }]}
          onPress={handlePickFolder}
          disabled={Platform.OS !== "android" || isPickingBackupFolder}
        >
          <View style={[styles.iconBox, { backgroundColor: `${C.amberSignal}18` }]}>
            <Feather name="folder" size={14} color={Platform.OS === "android" ? C.amberSignal : C.ghostText} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: Platform.OS === "android" ? C.cipherWhite : C.ghostText }]}>
              {t("settings.backup_folder")}
            </Text>
            <Text style={[styles.rowSub, { color: C.slateText }]}>
              {backupFolderLabel}
            </Text>
          </View>
          {Platform.OS === "android" && (
            isPickingBackupFolder ? (
              <ActivityIndicator size="small" color={C.amberSignal} />
            ) : (
              <Feather name="chevron-right" size={14} color={C.ghostText} />
            )
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.row, { borderTopColor: C.wireGray, borderTopWidth: 1 }]}
          onPress={() => setShowBackupPassword(true)}
          disabled={Platform.OS === "web"}
        >
          <View style={[styles.iconBox, { backgroundColor: `${C.amberSignal}18` }]}>
            <Feather name="shield" size={14} color={Platform.OS === "web" ? C.ghostText : C.amberSignal} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: Platform.OS === "web" ? C.ghostText : C.cipherWhite }]}>
              {t("settings.backup_password")}
            </Text>
            <Text style={[styles.rowSub, { color: C.slateText }]}>
              {autoBackupPassword ? t("settings.custom_password") : t("settings.using_pin")}
            </Text>
          </View>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: autoBackupPassword ? C.amberSignal : C.creditGreen },
            ]}
          />
        </TouchableOpacity>

        <View style={[styles.row, { borderTopColor: C.wireGray, borderTopWidth: 1 }]}>
          <View style={[styles.iconBox, { backgroundColor: `${C.amberSignal}18` }]}>
            <Feather name="clock" size={14} color={C.amberSignal} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: C.cipherWhite }]}>{t("settings.last_backup")}</Text>
            <Text style={[styles.rowSub, { color: C.slateText }]}>
              {Platform.OS === "web" ? "N/A — not supported on web" : lastBackupLabel}
            </Text>
          </View>
        </View>
      </View>

      {/* ── SECURITY ── */}
      <View style={[styles.section, { backgroundColor: C.vaultDark, borderColor: C.wireGray }]}>
        <SectionHeader label={t("settings.security")} />

        <View style={[styles.row, { borderTopColor: C.wireGray }]}>
          <View style={[styles.iconBox, { backgroundColor: `${C.creditGreen}18` }]}>
            <Feather name="database" size={14} color={C.creditGreen} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: C.cipherWhite }]}>{t("settings.local_storage")}</Text>
            <Text style={[styles.rowSub, { color: C.slateText }]}>
              {t("settings.local_storage_desc")}
            </Text>
          </View>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: C.creditGreen },
            ]}
          />
        </View>

        {/* Change PIN */}
        <TouchableOpacity
          style={[styles.row, { borderTopColor: C.wireGray, borderTopWidth: 1 }]}
          onPress={() => setShowChangePin(true)}
        >
          <View style={[styles.iconBox, { backgroundColor: `${C.amberSignal}18` }]}>
            <Feather name="key" size={14} color={C.amberSignal} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: C.cipherWhite }]}>{t("settings.change_pin")}</Text>
            <Text style={[styles.rowSub, { color: C.slateText }]}>{t("settings.change_pin_desc")}</Text>
          </View>
          <Feather name="chevron-right" size={14} color={C.ghostText} />
        </TouchableOpacity>

        {/* Biometrics */}
        <View style={[styles.row, { borderTopColor: C.wireGray, borderTopWidth: 1 }]}>
          <View style={[styles.iconBox, { backgroundColor: `${C.amberSignal}18` }]}>
            <Feather name="user-check" size={14} color={C.amberSignal} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: C.cipherWhite }]}>{t("settings.biometric_unlock")}</Text>
            <Text style={[styles.rowSub, { color: C.slateText }]}>
              {biometricEnabled ? t("settings.biometric_on") : t("settings.biometric_off")}
            </Text>
          </View>
          <Switch
            value={biometricEnabled}
            onValueChange={handleBiometricToggle}
            trackColor={{ false: C.wireGray, true: `${C.amberSignal}60` }}
            thumbColor={biometricEnabled ? C.amberSignal : C.slateText}
          />
        </View>

        {/* Auto-Lock */}
        <View style={[styles.row, { borderTopColor: C.wireGray, borderTopWidth: 1 }]}>
          <View style={[styles.iconBox, { backgroundColor: `${C.amberSignal}18` }]}>
            <Feather name="clock" size={14} color={C.amberSignal} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: C.cipherWhite }]}>{t("settings.auto_lock")}</Text>
            <Text style={[styles.rowSub, { color: C.slateText }]}>{t("settings.auto_lock_desc")}</Text>
          </View>
        </View>
        <View style={[styles.lockChips, { paddingHorizontal: 16, paddingBottom: 14 }]}>
          {lockOptions.map((opt) => {
            const active = appSettings.autoLockMinutes === opt.value;
            return (
              <TouchableOpacity
                key={String(opt.value)}
                style={[
                  styles.lockChip,
                  {
                    borderColor: active ? C.amberSignal : C.wireGray,
                    backgroundColor: active ? `${C.amberSignal}18` : "transparent",
                  },
                ]}
                onPress={() => updateAppSettings({ autoLockMinutes: opt.value })}
              >
                <Text style={[styles.lockChipText, { color: active ? C.amberSignal : C.slateText }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── APPEARANCE ── */}
      <View style={[styles.section, { backgroundColor: C.vaultDark, borderColor: C.wireGray }]}>
        <SectionHeader label={t("settings.appearance")} />
        <View style={[styles.row, { borderTopColor: C.wireGray }]}>
          <View style={[styles.iconBox, { backgroundColor: `${C.amberSignal}18` }]}>
            <Feather name="moon" size={14} color={C.amberSignal} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: C.cipherWhite }]}>{t("settings.theme")}</Text>
            <Text style={[styles.rowSub, { color: C.slateText }]}>
              {appSettings.theme === "dark"
                ? t("settings.theme_dark_desc")
                : appSettings.theme === "dim"
                ? t("settings.theme_dim_desc")
                : t("settings.theme_oled_desc")}
            </Text>
          </View>
          <PillGroup
            options={themeOptions}
            value={appSettings.theme}
            onChange={(v) => updateAppSettings({ theme: v })}
            C={C}
          />
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: C.vaultDark, borderColor: C.wireGray }]}>
        <SectionHeader label={t("settings.language")} />
        <TouchableOpacity
          style={[styles.row, { borderTopColor: C.wireGray }]}
          onPress={() => setShowLanguage(true)}
        >
          <View style={[styles.iconBox, { backgroundColor: `${C.amberSignal}18` }]}>
            <Feather name="globe" size={14} color={C.amberSignal} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: C.cipherWhite }]}>{t("settings.language")}</Text>
            <Text style={[styles.rowSub, { color: C.slateText }]}>{t("settings.language_desc")}</Text>
          </View>
          <View style={[styles.currencyBadge, { backgroundColor: C.wireDim, borderColor: C.wireGray, width: "auto", paddingHorizontal: 10 }]}>
            <Text style={[styles.pillText, { color: C.amberSignal }]}>{getLanguageLabel(appSettings.language)}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ── CURRENCY ── */}
      <View style={[styles.section, { backgroundColor: C.vaultDark, borderColor: C.wireGray }]}>
        <SectionHeader label={t("settings.currency")} />
        <TouchableOpacity
          style={[styles.row, { borderTopColor: C.wireGray }]}
          onPress={() => setShowCurrency(true)}
        >
          <View style={[styles.iconBox, { backgroundColor: `${C.amberSignal}18` }]}>
            <Feather name="dollar-sign" size={14} color={C.amberSignal} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: C.cipherWhite }]}>{t("settings.active_currency")}</Text>
            <Text style={[styles.rowSub, { color: C.slateText }]}>{currency.code}</Text>
          </View>
          <View style={[styles.currencyBadge, { backgroundColor: C.wireDim, borderColor: C.wireGray }]}>
            <Text style={[styles.currencySymbol, { color: C.amberSignal }]}>{currency.symbol}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ── BUDGET ENVELOPES ── */}
      <View style={[styles.section, { backgroundColor: C.vaultDark, borderColor: C.wireGray }]}>
        <SectionHeader label={t("settings.budget_envelopes")} />
        {(budgetEnvelopes as BudgetEnvelope[]).map((env) => {
          const spent = computeBudgetProgress(transactions, env.category);
          const pct = env.monthlyLimit > 0 ? Math.min(1, spent / env.monthlyLimit) : 0;
          const barColor = pct >= 1 ? C.debitRed : pct >= 0.8 ? C.amberSignal : C.ghostText;
          return (
            <View key={env.id} style={[styles.envelopeRow, { borderTopColor: C.wireGray }]}>
              <View style={[styles.iconBox, { backgroundColor: `${C.amberSignal}18` }]}>
                <Feather name="inbox" size={14} color={C.amberSignal} />
              </View>
              <View style={{ flex: 1, gap: 5 }}>
                <View style={styles.envelopeTop}>
                  <Text style={[styles.rowLabel, { color: C.cipherWhite }]}>{tc(env.category)}</Text>
                  <Text style={[styles.envelopePct, { color: barColor }]}>{Math.round(pct * 100)}%</Text>
                </View>
                <View style={[styles.envelopeBar, { backgroundColor: C.wireGray }]}>
                  <View style={[styles.envelopeFill, { width: `${pct * 100}%` as any, backgroundColor: barColor }]} />
                </View>
                <Text style={[styles.rowSub, { color: C.slateText }]}>
                  {formatAmount(spent)} / {formatAmount(env.monthlyLimit)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => deleteBudgetEnvelope(env.id)}
                style={{ marginLeft: 12 }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="trash-2" size={14} color={C.ghostText} />
              </TouchableOpacity>
            </View>
          );
        })}
        {showAddEnvelope ? (
          <View style={[styles.addForm, { borderTopColor: C.wireGray }]}>
            <Text style={[styles.formLabel, { color: C.ghostText }]}>{t("add.category")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.pill,
                      {
                        borderColor: envCategory === cat ? C.amberSignal : C.wireGray,
                        backgroundColor: envCategory === cat ? `${C.amberSignal}18` : "transparent",
                      },
                    ]}
                    onPress={() => setEnvCategory(cat)}
                  >
                    <Text style={[styles.pillText, { color: envCategory === cat ? C.amberSignal : C.slateText }]}>
                      {tc(cat)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <Text style={[styles.formLabel, { color: C.ghostText }]}>{t("settings.monthly_limit")}</Text>
            <TextInput
              style={[styles.formInput, { borderColor: C.wireGray, color: C.cipherWhite, backgroundColor: C.forgeBlack }]}
              value={envLimit}
              onChangeText={setEnvLimit}
              placeholder={t("finances.amount_placeholder")}
              placeholderTextColor={C.ghostText}
              keyboardType="decimal-pad"
            />
            <View style={styles.formBtns}>
              <TouchableOpacity style={[styles.formBtn, { borderColor: C.wireGray }]} onPress={() => setShowAddEnvelope(false)}>
                <Text style={[styles.formBtnText, { color: C.slateText }]}>{t("analytics.close")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.formBtn, { flex: 1, borderColor: C.amberSignal, backgroundColor: `${C.amberSignal}18` }]}
                onPress={handleAddEnvelope}
              >
                <Text style={[styles.formBtnText, { color: C.amberSignal }]}>{t("settings.add_envelope")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={[styles.addBtn, { borderTopColor: C.wireGray }]} onPress={() => setShowAddEnvelope(true)}>
            <Feather name="plus" size={13} color={C.ghostText} />
            <Text style={[styles.addBtnText, { color: C.ghostText }]}>{t("settings.add_envelope")}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── RECURRING ENTRIES ── */}
      <View style={[styles.section, { backgroundColor: C.vaultDark, borderColor: C.wireGray }]}>
        <SectionHeader label={t("settings.recurring_entries")} />
        {(recurringTemplates as RecurringTemplate[]).length === 0 ? (
          <View style={[styles.emptyBox, { borderTopColor: C.wireGray }]}>
            <Text style={[styles.emptyText, { color: C.ghostText }]}>
              {t("settings.no_recurring")}
            </Text>
          </View>
        ) : (
          (recurringTemplates as RecurringTemplate[]).map((t) => (
            <View key={t.id} style={[styles.recurringRow, { borderTopColor: C.wireGray }]}>
              <View
                style={[
                  styles.recurringIcon,
                  { backgroundColor: t.type === "income" ? `${C.creditGreen}20` : `${C.debitRed}20` },
                ]}
              >
                <Feather
                  name={t.type === "income" ? "arrow-up" : "arrow-down"}
                  size={13}
                  color={t.type === "income" ? C.creditGreen : C.debitRed}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: C.cipherWhite }]}>{tc(t.category)}</Text>
                <Text style={[styles.rowSub, { color: C.slateText }]}>
                  {tf(t.frequency)}{t.note ? `  ·  ${t.note}` : ""}
                </Text>
              </View>
              <Switch
                value={t.active}
                onValueChange={() => toggleRecurringTemplate(t.id)}
                trackColor={{ false: C.wireGray, true: `${C.amberSignal}60` }}
                thumbColor={t.active ? C.amberSignal : C.slateText}
                style={{ transform: [{ scale: 0.8 }], marginRight: 4 }}
              />
              <TouchableOpacity onPress={() => deleteRecurringTemplate(t.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="trash-2" size={14} color={C.ghostText} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* ── APP ── */}
      <View style={[styles.section, { backgroundColor: C.vaultDark, borderColor: C.wireGray }]}>
        <SectionHeader label={t("settings.app")} />
        <TouchableOpacity
          style={[styles.row, { borderTopColor: C.wireGray }]}
          onPress={() => router.push("/(app)/about")}
        >
          <View style={[styles.iconBox, { backgroundColor: `${C.amberSignal}18` }]}>
            <Feather name="info" size={14} color={C.amberSignal} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: C.cipherWhite }]}>{t("settings.about_ledger")}</Text>
            <Text style={[styles.rowSub, { color: C.slateText }]}>{t("settings.about_desc")}</Text>
          </View>
          <Feather name="chevron-right" size={14} color={C.ghostText} />
        </TouchableOpacity>
      </View>

      <View style={styles.about}>
        <Text style={[styles.aboutWordmark, { color: C.amberSignal }]}>LEDGER</Text>
        <Text style={[styles.aboutLine, { color: C.ghostText }]}>{t("settings.footer_tag")}</Text>
        <Text style={[styles.aboutLine, { color: C.ghostText }]}>
          {t("settings.footer_sub")}
        </Text>
      </View>

      {/* ── Modals ── */}
      <ExportModal visible={showExport} onClose={() => setShowExport(false)} />
      <ReportCard visible={showReport} onClose={() => setShowReport(false)} />
      <LanguageSelector visible={showLanguage} onClose={() => setShowLanguage(false)} />
      <CurrencySelector visible={showCurrency} onClose={() => setShowCurrency(false)} />
      <ChangePinModal
        visible={showChangePin}
        onClose={() => setShowChangePin(false)}
        currentPin={pin ?? ""}
        onChanged={changePin}
        C={C}
      />
      <BackupFolderModal
        visible={showBackupFolderModal}
        onClose={() => {
          setShowBackupFolderModal(false);
          setEnableAutoBackupAfterPick(false);
        }}
        onChoose={() => void chooseBackupFolder(enableAutoBackupAfterPick)}
        currentFolderLabel={backupFolderLabel}
        isPicking={isPickingBackupFolder}
        enableAfterPick={enableAutoBackupAfterPick}
        C={C}
      />
      <BackupPasswordModal
        visible={showBackupPassword}
        currentPassword={autoBackupPassword}
        onSave={setAutoBackupPassword}
        onClose={() => setShowBackupPassword(false)}
        C={C}
      />
      <WipeModal
        visible={showWipe}
        onConfirm={handleWipe}
        onClose={() => setShowWipe(false)}
        C={C}
      />
      {PinPromptModal}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  banner: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  bannerText: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 12,
    textAlign: "center",
  },
  section: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  sectionHeader: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 10,
    color: "#3a4a60",
    letterSpacing: 2,
    textTransform: "uppercase",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 13,
  },
  rowSub: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 11,
    marginTop: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  lockChips: {
    flexDirection: "row",
    gap: 6,
  },
  lockChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: "center",
  },
  lockChipText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 9,
    letterSpacing: 0.5,
  },
  currencyBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  currencySymbol: {
    fontFamily: "JetBrainsMono_600SemiBold",
    fontSize: 16,
  },
  envelopeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 14,
    borderTopWidth: 1,
  },
  envelopeTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  envelopePct: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  envelopeBar: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  envelopeFill: {
    height: "100%",
    borderRadius: 2,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  addBtnText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 9,
    letterSpacing: 1,
  },
  addForm: {
    padding: 16,
    gap: 8,
    borderTopWidth: 1,
  },
  formLabel: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 9,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 14,
    outlineStyle: "none" as any,
  },
  formBtns: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  formBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  formBtnText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 9,
    letterSpacing: 1,
  },
  pillGroup: {
    flexDirection: "row",
    gap: 6,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  pillText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 9,
    letterSpacing: 0.5,
  },
  recurringRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: 1,
  },
  recurringIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBox: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  emptyText: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 12,
    textAlign: "center",
  },
  about: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 20,
  },
  aboutWordmark: {
    fontFamily: "Syne_700Bold",
    fontSize: 20,
    letterSpacing: 5,
  },
  aboutLine: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 9,
    letterSpacing: 1,
  },
  /* Modals */
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalBox: {
    width: "100%",
    maxWidth: 360,
    borderWidth: 1,
    borderRadius: 12,
    padding: 24,
    gap: 12,
  },
  modalIconRow: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  modalTitle: {
    fontFamily: "Syne_700Bold",
    fontSize: 18,
    letterSpacing: 2,
    textAlign: "center",
  },
  modalBody: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  modalBodySub: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 18,
  },
  modalBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  modalBtnText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 11,
    letterSpacing: 1.5,
  },
  folderPreview: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  folderPreviewLabel: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 9,
    letterSpacing: 1.2,
  },
  folderPreviewValue: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  primaryFolderBtn: {
    minHeight: 42,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  checkLabel: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 13,
  },
  /* PIN modal */
  pinBox: {
    width: "100%",
    maxWidth: 340,
    borderWidth: 1,
    borderRadius: 12,
    padding: 24,
    gap: 16,
  },
  pinHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pinTitle: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 11,
    letterSpacing: 2,
  },
  pinDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  pinError: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 11,
    textAlign: "center",
  },
  pinGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pinKey: {
    width: "30%",
    aspectRatio: 1.6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pinKeyText: {
    fontFamily: "JetBrainsMono_600SemiBold",
    fontSize: 20,
  },
  pinKeyLabel: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 8,
    letterSpacing: 1,
    textAlign: "center",
  },
});
