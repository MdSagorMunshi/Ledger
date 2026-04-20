import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import {
  Transaction,
  SavingsTransaction,
  SavingsGoal,
  AssetEntry,
  OweEntry,
  LendEntry,
  BudgetEnvelope,
  RecurringTemplate,
  AppSettings,
  Currency,
} from "@/context/LedgerContext";
import { encryptData, EncryptedPayload } from "./crypto";

export interface LedgerExportV1 {
  version: 1;
  exportedAt: string;
  transactions: Transaction[];
  savingsTransactions: SavingsTransaction[];
  savingsGoals: SavingsGoal[];
  assetEntries: AssetEntry[];
  oweEntries: OweEntry[];
  lendEntries: LendEntry[];
  budgetEnvelopes: BudgetEnvelope[];
  recurringTemplates: RecurringTemplate[];
  settings: Omit<AppSettings, never>;
  currency: Currency;
}

function getTimestamp(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${min}${ss}`;
}

function downloadFile(content: string, filename: string): void {
  if (Platform.OS !== "web") return;
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Save content to a temp file and share it on mobile */
async function shareFile(content: string, filename: string): Promise<void> {
  const Sharing = await import("expo-sharing") as any;

  const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!baseDir) {
    throw new Error("Local file storage is unavailable on this device.");
  }

  const path = baseDir + filename;
  await FileSystem.writeAsStringAsync(path, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: "application/json",
      dialogTitle: "Export Ledger Data",
      UTI: "public.json",
    });
  }
}

export function buildExportPayload(state: {
  transactions: Transaction[];
  savingsTransactions: SavingsTransaction[];
  savingsGoals: SavingsGoal[];
  assetEntries: AssetEntry[];
  oweEntries: OweEntry[];
  lendEntries: LendEntry[];
  budgetEnvelopes: BudgetEnvelope[];
  recurringTemplates: RecurringTemplate[];
  appSettings: AppSettings;
  currency: Currency;
}): LedgerExportV1 {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions: state.transactions,
    savingsTransactions: state.savingsTransactions,
    savingsGoals: state.savingsGoals,
    assetEntries: state.assetEntries,
    oweEntries: state.oweEntries,
    lendEntries: state.lendEntries,
    budgetEnvelopes: state.budgetEnvelopes,
    recurringTemplates: state.recurringTemplates,
    settings: state.appSettings,
    currency: state.currency,
  };
}

export async function exportPlain(state: Parameters<typeof buildExportPayload>[0]): Promise<void> {
  const payload = buildExportPayload(state);
  const content = JSON.stringify(payload, null, 2);
  const filename = `ledger-${getTimestamp()}.json`;
  if (Platform.OS === "web") {
    downloadFile(content, filename);
  } else {
    await shareFile(content, filename);
  }
}

export async function exportEncrypted(
  state: Parameters<typeof buildExportPayload>[0],
  pin: string
): Promise<void> {
  const payload = buildExportPayload(state);
  const encrypted: EncryptedPayload = await encryptData(payload, pin);
  const content = JSON.stringify(encrypted, null, 2);
  const filename = `ledger-${getTimestamp()}.enc.json`;
  if (Platform.OS === "web") {
    downloadFile(content, filename);
  } else {
    await shareFile(content, filename);
  }
}

export function parseImport(raw: unknown): Partial<{
  transactions: Transaction[];
  savingsTransactions: SavingsTransaction[];
  savingsGoals: SavingsGoal[];
  assetEntries: AssetEntry[];
  oweEntries: OweEntry[];
  lendEntries: LendEntry[];
  budgetEnvelopes: BudgetEnvelope[];
  recurringTemplates: RecurringTemplate[];
  settings: AppSettings;
  currency: Currency;
}> {
  if (!raw || typeof raw !== "object") throw new Error("Invalid file");
  const obj = raw as Record<string, unknown>;
  if (obj.version !== 1) {
    throw new Error("Unsupported export version");
  }

  const v1 = obj as unknown as LedgerExportV1;
  return {
    transactions: v1.transactions ?? [],
    savingsTransactions: v1.savingsTransactions ?? [],
    savingsGoals: v1.savingsGoals ?? [],
    assetEntries: v1.assetEntries ?? [],
    oweEntries: v1.oweEntries ?? [],
    lendEntries: v1.lendEntries ?? [],
    budgetEnvelopes: v1.budgetEnvelopes ?? [],
    recurringTemplates: v1.recurringTemplates ?? [],
    settings: v1.settings,
    currency: v1.currency,
  };
}
