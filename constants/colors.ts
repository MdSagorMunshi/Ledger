const colors = {
  light: {
    text: "#e2e8f0",
    tint: "#f59e0b",

    background: "#07090e",
    foreground: "#e2e8f0",

    card: "#0f1420",
    cardForeground: "#e2e8f0",

    primary: "#f59e0b",
    primaryForeground: "#07090e",

    secondary: "#1e2535",
    secondaryForeground: "#e2e8f0",

    muted: "#1e2535",
    mutedForeground: "#7a8aa0",

    accent: "#f59e0b",
    accentForeground: "#07090e",

    destructive: "#ef4444",
    destructiveForeground: "#ffffff",

    border: "#1e2535",
    input: "#1e2535",

    forgeBlack: "#07090e",
    vaultDark: "#0f1420",
    inkSurface: "#121824",
    wireGray: "#1e2535",
    wireDim: "#141c28",
    cipherWhite: "#e2e8f0",
    slateText: "#7a8aa0",
    ghostText: "#3a4a60",
    amberSignal: "#f59e0b",
    creditGreen: "#22c55e",
    debitRed: "#ef4444",

    chartColors: [
      "#f59e0b",
      "#3b82f6",
      "#8b5cf6",
      "#06b6d4",
      "#ec4899",
      "#10b981",
      "#f97316",
      "#6366f1",
    ],
  },

  dim: {
    forgeBlack: "#111827",
    vaultDark: "#1a2230",
    inkSurface: "#1e2a3a",
    wireGray: "#1e2535",
    wireDim: "#141c28",
    cipherWhite: "#e2e8f0",
    slateText: "#7a8aa0",
    ghostText: "#3a4a60",
    amberSignal: "#f59e0b",
    creditGreen: "#22c55e",
    debitRed: "#ef4444",
  },

  oled: {
    forgeBlack: "#000000",
    vaultDark: "#000000",
    inkSurface: "#000000",
    wireGray: "#1f2937",
    wireDim: "#000000",
    cipherWhite: "#e2e8f0",
    slateText: "#7a8aa0",
    ghostText: "#3a4a60",
    amberSignal: "#f59e0b",
    creditGreen: "#22c55e",
    debitRed: "#ef4444",
  },

  radius: 8,
};

export default colors;

export function getThemeColors(theme: "dark" | "dim" | "oled") {
  if (theme === "dim") {
    return {
      ...colors.light,
      forgeBlack: colors.dim.forgeBlack,
      vaultDark: colors.dim.vaultDark,
      inkSurface: colors.dim.inkSurface,
      background: colors.dim.forgeBlack,
      card: colors.dim.vaultDark,
    };
  }
  if (theme === "oled") {
    return {
      ...colors.light,
      forgeBlack: colors.oled.forgeBlack,
      vaultDark: colors.oled.vaultDark,
      inkSurface: colors.oled.inkSurface,
      wireGray: colors.oled.wireGray,
      wireDim: colors.oled.wireDim,
      background: colors.oled.forgeBlack,
      card: colors.oled.vaultDark,
    };
  }
  return colors.light;
}
