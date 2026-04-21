import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLedger, TransactionType } from "@/context/LedgerContext";
import { TransactionRow } from "@/components/TransactionRow";
import { getThemeColors } from "@/constants/colors";
import { useI18n } from "@/utils/i18n";

type FilterType = "all" | TransactionType;
type DateRange = "all" | "today" | "week" | "month" | "year" | "custom";
type SortOrder = "newest" | "oldest";

function startOf(unit: "today" | "week" | "month" | "year"): Date {
  const d = new Date();
  if (unit === "today") {
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (unit === "week") {
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (unit === "month") {
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  d.setMonth(0, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function History() {
  const { transactions, removeTransaction, formatAmount, appSettings } = useLedger();
  const { t } = useI18n();
  const C = getThemeColors(appSettings.theme);
  const styles = getStyles(C);
  const TYPE_FILTERS: { label: string; value: FilterType }[] = [
    { label: t("history.all"), value: "all" },
    { label: t("history.in"), value: "income" },
    { label: t("history.exp"), value: "expense" },
  ];
  const DATE_RANGES: { label: string; value: DateRange }[] = [
    { label: t("history.all"), value: "all" },
    { label: t("history.today"), value: "today" },
    { label: t("history.week"), value: "week" },
    { label: t("history.month"), value: "month" },
    { label: t("history.year"), value: "year" },
    { label: t("history.custom"), value: "custom" },
  ];
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [customFrom, setCustomFrom] = useState(todayStr());
  const [customTo, setCustomTo] = useState(todayStr());
  const [showDatePanel, setShowDatePanel] = useState(false);

  const filtered = useMemo(() => {
    let result = transactions.filter((tx) => {
      const matchType = typeFilter === "all" || tx.type === typeFilter;
      const searchLower = search.toLowerCase();
      const matchSearch =
        !search ||
        tx.category.toLowerCase().includes(searchLower) ||
        tx.note.toLowerCase().includes(searchLower) ||
        tx.date.includes(searchLower);
      return matchType && matchSearch;
    });

    if (dateRange !== "all") {
      if (dateRange === "custom") {
        result = result.filter((tx) => tx.date >= customFrom && tx.date <= customTo);
      } else {
        const start = startOf(dateRange);
        const startStr = start.toISOString().slice(0, 10);
        result = result.filter((tx) => tx.date >= startStr);
      }
    }

    if (sortOrder === "oldest") {
      result = [...result].reverse();
    }

    return result;
  }, [transactions, search, typeFilter, dateRange, customFrom, customTo, sortOrder]);

  const handleDelete = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    removeTransaction(id);
  };

  const activeFilters =
    (typeFilter !== "all" ? 1 : 0) +
    (dateRange !== "all" ? 1 : 0) +
    (sortOrder !== "newest" ? 1 : 0);

  return (
    <View style={styles.root}>
      <View style={styles.filterBar}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={t("history.search_entries")}
            placeholderTextColor={C.ghostText}
          />
          <TouchableOpacity
            style={[styles.filterToggleBtn, showDatePanel && styles.filterToggleBtnActive]}
            onPress={() => setShowDatePanel((v) => !v)}
          >
            <Feather name="sliders" size={13} color={showDatePanel ? C.amberSignal : C.slateText} />
            {activeFilters > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{activeFilters}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.typeRow}>
          {TYPE_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.value}
              style={[styles.typeChip, typeFilter === f.value && styles.typeChipActive]}
              onPress={() => setTypeFilter(f.value)}
            >
              <Text style={[styles.typeChipText, typeFilter === f.value && styles.typeChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}

          <View style={styles.sortSep} />

          <TouchableOpacity
            style={styles.sortBtn}
            onPress={() => setSortOrder((s) => s === "newest" ? "oldest" : "newest")}
          >
            <Feather
              name={sortOrder === "newest" ? "arrow-down" : "arrow-up"}
              size={11}
              color={sortOrder !== "newest" ? C.amberSignal : C.slateText}
            />
            <Text style={[styles.sortBtnText, sortOrder !== "newest" && { color: C.amberSignal }]}>
              {sortOrder === "newest" ? t("history.newest") : t("history.oldest")}
            </Text>
          </TouchableOpacity>
        </View>

        {showDatePanel && (
          <View style={styles.datePanel}>
            <Text style={styles.datePanelLabel}>{t("history.date_range")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.dateChips}>
                {DATE_RANGES.map((r) => (
                  <TouchableOpacity
                    key={r.value}
                    style={[styles.dateChip, dateRange === r.value && styles.dateChipActive]}
                    onPress={() => setDateRange(r.value)}
                  >
                    <Text style={[styles.dateChipText, dateRange === r.value && styles.dateChipTextActive]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {dateRange === "custom" && (
              <View style={styles.customRange}>
                <View style={styles.customRangeField}>
                  <Text style={styles.customRangeLabel}>{t("history.from")}</Text>
                  <TextInput
                    style={styles.customRangeInput}
                    value={customFrom}
                    onChangeText={setCustomFrom}
                    placeholder={t("history.date_placeholder")}
                    placeholderTextColor={C.ghostText}
                  />
                </View>
                <View style={styles.customRangeSep}>
                  <Text style={styles.customRangeDash}>–</Text>
                </View>
                <View style={styles.customRangeField}>
                  <Text style={styles.customRangeLabel}>{t("history.to")}</Text>
                  <TextInput
                    style={styles.customRangeInput}
                    value={customTo}
                    onChangeText={setCustomTo}
                    placeholder={t("history.date_placeholder")}
                    placeholderTextColor={C.ghostText}
                  />
                </View>
              </View>
            )}
          </View>
        )}
      </View>

      <View style={styles.resultBar}>
        <Text style={styles.resultCount}>
          {filtered.length} {filtered.length === 1 ? t("history.entry") : t("history.entries")}
        </Text>
        {activeFilters > 0 && (
          <TouchableOpacity onPress={() => {
            setTypeFilter("all");
            setDateRange("all");
            setSortOrder("newest");
          }}>
            <Text style={styles.clearFilters}>{t("history.clear_filters")}</Text>
          </TouchableOpacity>
        )}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptySymbol}>◈</Text>
          <Text style={styles.emptyText}>{t("history.no_entries_match")}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.rowCard}>
              <TransactionRow
                transaction={item}
                formatAmount={formatAmount}
                onDelete={() => handleDelete(item.id)}
                showDelete
              />
            </View>
          )}
        />
      )}
    </View>
  );
}

const getStyles = (C: ReturnType<typeof getThemeColors>) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.forgeBlack },
  filterBar: {
    backgroundColor: C.vaultDark,
    borderBottomWidth: 1,
    borderBottomColor: C.wireGray,
    padding: 10,
    gap: 8,
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    backgroundColor: C.forgeBlack,
    borderWidth: 1,
    borderColor: C.wireGray,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 12,
    color: C.cipherWhite,
    outlineStyle: "none" as any,
  },
  filterToggleBtn: {
    width: 38,
    height: 38,
    backgroundColor: C.forgeBlack,
    borderWidth: 1,
    borderColor: C.wireGray,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  filterToggleBtnActive: {
    borderColor: C.amberSignal,
    backgroundColor: "rgba(245,158,11,0.10)",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: C.amberSignal,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontFamily: "JetBrainsMono_600SemiBold",
    fontSize: 8,
    color: C.forgeBlack,
  },
  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.wireGray,
  },
  typeChipActive: {
    borderColor: C.amberSignal,
    backgroundColor: "rgba(245,158,11,0.12)",
  },
  typeChipText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 9,
    color: C.slateText,
    letterSpacing: 1,
  },
  typeChipTextActive: { color: C.amberSignal },
  sortSep: {
    flex: 1,
  },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.wireGray,
  },
  sortBtnText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 8,
    color: C.slateText,
    letterSpacing: 1,
  },
  datePanel: {
    gap: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: C.wireGray,
  },
  datePanelLabel: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 9,
    color: C.amberSignal,
    letterSpacing: 2,
  },
  dateChips: {
    flexDirection: "row",
    gap: 6,
  },
  dateChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.wireGray,
  },
  dateChipActive: {
    borderColor: C.amberSignal,
    backgroundColor: "rgba(245,158,11,0.12)",
  },
  dateChipText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 8,
    color: C.slateText,
    letterSpacing: 1,
  },
  dateChipTextActive: { color: C.amberSignal },
  customRange: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  customRangeField: { flex: 1, gap: 4 },
  customRangeLabel: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 8,
    color: C.slateText,
    letterSpacing: 1.5,
  },
  customRangeInput: {
    backgroundColor: C.forgeBlack,
    borderWidth: 1,
    borderColor: C.wireGray,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 12,
    color: C.cipherWhite,
    outlineStyle: "none" as any,
  },
  customRangeSep: { paddingTop: 16 },
  customRangeDash: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 16,
    color: C.slateText,
  },
  resultBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: C.wireGray,
  },
  resultCount: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 9,
    color: C.ghostText,
    letterSpacing: 1.5,
  },
  clearFilters: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 9,
    color: C.amberSignal,
    letterSpacing: 1,
  },
  list: { padding: 12, gap: 8, paddingBottom: 32 },
  rowCard: {
    backgroundColor: C.vaultDark,
    borderWidth: 1,
    borderColor: C.wireGray,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptySymbol: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 36,
    color: C.ghostText,
  },
  emptyText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 11,
    color: C.ghostText,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
});
