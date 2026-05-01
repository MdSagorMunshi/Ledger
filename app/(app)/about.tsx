import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { getThemeColors } from "@/constants/colors";
import { useLedger } from "@/context/LedgerContext";
import { useI18n } from "@/utils/i18n";

const APP_INFO = {
  name: "LEDGER",
  version: "3.0.0",
  lastUpdate: "2026-04-23",
  license: "MIT",
  sourceUrl: "https://github.com/MdSagorMunshi/Ledger",
};

const DEVELOPER = {
  name: "Ryan Shelby",
  email: "ryn@disr.it",
  github: "MdSagorMunshi",
  telegram: "leesiwoo_s",
  reddit: "leesiwoo_s",
};

const TECH_STACK = [
  { labelKey: "about.stack_runtime", valueKey: "about.stack_runtime_value" },
  { labelKey: "about.stack_language", valueKey: "about.stack_language_value" },
  { labelKey: "about.stack_navigation", valueKey: "about.stack_navigation_value" },
  { labelKey: "about.stack_persistence", valueKey: "about.stack_persistence_value" },
  { labelKey: "about.stack_export_security", valueKey: "about.stack_export_security_value" },
  { labelKey: "about.stack_key_deriv", valueKey: "about.stack_key_deriv_value" },
  { labelKey: "about.stack_charts", valueKey: "about.stack_charts_value" },
];

const CHANGELOGS = [
  {
    version: "3.0.0",
    date: "2026-04-23",
    labelKey: "about.current",
    entries: [
      "about.changelog_300_1",
      "about.changelog_300_2",
      "about.changelog_300_3",
      "about.changelog_300_4",
      "about.changelog_300_5",
      "about.changelog_300_6",
      "about.changelog_300_7",
      "about.changelog_300_8",
      "about.changelog_300_9",
      "about.changelog_300_10",
    ],
  },
  {
    version: "2.0.0",
    date: "2026-04-21",
    labelKey: "about.stable",
    entries: [
      "about.changelog_200_1",
      "about.changelog_200_2",
      "about.changelog_200_3",
      "about.changelog_200_4",
      "about.changelog_200_5",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-04-20",
    labelKey: "about.launch",
    entries: [
      "about.changelog_100_1",
      "about.changelog_100_2",
      "about.changelog_100_3",
    ],
  },
];

function SectionHeader({
  title,
  C,
}: {
  title: string;
  C: ReturnType<typeof getThemeColors>;
}) {
  const s = getStyles(C);
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionLine} />
    </View>
  );
}

function DataRow({
  label,
  value,
  mono,
  C,
}: {
  label: string;
  value: string;
  mono?: boolean;
  C: ReturnType<typeof getThemeColors>;
}) {
  const s = getStyles(C);
  return (
    <View style={s.dataRow}>
      <Text style={s.dataLabel}>{label}</Text>
      <Text style={[s.dataValue, mono && s.dataValueMono]}>{value}</Text>
    </View>
  );
}

function LinkRow({
  icon,
  label,
  value,
  url,
  C,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  url?: string;
  C: ReturnType<typeof getThemeColors>;
}) {
  const s = getStyles(C);
  const handlePress = () => {
    if (url) Linking.openURL(url);
  };
  return (
    <TouchableOpacity
      style={s.linkRow}
      onPress={url ? handlePress : undefined}
      activeOpacity={url ? 0.7 : 1}
    >
      <View style={s.linkIcon}>
        <Feather name={icon} size={13} color={C.amberSignal} />
      </View>
      <View style={s.linkContent}>
        <Text style={s.linkLabel}>{label}</Text>
        <Text style={[s.linkValue, url && s.linkValueClickable]}>{value}</Text>
      </View>
      {url && <Feather name="external-link" size={12} color={C.ghostText} />}
    </TouchableOpacity>
  );
}

export default function AboutScreen() {
  const { appSettings } = useLedger();
  const { t } = useI18n();
  const C = getThemeColors(appSettings.theme);
  const s = getStyles(C);
  const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>({
    [APP_INFO.version]: true,
  });

  const toggleVersion = (version: string) => {
    if (version === APP_INFO.version) return;
    setExpandedVersions((prev) => ({
      ...prev,
      [version]: !prev[version],
    }));
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={14} color={C.slateText} />
          <Text style={s.backText}>{t("screen.settings").toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      <View style={s.hero}>
        <View style={s.heroIcon}>
          <Feather name="shield" size={28} color={C.amberSignal} />
        </View>
        <Text style={s.heroTitle}>{APP_INFO.name}</Text>
        <Text style={s.heroTagline}>{t("about.tagline").toUpperCase()}</Text>
        <View style={s.versionBadge}>
          <Text style={s.versionText}>v{APP_INFO.version}</Text>
        </View>
      </View>

      <SectionHeader title={t("about.app_details")} C={C} />
      <View style={s.section}>
        <DataRow label={t("about.version")} value={`v${APP_INFO.version}`} mono C={C} />
        <View style={s.divider} />
        <DataRow label={t("about.last_update")} value={APP_INFO.lastUpdate} mono C={C} />
        <View style={s.divider} />
        <DataRow label={t("about.license")} value={APP_INFO.license} C={C} />
      </View>

      <SectionHeader title={t("about.source_code")} C={C} />
      <View style={s.section}>
        <LinkRow
          icon="github"
          label={t("about.github_repo")}
          value="MdSagorMunshi/Ledger"
          url={APP_INFO.sourceUrl}
          C={C}
        />
      </View>

      <SectionHeader title={t("about.developer")} C={C} />
      <View style={s.section}>
        <DataRow label={t("about.name")} value={DEVELOPER.name} C={C} />
        <View style={s.divider} />
        <LinkRow
          icon="mail"
          label={t("about.email")}
          value={DEVELOPER.email}
          url={`mailto:${DEVELOPER.email}`}
          C={C}
        />
        <View style={s.divider} />
        <LinkRow
          icon="github"
          label={t("about.github")}
          value={`@${DEVELOPER.github}`}
          url={`https://github.com/${DEVELOPER.github}`}
          C={C}
        />
        <View style={s.divider} />
        <LinkRow
          icon="send"
          label={t("about.telegram")}
          value={`@${DEVELOPER.telegram}`}
          url={`https://t.me/${DEVELOPER.telegram}`}
          C={C}
        />
        <View style={s.divider} />
        <LinkRow
          icon="message-square"
          label={t("about.reddit")}
          value={`u/${DEVELOPER.reddit}`}
          url={`https://reddit.com/u/${DEVELOPER.reddit}`}
          C={C}
        />
      </View>

      <SectionHeader title={t("about.tech_stack")} C={C} />
      <View style={s.section}>
        {TECH_STACK.map((item, idx) => (
          <React.Fragment key={item.labelKey}>
            <DataRow label={t(item.labelKey)} value={t(item.valueKey)} C={C} />
            {idx < TECH_STACK.length - 1 && <View style={s.divider} />}
          </React.Fragment>
        ))}
      </View>

      <SectionHeader title={t("about.changelog")} C={C} />
      <View style={s.changelogList}>
        {CHANGELOGS.map((release) => (
          <View key={release.version} style={s.changelogCard}>
            <TouchableOpacity
              style={s.changelogHeader}
              activeOpacity={release.version === APP_INFO.version ? 1 : 0.75}
              onPress={
                release.version === APP_INFO.version
                  ? undefined
                  : () => toggleVersion(release.version)
              }
            >
              <View>
                <Text style={s.changelogVersion}>v{release.version}</Text>
                <Text style={s.changelogDate}>{release.date}</Text>
              </View>
              <View style={s.changelogHeaderRight}>
                <View style={s.changelogBadge}>
                  <Text style={s.changelogBadgeText}>{t(release.labelKey)}</Text>
                </View>
                {release.version !== APP_INFO.version && (
                  <Feather
                    name={expandedVersions[release.version] ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={C.ghostText}
                  />
                )}
              </View>
            </TouchableOpacity>

            {(release.version === APP_INFO.version || expandedVersions[release.version]) && (
              <View style={s.changelogEntries}>
                {release.entries.map((entryKey) => (
                  <View key={entryKey} style={s.changelogEntryRow}>
                    <View style={s.changelogDot} />
                    <Text style={s.changelogEntryText}>{t(entryKey)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </View>

      <SectionHeader title={t("about.privacy")} C={C} />
      <View style={s.section}>
        <View style={s.privacyBlock}>
          <Text style={s.privacyLine}>{t("about.privacy_line_1")}</Text>
          <Text style={s.privacyLine}>{t("about.privacy_line_2")}</Text>
          <Text style={s.privacyLine}>{t("about.privacy_line_3")}</Text>
          <Text style={s.privacyLine}>{t("about.privacy_line_4")}</Text>
          <Text style={s.privacyLine}>{t("about.privacy_line_5")}</Text>
          <Text style={s.privacyLine}>{t("about.privacy_line_6")}</Text>
        </View>
      </View>

      <View style={s.footer}>
        <Text style={s.footerText}>
          {t("about.built_with")}
        </Text>
        <Text style={s.footerText}>
          {`© ${new Date().getFullYear()} ${DEVELOPER.name}`}
        </Text>
      </View>
    </ScrollView>
  );
}

const getStyles = (C: ReturnType<typeof getThemeColors>) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.forgeBlack,
  },
  content: {
    paddingBottom: 48,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.wireGray,
  },
  backText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 9,
    color: C.slateText,
    letterSpacing: 1.5,
  },
  hero: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 8,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: C.inkSurface,
    borderWidth: 1,
    borderColor: C.wireGray,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  heroTitle: {
    fontFamily: "Syne_700Bold",
    fontSize: 28,
    color: C.amberSignal,
    letterSpacing: 6,
  },
  heroTagline: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 10,
    color: C.slateText,
    letterSpacing: 2,
  },
  versionBadge: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.wireGray,
    backgroundColor: C.wireDim,
  },
  versionText: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 11,
    color: C.slateText,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    gap: 10,
  },
  sectionTitle: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 9,
    color: C.amberSignal,
    letterSpacing: 2,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.wireGray,
  },
  section: {
    marginHorizontal: 16,
    backgroundColor: C.inkSurface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.wireGray,
    overflow: "hidden",
  },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  dataLabel: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 9,
    color: C.slateText,
    letterSpacing: 1.5,
  },
  dataValue: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 11,
    color: C.cipherWhite,
    textAlign: "right",
    flex: 1,
  },
  dataValueMono: {
    color: C.amberSignal,
  },
  divider: {
    height: 1,
    backgroundColor: C.wireGray,
    marginLeft: 16,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  linkIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: C.wireDim,
    alignItems: "center",
    justifyContent: "center",
  },
  linkContent: {
    flex: 1,
    gap: 2,
  },
  linkLabel: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 9,
    color: C.slateText,
    letterSpacing: 1.5,
  },
  linkValue: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 12,
    color: C.cipherWhite,
  },
  linkValueClickable: {
    color: C.amberSignal,
  },
  changelogList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  changelogCard: {
    backgroundColor: C.inkSurface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.wireGray,
    padding: 16,
    gap: 14,
  },
  changelogHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  changelogHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  changelogVersion: {
    fontFamily: "Syne_700Bold",
    fontSize: 18,
    color: C.amberSignal,
    letterSpacing: 1.5,
  },
  changelogDate: {
    marginTop: 4,
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 10,
    color: C.ghostText,
  },
  changelogBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.wireGray,
    backgroundColor: C.wireDim,
  },
  changelogBadgeText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 8,
    color: C.cipherWhite,
    letterSpacing: 1.4,
  },
  changelogEntries: {
    gap: 10,
  },
  changelogEntryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  changelogDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: C.amberSignal,
    marginTop: 6,
  },
  changelogEntryText: {
    flex: 1,
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 11,
    lineHeight: 18,
    color: C.cipherWhite,
  },
  privacyBlock: {
    padding: 16,
    gap: 6,
  },
  privacyLine: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 11,
    color: C.creditGreen,
    letterSpacing: 0.5,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 32,
    alignItems: "center",
    gap: 4,
  },
  footerText: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 10,
    color: C.ghostText,
    textAlign: "center",
  },
});
