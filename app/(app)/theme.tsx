import React, { useMemo, useRef } from "react";
import {
  Animated,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useLedger, AppSettings } from "@/context/LedgerContext";
import { getThemeColors } from "@/constants/colors";
import { useI18n } from "@/utils/i18n";
import { resolveFontFamily, scaleFontSize } from "@/utils/typography";

const DIAL_SIZE = 240;
const DIAL_CENTER = DIAL_SIZE / 2;
const DIAL_RADIUS = 92;
const DOT_COUNT = 48;

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function percentToAngle(percent: number): number {
  return -90 + percent * 3.6;
}

function pointForPercent(percent: number) {
  const radians = (percentToAngle(percent) * Math.PI) / 180;
  return {
    left: DIAL_CENTER + Math.cos(radians) * DIAL_RADIUS,
    top: DIAL_CENTER + Math.sin(radians) * DIAL_RADIUS,
  };
}

export default function ThemeScreen() {
  const { appSettings, updateAppSettings } = useLedger();
  const { t } = useI18n();
  const C = getThemeColors(appSettings.theme);
  const knobScale = useRef(new Animated.Value(1)).current;

  const themeOptions: { label: string; value: AppSettings["theme"]; desc: string }[] = [
    { label: t("settings.dark"), value: "dark", desc: t("settings.theme_dark_desc") },
    { label: t("settings.dim"), value: "dim", desc: t("settings.theme_dim_desc") },
    { label: t("settings.oled"), value: "oled", desc: t("settings.theme_oled_desc") },
  ];

  const weightOptions: { label: string; value: AppSettings["fontWeight"] }[] = [
    { label: t("settings.font_weight_default"), value: "default" },
    { label: t("settings.font_weight_semibold"), value: "semibold" },
    { label: t("settings.font_weight_bold"), value: "bold" },
    { label: t("settings.font_weight_extrabold"), value: "extrabold" },
  ];

  const setFontPercentFromTouch = (x: number, y: number) => {
    const dx = x - DIAL_CENTER;
    const dy = y - DIAL_CENTER;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const normalized = (angle + 450) % 360;
    updateAppSettings({ fontSizePercent: clampPercent(normalized / 3.6) });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          Animated.spring(knobScale, { toValue: 1.16, useNativeDriver: true }).start();
          setFontPercentFromTouch(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
        },
        onPanResponderMove: (evt) => {
          setFontPercentFromTouch(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
        },
        onPanResponderRelease: () => {
          Animated.spring(knobScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(knobScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
        },
      }),
    [knobScale]
  );

  const fontPercent = appSettings.fontSizePercent ?? 0;
  const knob = pointForPercent(fontPercent);
  const previewWeight = appSettings.fontWeight ?? "default";
  const previewTitleFamily = resolveFontFamily("Syne_700Bold", previewWeight);
  const previewBodyFamily = resolveFontFamily("JetBrainsMono_400Regular", previewWeight);

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: C.forgeBlack }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topBar}>
        <TouchableOpacity style={[styles.backBtn, { borderColor: C.wireGray }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={14} color={C.slateText} />
          <Text style={[styles.backText, { color: C.slateText }]}>{t("screen.settings").toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.hero, { backgroundColor: C.vaultDark, borderColor: C.wireGray }]}>
        <View style={[styles.heroIcon, { backgroundColor: `${C.amberSignal}18`, borderColor: `${C.amberSignal}40` }]}>
          <Feather name="sliders" size={22} color={C.amberSignal} />
        </View>
        <Text style={[styles.heroTitle, { color: C.cipherWhite }]}>{t("settings.theme_page")}</Text>
        <Text style={[styles.heroSub, { color: C.slateText }]}>{t("settings.theme_page_desc")}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: C.vaultDark, borderColor: C.wireGray }]}>
        <Text style={[styles.sectionTitle, { color: C.amberSignal }]}>{t("settings.color_theme")}</Text>
        <View style={styles.themeGrid}>
          {themeOptions.map((option) => {
            const active = appSettings.theme === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.themeTile,
                  {
                    borderColor: active ? C.amberSignal : C.wireGray,
                    backgroundColor: active ? `${C.amberSignal}14` : C.inkSurface,
                  },
                ]}
                onPress={() => updateAppSettings({ theme: option.value })}
              >
                <Text style={[styles.themeTileLabel, { color: active ? C.amberSignal : C.cipherWhite }]}>
                  {option.label}
                </Text>
                <Text style={[styles.themeTileDesc, { color: C.slateText }]}>{option.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: C.vaultDark, borderColor: C.wireGray }]}>
        <Text style={[styles.sectionTitle, { color: C.amberSignal }]}>{t("settings.font_size")}</Text>
        <Text style={[styles.sectionCopy, { color: C.slateText }]}>{t("settings.font_size_desc")}</Text>
        <View style={styles.dialWrap}>
          <View style={styles.dial} {...panResponder.panHandlers}>
            {Array.from({ length: DOT_COUNT }).map((_, index) => {
              const dotPercent = Math.round((index / DOT_COUNT) * 100);
              const point = pointForPercent(dotPercent);
              const active = dotPercent <= fontPercent && fontPercent > 0;
              return (
                <View
                  key={index}
                  style={[
                    styles.dialDot,
                    {
                      left: point.left - 3,
                      top: point.top - 3,
                      backgroundColor: active ? C.amberSignal : C.wireGray,
                      opacity: active ? 1 : 0.55,
                    },
                  ]}
                />
              );
            })}
            <Animated.View
              style={[
                styles.knob,
                {
                  left: knob.left - 17,
                  top: knob.top - 17,
                  borderColor: C.amberSignal,
                  backgroundColor: C.forgeBlack,
                  transform: [{ scale: knobScale }],
                },
              ]}
            >
              <View style={[styles.knobCore, { backgroundColor: C.amberSignal }]} />
            </Animated.View>
            <View style={[styles.dialCenter, { backgroundColor: C.inkSurface, borderColor: C.wireGray }]}>
              <Text style={[styles.dialValue, { color: C.cipherWhite }]}>
                {fontPercent === 0 ? t("settings.default_value") : `${fontPercent}%`}
              </Text>
              <Text style={[styles.dialLabel, { color: C.ghostText }]}>{t("settings.font_size")}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: C.vaultDark, borderColor: C.wireGray }]}>
        <Text style={[styles.sectionTitle, { color: C.amberSignal }]}>{t("settings.font_boldness")}</Text>
        <View style={styles.weightGrid}>
          {weightOptions.map((option) => {
            const active = previewWeight === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.weightBtn,
                  {
                    borderColor: active ? C.amberSignal : C.wireGray,
                    backgroundColor: active ? `${C.amberSignal}14` : "transparent",
                  },
                ]}
                onPress={() => updateAppSettings({ fontWeight: option.value })}
              >
                <Text style={[styles.weightBtnText, { color: active ? C.amberSignal : C.slateText }]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={[styles.previewCard, { backgroundColor: C.inkSurface, borderColor: C.wireGray }]}>
        <Text
          style={[
            styles.previewKicker,
            {
              color: C.amberSignal,
              fontFamily: resolveFontFamily("SyneMono_400Regular", previewWeight),
              fontSize: scaleFontSize(9, fontPercent),
            },
          ]}
        >
          {t("settings.live_preview")}
        </Text>
        <Text
          style={[
            styles.previewTitle,
            {
              color: C.cipherWhite,
              fontFamily: previewTitleFamily,
              fontSize: scaleFontSize(26, fontPercent),
            },
          ]}
        >
          LEDGER
        </Text>
        <Text
          style={[
            styles.previewBody,
            {
              color: C.slateText,
              fontFamily: previewBodyFamily,
              fontSize: scaleFontSize(12, fontPercent),
            },
          ]}
        >
          {t("settings.theme_preview_text")}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    padding: 16,
    paddingBottom: 44,
    gap: 14,
  },
  topBar: {
    paddingTop: 2,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  backText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 9,
    letterSpacing: 1.6,
  },
  hero: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    gap: 8,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroTitle: {
    fontFamily: "Syne_700Bold",
    fontSize: 24,
    letterSpacing: 1.5,
  },
  heroSub: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 11,
    lineHeight: 18,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  sectionCopy: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 11,
    lineHeight: 18,
  },
  themeGrid: {
    gap: 8,
  },
  themeTile: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
    gap: 4,
  },
  themeTileLabel: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },
  themeTileDesc: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 10,
  },
  dialWrap: {
    alignItems: "center",
    paddingVertical: 8,
  },
  dial: {
    width: DIAL_SIZE,
    height: DIAL_SIZE,
  },
  dialDot: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  knob: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  knobCore: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  dialCenter: {
    position: "absolute",
    left: 54,
    top: 54,
    width: 132,
    height: 132,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  dialValue: {
    fontFamily: "JetBrainsMono_600SemiBold",
    fontSize: 24,
  },
  dialLabel: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  weightGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  weightBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  weightBtnText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  previewCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    gap: 8,
  },
  previewKicker: {
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  previewTitle: {
    letterSpacing: 4,
  },
  previewBody: {
    lineHeight: 20,
  },
});
