import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Switch,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLedger, OweEntry, LendEntry, SavingsGoal } from "@/context/LedgerContext";
import { computeNetWorth } from "@/utils/netWorth";
import { getThemeColors } from "@/constants/colors";
import { useI18n } from "@/utils/i18n";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function SLabel({ label }: { label: string }) {
  return <Text style={styles.sLabel}>{label}</Text>;
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{text}</Text>
    </View>
  );
}

function ProgressBar({
  value,
  max,
  C,
}: {
  value: number;
  max: number | null;
  C: ReturnType<typeof getThemeColors>;
}) {
  if (max === null || max === 0) return null;
  const pct = Math.min(1, value / max);
  const barColor = pct >= 1 ? C.creditGreen : pct >= 0.5 ? C.amberSignal : C.ghostText;
  return (
    <View style={[styles.progressBar, { backgroundColor: C.wireGray }]}>
      <View style={[styles.progressFill, { width: `${pct * 100}%` as any, backgroundColor: barColor }]} />
    </View>
  );
}

type FinanceActionTarget =
  | { kind: "owe"; entry: OweEntry }
  | { kind: "lend"; entry: LendEntry };

export default function FinancesScreen() {
  const {
    transactions,
    savingsTransactions,
    savingsGoals,
    assetEntries,
    oweEntries,
    lendEntries,
    appSettings,
    addAssetEntry,
    updateAssetEntry,
    deleteAssetEntry,
    addSavingsTransaction,
    addSavingsGoal,
    deleteSavingsGoal,
    addOweEntry,
    updateOweEntry,
    deleteOweEntry,
    repayOweEntry,
    addLendEntry,
    updateLendEntry,
    deleteLendEntry,
    repayLendEntry,
    toggleLendNetWorth,
    addTransaction,
    formatAmount,
  } = useLedger();
  const { t } = useI18n();

  const C = getThemeColors(appSettings.theme);

  const nw = useMemo(
    () =>
      computeNetWorth({
        transactions,
        savingsTransactions,
        assetEntries,
        oweEntries,
        lendEntries,
      }),
    [transactions, savingsTransactions, assetEntries, oweEntries, lendEntries]
  );

  const savingsPool = useMemo(
    () =>
      savingsTransactions.filter((s) => s.direction === "in").reduce((sum, s) => sum + s.amount, 0) -
      savingsTransactions.filter((s) => s.direction === "out").reduce((sum, s) => sum + s.amount, 0),
    [savingsTransactions]
  );

  const [assetsExpanded, setAssetsExpanded] = useState(true);
  const [liabsExpanded, setLiabsExpanded] = useState(true);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [editingAsset, setEditingAsset] = useState<string | null>(null);
  const [assetLabel, setAssetLabel] = useState("");
  const [assetValue, setAssetValue] = useState("");
  const [assetType, setAssetType] = useState<"asset" | "liability">("asset");

  const [showTransferIn, setShowTransferIn] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [savAmount, setSavAmount] = useState("");
  const [savGoalId, setSavGoalId] = useState<string | null>(null);
  const [savNote, setSavNote] = useState("");
  const [savDate, setSavDate] = useState(todayStr());
  const [goalLabel, setGoalLabel] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalDeadline, setGoalDeadline] = useState("");

  const [showAddOwe, setShowAddOwe] = useState(false);
  const [oweName, setOweName] = useState("");
  const [oweAmt, setOweAmt] = useState("");
  const [oweReason, setOweReason] = useState("");
  const [oweBorrowed, setOweBorrowed] = useState(todayStr());
  const [oweDue, setOweDue] = useState("");
  const [editingOweId, setEditingOweId] = useState<string | null>(null);
  const [repayingOweId, setRepayingOweId] = useState<string | null>(null);
  const [repayAmt, setRepayAmt] = useState("");
  const [repayNote, setRepayNote] = useState("");
  const [repayDate, setRepayDate] = useState(todayStr());
  const [settledExpanded, setSettledExpanded] = useState(false);
  const [actionTarget, setActionTarget] = useState<FinanceActionTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FinanceActionTarget | null>(null);

  const [showAddLend, setShowAddLend] = useState(false);
  const [lendName, setLendName] = useState("");
  const [lendAmt, setLendAmt] = useState("");
  const [lendReason, setLendReason] = useState("");
  const [lendDate, setLendDate] = useState(todayStr());
  const [lendReturn, setLendReturn] = useState("");
  const [editingLendId, setEditingLendId] = useState<string | null>(null);
  const [repayingLendId, setRepayingLendId] = useState<string | null>(null);
  const [lendRepayAmt, setLendRepayAmt] = useState("");
  const [lendRepayNote, setLendRepayNote] = useState("");
  const [lendRepayDate, setLendRepayDate] = useState(todayStr());
  const [lendSettledExpanded, setLendSettledExpanded] = useState(false);

  const today = todayStr();

  const nwColor =
    nw.total > 0 ? C.creditGreen : nw.total < 0 ? C.debitRed : C.cipherWhite;

  const handleAddAsset = () => {
    const v = parseFloat(assetValue);
    if (!assetLabel.trim() || isNaN(v) || v <= 0) return;
    if (editingAsset) {
      updateAssetEntry(editingAsset, { label: assetLabel.trim(), value: v, type: assetType });
      setEditingAsset(null);
    } else {
      addAssetEntry({ label: assetLabel.trim(), value: v, type: assetType, isManual: true });
    }
    setAssetLabel("");
    setAssetValue("");
    setAssetType("asset");
    setShowAddAsset(false);
  };

  const handleTransferIn = () => {
    const amt = parseFloat(savAmount);
    if (isNaN(amt) || amt <= 0) return;
    const ledgerId = addTransaction({
      type: "expense",
      amount: amt,
      category: "Savings",
      note: savNote || t("finances.transfer_to_savings"),
      date: savDate,
      subtype: "savings_transfer",
    });
    addSavingsTransaction({
      direction: "in",
      amount: amt,
      goalId: savGoalId,
      note: savNote,
      date: savDate,
      linkedLedgerTxId: ledgerId,
    });
    setSavAmount(""); setSavNote(""); setSavGoalId(null); setSavDate(todayStr());
    setShowTransferIn(false);
  };

  const handleWithdraw = () => {
    const amt = parseFloat(savAmount);
    if (isNaN(amt) || amt <= 0) return;
    const ledgerId = addTransaction({
      type: "income",
      amount: amt,
      category: "Savings",
      note: savNote || t("finances.withdraw_from_savings"),
      date: savDate,
      subtype: "savings_withdrawal",
    });
    addSavingsTransaction({
      direction: "out",
      amount: amt,
      goalId: savGoalId,
      note: savNote,
      date: savDate,
      linkedLedgerTxId: ledgerId,
    });
    setSavAmount(""); setSavNote(""); setSavGoalId(null); setSavDate(todayStr());
    setShowWithdraw(false);
  };

  const handleAddGoal = () => {
    if (!goalLabel.trim()) return;
    const target = goalTarget ? parseFloat(goalTarget) : null;
    addSavingsGoal({
      label: goalLabel.trim(),
      targetAmount: target && target > 0 ? target : null,
      deadline: goalDeadline || null,
      allocatedAmount: 0,
    });
    setGoalLabel(""); setGoalTarget(""); setGoalDeadline("");
    setShowAddGoal(false);
  };

  const resetOweForm = () => {
    setEditingOweId(null);
    setOweName("");
    setOweAmt("");
    setOweReason("");
    setOweBorrowed(todayStr());
    setOweDue("");
  };

  const resetLendForm = () => {
    setEditingLendId(null);
    setLendName("");
    setLendAmt("");
    setLendReason("");
    setLendDate(todayStr());
    setLendReturn("");
  };

  const openOweEditor = (owe: OweEntry) => {
    setEditingOweId(owe.id);
    setOweName(owe.personName);
    setOweAmt(String(owe.originalAmount));
    setOweReason(owe.reason);
    setOweBorrowed(owe.dateBorrowed);
    setOweDue(owe.dueDate ?? "");
    setShowAddOwe(true);
  };

  const openLendEditor = (lend: LendEntry) => {
    setEditingLendId(lend.id);
    setLendName(lend.personName);
    setLendAmt(String(lend.originalAmount));
    setLendReason(lend.reason);
    setLendDate(lend.dateLent);
    setLendReturn(lend.expectedReturnDate ?? "");
    setShowAddLend(true);
  };

  const confirmDeleteOwe = (owe: OweEntry) => {
    setActionTarget(null);
    setDeleteTarget({ kind: "owe", entry: owe });
  };

  const confirmDeleteLend = (lend: LendEntry) => {
    setActionTarget(null);
    setDeleteTarget({ kind: "lend", entry: lend });
  };

  const showOweActions = (owe: OweEntry) => {
    setActionTarget({ kind: "owe", entry: owe });
  };

  const showLendActions = (lend: LendEntry) => {
    setActionTarget({ kind: "lend", entry: lend });
  };

  const handleDeleteConfirmed = () => {
    if (!deleteTarget) return;

    if (deleteTarget.kind === "owe") {
      deleteOweEntry(deleteTarget.entry.id);
      if (repayingOweId === deleteTarget.entry.id) {
        setRepayingOweId(null);
        setRepayAmt("");
        setRepayNote("");
        setRepayDate(todayStr());
      }
    } else {
      deleteLendEntry(deleteTarget.entry.id);
      if (repayingLendId === deleteTarget.entry.id) {
        setRepayingLendId(null);
        setLendRepayAmt("");
        setLendRepayNote("");
        setLendRepayDate(todayStr());
      }
    }

    setDeleteTarget(null);
  };

  const handleEditFromMenu = () => {
    if (!actionTarget) return;
    if (actionTarget.kind === "owe") {
      openOweEditor(actionTarget.entry);
    } else {
      openLendEditor(actionTarget.entry);
    }
    setActionTarget(null);
  };

  const handleAddOwe = () => {
    const amt = parseFloat(oweAmt);
    if (!oweName.trim() || isNaN(amt) || amt <= 0) return;
    if (editingOweId) {
      const current = oweEntries.find((entry) => entry.id === editingOweId);
      if (!current) return;
      const repaidAmount = current.originalAmount - current.remainingAmount;
      updateOweEntry(editingOweId, {
        personName: oweName.trim(),
        originalAmount: amt,
        remainingAmount: Math.max(0, amt - repaidAmount),
        reason: oweReason.trim(),
        dateBorrowed: oweBorrowed,
        dueDate: oweDue || null,
      });
    } else {
      addOweEntry({
        personName: oweName.trim(),
        originalAmount: amt,
        remainingAmount: amt,
        reason: oweReason.trim(),
        dateBorrowed: oweBorrowed,
        dueDate: oweDue || null,
        status: "unpaid",
        repayments: [],
      });
    }
    resetOweForm();
    setShowAddOwe(false);
  };

  const handleRepayOwe = (owe: OweEntry) => {
    const amt = parseFloat(repayAmt);
    if (isNaN(amt) || amt <= 0) return;
    const ledgerId = addTransaction({
      type: "expense",
      amount: amt,
      category: "Debt Repayment",
      note: repayNote || `${t("finances.record_repayment")} ${owe.personName}`,
      date: repayDate,
      subtype: "debt_repayment",
    });
    repayOweEntry(owe.id, { amount: amt, date: repayDate, ledgerTxId: ledgerId });
    setRepayingOweId(null); setRepayAmt(""); setRepayNote(""); setRepayDate(todayStr());
  };

  const handleAddLend = () => {
    const amt = parseFloat(lendAmt);
    if (!lendName.trim() || isNaN(amt) || amt <= 0) return;
    if (editingLendId) {
      const current = lendEntries.find((entry) => entry.id === editingLendId);
      if (!current) return;
      const repaidAmount = current.originalAmount - current.remainingAmount;
      updateLendEntry(editingLendId, {
        personName: lendName.trim(),
        originalAmount: amt,
        remainingAmount: Math.max(0, amt - repaidAmount),
        reason: lendReason.trim(),
        dateLent: lendDate,
        expectedReturnDate: lendReturn || null,
      });
    } else {
      addLendEntry({
        personName: lendName.trim(),
        originalAmount: amt,
        remainingAmount: amt,
        reason: lendReason.trim(),
        dateLent: lendDate,
        expectedReturnDate: lendReturn || null,
        status: "outstanding",
        countInNetWorth: true,
        repayments: [],
      });
    }
    resetLendForm();
    setShowAddLend(false);
  };

  const handleRepayLend = (lend: LendEntry) => {
    const amt = parseFloat(lendRepayAmt);
    if (isNaN(amt) || amt <= 0) return;
    const ledgerId = addTransaction({
      type: "income",
      amount: amt,
      category: "Lend Returned",
      note: lendRepayNote || `${t("finances.repayment_received")} ${lend.personName}`,
      date: lendRepayDate,
      subtype: "lend_returned",
    });
    repayLendEntry(lend.id, { amount: amt, date: lendRepayDate, ledgerTxId: ledgerId });
    setRepayingLendId(null); setLendRepayAmt(""); setLendRepayNote(""); setLendRepayDate(todayStr());
  };

  const activeOwe = oweEntries.filter((o) => o.status !== "settled");
  const settledOwe = oweEntries.filter((o) => o.status === "settled");
  const activeLend = lendEntries.filter((l) => l.status !== "returned");
  const returnedLend = lendEntries.filter((l) => l.status === "returned");

  const deleteTitle = deleteTarget
    ? deleteTarget.kind === "owe"
      ? t("finances.remove_debt_title")
      : t("finances.remove_lend_title")
    : "";
  const deleteDescription = deleteTarget
    ? deleteTarget.kind === "owe"
      ? deleteTarget.entry.repayments.length > 0
        ? t("finances.delete_debt_with_records", {
            name: deleteTarget.entry.personName,
            count: deleteTarget.entry.repayments.length,
          })
        : t("finances.delete_debt_single", { name: deleteTarget.entry.personName })
      : deleteTarget.entry.repayments.length > 0
      ? t("finances.delete_lend_with_records", {
          name: deleteTarget.entry.personName,
          count: deleteTarget.entry.repayments.length,
        })
      : t("finances.delete_lend_single", { name: deleteTarget.entry.personName })
    : "";
  const actionDescription = actionTarget
    ? actionTarget.kind === "owe"
      ? t("finances.choose_debt_action")
      : t("finances.choose_lend_action")
    : "";

  const manualAssets = assetEntries.filter((a) => a.isManual && a.type === "asset");
  const manualLiabs = assetEntries.filter((a) => a.isManual && a.type === "liability");

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: C.forgeBlack }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* NET WORTH SUMMARY */}
      <View style={[styles.nwCard, { backgroundColor: C.vaultDark, borderColor: C.wireGray }]}>
        <Text style={[styles.nwHeading, { color: C.ghostText }]}>{t("finances.net_worth")}</Text>
        <Text style={[styles.nwValue, { color: nwColor }]}>{formatAmount(nw.total)}</Text>
        <View style={styles.nwSubRow}>
          <View style={styles.nwSubItem}>
            <Text style={[styles.nwSubLabel, { color: C.creditGreen }]}>{t("finances.assets")}</Text>
            <Text style={[styles.nwSubAmount, { color: C.creditGreen }]}>{formatAmount(nw.totalAssets)}</Text>
          </View>
          <View style={[styles.nwSubDivider, { backgroundColor: C.wireGray }]} />
          <View style={styles.nwSubItem}>
            <Text style={[styles.nwSubLabel, { color: C.debitRed }]}>{t("finances.liabilities")}</Text>
            <Text style={[styles.nwSubAmount, { color: C.debitRed }]}>{formatAmount(nw.totalLiabilities)}</Text>
          </View>
        </View>
      </View>

      {/* ASSETS BREAKDOWN */}
      <View style={[styles.card, { backgroundColor: C.vaultDark, borderColor: C.wireGray }]}>
        <TouchableOpacity style={styles.collapsibleHeader} onPress={() => setAssetsExpanded((v) => !v)}>
          <SLabel label={t("finances.assets")} />
          <Feather name={assetsExpanded ? "chevron-up" : "chevron-down"} size={14} color={C.ghostText} />
        </TouchableOpacity>
        {assetsExpanded && (
          <View style={styles.assetList}>
            <AssetRow label="Spendable Balance" value={nw.spendableBalance} isAuto C={C} formatAmount={formatAmount} />
            <AssetRow label="Savings Pool" value={nw.savingsPool} isAuto C={C} formatAmount={formatAmount} />
            {activeLend.filter(l => l.countInNetWorth).map((l) => (
              <AssetRow key={l.id} label={`Lend: ${l.personName}`} value={l.remainingAmount} isAuto C={C} formatAmount={formatAmount} />
            ))}
            {manualAssets.map((a) => (
              <AssetRow
                key={a.id}
                label={a.label}
                value={a.value}
                C={C}
                formatAmount={formatAmount}
                onEdit={() => {
                  setEditingAsset(a.id);
                  setAssetLabel(a.label);
                  setAssetValue(String(a.value));
                  setAssetType("asset");
                  setShowAddAsset(true);
                }}
                onDelete={() => deleteAssetEntry(a.id)}
              />
            ))}
          </View>
        )}
      </View>

      {/* LIABILITIES BREAKDOWN */}
      <View style={[styles.card, { backgroundColor: C.vaultDark, borderColor: C.wireGray }]}>
        <TouchableOpacity style={styles.collapsibleHeader} onPress={() => setLiabsExpanded((v) => !v)}>
          <SLabel label={t("finances.liabilities")} />
          <Feather name={liabsExpanded ? "chevron-up" : "chevron-down"} size={14} color={C.ghostText} />
        </TouchableOpacity>
        {liabsExpanded && (
          <View style={styles.assetList}>
            {activeOwe.map((o) => (
              <AssetRow key={o.id} label={`Owe: ${o.personName}`} value={o.remainingAmount} isAuto C={C} formatAmount={formatAmount} color={C.debitRed} />
            ))}
            {manualLiabs.map((a) => (
              <AssetRow
                key={a.id}
                label={a.label}
                value={a.value}
                C={C}
                color={C.debitRed}
                formatAmount={formatAmount}
                onEdit={() => {
                  setEditingAsset(a.id);
                  setAssetLabel(a.label);
                  setAssetValue(String(a.value));
                  setAssetType("liability");
                  setShowAddAsset(true);
                }}
                onDelete={() => deleteAssetEntry(a.id)}
              />
            ))}
            {nw.totalLiabilities === 0 && (
              <Text style={[styles.emptyText, { color: C.ghostText }]}>{t("finances.no_liabilities")}</Text>
            )}
          </View>
        )}
      </View>

      {/* ADD ASSET FAB */}
      <TouchableOpacity
        style={[styles.addAssetBtn, { borderColor: C.amberSignal, backgroundColor: `${C.amberSignal}15` }]}
        onPress={() => { setEditingAsset(null); setShowAddAsset(true); }}
      >
        <Feather name="plus" size={14} color={C.amberSignal} />
        <Text style={[styles.addAssetBtnText, { color: C.amberSignal }]}>{t("finances.add_asset_liability")}</Text>
      </TouchableOpacity>

      {/* SAVINGS SECTION */}
      <View style={[styles.card, { backgroundColor: C.vaultDark, borderColor: C.wireGray }]}>
        <SLabel label={t("finances.savings")} />
        <View style={[styles.savingsSummary, { backgroundColor: C.forgeBlack, borderColor: C.wireGray }]}>
          <Text style={[styles.savingsLabel, { color: C.ghostText }]}>{t("finances.pool_balance")}</Text>
          <Text style={[styles.savingsAmount, { color: C.creditGreen }]}>{formatAmount(savingsPool)}</Text>
        </View>
        <View style={styles.savingsActions}>
          <TouchableOpacity
            style={[styles.savingsBtn, { borderColor: C.creditGreen, backgroundColor: `${C.creditGreen}15` }]}
            onPress={() => setShowTransferIn(true)}
          >
            <Feather name="arrow-up" size={12} color={C.creditGreen} />
            <Text style={[styles.savingsBtnText, { color: C.creditGreen }]}>{t("finances.transfer_in")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.savingsBtn, { borderColor: C.debitRed, backgroundColor: `${C.debitRed}15` }]}
            onPress={() => setShowWithdraw(true)}
          >
            <Feather name="arrow-down" size={12} color={C.debitRed} />
            <Text style={[styles.savingsBtnText, { color: C.debitRed }]}>{t("finances.withdraw")}</Text>
          </TouchableOpacity>
        </View>

        {savingsGoals.length > 0 && (
          <View style={styles.goalsList}>
            {savingsGoals.map((g) => {
              const isFunded = g.targetAmount !== null && g.allocatedAmount >= g.targetAmount;
              return (
                <View key={g.id} style={[styles.goalCard, { backgroundColor: C.forgeBlack, borderColor: C.wireGray }]}>
                  <View style={styles.goalTop}>
                    <Text style={[styles.goalLabel, { color: C.cipherWhite }]}>{g.label}</Text>
                    <View style={styles.goalRight}>
                      {isFunded && <Badge text={t("finances.funded")} color={C.creditGreen} />}
                      <TouchableOpacity onPress={() => deleteSavingsGoal(g.id)}>
                        <Feather name="trash-2" size={12} color={C.ghostText} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={[styles.goalMeta, { color: C.slateText }]}>
                    {formatAmount(g.allocatedAmount)} / {g.targetAmount ? formatAmount(g.targetAmount) : t("finances.open_goal")}
                    {g.deadline ? `  ·  Due ${g.deadline}` : ""}
                  </Text>
                  <ProgressBar value={g.allocatedAmount} max={g.targetAmount} C={C} />
                </View>
              );
            })}
          </View>
        )}

        <TouchableOpacity
          style={[styles.addGoalBtn, { borderColor: C.wireGray }]}
          onPress={() => setShowAddGoal(true)}
        >
          <Feather name="plus" size={12} color={C.ghostText} />
          <Text style={[styles.addGoalBtnText, { color: C.ghostText }]}>{t("finances.add_goal")}</Text>
        </TouchableOpacity>
      </View>

      {/* I OWE SECTION */}
      <View style={[styles.card, { backgroundColor: C.vaultDark, borderColor: C.wireGray }]}>
        <View style={styles.sectionTopRow}>
          <SLabel label={t("finances.i_owe")} />
          <TouchableOpacity
            style={[styles.sectionAddBtn, { borderColor: C.wireGray }]}
            onPress={() => {
              resetOweForm();
              setShowAddOwe(true);
            }}
          >
            <Feather name="plus" size={11} color={C.ghostText} />
            <Text style={[styles.sectionAddBtnText, { color: C.ghostText }]}>{t("finances.add")}</Text>
          </TouchableOpacity>
        </View>
        {activeOwe.length > 0 && (
          <Text style={[styles.oweSummary, { color: C.debitRed }]}>
            {t("finances.total")}: {formatAmount(activeOwe.reduce((s, o) => s + o.remainingAmount, 0))}
          </Text>
        )}
        {activeOwe.map((owe) => {
          const isOverdue = owe.dueDate && owe.dueDate < today && owe.status !== "settled";
          return (
            <TouchableOpacity
              key={owe.id}
              activeOpacity={0.95}
              delayLongPress={1000}
              onLongPress={() => showOweActions(owe)}
              style={[
                styles.oweCard,
                { backgroundColor: C.forgeBlack, borderColor: C.wireGray },
                isOverdue && { borderLeftColor: C.debitRed, borderLeftWidth: 3 },
              ]}
            >
              <View style={styles.oweTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.oweName, { color: C.cipherWhite }]}>{owe.personName}</Text>
                  {!!owe.reason && <Text style={[styles.oweReason, { color: C.slateText }]}>{owe.reason}</Text>}
                  <Text style={[styles.oweDate, { color: C.ghostText }]}>
                    {t("finances.borrowed_on", { date: owe.dateBorrowed })}
                    {owe.dueDate ? `  ·  ${t("finances.due_on", { date: owe.dueDate })}` : ""}
                  </Text>
                </View>
                <View style={styles.oweSide}>
                  <View style={styles.cardActionRow}>
                    <TouchableOpacity
                      onPress={() => openOweEditor(owe)}
                      style={styles.cardActionBtn}
                    >
                      <Feather name="edit-2" size={12} color={C.ghostText} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => confirmDeleteOwe(owe)}
                      style={styles.cardActionBtn}
                    >
                      <Feather name="trash-2" size={12} color={C.ghostText} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.oweRight}>
                    {isOverdue && <Text style={[styles.overdueLabel, { color: C.debitRed }]}>{t("finances.overdue")}</Text>}
                    <Text style={[styles.oweRemaining, { color: C.debitRed }]}>{formatAmount(owe.remainingAmount)}</Text>
                    <Text style={[styles.oweOriginal, { color: C.ghostText }]}>{t("finances.of")} {formatAmount(owe.originalAmount)}</Text>
                  </View>
                </View>
              </View>
              {repayingOweId === owe.id ? (
                <View style={styles.repayForm}>
                  <TextInput
                    style={[styles.repayInput, { borderColor: C.wireGray, color: C.cipherWhite, backgroundColor: C.inkSurface }]}
                    value={repayAmt}
                    onChangeText={setRepayAmt}
                    placeholder={t("finances.amount_max_placeholder", { amount: formatAmount(owe.remainingAmount) })}
                    placeholderTextColor={C.ghostText}
                    keyboardType="decimal-pad"
                  />
                  <TextInput
                    style={[styles.repayInput, { borderColor: C.wireGray, color: C.cipherWhite, backgroundColor: C.inkSurface }]}
                    value={repayNote}
                    onChangeText={setRepayNote}
                    placeholder={t("finances.note_placeholder")}
                    placeholderTextColor={C.ghostText}
                  />
                  <TextInput
                    style={[styles.repayInput, { borderColor: C.wireGray, color: C.cipherWhite, backgroundColor: C.inkSurface }]}
                    value={repayDate}
                    onChangeText={setRepayDate}
                    placeholder={t("finances.date_placeholder")}
                    placeholderTextColor={C.ghostText}
                  />
                  <View style={styles.repayBtns}>
                    <TouchableOpacity
                    style={[styles.repayBtn, { borderColor: C.wireGray }]}
                    onPress={() => setRepayingOweId(null)}
                  >
                      <Text style={[styles.repayBtnText, { color: C.slateText }]}>{t("common.cancel")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.repayBtn, { borderColor: C.creditGreen, backgroundColor: `${C.creditGreen}15`, flex: 1 }]}
                      onPress={() => handleRepayOwe(owe)}
                    >
                      <Text style={[styles.repayBtnText, { color: C.creditGreen }]}>{t("finances.record_repayment")}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.repayTrigger, { borderColor: C.debitRed, backgroundColor: `${C.debitRed}10` }]}
                  onPress={() => {
                    setRepayingOweId(owe.id);
                    setRepayAmt(String(owe.remainingAmount));
                    setRepayDate(todayStr());
                    setRepayNote("");
                  }}
                >
                  <Text style={[styles.repayTriggerText, { color: C.debitRed }]}>{t("finances.repay")}</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        })}
        {settledOwe.length > 0 && (
          <TouchableOpacity style={styles.settledToggle} onPress={() => setSettledExpanded((v) => !v)}>
            <Text style={[styles.settledToggleText, { color: C.ghostText }]}>
              {t("finances.settled")} ({settledOwe.length}) {settledExpanded ? "▲" : "▼"}
            </Text>
          </TouchableOpacity>
        )}
        {settledExpanded && settledOwe.map((owe) => (
          <TouchableOpacity
            key={owe.id}
            activeOpacity={0.95}
            delayLongPress={1000}
            onLongPress={() => showOweActions(owe)}
            style={[styles.oweCard, { backgroundColor: C.forgeBlack, borderColor: C.wireGray, opacity: 0.5 }]}
          >
            <View style={styles.oweTop}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.oweName, { color: C.cipherWhite }]}>{owe.personName}</Text>
                {!!owe.reason && <Text style={[styles.oweReason, { color: C.slateText }]}>{owe.reason}</Text>}
              </View>
              <View style={styles.oweSide}>
                <View style={styles.cardActionRow}>
                  <TouchableOpacity
                    onPress={() => openOweEditor(owe)}
                    style={styles.cardActionBtn}
                  >
                    <Feather name="edit-2" size={12} color={C.ghostText} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => confirmDeleteOwe(owe)}
                    style={styles.cardActionBtn}
                  >
                    <Feather name="trash-2" size={12} color={C.ghostText} />
                  </TouchableOpacity>
                </View>
                <Badge text={t("finances.settled")} color={C.ghostText} />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* I LENT SECTION */}
      <View style={[styles.card, { backgroundColor: C.vaultDark, borderColor: C.wireGray }]}>
        <View style={styles.sectionTopRow}>
          <SLabel label={t("finances.i_lent")} />
          <TouchableOpacity
            style={[styles.sectionAddBtn, { borderColor: C.wireGray }]}
            onPress={() => {
              resetLendForm();
              setShowAddLend(true);
            }}
          >
            <Feather name="plus" size={11} color={C.ghostText} />
            <Text style={[styles.sectionAddBtnText, { color: C.ghostText }]}>{t("finances.add")}</Text>
          </TouchableOpacity>
        </View>
        {activeLend.length > 0 && (
          <Text style={[styles.oweSummary, { color: C.creditGreen }]}>
            {t("finances.total")}: {formatAmount(activeLend.reduce((s, l) => s + l.remainingAmount, 0))}
          </Text>
        )}
        {activeLend.map((lend) => {
          const isOverdue =
            lend.expectedReturnDate && lend.expectedReturnDate < today && lend.status !== "returned";
          return (
            <TouchableOpacity
              key={lend.id}
              activeOpacity={0.95}
              delayLongPress={1000}
              onLongPress={() => showLendActions(lend)}
              style={[
                styles.oweCard,
                { backgroundColor: C.forgeBlack, borderColor: C.wireGray },
                isOverdue && { borderLeftColor: C.amberSignal, borderLeftWidth: 3 },
              ]}
            >
              <View style={styles.oweTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.oweName, { color: C.cipherWhite }]}>{lend.personName}</Text>
                  {!!lend.reason && <Text style={[styles.oweReason, { color: C.slateText }]}>{lend.reason}</Text>}
                  <Text style={[styles.oweDate, { color: C.ghostText }]}>
                    {t("finances.lent_on", { date: lend.dateLent })}
                    {lend.expectedReturnDate ? `  ·  ${t("finances.due_on", { date: lend.expectedReturnDate })}` : ""}
                  </Text>
                </View>
                <View style={styles.oweSide}>
                  <View style={styles.cardActionRow}>
                    <TouchableOpacity
                      onPress={() => openLendEditor(lend)}
                      style={styles.cardActionBtn}
                    >
                      <Feather name="edit-2" size={12} color={C.ghostText} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => confirmDeleteLend(lend)}
                      style={styles.cardActionBtn}
                    >
                      <Feather name="trash-2" size={12} color={C.ghostText} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.oweRight}>
                    {isOverdue && <Text style={[styles.overdueLabel, { color: C.amberSignal }]}>{t("finances.overdue")}</Text>}
                    <Text style={[styles.oweRemaining, { color: C.creditGreen }]}>{formatAmount(lend.remainingAmount)}</Text>
                    <Text style={[styles.oweOriginal, { color: C.ghostText }]}>{t("finances.of")} {formatAmount(lend.originalAmount)}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.lendToggleRow}>
                <Text style={[styles.lendToggleLabel, { color: lend.countInNetWorth ? C.slateText : C.ghostText }]}>
                  {t("finances.count_in_net_worth")}
                </Text>
                <Switch
                  value={lend.countInNetWorth}
                  onValueChange={() => toggleLendNetWorth(lend.id)}
                  trackColor={{ false: C.wireGray, true: `${C.creditGreen}60` }}
                  thumbColor={lend.countInNetWorth ? C.creditGreen : C.slateText}
                  style={{ transform: [{ scale: 0.8 }] }}
                />
              </View>
              {!lend.countInNetWorth && (
                <Text style={[styles.excludedNote, { color: C.ghostText }]}>{t("finances.excluded_net_worth")}</Text>
              )}
              {repayingLendId === lend.id ? (
                <View style={styles.repayForm}>
                  <TextInput
                    style={[styles.repayInput, { borderColor: C.wireGray, color: C.cipherWhite, backgroundColor: C.inkSurface }]}
                    value={lendRepayAmt}
                    onChangeText={setLendRepayAmt}
                    placeholder={t("finances.amount_received_placeholder")}
                    placeholderTextColor={C.ghostText}
                    keyboardType="decimal-pad"
                  />
                  <TextInput
                    style={[styles.repayInput, { borderColor: C.wireGray, color: C.cipherWhite, backgroundColor: C.inkSurface }]}
                    value={lendRepayNote}
                    onChangeText={setLendRepayNote}
                    placeholder={t("finances.note_placeholder")}
                    placeholderTextColor={C.ghostText}
                  />
                  <TextInput
                    style={[styles.repayInput, { borderColor: C.wireGray, color: C.cipherWhite, backgroundColor: C.inkSurface }]}
                    value={lendRepayDate}
                    onChangeText={setLendRepayDate}
                    placeholder={t("finances.date_placeholder")}
                    placeholderTextColor={C.ghostText}
                  />
                  <View style={styles.repayBtns}>
                    <TouchableOpacity
                      style={[styles.repayBtn, { borderColor: C.wireGray }]}
                      onPress={() => setRepayingLendId(null)}
                    >
                      <Text style={[styles.repayBtnText, { color: C.slateText }]}>{t("common.cancel")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.repayBtn, { borderColor: C.creditGreen, backgroundColor: `${C.creditGreen}15`, flex: 1 }]}
                      onPress={() => handleRepayLend(lend)}
                    >
                      <Text style={[styles.repayBtnText, { color: C.creditGreen }]}>{t("finances.record_received")}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.repayTrigger, { borderColor: C.creditGreen, backgroundColor: `${C.creditGreen}10` }]}
                  onPress={() => {
                    setRepayingLendId(lend.id);
                    setLendRepayAmt(String(lend.remainingAmount));
                    setLendRepayDate(todayStr());
                    setLendRepayNote("");
                  }}
                >
                  <Text style={[styles.repayTriggerText, { color: C.creditGreen }]}>{t("finances.repayment_received")}</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        })}
        {returnedLend.length > 0 && (
          <TouchableOpacity style={styles.settledToggle} onPress={() => setLendSettledExpanded((v) => !v)}>
            <Text style={[styles.settledToggleText, { color: C.ghostText }]}>
              {t("finances.returned")} ({returnedLend.length}) {lendSettledExpanded ? "▲" : "▼"}
            </Text>
          </TouchableOpacity>
        )}
      {lendSettledExpanded && returnedLend.map((lend) => (
          <TouchableOpacity
            key={lend.id}
            activeOpacity={0.95}
            delayLongPress={1000}
            onLongPress={() => showLendActions(lend)}
            style={[styles.oweCard, { backgroundColor: C.forgeBlack, borderColor: C.wireGray, opacity: 0.5 }]}
          >
            <View style={styles.oweTop}>
              <Text style={[styles.oweName, { color: C.cipherWhite, flex: 1 }]}>{lend.personName}</Text>
              <View style={styles.oweSide}>
                <View style={styles.cardActionRow}>
                  <TouchableOpacity
                    onPress={() => openLendEditor(lend)}
                    style={styles.cardActionBtn}
                  >
                    <Feather name="edit-2" size={12} color={C.ghostText} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => confirmDeleteLend(lend)}
                    style={styles.cardActionBtn}
                  >
                    <Feather name="trash-2" size={12} color={C.ghostText} />
                  </TouchableOpacity>
                </View>
                <Badge text={t("finances.returned")} color={C.ghostText} />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <FinanceActionModal
        visible={!!actionTarget}
        title={actionTarget?.entry.personName ?? ""}
        description={actionDescription}
        C={C}
        onClose={() => setActionTarget(null)}
        onEdit={handleEditFromMenu}
        onRemove={() => {
          if (!actionTarget) return;
          if (actionTarget.kind === "owe") {
            confirmDeleteOwe(actionTarget.entry);
          } else {
            confirmDeleteLend(actionTarget.entry);
          }
        }}
        t={t}
      />

      <FinanceConfirmModal
        visible={!!deleteTarget}
        title={deleteTitle}
        description={deleteDescription}
        C={C}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirmed}
        t={t}
      />

      {/* OVERLAYS */}
      <SimpleOverlay visible={showAddAsset} onClose={() => { setShowAddAsset(false); setEditingAsset(null); }} C={C} title={editingAsset ? `${t("finances.edit")} ${t("finances.type")}` : t("finances.add_asset_liability")}>
        <Text style={[styles.overlayLabel, { color: C.ghostText }]}>{t("finances.label")}</Text>
        <TextInput style={[styles.overlayInput, { borderColor: C.wireGray, color: C.cipherWhite, backgroundColor: C.forgeBlack }]} value={assetLabel} onChangeText={setAssetLabel} placeholder={t("finances.asset_placeholder")} placeholderTextColor={C.ghostText} />
        <Text style={[styles.overlayLabel, { color: C.ghostText }]}>{t("finances.value")}</Text>
        <TextInput style={[styles.overlayInput, { borderColor: C.wireGray, color: C.cipherWhite, backgroundColor: C.forgeBlack }]} value={assetValue} onChangeText={setAssetValue} placeholder={t("finances.amount_placeholder")} placeholderTextColor={C.ghostText} keyboardType="decimal-pad" />
        <Text style={[styles.overlayLabel, { color: C.ghostText }]}>{t("finances.type")}</Text>
        <View style={styles.typeToggle}>
          {(["asset", "liability"] as const).map((t) => (
            <TouchableOpacity key={t} style={[styles.typeBtn, { borderColor: assetType === t ? C.amberSignal : C.wireGray, backgroundColor: assetType === t ? `${C.amberSignal}15` : "transparent" }]} onPress={() => setAssetType(t)}>
              <Text style={[styles.typeBtnText, { color: assetType === t ? C.amberSignal : C.slateText }]}>{t.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={[styles.overlaySubmit, { borderColor: C.amberSignal, backgroundColor: `${C.amberSignal}15` }]} onPress={handleAddAsset}>
          <Text style={[styles.overlaySubmitText, { color: C.amberSignal }]}>{editingAsset ? t("common.update") : t("common.add")}</Text>
        </TouchableOpacity>
      </SimpleOverlay>

      <SimpleOverlay visible={showTransferIn} onClose={() => setShowTransferIn(false)} C={C} title={t("finances.transfer_in")}>
        <Text style={[styles.overlayLabel, { color: C.ghostText }]}>{t("finances.amount")}</Text>
        <TextInput style={[styles.overlayInput, { borderColor: C.wireGray, color: C.cipherWhite, backgroundColor: C.forgeBlack }]} value={savAmount} onChangeText={setSavAmount} placeholder={t("finances.amount_placeholder")} placeholderTextColor={C.ghostText} keyboardType="decimal-pad" />
        <Text style={[styles.overlayLabel, { color: C.ghostText }]}>{t("finances.goal_optional")}</Text>
        <GoalSelector goals={savingsGoals} selected={savGoalId} onSelect={setSavGoalId} C={C} />
        <Text style={[styles.overlayLabel, { color: C.ghostText }]}>{t("finances.note_optional")}</Text>
        <TextInput style={[styles.overlayInput, { borderColor: C.wireGray, color: C.cipherWhite, backgroundColor: C.forgeBlack }]} value={savNote} onChangeText={setSavNote} placeholder={t("finances.note_placeholder")} placeholderTextColor={C.ghostText} />
        <Text style={[styles.overlayLabel, { color: C.ghostText }]}>{t("finances.date")}</Text>
        <TextInput style={[styles.overlayInput, { borderColor: C.wireGray, color: C.cipherWhite, backgroundColor: C.forgeBlack }]} value={savDate} onChangeText={setSavDate} placeholder={t("finances.date_placeholder")} placeholderTextColor={C.ghostText} />
        <TouchableOpacity style={[styles.overlaySubmit, { borderColor: C.creditGreen, backgroundColor: `${C.creditGreen}15` }]} onPress={handleTransferIn}>
          <Text style={[styles.overlaySubmitText, { color: C.creditGreen }]}>{t("finances.transfer_in")}</Text>
        </TouchableOpacity>
      </SimpleOverlay>

      <SimpleOverlay visible={showWithdraw} onClose={() => setShowWithdraw(false)} C={C} title={t("finances.withdraw")}>
        <Text style={[styles.overlayLabel, { color: C.ghostText }]}>{t("finances.amount")}</Text>
        <TextInput style={[styles.overlayInput, { borderColor: C.wireGray, color: C.cipherWhite, backgroundColor: C.forgeBlack }]} value={savAmount} onChangeText={setSavAmount} placeholder={t("finances.amount_placeholder")} placeholderTextColor={C.ghostText} keyboardType="decimal-pad" />
        <Text style={[styles.overlayLabel, { color: C.ghostText }]}>{t("finances.from_goal_optional")}</Text>
        <GoalSelector goals={savingsGoals} selected={savGoalId} onSelect={setSavGoalId} C={C} />
        <Text style={[styles.overlayLabel, { color: C.ghostText }]}>{t("finances.note_optional")}</Text>
        <TextInput style={[styles.overlayInput, { borderColor: C.wireGray, color: C.cipherWhite, backgroundColor: C.forgeBlack }]} value={savNote} onChangeText={setSavNote} placeholder={t("finances.note_placeholder")} placeholderTextColor={C.ghostText} />
        <Text style={[styles.overlayLabel, { color: C.ghostText }]}>{t("finances.date")}</Text>
        <TextInput style={[styles.overlayInput, { borderColor: C.wireGray, color: C.cipherWhite, backgroundColor: C.forgeBlack }]} value={savDate} onChangeText={setSavDate} placeholder={t("finances.date_placeholder")} placeholderTextColor={C.ghostText} />
        <TouchableOpacity style={[styles.overlaySubmit, { borderColor: C.debitRed, backgroundColor: `${C.debitRed}15` }]} onPress={handleWithdraw}>
          <Text style={[styles.overlaySubmitText, { color: C.debitRed }]}>{t("finances.withdraw")}</Text>
        </TouchableOpacity>
      </SimpleOverlay>

      <SimpleOverlay visible={showAddGoal} onClose={() => setShowAddGoal(false)} C={C} title={t("finances.add_goal")}>
        <Text style={[styles.overlayLabel, { color: C.ghostText }]}>{t("finances.label")}</Text>
        <TextInput style={[styles.overlayInput, { borderColor: C.wireGray, color: C.cipherWhite, backgroundColor: C.forgeBlack }]} value={goalLabel} onChangeText={setGoalLabel} placeholder={t("finances.goal_placeholder")} placeholderTextColor={C.ghostText} />
        <Text style={[styles.overlayLabel, { color: C.ghostText }]}>{t("finances.target_amount_optional")}</Text>
        <TextInput style={[styles.overlayInput, { borderColor: C.wireGray, color: C.cipherWhite, backgroundColor: C.forgeBlack }]} value={goalTarget} onChangeText={setGoalTarget} placeholder={t("finances.open_goal")} placeholderTextColor={C.ghostText} keyboardType="decimal-pad" />
        <Text style={[styles.overlayLabel, { color: C.ghostText }]}>{t("finances.deadline_optional")}</Text>
        <TextInput style={[styles.overlayInput, { borderColor: C.wireGray, color: C.cipherWhite, backgroundColor: C.forgeBlack }]} value={goalDeadline} onChangeText={setGoalDeadline} placeholder={t("finances.date_placeholder")} placeholderTextColor={C.ghostText} />
        <TouchableOpacity style={[styles.overlaySubmit, { borderColor: C.amberSignal, backgroundColor: `${C.amberSignal}15` }]} onPress={handleAddGoal}>
          <Text style={[styles.overlaySubmitText, { color: C.amberSignal }]}>{t("finances.add_goal")}</Text>
        </TouchableOpacity>
      </SimpleOverlay>

      <SimpleOverlay
        visible={showAddOwe}
        onClose={() => {
          setShowAddOwe(false);
          resetOweForm();
        }}
        C={C}
        title={editingOweId ? t("finances.edit_owe_entry") : t("finances.add_owe_entry")}
      >
        <Text style={[styles.overlayLabel, { color: C.ghostText }]}>{t("finances.person_name")}</Text>
        <TextInput style={[styles.overlayInput, { borderColor: C.wireGray, color: C.cipherWhite, backgroundColor: C.forgeBlack }]} value={oweName} onChangeText={setOweName} placeholder={t("finances.name_placeholder")} placeholderTextColor={C.ghostText} />
        <Text style={[styles.overlayLabel, { color: C.ghostText }]}>{t("finances.amount")}</Text>
        <TextInput style={[styles.overlayInput, { borderColor: C.wireGray, color: C.cipherWhite, backgroundColor: C.forgeBlack }]} value={oweAmt} onChangeText={setOweAmt} placeholder={t("finances.amount_placeholder")} placeholderTextColor={C.ghostText} keyboardType="decimal-pad" />
        <Text style={[styles.overlayLabel, { color: C.ghostText }]}>{t("finances.reason_optional")}</Text>
        <TextInput style={[styles.overlayInput, { borderColor: C.wireGray, color: C.cipherWhite, backgroundColor: C.forgeBlack }]} value={oweReason} onChangeText={setOweReason} placeholder={t("finances.reason_placeholder")} placeholderTextColor={C.ghostText} />
        <Text style={[styles.overlayLabel, { color: C.ghostText }]}>{t("finances.date_borrowed")}</Text>
        <TextInput style={[styles.overlayInput, { borderColor: C.wireGray, color: C.cipherWhite, backgroundColor: C.forgeBlack }]} value={oweBorrowed} onChangeText={setOweBorrowed} placeholder={t("finances.date_placeholder")} placeholderTextColor={C.ghostText} />
        <Text style={[styles.overlayLabel, { color: C.ghostText }]}>{t("finances.due_date_optional")}</Text>
        <TextInput style={[styles.overlayInput, { borderColor: C.wireGray, color: C.cipherWhite, backgroundColor: C.forgeBlack }]} value={oweDue} onChangeText={setOweDue} placeholder={t("finances.date_placeholder")} placeholderTextColor={C.ghostText} />
        <TouchableOpacity style={[styles.overlaySubmit, { borderColor: C.debitRed, backgroundColor: `${C.debitRed}15` }]} onPress={handleAddOwe}>
          <Text style={[styles.overlaySubmitText, { color: C.debitRed }]}>{editingOweId ? t("finances.update_owe_entry") : t("finances.add_owe_entry")}</Text>
        </TouchableOpacity>
      </SimpleOverlay>

      <SimpleOverlay
        visible={showAddLend}
        onClose={() => {
          setShowAddLend(false);
          resetLendForm();
        }}
        C={C}
        title={editingLendId ? t("finances.edit_lend_entry") : t("finances.add_lend_entry")}
      >
        <Text style={[styles.overlayLabel, { color: C.ghostText }]}>{t("finances.person_name")}</Text>
        <TextInput style={[styles.overlayInput, { borderColor: C.wireGray, color: C.cipherWhite, backgroundColor: C.forgeBlack }]} value={lendName} onChangeText={setLendName} placeholder={t("finances.name_placeholder")} placeholderTextColor={C.ghostText} />
        <Text style={[styles.overlayLabel, { color: C.ghostText }]}>{t("finances.amount")}</Text>
        <TextInput style={[styles.overlayInput, { borderColor: C.wireGray, color: C.cipherWhite, backgroundColor: C.forgeBlack }]} value={lendAmt} onChangeText={setLendAmt} placeholder={t("finances.amount_placeholder")} placeholderTextColor={C.ghostText} keyboardType="decimal-pad" />
        <Text style={[styles.overlayLabel, { color: C.ghostText }]}>{t("finances.reason_optional")}</Text>
        <TextInput style={[styles.overlayInput, { borderColor: C.wireGray, color: C.cipherWhite, backgroundColor: C.forgeBlack }]} value={lendReason} onChangeText={setLendReason} placeholder={t("finances.reason_placeholder")} placeholderTextColor={C.ghostText} />
        <Text style={[styles.overlayLabel, { color: C.ghostText }]}>{t("finances.date_lent")}</Text>
        <TextInput style={[styles.overlayInput, { borderColor: C.wireGray, color: C.cipherWhite, backgroundColor: C.forgeBlack }]} value={lendDate} onChangeText={setLendDate} placeholder={t("finances.date_placeholder")} placeholderTextColor={C.ghostText} />
        <Text style={[styles.overlayLabel, { color: C.ghostText }]}>{t("finances.expected_return_date_optional")}</Text>
        <TextInput style={[styles.overlayInput, { borderColor: C.wireGray, color: C.cipherWhite, backgroundColor: C.forgeBlack }]} value={lendReturn} onChangeText={setLendReturn} placeholder={t("finances.date_placeholder")} placeholderTextColor={C.ghostText} />
        <TouchableOpacity style={[styles.overlaySubmit, { borderColor: C.creditGreen, backgroundColor: `${C.creditGreen}15` }]} onPress={handleAddLend}>
          <Text style={[styles.overlaySubmitText, { color: C.creditGreen }]}>{editingLendId ? t("finances.update_lend_entry") : t("finances.add_lend_entry")}</Text>
        </TouchableOpacity>
      </SimpleOverlay>
    </ScrollView>
  );
}

function AssetRow({
  label,
  value,
  isAuto,
  C,
  formatAmount,
  color,
  onEdit,
  onDelete,
}: {
  label: string;
  value: number;
  isAuto?: boolean;
  C: ReturnType<typeof getThemeColors>;
  formatAmount: (n: number) => string;
  color?: string;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <View style={styles.assetRow}>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={[styles.assetLabel, { color: C.cipherWhite }]}>{label}</Text>
        {isAuto && (
          <View style={[styles.autoBadge, { borderColor: C.ghostText }]}>
            <Text style={[styles.autoBadgeText, { color: C.ghostText }]}>AUTO</Text>
          </View>
        )}
      </View>
      <Text style={[styles.assetValue, { color: color ?? C.creditGreen }]}>{formatAmount(value)}</Text>
      {!isAuto && onEdit && (
        <TouchableOpacity onPress={onEdit} style={{ marginLeft: 8 }}>
          <Feather name="edit-2" size={12} color={C.ghostText} />
        </TouchableOpacity>
      )}
      {!isAuto && onDelete && (
        <TouchableOpacity onPress={onDelete} style={{ marginLeft: 6 }}>
          <Feather name="trash-2" size={12} color={C.ghostText} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function GoalSelector({
  goals,
  selected,
  onSelect,
  C,
}: {
  goals: SavingsGoal[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  C: ReturnType<typeof getThemeColors>;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
      <View style={{ flexDirection: "row", gap: 6 }}>
        <TouchableOpacity
          style={[styles.goalChip, { borderColor: selected === null ? C.amberSignal : C.wireGray, backgroundColor: selected === null ? `${C.amberSignal}15` : "transparent" }]}
          onPress={() => onSelect(null)}
        >
          <Text style={[styles.goalChipText, { color: selected === null ? C.amberSignal : C.slateText }]}>General Pool</Text>
        </TouchableOpacity>
        {goals.map((g) => (
          <TouchableOpacity
            key={g.id}
            style={[styles.goalChip, { borderColor: selected === g.id ? C.amberSignal : C.wireGray, backgroundColor: selected === g.id ? `${C.amberSignal}15` : "transparent" }]}
            onPress={() => onSelect(g.id)}
          >
            <Text style={[styles.goalChipText, { color: selected === g.id ? C.amberSignal : C.slateText }]}>{g.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

function FinanceActionModal({
  visible,
  title,
  description,
  C,
  onClose,
  onEdit,
  onRemove,
  t,
}: {
  visible: boolean;
  title: string;
  description: string;
  C: ReturnType<typeof getThemeColors>;
  onClose: () => void;
  onEdit: () => void;
  onRemove: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.dialogBackdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={[styles.dialogCard, { backgroundColor: C.vaultDark, borderColor: C.wireGray }]}>
          <View style={styles.dialogHeader}>
            <View style={[styles.dialogIcon, { backgroundColor: `${C.amberSignal}16`, borderColor: `${C.amberSignal}50` }]}>
              <Feather name="more-horizontal" size={16} color={C.amberSignal} />
            </View>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={16} color={C.slateText} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.dialogTitle, { color: C.cipherWhite }]}>{title}</Text>
          <Text style={[styles.dialogText, { color: C.slateText }]}>{description}</Text>
          <View style={styles.dialogActionStack}>
            <TouchableOpacity
              style={[styles.dialogOptionBtn, { borderColor: C.wireGray, backgroundColor: C.inkSurface }]}
              onPress={onEdit}
            >
              <Feather name="edit-2" size={14} color={C.amberSignal} />
              <Text style={[styles.dialogOptionText, { color: C.cipherWhite }]}>{t("finances.edit")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dialogOptionBtn, { borderColor: `${C.debitRed}55`, backgroundColor: `${C.debitRed}10` }]}
              onPress={onRemove}
            >
              <Feather name="trash-2" size={14} color={C.debitRed} />
              <Text style={[styles.dialogOptionText, { color: C.debitRed }]}>{t("finances.remove")}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.dialogCancelBtn, { borderColor: C.wireGray }]} onPress={onClose}>
            <Text style={[styles.dialogCancelText, { color: C.slateText }]}>{t("common.cancel")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function FinanceConfirmModal({
  visible,
  title,
  description,
  C,
  onClose,
  onConfirm,
  t,
}: {
  visible: boolean;
  title: string;
  description: string;
  C: ReturnType<typeof getThemeColors>;
  onClose: () => void;
  onConfirm: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.dialogBackdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={[styles.dialogCard, { backgroundColor: C.vaultDark, borderColor: `${C.debitRed}55` }]}>
          <View style={styles.dialogHeader}>
            <View style={[styles.dialogIcon, { backgroundColor: `${C.debitRed}16`, borderColor: `${C.debitRed}55` }]}>
              <Feather name="alert-triangle" size={16} color={C.debitRed} />
            </View>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={16} color={C.slateText} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.dialogTitle, { color: C.cipherWhite }]}>{title}</Text>
          <Text style={[styles.dialogText, { color: C.slateText }]}>{description}</Text>
          <View style={styles.dialogFooter}>
            <TouchableOpacity style={[styles.dialogHalfBtn, { borderColor: C.wireGray }]} onPress={onClose}>
              <Text style={[styles.dialogCancelText, { color: C.slateText }]}>{t("common.cancel")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dialogHalfBtn, { borderColor: `${C.debitRed}55`, backgroundColor: `${C.debitRed}10` }]}
              onPress={onConfirm}
            >
              <Text style={[styles.dialogDangerText, { color: C.debitRed }]}>{t("finances.remove")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SimpleOverlay({
  visible,
  onClose,
  title,
  children,
  C,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  C: ReturnType<typeof getThemeColors>;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlayBackdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={[styles.overlaySheet, { backgroundColor: C.vaultDark, borderColor: C.wireGray }]}>
          <View style={styles.overlayHeader}>
            <Text style={[styles.overlayTitle, { color: C.amberSignal }]}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={18} color={C.slateText} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={{ gap: 10, paddingBottom: 20 }}>{children}</View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  nwCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 20,
    gap: 8,
    alignItems: "center",
  },
  nwHeading: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  nwValue: {
    fontFamily: "JetBrainsMono_600SemiBold",
    fontSize: 28,
  },
  nwSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginTop: 8,
  },
  nwSubItem: { alignItems: "center" },
  nwSubLabel: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 9,
    letterSpacing: 1.5,
  },
  nwSubAmount: {
    fontFamily: "JetBrainsMono_600SemiBold",
    fontSize: 14,
    marginTop: 2,
  },
  nwSubDivider: { width: 1, height: 32 },
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
  collapsibleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  assetList: { gap: 10 },
  assetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  assetLabel: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 12,
  },
  assetValue: {
    fontFamily: "JetBrainsMono_600SemiBold",
    fontSize: 13,
  },
  autoBadge: {
    borderWidth: 1,
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  autoBadgeText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 7,
    letterSpacing: 0.5,
  },
  addAssetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 12,
    justifyContent: "center",
  },
  addAssetBtnText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 10,
    letterSpacing: 1,
  },
  savingsSummary: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  savingsLabel: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 9,
    letterSpacing: 1.5,
  },
  savingsAmount: {
    fontFamily: "JetBrainsMono_600SemiBold",
    fontSize: 22,
  },
  savingsActions: {
    flexDirection: "row",
    gap: 10,
  },
  savingsBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 12,
  },
  savingsBtnText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 10,
    letterSpacing: 1,
  },
  goalsList: { gap: 10 },
  goalCard: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    gap: 6,
  },
  goalTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  goalLabel: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 13,
  },
  goalRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  goalMeta: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 11,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 2,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  addGoalBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderStyle: "dashed" as any,
    borderRadius: 6,
    paddingVertical: 10,
    justifyContent: "center",
  },
  addGoalBtnText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 9,
    letterSpacing: 1,
  },
  sectionTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sectionAddBtnText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 9,
    letterSpacing: 1,
  },
  oweSummary: {
    fontFamily: "JetBrainsMono_600SemiBold",
    fontSize: 14,
  },
  oweCard: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    gap: 10,
  },
  oweTop: {
    flexDirection: "row",
    gap: 10,
  },
  oweSide: {
    alignItems: "flex-end",
    gap: 6,
  },
  oweName: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 13,
  },
  oweReason: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 11,
    marginTop: 2,
  },
  oweDate: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 10,
    marginTop: 2,
  },
  oweRight: { alignItems: "flex-end", gap: 2 },
  cardActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardActionBtn: {
    padding: 2,
  },
  oweRemaining: {
    fontFamily: "JetBrainsMono_600SemiBold",
    fontSize: 14,
  },
  oweOriginal: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 10,
  },
  overdueLabel: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 9,
    letterSpacing: 1,
  },
  repayTrigger: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: "center",
  },
  repayTriggerText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 10,
    letterSpacing: 1,
  },
  repayForm: { gap: 8 },
  repayInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 13,
    outlineStyle: "none" as any,
  },
  repayBtns: { flexDirection: "row", gap: 8 },
  repayBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  repayBtnText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  settledToggle: { alignItems: "center", paddingVertical: 6 },
  settledToggleText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 9,
    letterSpacing: 1,
  },
  lendToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  lendToggleLabel: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 9,
    letterSpacing: 1,
  },
  excludedNote: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 10,
    fontStyle: "italic",
  },
  emptyText: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 8,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 8,
    letterSpacing: 0.5,
  },
  dialogBackdrop: {
    flex: 1,
    backgroundColor: "rgba(7,9,14,0.84)",
    justifyContent: "center",
    padding: 24,
  },
  dialogCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 18,
    gap: 14,
  },
  dialogHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dialogIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dialogTitle: {
    fontFamily: "Syne_700Bold",
    fontSize: 16,
    letterSpacing: 0.8,
  },
  dialogText: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 11,
    lineHeight: 18,
  },
  dialogActionStack: {
    gap: 8,
  },
  dialogOptionBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dialogOptionText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 10,
    letterSpacing: 1,
  },
  dialogCancelBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  dialogCancelText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 10,
    letterSpacing: 1,
  },
  dialogFooter: {
    flexDirection: "row",
    gap: 10,
  },
  dialogHalfBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  dialogDangerText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 10,
    letterSpacing: 1,
  },
  overlayBackdrop: {
    flex: 1,
    backgroundColor: "rgba(7,9,14,0.85)",
    justifyContent: "flex-end",
  },
  overlaySheet: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderWidth: 1,
    padding: 20,
    maxHeight: "80%",
  },
  overlayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  overlayTitle: {
    fontFamily: "Syne_700Bold",
    fontSize: 14,
    letterSpacing: 2.5,
  },
  overlayLabel: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  overlayInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 15,
    outlineStyle: "none" as any,
  },
  overlaySubmit: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  overlaySubmitText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 11,
    letterSpacing: 1.2,
  },
  typeToggle: { flexDirection: "row", gap: 8 },
  typeBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: "center",
  },
  typeBtnText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 10,
    letterSpacing: 1,
  },
  goalChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 6,
  },
  goalChipText: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 12,
  },
});
