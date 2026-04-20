import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
} from "react-native";
import { Tabs, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLedger } from "@/context/LedgerContext";
import { performAutoBackup } from "@/utils/autoBackup";
import colors, { getThemeColors } from "@/constants/colors";

function AppHeader() {
  const insets = useSafeAreaInsets();
  const { lock, appSettings } = useLedger();
  const C = getThemeColors(appSettings.theme);

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
          {"// LOCAL ONLY · NO SYNC"}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.lockBtn, { borderColor: C.amberSignal }]}
        onPress={handleLock}
      >
        <Feather name="log-out" size={11} color={C.amberSignal} />
        <Text style={[styles.lockBtnText, { color: C.amberSignal }]}>LOCK</Text>
      </TouchableOpacity>
    </View>
  );
}

const TABS = [
  { name: "dashboard", label: "DASH", icon: "grid" as const },
  { name: "add", label: "ADD", icon: "plus-circle" as const },
  { name: "history", label: "HISTORY", icon: "list" as const },
  { name: "finances", label: "FINANCE", icon: "trending-up" as const },
  { name: "analytics", label: "ANALYTICS", icon: "bar-chart-2" as const },
  { name: "settings", label: "SETTINGS", icon: "settings" as const },
];

function TabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { appSettings } = useLedger();
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
              {tab.label}
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
      const password = autoBackupPassword ?? pin ?? "";
      if (!password) return;
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
        autoBackupFolderUri
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
        <Tabs.Screen name="dashboard" options={{ title: "Dashboard" }} />
        <Tabs.Screen name="add" options={{ title: "Add" }} />
        <Tabs.Screen name="history" options={{ title: "History" }} />
        <Tabs.Screen name="finances" options={{ title: "Finances" }} />
        <Tabs.Screen name="analytics" options={{ title: "Analytics" }} />
        <Tabs.Screen name="settings" options={{ title: "Settings" }} />
        <Tabs.Screen name="about" options={{ title: "About", href: null }} />
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
