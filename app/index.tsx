import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLedger } from "@/context/LedgerContext";
import { PinDots } from "@/components/PinDots";
import { PinKeypad } from "@/components/PinKeypad";
import colors from "@/constants/colors";
import { useI18n } from "@/utils/i18n";

type PinMode = "setup" | "confirm" | "unlock";

const MAX_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 30;

export default function PinGate() {
  const { setupPin, unlock, pin, isUnlocked, biometricEnabled, isHydrated } = useLedger();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<PinMode>("unlock");

  // Update mode when hydration completes
  useEffect(() => {
    if (isHydrated) {
      setMode(pin === null ? "setup" : "unlock");
    }
  }, [isHydrated, pin]);
  const [input, setInput] = useState("");
  const [setupFirst, setSetupFirst] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownSecsLeft, setCooldownSecsLeft] = useState(0);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isUnlocked) {
      router.replace("/(app)/dashboard");
    }
  }, [isUnlocked]);

  useEffect(() => {
    return () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    };
  }, []);

  // Check biometric hardware availability
  useEffect(() => {
    if (Platform.OS === "web") return;
    (async () => {
      try {
        const LocalAuth = await import("expo-local-authentication");
        const hasHardware = await LocalAuth.hasHardwareAsync();
        const isEnrolled = await LocalAuth.isEnrolledAsync();
        setBioAvailable(hasHardware && isEnrolled);
      } catch {
        setBioAvailable(false);
      }
    })();
  }, []);

  // Auto-trigger biometrics on unlock screen if enabled
  const triggerBiometrics = useCallback(async () => {
    if (Platform.OS === "web") return;
    try {
      const LocalAuth = await import("expo-local-authentication");
        const result = await LocalAuth.authenticateAsync({
        promptMessage: t("pin.unlock_prompt"),
        cancelLabel: t("pin.use_pin"),
        disableDeviceFallback: true,
      });
      if (result.success) {
        unlock(pin ?? "");
      }
    } catch {
      // silently fail — user falls back to PIN
    }
  }, [pin, unlock]);

  useEffect(() => {
    if (mode === "unlock" && biometricEnabled && bioAvailable) {
      const t = setTimeout(triggerBiometrics, 400);
      return () => clearTimeout(t);
    }
  }, [mode, biometricEnabled, bioAvailable, triggerBiometrics]);

  const startCooldown = (secs: number) => {
    setCooldownSecsLeft(secs);
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    cooldownTimer.current = setInterval(() => {
      setCooldownSecsLeft((prev) => {
        if (prev <= 1) {
          if (cooldownTimer.current) clearInterval(cooldownTimer.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 350);
  };

  const handleDigit = (d: string) => {
    if (cooldownSecsLeft > 0) return;
    if (input.length >= 6) return;
    const next = input + d;
    setInput(next);
    setError("");

    if (next.length >= 4 && mode !== "setup" && mode !== "confirm") {
      setTimeout(() => processPin(next), 80);
    }
    if (next.length === 4 && (mode === "setup" || mode === "confirm")) {
      setTimeout(() => processPin(next), 80);
    }
  };

  const handleBackspace = () => {
    setInput((prev) => prev.slice(0, -1));
    setError("");
  };

  const processPin = (entered: string) => {
    if (mode === "setup") {
      setSetupFirst(entered);
      setMode("confirm");
      setInput("");
    } else if (mode === "confirm") {
      if (entered === setupFirst) {
        setupPin(entered);
      } else {
        setError(t("pin.mismatch"));
        triggerShake();
        setInput("");
        setMode("setup");
        setSetupFirst("");
      }
    } else {
      const ok = unlock(entered);
      if (!ok) {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        if (newAttempts >= MAX_ATTEMPTS) {
          setError(t("pin.too_many_attempts", { seconds: COOLDOWN_SECONDS }));
          startCooldown(COOLDOWN_SECONDS);
          setFailedAttempts(0);
        } else {
          const remaining = MAX_ATTEMPTS - newAttempts;
          setError(t("pin.incorrect_remaining", {
            count: remaining,
            suffix: remaining === 1 ? "" : "s",
          }));
        }
        triggerShake();
        setInput("");
      }
    }
  };

  const C = colors.light;
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const isLocked = cooldownSecsLeft > 0;

  if (!isHydrated) {
    return (
      <View style={[styles.root, { paddingTop: topPad, paddingBottom: Math.max(bottomPad, 20) }]}>
        <View style={styles.inner}>
          <View style={styles.topSection}>
            <View style={styles.brand}>
              <Feather name="shield" size={32} color={C.amberSignal} />
              <Text style={styles.brandText}>LEDGER</Text>
            </View>
            <Text style={styles.tagline}>{t("pin.loading_vault")}</Text>
          </View>
        </View>
      </View>
    );
  }

  const statusText = isLocked
    ? `LOCKED — ${cooldownSecsLeft}s`
    : mode === "setup"
    ? t("pin.set_pin")
    : mode === "confirm"
    ? t("pin.confirm_pin")
    : t("pin.enter_pin");

  const showBioBtn = mode === "unlock" && biometricEnabled && bioAvailable && !isLocked;

  return (
    <View style={[styles.root, { paddingTop: topPad, paddingBottom: Math.max(bottomPad, 20) }]}>
      <View style={styles.inner}>
        <View style={styles.topSection}>
          <View style={styles.brand}>
            <Feather name="shield" size={32} color={C.amberSignal} />
            <Text style={styles.brandText}>LEDGER</Text>
          </View>
          <Text style={styles.tagline}>{t("pin.secure_tracker")}</Text>
        </View>

        <View style={styles.pinSection}>
          <Text style={[styles.statusText, isLocked && { color: C.debitRed }]}>{statusText}</Text>
          <PinDots length={4} filled={input.length} shake={shake} />
          {!!error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <View style={{ height: 18 }} />
          )}
        </View>

        <PinKeypad onPress={handleDigit} onBackspace={handleBackspace} disabled={isLocked} />

        {showBioBtn ? (
          <TouchableOpacity style={styles.bioBtn} onPress={triggerBiometrics} activeOpacity={0.7}>
            <Feather name="user-check" size={20} color={C.amberSignal} />
            <Text style={styles.bioBtnText}>{t("pin.use_biometrics")}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.footer}>
            {t("pin.footer")}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.light.forgeBlack,
  },
  inner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  topSection: {
    alignItems: "center",
    gap: 8,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  brandText: {
    fontFamily: "Syne_700Bold",
    fontSize: 22,
    color: colors.light.amberSignal,
    letterSpacing: 5.5,
  },
  tagline: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 10,
    color: colors.light.ghostText,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  pinSection: {
    alignItems: "center",
    gap: 20,
  },
  statusText: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 13,
    color: colors.light.slateText,
    textAlign: "center",
  },
  errorText: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 11,
    color: colors.light.debitRed,
    textAlign: "center",
    height: 18,
  },
  bioBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.light.amberSignal,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  bioBtnText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 11,
    color: colors.light.amberSignal,
    letterSpacing: 1.5,
  },
  footer: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 10,
    color: colors.light.ghostText,
    textAlign: "center",
    paddingHorizontal: 20,
  },
});
