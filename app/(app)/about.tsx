import React from "react";
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
import colors from "@/constants/colors";

const C = colors.light;

const APP_INFO = {
  name: "LEDGER",
  tagline: "Local-First Finance Tracker",
  version: "1.0.0",
  lastUpdate: "2026-04-20",
  license: "MIT",
  sourceUrl: "https://github.com/MdSagorMunshi/ledger",
};

const DEVELOPER = {
  name: "Ryan Shelby",
  email: "ryn@disr.it",
  github: "MdSagorMunshi",
  telegram: "leesiwoo_s",
  reddit: "leesiwoo_s",
};

const TECH_STACK = [
  { label: "RUNTIME", value: "Expo / React Native" },
  { label: "LANGUAGE", value: "TypeScript" },
  { label: "NAVIGATION", value: "Expo Router" },
  { label: "PERSISTENCE", value: "SQLite local database" },
  { label: "EXPORT SECURITY", value: "AES-GCM snapshots" },
  { label: "KEY DERIV.", value: "PBKDF2 SHA-256" },
  { label: "CHARTS", value: "react-native-svg" },
];

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionLine} />
    </View>
  );
}

function DataRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
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
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  url?: string;
}) {
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
  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={14} color={C.slateText} />
          <Text style={s.backText}>SETTINGS</Text>
        </TouchableOpacity>
      </View>

      <View style={s.hero}>
        <View style={s.heroIcon}>
          <Feather name="shield" size={28} color={C.amberSignal} />
        </View>
        <Text style={s.heroTitle}>{APP_INFO.name}</Text>
        <Text style={s.heroTagline}>{APP_INFO.tagline.toUpperCase()}</Text>
        <View style={s.versionBadge}>
          <Text style={s.versionText}>v{APP_INFO.version}</Text>
        </View>
      </View>

      <SectionHeader title="APP DETAILS" />
      <View style={s.section}>
        <DataRow label="VERSION" value={`v${APP_INFO.version}`} mono />
        <View style={s.divider} />
        <DataRow label="LAST UPDATE" value={APP_INFO.lastUpdate} mono />
        <View style={s.divider} />
        <DataRow label="LICENSE" value={APP_INFO.license} />
      </View>

      <SectionHeader title="SOURCE CODE" />
      <View style={s.section}>
        <LinkRow
          icon="github"
          label="GITHUB REPOSITORY"
          value="MdSagorMunshi/Ledger"
          url={APP_INFO.sourceUrl}
        />
      </View>

      <SectionHeader title="DEVELOPER" />
      <View style={s.section}>
        <DataRow label="NAME" value={DEVELOPER.name} />
        <View style={s.divider} />
        <LinkRow
          icon="mail"
          label="EMAIL"
          value={DEVELOPER.email}
          url={`mailto:${DEVELOPER.email}`}
        />
        <View style={s.divider} />
        <LinkRow
          icon="github"
          label="GITHUB"
          value={`@${DEVELOPER.github}`}
          url={`https://github.com/${DEVELOPER.github}`}
        />
        <View style={s.divider} />
        <LinkRow
          icon="send"
          label="TELEGRAM"
          value={`@${DEVELOPER.telegram}`}
          url={`https://t.me/${DEVELOPER.telegram}`}
        />
        <View style={s.divider} />
        <LinkRow
          icon="message-square"
          label="REDDIT"
          value={`u/${DEVELOPER.reddit}`}
          url={`https://reddit.com/u/${DEVELOPER.reddit}`}
        />
      </View>

      <SectionHeader title="TECH STACK" />
      <View style={s.section}>
        {TECH_STACK.map((item, idx) => (
          <React.Fragment key={item.label}>
            <DataRow label={item.label} value={item.value} />
            {idx < TECH_STACK.length - 1 && <View style={s.divider} />}
          </React.Fragment>
        ))}
      </View>

      <SectionHeader title="PRIVACY" />
      <View style={s.section}>
        <View style={s.privacyBlock}>
          <Text style={s.privacyLine}>{"// NO DATA LEAVES YOUR DEVICE"}</Text>
          <Text style={s.privacyLine}>{"// NO ANALYTICS, NO TRACKING"}</Text>
          <Text style={s.privacyLine}>{"// NO BACKEND, NO CLOUD SYNC"}</Text>
          <Text style={s.privacyLine}>{"// LOCAL SQLITE DATABASE ON DEVICE"}</Text>
          <Text style={s.privacyLine}>{"// EXPORTS AND AUTO-BACKUPS CAN BE ENCRYPTED"}</Text>
          <Text style={s.privacyLine}>{"// BACKUPS USE SCOPED STORAGE (NO BROAD PERMISSIONS)"}</Text>
        </View>
      </View>

      <View style={s.footer}>
        <Text style={s.footerText}>
          {"Built with Dead Reckoning design language."}
        </Text>
        <Text style={s.footerText}>
          {`© ${new Date().getFullYear()} ${DEVELOPER.name}`}
        </Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
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
