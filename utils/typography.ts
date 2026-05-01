import { StyleSheet } from "react-native";
import type { AppSettings } from "@/context/LedgerContext";

let installed = false;
let fontSizePercent = 0;
let fontWeight: AppSettings["fontWeight"] = "default";

const monoWeightMap: Record<Exclude<AppSettings["fontWeight"], "default">, string> = {
  semibold: "JetBrainsMono_600SemiBold",
  bold: "JetBrainsMono_700Bold",
  extrabold: "JetBrainsMono_800ExtraBold",
};

const displayWeightMap: Record<Exclude<AppSettings["fontWeight"], "default">, string> = {
  semibold: "Syne_600SemiBold",
  bold: "Syne_700Bold",
  extrabold: "Syne_800ExtraBold",
};

export function getFontSizeMultiplier(percent = fontSizePercent): number {
  return 1 + Math.max(0, Math.min(100, percent)) / 100;
}

export function scaleFontSize(size: number, percent = fontSizePercent): number {
  if (percent <= 0) return size;
  return Math.round(size * getFontSizeMultiplier(percent) * 10) / 10;
}

export function resolveFontFamily(family?: string, weight = fontWeight): string | undefined {
  if (!family || weight === "default") return family;
  if (family.startsWith("JetBrainsMono_")) return monoWeightMap[weight];
  if (family.startsWith("Syne_")) return displayWeightMap[weight];
  return family;
}

export function setTypographyPreferences(settings: AppSettings) {
  fontSizePercent = settings.fontSizePercent ?? 0;
  fontWeight = settings.fontWeight ?? "default";
}

export function installTypographyControls() {
  if (installed) return;
  installed = true;
  const styleSheet = StyleSheet as unknown as {
    setStyleAttributePreprocessor?: (property: string, process: (value: unknown) => unknown) => void;
  };

  styleSheet.setStyleAttributePreprocessor?.("fontSize", (value) =>
    typeof value === "number" ? scaleFontSize(value) : value
  );
  styleSheet.setStyleAttributePreprocessor?.("fontFamily", (value) =>
    typeof value === "string" ? resolveFontFamily(value) : value
  );
}
