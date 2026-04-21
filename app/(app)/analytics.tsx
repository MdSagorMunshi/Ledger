import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import { useLedger } from "@/context/LedgerContext";
import {
  computeSpendingVelocity,
  computeDayOfWeekHeatmap,
  computeCategoryTrends,
  computeIncomeStability,
} from "@/utils/analytics";
import { getThemeColors } from "@/constants/colors";
import { useI18n } from "@/utils/i18n";

function SLabel({ label }: { label: string }) {
  return <Text style={styles.sLabel}>{label}</Text>;
}

function Sparkline({
  data,
  color,
  width = 80,
  height = 28,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 0.001);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);

  const points = data.map((v, i) => ({
    x: i * stepX,
    y: height - ((v - min) / range) * height * 0.85 - 2,
  }));

  const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <View style={{ width, height }}>
      <Svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
      >
        <Path
          d={d}
          stroke={color}
          strokeWidth={1.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

export default function AnalyticsScreen() {
  const { transactions, appSettings, formatAmount } = useLedger();
  const { t, tc } = useI18n();
  const C = getThemeColors(appSettings.theme);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const velocity = useMemo(() => computeSpendingVelocity(transactions), [transactions]);
  const heatmap = useMemo(() => computeDayOfWeekHeatmap(transactions), [transactions]);
  const trends = useMemo(() => computeCategoryTrends(transactions), [transactions]);
  const stability = useMemo(() => computeIncomeStability(transactions), [transactions]);

  const heatmapMax = Math.max(...heatmap.map((d) => d.average), 0.001);

  const stabilityColor =
    stability.score >= 75 ? C.creditGreen : stability.score >= 40 ? C.amberSignal : C.debitRed;

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: C.forgeBlack }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* SPENDING VELOCITY */}
      <View style={[styles.card, { backgroundColor: C.vaultDark, borderColor: C.wireGray }]}>
        <SLabel label={t("analytics.spending_velocity")} />
        {!velocity.hasEnoughData ? (
          <View style={styles.noData}>
            <Text style={[styles.noDataText, { color: C.ghostText }]}>
              {t("analytics.not_enough_data")}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.velocityRow}>
              <View style={styles.velocityItem}>
                <Text style={[styles.velocityPeriodLabel, { color: C.slateText }]}>{t("analytics.this_month")}</Text>
                <Text style={[styles.velocityAmount, { color: C.cipherWhite }]}>
                  {formatAmount(velocity.thisMonthDaily)}/day
                </Text>
              </View>
              <View style={styles.velocityIndicator}>
                {velocity.direction === "up" && (
                  <Feather name="arrow-up" size={24} color={C.debitRed} />
                )}
                {velocity.direction === "down" && (
                  <Feather name="arrow-down" size={24} color={C.creditGreen} />
                )}
                {velocity.direction === "flat" && (
                  <Feather name="minus" size={24} color={C.ghostText} />
                )}
              </View>
              <View style={[styles.velocityItem, { alignItems: "flex-end" }]}>
                <Text style={[styles.velocityPeriodLabel, { color: C.slateText }]}>{t("analytics.last_month")}</Text>
                <Text style={[styles.velocityAmount, { color: C.cipherWhite }]}>
                  {formatAmount(velocity.lastMonthDaily)}/day
                </Text>
              </View>
            </View>
            <Text style={[styles.velocityInterpretation, { color: C.slateText }]}>
              {velocity.direction === "up"
                ? t("analytics.more_per_day", { amount: formatAmount(velocity.diffPerDay) })
                : velocity.direction === "down"
                ? t("analytics.less_per_day", { amount: formatAmount(velocity.diffPerDay) })
                : t("analytics.similar_pace")}
            </Text>
          </>
        )}
      </View>

      {/* WEEKLY PATTERN HEATMAP */}
      <View style={[styles.card, { backgroundColor: C.vaultDark, borderColor: C.wireGray }]}>
        <SLabel label={t("analytics.weekly_pattern")} />
        <View style={styles.heatmapRow}>
          {heatmap.map((day) => {
            const intensity = day.hasData ? 0.03 + (day.average / heatmapMax) * 0.27 : 0;
            return (
              <View
                key={day.day}
                style={[
                  styles.heatmapCell,
                  {
                    backgroundColor:
                      day.hasData
                        ? `rgba(245, 158, 11, ${intensity})`
                        : "transparent",
                    borderColor: C.wireGray,
                  },
                ]}
              >
                <Text style={[styles.heatmapDayLabel, { color: C.ghostText }]}>{day.label}</Text>
                <Text style={[styles.heatmapAmount, { color: C.cipherWhite }]}>
                  {day.hasData ? formatAmount(day.average).replace(/[^\d.,]/g, "") : "—"}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* CATEGORY TREND LINES */}
      <View style={[styles.card, { backgroundColor: C.vaultDark, borderColor: C.wireGray }]}>
        <SLabel label={t("analytics.category_trends")} />
        {trends.length === 0 ? (
          <Text style={[styles.noDataText, { color: C.ghostText }]}>
            {t("analytics.no_expense_data")}
          </Text>
        ) : (
          <View style={styles.trendsContainer}>
            {trends.map((trend) => {
              const isExpanded = expandedCategory === trend.category;
              const catTxs = transactions
                .filter(
                  (t) =>
                    t.category === trend.category &&
                    t.type === "expense" &&
                    t.subtype !== "savings_transfer"
                )
                .sort((a, b) => b.amount - a.amount);
              return (
                <View key={trend.category}>
                  <TouchableOpacity
                    style={styles.trendRow}
                    onPress={() =>
                      setExpandedCategory(isExpanded ? null : trend.category)
                    }
                  >
                    <Text style={[styles.trendCategory, { color: C.cipherWhite }]}>
                      {tc(trend.category)}
                    </Text>
                    <View style={styles.trendRight}>
                      <Sparkline
                        data={trend.monthlyTotals}
                        color={C.amberSignal}
                        width={72}
                        height={24}
                      />
                      {trend.trend === "up" && (
                        <Feather name="arrow-up" size={12} color={C.debitRed} />
                      )}
                      {trend.trend === "down" && (
                        <Feather name="arrow-down" size={12} color={C.creditGreen} />
                      )}
                    </View>
                  </TouchableOpacity>
                  {isExpanded && (
                    <View style={[styles.trendDetail, { backgroundColor: C.forgeBlack, borderColor: C.wireGray }]}>
                      <View style={styles.trendDetailHeader}>
                        <Text style={[styles.trendDetailTitle, { color: C.slateText }]}>
                          {t("analytics.category_transactions", { category: tc(trend.category).toUpperCase() })}
                        </Text>
                        <TouchableOpacity onPress={() => setExpandedCategory(null)}>
                          <Text style={[styles.trendClose, { color: C.amberSignal }]}>{t("analytics.close")}</Text>
                        </TouchableOpacity>
                      </View>
                      {catTxs.map((tx) => (
                        <View key={tx.id} style={styles.trendTxRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.trendTxNote, { color: C.cipherWhite }]}>
                              {tx.note || "—"}
                            </Text>
                            <Text style={[styles.trendTxDate, { color: C.ghostText }]}>
                              {tx.date}
                            </Text>
                          </View>
                          <Text style={[styles.trendTxAmount, { color: C.debitRed }]}>
                            {formatAmount(tx.amount)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <View style={[styles.trendDivider, { backgroundColor: C.wireGray }]} />
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* INCOME STABILITY */}
      <View style={[styles.card, { backgroundColor: C.vaultDark, borderColor: C.wireGray }]}>
        <SLabel label={t("analytics.income_stability")} />
        {!stability.hasEnoughData ? (
          <Text style={[styles.noDataText, { color: C.ghostText }]}>
            {t("analytics.stability_need_data")}
          </Text>
        ) : (
          <>
            <Text style={[styles.stabilityScore, { color: stabilityColor }]}>
              {stability.score}
            </Text>
            <Text style={[styles.stabilityLabel, { color: stabilityColor }]}>
              {stability.label}
            </Text>
            <View style={[styles.stabilityBar, { backgroundColor: C.wireGray }]}>
              <View
                style={[
                  styles.stabilityFill,
                  {
                    width: `${stability.score}%` as any,
                    backgroundColor: stabilityColor,
                  },
                ]}
              />
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  card: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  sLabel: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 10,
    color: "#3a4a60",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  noData: { alignItems: "center", paddingVertical: 16 },
  noDataText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 10,
    letterSpacing: 1,
    textAlign: "center",
  },
  velocityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  velocityItem: { flex: 1 },
  velocityPeriodLabel: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 9,
    letterSpacing: 1,
  },
  velocityAmount: {
    fontFamily: "JetBrainsMono_600SemiBold",
    fontSize: 18,
    marginTop: 4,
  },
  velocityIndicator: {
    alignItems: "center",
    paddingHorizontal: 16,
  },
  velocityInterpretation: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 9,
    letterSpacing: 0.8,
    textAlign: "center",
  },
  heatmapRow: {
    flexDirection: "row",
    gap: 4,
  },
  heatmapCell: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 8,
    alignItems: "center",
    gap: 4,
  },
  heatmapDayLabel: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 7,
    letterSpacing: 0.5,
  },
  heatmapAmount: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 9,
  },
  trendsContainer: { gap: 0 },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  trendCategory: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 13,
    flex: 1,
  },
  trendRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  trendDetail: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    gap: 8,
    marginBottom: 8,
  },
  trendDetailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  trendDetailTitle: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 9,
    letterSpacing: 1,
  },
  trendClose: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 9,
    letterSpacing: 1,
  },
  trendTxRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  trendTxNote: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 12,
  },
  trendTxDate: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 10,
  },
  trendTxAmount: {
    fontFamily: "JetBrainsMono_600SemiBold",
    fontSize: 13,
  },
  trendDivider: {
    height: 1,
  },
  stabilityScore: {
    fontFamily: "JetBrainsMono_600SemiBold",
    fontSize: 28,
    textAlign: "center",
  },
  stabilityLabel: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 11,
    letterSpacing: 1.5,
    textAlign: "center",
  },
  stabilityBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  stabilityFill: {
    height: "100%",
    borderRadius: 3,
  },
});
