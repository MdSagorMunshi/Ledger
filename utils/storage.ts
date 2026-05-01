/**
 * SQLite-backed local persistence for Ledger data.
 * Normal app persistence is local and unencrypted on disk.
 * Export and backup encryption are handled separately in utils/crypto.ts.
 */
import { Platform } from "react-native";
import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import type {
  AppSettings,
  AssetEntry,
  BudgetEnvelope,
  Currency,
  LendEntry,
  LendRepayment,
  OweEntry,
  OweRepayment,
  RecurringTemplate,
  SavingsGoal,
  SavingsTransaction,
  Transaction,
} from "@/context/LedgerContext";

type PersistedState = {
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
  biometricEnabled: boolean;
  autoBackupEnabled: boolean;
  autoBackupEncrypted: boolean;
  autoBackupFolderUri: string | null;
  autoBackupPassword: string | null;
  lastBackupTime: string | null;
  lastBackupPath: string | null;
};

type SettingsRow = {
  pin: string | null;
  biometric_enabled: number;
  auto_backup_enabled: number;
  auto_backup_encrypted: number;
  auto_backup_folder_uri: string | null;
  auto_backup_password: string | null;
  last_backup_time: string | null;
  last_backup_path: string | null;
  theme: AppSettings["theme"];
  auto_lock_minutes: number | null;
  default_currency_code: string;
  language: AppSettings["language"];
  font_size_percent: number;
  font_weight: AppSettings["fontWeight"];
};

type OweRepaymentRow = Omit<OweRepayment, "ledgerTxId"> & {
  owe_id: string;
  ledger_tx_id: string;
};

type LendRepaymentRow = Omit<LendRepayment, "ledgerTxId"> & {
  lend_id: string;
  ledger_tx_id: string;
};

const DB_NAME = "ledger.db";
const SETTINGS_ROW_ID = 1;
const SCHEMA_VERSION = 1;
const DEFAULT_THEME: AppSettings["theme"] = "dark";
const DEFAULT_CURRENCY_CODE = "BDT";
const DEFAULT_LANGUAGE: AppSettings["language"] = "en";
const CURRENCY_SYMBOLS: Record<string, string> = {
  BDT: "৳",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  INR: "₹",
};

let dbPromise: Promise<SQLiteDatabase> | null = null;
let lastSavedPin: string | null = null;
let lastSavedState: PersistedState | null = null;

function toInt(value: boolean): number {
  return value ? 1 : 0;
}

function toBool(value: number | null | undefined): boolean {
  return value === 1;
}

async function getDb(): Promise<SQLiteDatabase> {
  if (Platform.OS === "web") {
    throw new Error("SQLite persistence is not supported on web.");
  }
  if (!dbPromise) {
    dbPromise = initDb();
  }
  return dbPromise;
}

async function initDb(): Promise<SQLiteDatabase> {
  const db = (await openDatabaseAsync(DB_NAME)) as SQLiteDatabase;
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA user_version = ${SCHEMA_VERSION};

    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      pin TEXT,
      biometric_enabled INTEGER NOT NULL DEFAULT 0,
      auto_backup_enabled INTEGER NOT NULL DEFAULT 0,
      auto_backup_encrypted INTEGER NOT NULL DEFAULT 0,
      auto_backup_folder_uri TEXT,
      auto_backup_password TEXT,
      last_backup_time TEXT,
      last_backup_path TEXT,
      theme TEXT NOT NULL DEFAULT 'dark',
      auto_lock_minutes INTEGER,
      default_currency_code TEXT NOT NULL DEFAULT 'BDT',
      language TEXT NOT NULL DEFAULT 'en',
      font_size_percent INTEGER NOT NULL DEFAULT 0,
      font_weight TEXT NOT NULL DEFAULT 'default'
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      note TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT,
      subtype TEXT,
      recurring_template_id TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
    CREATE INDEX IF NOT EXISTS idx_transactions_type_date ON transactions(type, date DESC);
    CREATE INDEX IF NOT EXISTS idx_transactions_category_date ON transactions(category, date DESC);

    CREATE TABLE IF NOT EXISTS savings_goals (
      id TEXT PRIMARY KEY NOT NULL,
      label TEXT NOT NULL,
      target_amount REAL,
      deadline TEXT,
      allocated_amount REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS savings_transactions (
      id TEXT PRIMARY KEY NOT NULL,
      direction TEXT NOT NULL,
      amount REAL NOT NULL,
      goal_id TEXT,
      note TEXT NOT NULL,
      date TEXT NOT NULL,
      linked_ledger_tx_id TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_savings_transactions_goal_date
      ON savings_transactions(goal_id, date DESC);

    CREATE TABLE IF NOT EXISTS asset_entries (
      id TEXT PRIMARY KEY NOT NULL,
      label TEXT NOT NULL,
      value REAL NOT NULL,
      type TEXT NOT NULL,
      is_manual INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS owe_entries (
      id TEXT PRIMARY KEY NOT NULL,
      person_name TEXT NOT NULL,
      original_amount REAL NOT NULL,
      remaining_amount REAL NOT NULL,
      reason TEXT NOT NULL,
      date_borrowed TEXT NOT NULL,
      due_date TEXT,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS owe_repayments (
      id TEXT PRIMARY KEY NOT NULL,
      owe_id TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      ledger_tx_id TEXT NOT NULL,
      FOREIGN KEY (owe_id) REFERENCES owe_entries(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_owe_repayments_owe_date
      ON owe_repayments(owe_id, date DESC);

    CREATE TABLE IF NOT EXISTS lend_entries (
      id TEXT PRIMARY KEY NOT NULL,
      person_name TEXT NOT NULL,
      original_amount REAL NOT NULL,
      remaining_amount REAL NOT NULL,
      reason TEXT NOT NULL,
      date_lent TEXT NOT NULL,
      expected_return_date TEXT,
      status TEXT NOT NULL,
      count_in_net_worth INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lend_repayments (
      id TEXT PRIMARY KEY NOT NULL,
      lend_id TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      ledger_tx_id TEXT NOT NULL,
      FOREIGN KEY (lend_id) REFERENCES lend_entries(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_lend_repayments_lend_date
      ON lend_repayments(lend_id, date DESC);

    CREATE TABLE IF NOT EXISTS budget_envelopes (
      id TEXT PRIMARY KEY NOT NULL,
      category TEXT NOT NULL,
      monthly_limit REAL NOT NULL,
      applies_to TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recurring_templates (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      note TEXT NOT NULL,
      frequency TEXT NOT NULL,
      start_date TEXT NOT NULL,
      last_generated_date TEXT,
      active INTEGER NOT NULL
    );
  `);

  try {
    await db.runAsync(
      `ALTER TABLE app_settings ADD COLUMN language TEXT NOT NULL DEFAULT 'en'`
    );
  } catch {
    // Column already exists on upgraded installs.
  }

  try {
    await db.runAsync(
      `ALTER TABLE app_settings ADD COLUMN auto_backup_encrypted INTEGER NOT NULL DEFAULT 0`
    );
  } catch {
    // Column already exists on upgraded installs.
  }

  try {
    await db.runAsync(
      `ALTER TABLE app_settings ADD COLUMN font_size_percent INTEGER NOT NULL DEFAULT 0`
    );
  } catch {
    // Column already exists on upgraded installs.
  }

  try {
    await db.runAsync(
      `ALTER TABLE app_settings ADD COLUMN font_weight TEXT NOT NULL DEFAULT 'default'`
    );
  } catch {
    // Column already exists on upgraded installs.
  }

  await db.runAsync(
    `INSERT OR IGNORE INTO app_settings (
      id, theme, default_currency_code, language
    ) VALUES (?, ?, ?, ?)`,
    SETTINGS_ROW_ID,
    DEFAULT_THEME,
    DEFAULT_CURRENCY_CODE,
    DEFAULT_LANGUAGE
  );

  return db;
}

async function withTransaction<T>(
  db: SQLiteDatabase,
  work: () => Promise<T>
): Promise<T> {
  await db.execAsync("BEGIN IMMEDIATE TRANSACTION;");
  try {
    const result = await work();
    await db.execAsync("COMMIT;");
    return result;
  } catch (error) {
    await db.execAsync("ROLLBACK;");
    throw error;
  }
}

function clonePersistedState(state: PersistedState): PersistedState {
  return {
    ...state,
    appSettings: state.appSettings,
    currency: state.currency,
    transactions: state.transactions,
    savingsTransactions: state.savingsTransactions,
    savingsGoals: state.savingsGoals,
    assetEntries: state.assetEntries,
    oweEntries: state.oweEntries,
    lendEntries: state.lendEntries,
    budgetEnvelopes: state.budgetEnvelopes,
    recurringTemplates: state.recurringTemplates,
  };
}

function hasSettingsChanges(
  previousState: PersistedState | null,
  pin: string,
  nextState: PersistedState
): boolean {
  if (!previousState || lastSavedPin !== pin) return true;

  return (
    previousState.biometricEnabled !== nextState.biometricEnabled ||
    previousState.autoBackupEnabled !== nextState.autoBackupEnabled ||
    previousState.autoBackupEncrypted !== nextState.autoBackupEncrypted ||
    previousState.autoBackupFolderUri !== nextState.autoBackupFolderUri ||
    previousState.autoBackupPassword !== nextState.autoBackupPassword ||
    previousState.lastBackupTime !== nextState.lastBackupTime ||
    previousState.lastBackupPath !== nextState.lastBackupPath ||
    previousState.appSettings !== nextState.appSettings ||
    previousState.currency.code !== nextState.currency.code
  );
}

function hasTableChanges(
  previousState: PersistedState | null,
  nextState: PersistedState
): boolean {
  if (!previousState) return true;

  return (
    previousState.transactions !== nextState.transactions ||
    previousState.savingsGoals !== nextState.savingsGoals ||
    previousState.savingsTransactions !== nextState.savingsTransactions ||
    previousState.assetEntries !== nextState.assetEntries ||
    previousState.oweEntries !== nextState.oweEntries ||
    previousState.lendEntries !== nextState.lendEntries ||
    previousState.budgetEnvelopes !== nextState.budgetEnvelopes ||
    previousState.recurringTemplates !== nextState.recurringTemplates
  );
}

async function replaceTransactions(db: SQLiteDatabase, transactions: Transaction[]) {
  await db.runAsync("DELETE FROM transactions");
  for (const tx of transactions) {
    await db.runAsync(
      `INSERT INTO transactions (
        id, type, amount, category, note, date, time, subtype, recurring_template_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      tx.id,
      tx.type,
      tx.amount,
      tx.category,
      tx.note,
      tx.date,
      tx.time ?? null,
      tx.subtype ?? null,
      tx.recurringTemplateId ?? null
    );
  }
}

async function replaceSavings(db: SQLiteDatabase, goals: SavingsGoal[], transactions: SavingsTransaction[]) {
  await db.runAsync("DELETE FROM savings_transactions");
  await db.runAsync("DELETE FROM savings_goals");

  for (const goal of goals) {
    await db.runAsync(
      `INSERT INTO savings_goals (
        id, label, target_amount, deadline, allocated_amount
      ) VALUES (?, ?, ?, ?, ?)`,
      goal.id,
      goal.label,
      goal.targetAmount,
      goal.deadline,
      goal.allocatedAmount
    );
  }

  for (const tx of transactions) {
    await db.runAsync(
      `INSERT INTO savings_transactions (
        id, direction, amount, goal_id, note, date, linked_ledger_tx_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      tx.id,
      tx.direction,
      tx.amount,
      tx.goalId,
      tx.note,
      tx.date,
      tx.linkedLedgerTxId
    );
  }
}

async function replaceAssetEntries(db: SQLiteDatabase, assetEntries: AssetEntry[]) {
  await db.runAsync("DELETE FROM asset_entries");
  for (const entry of assetEntries) {
    await db.runAsync(
      `INSERT INTO asset_entries (
        id, label, value, type, is_manual
      ) VALUES (?, ?, ?, ?, ?)`,
      entry.id,
      entry.label,
      entry.value,
      entry.type,
      toInt(entry.isManual)
    );
  }
}

async function replaceOweEntries(db: SQLiteDatabase, oweEntries: OweEntry[]) {
  await db.runAsync("DELETE FROM owe_repayments");
  await db.runAsync("DELETE FROM owe_entries");

  for (const entry of oweEntries) {
    await db.runAsync(
      `INSERT INTO owe_entries (
        id, person_name, original_amount, remaining_amount, reason, date_borrowed, due_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      entry.id,
      entry.personName,
      entry.originalAmount,
      entry.remainingAmount,
      entry.reason,
      entry.dateBorrowed,
      entry.dueDate,
      entry.status
    );

    for (const repayment of entry.repayments) {
      await db.runAsync(
        `INSERT INTO owe_repayments (
          id, owe_id, amount, date, ledger_tx_id
        ) VALUES (?, ?, ?, ?, ?)`,
        repayment.id,
        entry.id,
        repayment.amount,
        repayment.date,
        repayment.ledgerTxId
      );
    }
  }
}

async function replaceLendEntries(db: SQLiteDatabase, lendEntries: LendEntry[]) {
  await db.runAsync("DELETE FROM lend_repayments");
  await db.runAsync("DELETE FROM lend_entries");

  for (const entry of lendEntries) {
    await db.runAsync(
      `INSERT INTO lend_entries (
        id, person_name, original_amount, remaining_amount, reason, date_lent, expected_return_date, status, count_in_net_worth
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      entry.id,
      entry.personName,
      entry.originalAmount,
      entry.remainingAmount,
      entry.reason,
      entry.dateLent,
      entry.expectedReturnDate,
      entry.status,
      toInt(entry.countInNetWorth)
    );

    for (const repayment of entry.repayments) {
      await db.runAsync(
        `INSERT INTO lend_repayments (
          id, lend_id, amount, date, ledger_tx_id
        ) VALUES (?, ?, ?, ?, ?)`,
        repayment.id,
        entry.id,
        repayment.amount,
        repayment.date,
        repayment.ledgerTxId
      );
    }
  }
}

async function replaceBudgetEnvelopes(db: SQLiteDatabase, budgetEnvelopes: BudgetEnvelope[]) {
  await db.runAsync("DELETE FROM budget_envelopes");
  for (const envelope of budgetEnvelopes) {
    await db.runAsync(
      `INSERT INTO budget_envelopes (
        id, category, monthly_limit, applies_to
      ) VALUES (?, ?, ?, ?)`,
      envelope.id,
      envelope.category,
      envelope.monthlyLimit,
      envelope.appliesTo
    );
  }
}

async function replaceRecurringTemplates(db: SQLiteDatabase, recurringTemplates: RecurringTemplate[]) {
  await db.runAsync("DELETE FROM recurring_templates");
  for (const template of recurringTemplates) {
    await db.runAsync(
      `INSERT INTO recurring_templates (
        id, type, amount, category, note, frequency, start_date, last_generated_date, active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      template.id,
      template.type,
      template.amount,
      template.category,
      template.note,
      template.frequency,
      template.startDate,
      template.lastGeneratedDate,
      toInt(template.active)
    );
  }
}

async function loadSettingsRow(db: SQLiteDatabase): Promise<SettingsRow> {
  const row = await db.getFirstAsync<SettingsRow>(
    `SELECT
      pin,
      biometric_enabled,
      auto_backup_enabled,
      auto_backup_encrypted,
      auto_backup_folder_uri,
      auto_backup_password,
      last_backup_time,
      last_backup_path,
      theme,
      auto_lock_minutes,
      default_currency_code,
      language,
      font_size_percent,
      font_weight
     FROM app_settings
     WHERE id = ?`,
    SETTINGS_ROW_ID
  );

  return (
    row ?? {
      pin: null,
      biometric_enabled: 0,
      auto_backup_enabled: 0,
      auto_backup_encrypted: 0,
      auto_backup_folder_uri: null,
      auto_backup_password: null,
      last_backup_time: null,
      last_backup_path: null,
      theme: DEFAULT_THEME,
      auto_lock_minutes: null,
      default_currency_code: DEFAULT_CURRENCY_CODE,
      language: DEFAULT_LANGUAGE,
      font_size_percent: 0,
      font_weight: "default",
    }
  );
}

async function buildStateFromDb(db: SQLiteDatabase, settings: SettingsRow): Promise<PersistedState> {
  const transactions = await db.getAllAsync<Transaction>(
    `SELECT
      id,
      type,
      amount,
      category,
      note,
      date,
      time,
      subtype,
      recurring_template_id as recurringTemplateId
     FROM transactions
     ORDER BY date DESC, id DESC`
  );

  const savingsGoals = await db.getAllAsync<SavingsGoal>(
    `SELECT
      id,
      label,
      target_amount as targetAmount,
      deadline,
      allocated_amount as allocatedAmount
     FROM savings_goals
     ORDER BY label ASC`
  );

  const savingsTransactions = await db.getAllAsync<SavingsTransaction>(
    `SELECT
      id,
      direction,
      amount,
      goal_id as goalId,
      note,
      date,
      linked_ledger_tx_id as linkedLedgerTxId
     FROM savings_transactions
     ORDER BY date DESC, id DESC`
  );

  const assetEntries = (
    await db.getAllAsync<
      Omit<AssetEntry, "isManual"> & { is_manual: number }
    >(
      `SELECT
        id,
        label,
        value,
        type,
        is_manual
       FROM asset_entries
       ORDER BY label ASC`
    )
  ).map((entry) => ({
    ...entry,
    isManual: toBool(entry.is_manual),
  }));

  const oweBase = await db.getAllAsync<
    Omit<OweEntry, "personName" | "dateBorrowed" | "dueDate" | "repayments"> & {
      person_name: string;
      date_borrowed: string;
      due_date: string | null;
    }
  >(
    `SELECT
      id,
      person_name,
      original_amount as originalAmount,
      remaining_amount as remainingAmount,
      reason,
      date_borrowed,
      due_date,
      status
     FROM owe_entries
     ORDER BY date_borrowed DESC, id DESC`
  );

  const oweRepayments = await db.getAllAsync<OweRepaymentRow>(
    `SELECT
      id,
      owe_id,
      amount,
      date,
      ledger_tx_id
     FROM owe_repayments
     ORDER BY date DESC, id DESC`
  );

  const oweRepaymentsByEntry = new Map<string, OweRepayment[]>();
  for (const row of oweRepayments) {
    const list = oweRepaymentsByEntry.get(row.owe_id) ?? [];
    list.push({
      id: row.id,
      amount: row.amount,
      date: row.date,
      ledgerTxId: row.ledger_tx_id,
    });
    oweRepaymentsByEntry.set(row.owe_id, list);
  }

  const oweEntries: OweEntry[] = oweBase.map((entry) => ({
    id: entry.id,
    personName: entry.person_name,
    originalAmount: entry.originalAmount,
    remainingAmount: entry.remainingAmount,
    reason: entry.reason,
    dateBorrowed: entry.date_borrowed,
    dueDate: entry.due_date,
    status: entry.status,
    repayments: oweRepaymentsByEntry.get(entry.id) ?? [],
  }));

  const lendBase = await db.getAllAsync<
    Omit<LendEntry, "personName" | "dateLent" | "expectedReturnDate" | "countInNetWorth" | "repayments"> & {
      person_name: string;
      date_lent: string;
      expected_return_date: string | null;
      count_in_net_worth: number;
    }
  >(
    `SELECT
      id,
      person_name,
      original_amount as originalAmount,
      remaining_amount as remainingAmount,
      reason,
      date_lent,
      expected_return_date,
      status,
      count_in_net_worth
     FROM lend_entries
     ORDER BY date_lent DESC, id DESC`
  );

  const lendRepayments = await db.getAllAsync<LendRepaymentRow>(
    `SELECT
      id,
      lend_id,
      amount,
      date,
      ledger_tx_id
     FROM lend_repayments
     ORDER BY date DESC, id DESC`
  );

  const lendRepaymentsByEntry = new Map<string, LendRepayment[]>();
  for (const row of lendRepayments) {
    const list = lendRepaymentsByEntry.get(row.lend_id) ?? [];
    list.push({
      id: row.id,
      amount: row.amount,
      date: row.date,
      ledgerTxId: row.ledger_tx_id,
    });
    lendRepaymentsByEntry.set(row.lend_id, list);
  }

  const lendEntries: LendEntry[] = lendBase.map((entry) => ({
    id: entry.id,
    personName: entry.person_name,
    originalAmount: entry.originalAmount,
    remainingAmount: entry.remainingAmount,
    reason: entry.reason,
    dateLent: entry.date_lent,
    expectedReturnDate: entry.expected_return_date,
    status: entry.status,
    countInNetWorth: toBool(entry.count_in_net_worth),
    repayments: lendRepaymentsByEntry.get(entry.id) ?? [],
  }));

  const budgetEnvelopes = await db.getAllAsync<BudgetEnvelope>(
    `SELECT
      id,
      category,
      monthly_limit as monthlyLimit,
      applies_to as appliesTo
     FROM budget_envelopes
     ORDER BY category ASC`
  );

  const recurringTemplates = (
    await db.getAllAsync<
      Omit<RecurringTemplate, "startDate" | "lastGeneratedDate" | "active"> & {
        start_date: string;
        last_generated_date: string | null;
        active: number;
      }
    >(
      `SELECT
        id,
        type,
        amount,
        category,
        note,
        frequency,
        start_date,
        last_generated_date,
        active
       FROM recurring_templates
       ORDER BY start_date DESC, id DESC`
    )
  ).map((template) => ({
    ...template,
    startDate: template.start_date,
    lastGeneratedDate: template.last_generated_date,
    active: toBool(template.active),
  }));

  return {
    transactions,
    savingsTransactions,
    savingsGoals,
    assetEntries,
    oweEntries,
    lendEntries,
    budgetEnvelopes,
    recurringTemplates,
    appSettings: {
      theme: settings.theme,
      autoLockMinutes: settings.auto_lock_minutes,
      defaultCurrencyCode: settings.default_currency_code,
      language: settings.language,
      fontSizePercent: settings.font_size_percent,
      fontWeight: settings.font_weight,
    },
    currency: {
      code: settings.default_currency_code,
      symbol: CURRENCY_SYMBOLS[settings.default_currency_code] ?? settings.default_currency_code,
    },
    biometricEnabled: toBool(settings.biometric_enabled),
    autoBackupEnabled: toBool(settings.auto_backup_enabled),
    autoBackupEncrypted: toBool(settings.auto_backup_encrypted),
    autoBackupFolderUri: settings.auto_backup_folder_uri,
    autoBackupPassword: settings.auto_backup_password,
    lastBackupTime: settings.last_backup_time,
    lastBackupPath: settings.last_backup_path,
  };
}

export async function hasStoredVault(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const db = await getDb();
    const row = await loadSettingsRow(db);
    return !!row.pin;
  } catch {
    return false;
  }
}

export async function loadStoredPin(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    const db = await getDb();
    const settings = await loadSettingsRow(db);
    return settings.pin ?? null;
  } catch {
    return null;
  }
}

export async function loadStoredSecurityState(): Promise<{
  pin: string | null;
  biometricEnabled: boolean;
}> {
  if (Platform.OS === "web") {
    return {
      pin: null,
      biometricEnabled: false,
    };
  }
  try {
    const db = await getDb();
    const settings = await loadSettingsRow(db);
    return {
      pin: settings.pin ?? null,
      biometricEnabled: toBool(settings.biometric_enabled),
    };
  } catch {
    return {
      pin: null,
      biometricEnabled: false,
    };
  }
}

export async function loadVault(pin: string): Promise<Record<string, any> | null> {
  if (Platform.OS === "web") return null;
  try {
    const db = await getDb();
    const settings = await loadSettingsRow(db);
    if (!settings.pin || settings.pin !== pin) return null;
    const state = await buildStateFromDb(db, settings);
    lastSavedPin = pin;
    lastSavedState = clonePersistedState(state);
    return state;
  } catch (e) {
    console.warn("[Storage] loadVault error:", e);
    return null;
  }
}

export async function saveVault(
  pin: string,
  data: Record<string, any>
): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const db = await getDb();
    const state = data as PersistedState;
    const settingsChanged = hasSettingsChanges(lastSavedState, pin, state);
    const transactionsChanged = !lastSavedState || lastSavedState.transactions !== state.transactions;
    const savingsChanged =
      !lastSavedState ||
      lastSavedState.savingsGoals !== state.savingsGoals ||
      lastSavedState.savingsTransactions !== state.savingsTransactions;
    const assetsChanged = !lastSavedState || lastSavedState.assetEntries !== state.assetEntries;
    const oweChanged = !lastSavedState || lastSavedState.oweEntries !== state.oweEntries;
    const lendChanged = !lastSavedState || lastSavedState.lendEntries !== state.lendEntries;
    const budgetsChanged =
      !lastSavedState || lastSavedState.budgetEnvelopes !== state.budgetEnvelopes;
    const recurringChanged =
      !lastSavedState || lastSavedState.recurringTemplates !== state.recurringTemplates;

    if (
      !settingsChanged &&
      !transactionsChanged &&
      !savingsChanged &&
      !assetsChanged &&
      !oweChanged &&
      !lendChanged &&
      !budgetsChanged &&
      !recurringChanged &&
      !hasTableChanges(lastSavedState, state)
    ) {
      return;
    }

    await withTransaction(db, async () => {
      if (settingsChanged) {
        await db.runAsync(
          `UPDATE app_settings
           SET pin = ?,
               biometric_enabled = ?,
               auto_backup_enabled = ?,
               auto_backup_encrypted = ?,
               auto_backup_folder_uri = ?,
               auto_backup_password = ?,
               last_backup_time = ?,
               last_backup_path = ?,
               theme = ?,
               auto_lock_minutes = ?,
               default_currency_code = ?,
               language = ?,
               font_size_percent = ?,
               font_weight = ?
           WHERE id = ?`,
          pin,
          toInt(state.biometricEnabled),
          toInt(state.autoBackupEnabled),
          toInt(state.autoBackupEncrypted),
          state.autoBackupFolderUri,
          state.autoBackupPassword,
          state.lastBackupTime,
          state.lastBackupPath,
          state.appSettings.theme,
          state.appSettings.autoLockMinutes,
          state.currency.code,
          state.appSettings.language,
          state.appSettings.fontSizePercent,
          state.appSettings.fontWeight,
          SETTINGS_ROW_ID
        );
      }

      if (transactionsChanged) {
        await replaceTransactions(db, state.transactions);
      }
      if (savingsChanged) {
        await replaceSavings(db, state.savingsGoals, state.savingsTransactions);
      }
      if (assetsChanged) {
        await replaceAssetEntries(db, state.assetEntries);
      }
      if (oweChanged) {
        await replaceOweEntries(db, state.oweEntries);
      }
      if (lendChanged) {
        await replaceLendEntries(db, state.lendEntries);
      }
      if (budgetsChanged) {
        await replaceBudgetEnvelopes(db, state.budgetEnvelopes);
      }
      if (recurringChanged) {
        await replaceRecurringTemplates(db, state.recurringTemplates);
      }
    });

    lastSavedPin = pin;
    lastSavedState = clonePersistedState(state);
  } catch (e) {
    console.warn("[Storage] saveVault error:", e);
  }
}

export async function deleteVault(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const db = await getDb();
    await withTransaction(db, async () => {
      await db.runAsync("DELETE FROM transactions");
      await db.runAsync("DELETE FROM savings_transactions");
      await db.runAsync("DELETE FROM savings_goals");
      await db.runAsync("DELETE FROM asset_entries");
      await db.runAsync("DELETE FROM owe_repayments");
      await db.runAsync("DELETE FROM owe_entries");
      await db.runAsync("DELETE FROM lend_repayments");
      await db.runAsync("DELETE FROM lend_entries");
      await db.runAsync("DELETE FROM budget_envelopes");
      await db.runAsync("DELETE FROM recurring_templates");
      await db.runAsync(
        `UPDATE app_settings
         SET pin = NULL,
             biometric_enabled = 0,
             auto_backup_enabled = 0,
             auto_backup_encrypted = 0,
             auto_backup_folder_uri = NULL,
             auto_backup_password = NULL,
             last_backup_time = NULL,
             last_backup_path = NULL,
             theme = ?,
             auto_lock_minutes = NULL,
             default_currency_code = ?,
             language = ?,
             font_size_percent = 0,
             font_weight = 'default'
         WHERE id = ?`,
        DEFAULT_THEME,
        DEFAULT_CURRENCY_CODE,
        DEFAULT_LANGUAGE,
        SETTINGS_ROW_ID
      );
    });
    lastSavedPin = null;
    lastSavedState = null;
  } catch (e) {
    console.warn("[Storage] deleteVault error:", e);
  }
}
