import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLedger } from "@/context/LedgerContext";
import { getAvailableMonths, getMonthTransactions, computeBudgetProgress } from "@/utils/analytics";
import { getThemeColors } from "@/constants/colors";
import { LANGUAGE_TO_LOCALE, useI18n } from "@/utils/i18n";

function getWeekOfMonth(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDate();
  return Math.ceil(day / 7);
}

export function ReportCard({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const {
    transactions,
    budgetEnvelopes,
    formatAmount,
    appSettings,
    currency,
  } = useLedger();
  const { t, tc, language } = useI18n();

  const C = getThemeColors(appSettings.theme);

  const availableMonths = useMemo(() => getAvailableMonths(transactions), [transactions]);
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const defaultMonth = availableMonths.includes(currentMonthKey)
    ? currentMonthKey
    : availableMonths[0] ?? currentMonthKey;

  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);

  const navigateMonth = (dir: -1 | 1) => {
    const idx = availableMonths.indexOf(selectedMonth);
    const next = idx + dir;
    if (next >= 0 && next < availableMonths.length) {
      setSelectedMonth(availableMonths[next]);
    }
  };

  const [year, month] = selectedMonth.split("-").map(Number);
  const locale = LANGUAGE_TO_LOCALE[language];
  const monthName = new Intl.DateTimeFormat(locale, { month: "long" }).format(
    new Date(year, month - 1, 1)
  );
  const generatedDate = new Intl.DateTimeFormat(locale).format(new Date());

  const monthTxs = useMemo(
    () => getMonthTransactions(transactions, year, month - 1),
    [transactions, year, month]
  );

  const regularExpenses = monthTxs.filter(
    (t) => t.type === "expense" && t.subtype !== "savings_transfer" && t.subtype !== "savings_withdrawal"
  );
  const regularIncome = monthTxs.filter(
    (t) => t.type === "income" && t.subtype !== "savings_transfer" && t.subtype !== "savings_withdrawal"
  );

  const totalIncome = regularIncome.reduce((s, t) => s + t.amount, 0);
  const totalExpenses = regularExpenses.reduce((s, t) => s + t.amount, 0);
  const net = totalIncome - totalExpenses;

  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {};
    regularExpenses.forEach((t) => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [regularExpenses]);

  const top3 = categoryTotals.slice(0, 3);

  const weeklyData = useMemo(() => {
    const weeks: { income: number; expense: number }[] = [
      { income: 0, expense: 0 },
      { income: 0, expense: 0 },
      { income: 0, expense: 0 },
      { income: 0, expense: 0 },
    ];
    monthTxs.forEach((t) => {
      const w = Math.min(getWeekOfMonth(t.date) - 1, 3);
      if (t.type === "income" && t.subtype !== "savings_withdrawal") weeks[w].income += t.amount;
      if (t.type === "expense" && t.subtype !== "savings_transfer") weeks[w].expense += t.amount;
    });
    return weeks;
  }, [monthTxs]);

  const maxWeek = Math.max(...weeklyData.flatMap((w) => [w.income, w.expense]), 1);

  const buildReportHtml = () => {
    const rows = monthTxs
      .map(
        (tx) =>
          `<tr><td>${tx.date}</td><td>${tc(tx.category)}</td><td>${tx.note || "—"}</td><td style="color:${tx.type === "income" ? "#166534" : "#991b1b"};text-align:right">${tx.type === "income" ? "+" : "-"}${formatAmount(tx.amount)}</td></tr>`
      )
      .join("");

    const catRows = categoryTotals
      .slice(0, 5)
      .map(
        ([cat, amt]) =>
          `<tr><td>${tc(cat)}</td><td style="text-align:right">${formatAmount(amt)}</td><td style="text-align:right">${totalExpenses > 0 ? Math.round((amt / totalExpenses) * 100) : 0}%</td></tr>`
      )
      .join("");

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body{font-family:monospace;padding:24px;font-size:12px;color:#1f2937}
      h1{font-size:20px;letter-spacing:4px;margin:0}
      h2{font-size:14px;margin:18px 0 8px;color:#6b7280;letter-spacing:2px;border-bottom:1px solid #e5e7eb;padding-bottom:4px}
      table{width:100%;border-collapse:collapse;margin-bottom:16px}
      th{text-align:left;font-size:9px;color:#6b7280;letter-spacing:1px;padding:6px 8px;border-bottom:2px solid #e5e7eb}
      td{padding:5px 8px;border-bottom:1px solid #f3f4f6;font-size:11px}
      .summary{display:flex;gap:12px;margin-bottom:16px}
      .metric{flex:1;border:1px solid #e5e7eb;border-radius:6px;padding:12px;text-align:center}
      .metric-label{font-size:8px;color:#6b7280;letter-spacing:1px}
      .metric-value{font-size:14px;font-weight:bold;margin-top:4px}
      .footer{text-align:center;color:#9ca3af;font-size:10px;margin-top:24px}
    </style></head><body>
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div><h1>LEDGER</h1><div style="font-size:10px;color:#6b7280">${t("report.generated", { date: generatedDate })}</div></div>
        <div style="text-align:right"><div style="font-size:12px;color:#374151;letter-spacing:2px">${t("report.monthly_report")}</div><div style="font-size:13px">${monthName} ${year}</div></div>
      </div>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0">
      <div class="summary">
        <div class="metric"><div class="metric-label">${t("report.net_income")}</div><div class="metric-value" style="color:#166534">${formatAmount(totalIncome)}</div></div>
        <div class="metric"><div class="metric-label">${t("report.total_expenses")}</div><div class="metric-value" style="color:#991b1b">${formatAmount(totalExpenses)}</div></div>
        <div class="metric"><div class="metric-label">${t("report.net")}</div><div class="metric-value" style="color:${net >= 0 ? "#166534" : "#991b1b"}">${formatAmount(net)}</div></div>
      </div>
      ${catRows ? `<h2>${t("report.top_expense_categories")}</h2><table><thead><tr><th>${t("report.category")}</th><th style="text-align:right">${t("report.spent")}</th><th style="text-align:right">${t("report.percent_total")}</th></tr></thead><tbody>${catRows}</tbody></table>` : ""}
      <h2>${t("report.transaction_log")}</h2>
      <table><thead><tr><th>DATE</th><th>${t("report.category")}</th><th>${t("report.note")}</th><th style="text-align:right">${t("report.amount")}</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="footer">${t("report.generated_by")}</div>
    </body></html>`;
  };

  const handlePrint = async () => {
    if (Platform.OS === "web") {
      window.print();
      return;
    }

    try {
      const Print = await import("expo-print");
      const html = buildReportHtml();
      await Print.printAsync({ html });
    } catch (e: any) {
      console.warn("[Report] Print error:", e);
      try {
        const Print = await import("expo-print");
        const Sharing = await import("expo-sharing");
        const { uri } = await Print.printToFileAsync({
          html: buildReportHtml(),
          base64: false,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: "application/pdf",
            dialogTitle: `Ledger Report - ${monthName} ${year}`,
            UTI: "com.adobe.pdf",
          });
          return;
        }
      } catch (fallbackError: any) {
        console.warn("[Report] Share fallback error:", fallbackError);
      }

          Alert.alert(t("report.error"), t("report.failed"));
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.reportContainer}>
          {/* Month navigator */}
          <View style={styles.monthNav}>
            <TouchableOpacity
              onPress={() => navigateMonth(1)}
              disabled={availableMonths.indexOf(selectedMonth) >= availableMonths.length - 1}
            >
              <Feather name="chevron-left" size={18} color="#1a1a2e" />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{monthName} {year}</Text>
            <TouchableOpacity
              onPress={() => navigateMonth(-1)}
              disabled={availableMonths.indexOf(selectedMonth) <= 0}
            >
              <Feather name="chevron-right" size={18} color="#1a1a2e" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.doc}
            showsVerticalScrollIndicator={false}
          >
            {/* HEADER */}
            <View style={styles.docHeader}>
              <View>
                <Text style={styles.wordmark}>LEDGER</Text>
                <Text style={styles.exportDate}>{t("report.generated", { date: generatedDate })}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.reportTitle}>{t("report.monthly_report")}</Text>
                <Text style={styles.reportPeriod}>{monthName} {year}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* SUMMARY ROW */}
            <View style={styles.summaryRow}>
              <MetricBox label={t("report.net_income")} value={formatAmount(totalIncome)} color="#166534" />
              <MetricBox label={t("report.total_expenses")} value={formatAmount(totalExpenses)} color="#991b1b" />
              <MetricBox label={t("report.net")} value={formatAmount(net)} color={net >= 0 ? "#166534" : "#991b1b"} />
            </View>

            {/* TOP 3 EXPENSE CATEGORIES */}
            {top3.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t("report.top_expense_categories")}</Text>
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHead, { flex: 2 }]}>{t("report.category")}</Text>
                    <Text style={[styles.tableHead, { flex: 1, textAlign: "right" }]}>{t("report.spent")}</Text>
                    <Text style={[styles.tableHead, { flex: 1, textAlign: "right" }]}>{t("report.percent_total")}</Text>
                  </View>
                  {top3.map(([cat, amt]) => (
                    <View key={cat} style={styles.tableRow}>
                      <Text style={[styles.tableCell, { flex: 2 }]}>{tc(cat)}</Text>
                      <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>{formatAmount(amt)}</Text>
                      <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>
                        {totalExpenses > 0 ? Math.round((amt / totalExpenses) * 100) : 0}%
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* BUDGET PERFORMANCE */}
            {budgetEnvelopes.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t("report.budget_performance")}</Text>
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHead, { flex: 2 }]}>{t("report.category")}</Text>
                    <Text style={[styles.tableHead, { flex: 1, textAlign: "right" }]}>{t("report.limit")}</Text>
                    <Text style={[styles.tableHead, { flex: 1, textAlign: "right" }]}>{t("report.spent")}</Text>
                    <Text style={[styles.tableHead, { flex: 1, textAlign: "right" }]}>{t("report.remaining_short")}</Text>
                  </View>
                  {budgetEnvelopes.map((env) => {
                    const spent = computeBudgetProgress(transactions, env.category);
                    const remaining = env.monthlyLimit - spent;
                    const pct = Math.min(1, spent / env.monthlyLimit);
                    const barColor = pct >= 1 ? "#991b1b" : pct >= 0.8 ? "#92400e" : "#166534";
                    return (
                      <View key={env.id}>
                        <View style={styles.tableRow}>
                          <Text style={[styles.tableCell, { flex: 2 }]}>{tc(env.category)}</Text>
                          <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>{formatAmount(env.monthlyLimit)}</Text>
                          <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>{formatAmount(spent)}</Text>
                          <Text style={[styles.tableCell, { flex: 1, textAlign: "right", color: remaining < 0 ? "#991b1b" : "#166534" }]}>
                            {formatAmount(Math.abs(remaining))}{remaining < 0 ? ` ${t("report.over")}` : ""}
                          </Text>
                        </View>
                        <View style={[styles.budgetBarTrack]}>
                          <View style={[styles.budgetBarFill, { width: `${Math.min(pct * 100, 100)}%` as any, backgroundColor: barColor }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* WEEKLY BAR CHART */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t("report.weekly_breakdown")}</Text>
              <View style={styles.weekChart}>
                {weeklyData.map((w, i) => (
                  <View key={i} style={styles.weekCol}>
                    <View style={styles.weekBars}>
                      <View style={[styles.weekBar, styles.weekBarIncome, { height: Math.max(2, (w.income / maxWeek) * 80) }]} />
                      <View style={[styles.weekBar, styles.weekBarExpense, { height: Math.max(2, (w.expense / maxWeek) * 80) }]} />
                    </View>
                    <Text style={styles.weekLabel}>W{i + 1}</Text>
                  </View>
                ))}
                <View style={styles.weekLegend}>
                  <View style={styles.weekLegendItem}>
                    <View style={[styles.weekLegendDot, { backgroundColor: "#166534" }]} />
                    <Text style={styles.weekLegendText}>{t("report.income")}</Text>
                  </View>
                  <View style={styles.weekLegendItem}>
                    <View style={[styles.weekLegendDot, { backgroundColor: "#991b1b" }]} />
                    <Text style={styles.weekLegendText}>{t("report.expenses")}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* TRANSACTION LOG */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t("report.transaction_log")}</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHead, { flex: 1 }]}>DATE</Text>
                  <Text style={[styles.tableHead, { flex: 1.5 }]}>{t("report.category")}</Text>
                  <Text style={[styles.tableHead, { flex: 2 }]}>{t("report.note")}</Text>
                  <Text style={[styles.tableHead, { flex: 1, textAlign: "right" }]}>{t("report.amount")}</Text>
                </View>
                {monthTxs.map((tx) => {
                  const isIncome = tx.type === "income";
                  return (
                    <View key={tx.id} style={styles.tableRow}>
                      <Text style={[styles.tableCell, { flex: 1, fontSize: 10 }]}>{tx.date}</Text>
                      <Text style={[styles.tableCell, { flex: 1.5, fontSize: 10 }]}>{tc(tx.category)}</Text>
                      <Text style={[styles.tableCell, { flex: 2, fontSize: 10 }]} numberOfLines={1}>{tx.note || "—"}</Text>
                      <Text style={[styles.tableCell, { flex: 1, textAlign: "right", fontSize: 10, color: isIncome ? "#166534" : "#991b1b" }]}>
                        {isIncome ? "+" : "-"}{formatAmount(tx.amount)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* FOOTER */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {t("report.generated_by")}
              </Text>
            </View>
          </ScrollView>

          {/* ACTIONS */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Feather name="x" size={14} color="#374151" />
              <Text style={styles.closeBtnText}>{t("analytics.close")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.printBtn} onPress={handlePrint}>
              <Feather name="printer" size={14} color="#1a1a2e" />
              <Text style={styles.printBtnText}>{t("report.print_save_pdf")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function MetricBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  reportContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    width: "100%",
    maxWidth: 700,
    maxHeight: "95%",
    overflow: "hidden",
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  monthLabel: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 14,
    color: "#111827",
    letterSpacing: 1,
  },
  scroll: { flex: 1 },
  doc: {
    padding: 24,
    gap: 20,
  },
  docHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  wordmark: {
    fontFamily: "Syne_700Bold",
    fontSize: 20,
    color: "#111827",
    letterSpacing: 4,
  },
  exportDate: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 10,
    color: "#6b7280",
    marginTop: 2,
  },
  reportTitle: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 12,
    color: "#374151",
    letterSpacing: 2,
  },
  reportPeriod: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 13,
    color: "#111827",
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
  },
  metricBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  metricLabel: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 8,
    color: "#6b7280",
    letterSpacing: 1,
    textAlign: "center",
  },
  metricValue: {
    fontFamily: "JetBrainsMono_600SemiBold",
    fontSize: 14,
  },
  section: { gap: 10 },
  sectionTitle: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 9,
    color: "#6b7280",
    letterSpacing: 2,
  },
  table: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tableHead: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 8,
    color: "#6b7280",
    letterSpacing: 1,
  },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  tableCell: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 11,
    color: "#1f2937",
  },
  budgetBarTrack: {
    marginHorizontal: 10,
    marginBottom: 6,
    height: 3,
    backgroundColor: "#e5e7eb",
    borderRadius: 2,
    overflow: "hidden",
  },
  budgetBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  weekChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
  },
  weekCol: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  weekBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    height: 80,
  },
  weekBar: {
    width: 12,
    borderRadius: 2,
    minHeight: 2,
  },
  weekBarIncome: { backgroundColor: "#166534" },
  weekBarExpense: { backgroundColor: "#991b1b" },
  weekLabel: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 9,
    color: "#6b7280",
  },
  weekLegend: {
    flexDirection: "column",
    gap: 4,
    marginLeft: 8,
    justifyContent: "center",
  },
  weekLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  weekLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  weekLegendText: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 9,
    color: "#6b7280",
  },
  footer: {
    alignItems: "center",
    paddingTop: 8,
  },
  footerText: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 10,
    color: "#9ca3af",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  closeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  closeBtnText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 10,
    color: "#374151",
    letterSpacing: 1,
  },
  printBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#111827",
    borderRadius: 6,
    paddingVertical: 10,
  },
  printBtnText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 10,
    color: "#ffffff",
    letterSpacing: 1,
  },
});
