import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
} from "react-native";
import { Tabs, router, usePathname } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLedger } from "@/context/LedgerContext";
import { performAutoBackup } from "@/utils/autoBackup";
import colors, { getThemeColors } from "@/constants/colors";
import { useI18n } from "@/utils/i18n";
import { MonthPickerModal } from "@/components/MonthPickerModal";

function formatMonthLabel(monthKey: string): string {
  if (!monthKey) return "";
  const [year, month] = monthKey.split("-").map(Number);
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function AppHeader() {
  const insets = useSafeAreaInsets();
  const { lock, appSettings, selectedMonth, setSelectedMonth } = useLedger();
  const { t } = useI18n();
  const C = getThemeColors(appSettings.theme);
  const pathname = usePathname();
  const isDashboard = pathname === "/dashboard" || pathname === "/";
  const [pickerVisible, setPickerVisible] = useState(false);

  const handleLock = () => {
    lock();
    router.replace("/");
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: topPad + 8,
          backgroundColor: C.vaultDark,
          borderBottomColor: C.wireGray,
        },
      ]}
    >
      <View style={styles.brandArea}>
        <View style={styles.brandRow}>
          <Feather name="shield" size={14} color={C.amberSignal} />
          <Text style={[styles.brandText, { color: C.amberSignal }]}>LEDGER</Text>
        </View>
        <Text style={[styles.offlineTag, { color: C.ghostText }]}>
          {t("shell.local_only_no_sync")}
        </Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {isDashboard && (
          <TouchableOpacity
            style={[styles.monthBtn, { borderColor: C.wireGray, backgroundColor: `${C.wireGray}20` }]}
            onPress={() => setPickerVisible(true)}
          >
            <Feather name="calendar" size={11} color={C.cipherWhite} />
            <Text style={[styles.monthBtnText, { color: C.cipherWhite }]}>
              {formatMonthLabel(selectedMonth)}
            </Text>
            <Feather name="chevron-down" size={10} color={C.ghostText} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.lockBtn, { borderColor: C.amberSignal }]}
          onPress={handleLock}
        >
          <Feather name="log-out" size={11} color={C.amberSignal} />
          <Text style={[styles.lockBtnText, { color: C.amberSignal }]}>{t("shell.lock")}</Text>
        </TouchableOpacity>
      </View>
      
      <MonthPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelectMonth={setSelectedMonth}
        selectedMonth={selectedMonth}
      />
    </View>
  );
}

const TABS = [
  { name: "dashboard", labelKey: "tab.dashboard", icon: "grid" as const },
  { name: "add", labelKey: "tab.add", icon: "plus-circle" as const },
  { name: "history", labelKey: "tab.history", icon: "list" as const },
  { name: "finances", labelKey: "tab.finance", icon: "trending-up" as const },
  { name: "analytics", labelKey: "tab.analytics", icon: "bar-chart-2" as const },
  { name: "settings", labelKey: "tab.settings", icon: "settings" as const },
];

function TabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { appSettings } = useLedger();
  const { t } = useI18n();
  const C = getThemeColors(appSettings.theme);
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View
      style={[
        styles.tabBar,
        {
          paddingBottom: bottomPad,
          backgroundColor: C.vaultDark,
          borderTopColor: C.wireGray,
        },
      ]}
    >
      {TABS.map((tab) => {
        const routeIndex = state.routes.findIndex((r: any) => r.name === tab.name);
        const isFocused = state.index === routeIndex;
        const onPress = () => {
          if (routeIndex === -1) return;
          const event = navigation.emit({
            type: "tabPress",
            target: state.routes[routeIndex]?.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(tab.name);
          }
        };
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabItem}
            onPress={onPress}
            activeOpacity={0.7}
          >
            <Feather
              name={tab.icon}
              size={15}
              color={isFocused ? C.amberSignal : C.ghostText}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: isFocused ? C.amberSignal : C.ghostText },
              ]}
            >
              {t(tab.labelKey)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function AppLayout() {
  const {
    isUnlocked,
    transactions,
    savingsTransactions,
    savingsGoals,
    assetEntries,
    oweEntries,
    lendEntries,
    budgetEnvelopes,
    recurringTemplates,
    currency,
    autoBackupEnabled,
    autoBackupEncrypted,
    autoBackupFolderUri,
    autoBackupPassword,
    pin,
    recordBackupResult,
    appSettings,
    lock,
    lastActivityRef,
  } = useLedger();

  const backupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoLockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const C = getThemeColors(appSettings.theme);
  const { t } = useI18n();

  useEffect(() => {
    if (!isUnlocked) {
      router.replace("/");
    }
  }, [isUnlocked]);

  useEffect(() => {
    const hasBackupContent =
      transactions.length > 0 ||
      savingsTransactions.length > 0 ||
      savingsGoals.length > 0 ||
      assetEntries.length > 0 ||
      oweEntries.length > 0 ||
      lendEntries.length > 0 ||
      budgetEnvelopes.length > 0 ||
      recurringTemplates.length > 0;

    if (!autoBackupEnabled || !isUnlocked || !hasBackupContent) return;
    if (Platform.OS === "web") return;
    if (backupTimer.current) clearTimeout(backupTimer.current);
    backupTimer.current = setTimeout(async () => {
      const password = autoBackupEncrypted ? autoBackupPassword ?? pin ?? "" : "";
      if (autoBackupEncrypted && !password) return;
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
        password,
        autoBackupFolderUri,
        autoBackupEncrypted
      );
      if (result.ok) {
        recordBackupResult(result.time, result.path);
      }
    }, 800);
    return () => {
      if (backupTimer.current) clearTimeout(backupTimer.current);
    };
  }, [
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
    autoBackupEnabled,
    autoBackupEncrypted,
    autoBackupFolderUri,
    autoBackupPassword,
    isUnlocked,
    pin,
    recordBackupResult,
  ]);

  useEffect(() => {
    if (!isUnlocked || appSettings.autoLockMinutes === null) {
      if (autoLockTimer.current) clearTimeout(autoLockTimer.current);
      return;
    }
    const ms = appSettings.autoLockMinutes * 60 * 1000;
    if (autoLockTimer.current) clearTimeout(autoLockTimer.current);
    autoLockTimer.current = setTimeout(() => {
      lock();
      router.replace("/");
    }, ms);
    return () => {
      if (autoLockTimer.current) clearTimeout(autoLockTimer.current);
    };
  }, [isUnlocked, appSettings.autoLockMinutes]);

  if (!isUnlocked) return null;

  return (
    <View style={[styles.root, { backgroundColor: C.forgeBlack }]}>
      <AppHeader />
      <Tabs
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="dashboard" options={{ title: t("screen.dashboard") }} />
        <Tabs.Screen name="add" options={{ title: t("screen.add") }} />
        <Tabs.Screen name="history" options={{ title: t("screen.history") }} />
        <Tabs.Screen name="finances" options={{ title: t("screen.finances") }} />
        <Tabs.Screen name="analytics" options={{ title: t("screen.analytics") }} />
        <Tabs.Screen name="settings" options={{ title: t("screen.settings") }} />
        <Tabs.Screen name="about" options={{ title: t("screen.about"), href: null }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandArea: {
    gap: 2,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  brandText: {
    fontFamily: "Syne_700Bold",
    fontSize: 16,
    letterSpacing: 3.5,
  },
  offlineTag: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 9,
  },
  monthBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  monthBtnText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  lockBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  lockBtnText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 3,
  },
  tabLabel: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
