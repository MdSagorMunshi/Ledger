import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import { AppState, Platform } from "react-native";
import {
  loadStoredSecurityState,
  loadVault,
  saveVault,
  deleteVault,
} from "@/utils/storage";

export type TransactionType = "income" | "expense";

export const INCOME_CATEGORIES = [
  "Salary",
  "Freelance",
  "Investment",
  "Gift",
  "Business",
  "Bonus",
  "Lend Returned",
  "Other",
] as const;

export const EXPENSE_CATEGORIES = [
  "Food",
  "Transport",
  "Housing",
  "Entertainment",
  "Shopping",
  "Health",
  "Education",
  "Bills",
  "Subscriptions",
  "Debt Repayment",
  "Other",
] as const;

export type Currency = {
  code: string;
  symbol: string;
};

export type AppLanguage =
  | "en"
  | "bn"
  | "hi"
  | "es"
  | "ja"
  | "fr"
  | "de"
  | "ar";

export const CURRENCIES: Currency[] = [
  { code: "BDT", symbol: "৳" },
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "JPY", symbol: "¥" },
  { code: "INR", symbol: "₹" },
];

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
  date: string;
  time?: string;
  subtype?:
    | "savings_transfer"
    | "savings_withdrawal"
    | "debt_repayment"
    | "lend_returned"
    | "asset_withdrawal";
  recurringTemplateId?: string;
}

export interface AssetEntry {
  id: string;
  label: string;
  value: number;
  type: "asset" | "liability";
  isManual: boolean;
}

export interface SavingsGoal {
  id: string;
  label: string;
  targetAmount: number | null;
  deadline: string | null;
  allocatedAmount: number;
}

export interface SavingsTransaction {
  id: string;
  direction: "in" | "out";
  amount: number;
  goalId: string | null;
  note: string;
  date: string;
  linkedLedgerTxId: string | null;
}

export interface OweRepayment {
  id: string;
  amount: number;
  date: string;
  ledgerTxId: string;
}

export interface OweEntry {
  id: string;
  personName: string;
  originalAmount: number;
  remainingAmount: number;
  reason: string;
  dateBorrowed: string;
  dueDate: string | null;
  status: "unpaid" | "partial" | "settled";
  repayments: OweRepayment[];
}

export interface LendRepayment {
  id: string;
  amount: number;
  date: string;
  ledgerTxId: string;
}

export interface LendEntry {
  id: string;
  personName: string;
  originalAmount: number;
  remainingAmount: number;
  reason: string;
  dateLent: string;
  expectedReturnDate: string | null;
  status: "outstanding" | "partial" | "returned";
  countInNetWorth: boolean;
  repayments: LendRepayment[];
}

export interface BudgetEnvelope {
  id: string;
  category: string;
  monthlyLimit: number;
  appliesTo: "expense";
}

export interface RecurringTemplate {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  note: string;
  frequency: "daily" | "weekly" | "monthly";
  startDate: string;
  lastGeneratedDate: string | null;
  active: boolean;
}

export interface AppSettings {
  autoLockMinutes: number | null;
  theme: "dark" | "dim" | "oled";
  defaultCurrencyCode: string;
  language: AppLanguage;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function addWeeks(dateStr: string, n: number): string {
  return addDays(dateStr, n * 7);
}

function addMonths(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}

function generateRecurringTransactions(
  templates: RecurringTemplate[],
  today: string
): { newTxs: Omit<Transaction, "id">[]; updatedTemplates: RecurringTemplate[] } {
  const newTxs: Omit<Transaction, "id">[] = [];
  const updatedTemplates: RecurringTemplate[] = templates.map((t) => {
    if (!t.active) return t;
    const from = t.lastGeneratedDate
      ? addDays(t.lastGeneratedDate, 1)
      : t.startDate;
    if (from > today) return t;
    let dates: string[] = [];
    let cursor = from;
    while (cursor <= today) {
      dates.push(cursor);
      if (t.frequency === "daily") cursor = addDays(cursor, 1);
      else if (t.frequency === "weekly") cursor = addWeeks(cursor, 1);
      else cursor = addMonths(cursor, 1);
    }
    dates.forEach((date) => {
      newTxs.push({
        type: t.type,
        amount: t.amount,
        category: t.category,
        note: t.note || "",
        date,
        recurringTemplateId: t.id,
      });
    });
    return { ...t, lastGeneratedDate: today };
  });
  return { newTxs, updatedTemplates };
}

interface LedgerState {
  transactions: Transaction[];
  pin: string | null;
  isUnlocked: boolean;
  currency: Currency;
  lastAddedId: string | null;
  biometricEnabled: boolean;
  autoBackupEnabled: boolean;
  autoBackupFolderUri: string | null;
  autoBackupPassword: string | null;
  lastBackupTime: string | null;
  lastBackupPath: string | null;
  savingsTransactions: SavingsTransaction[];
  savingsGoals: SavingsGoal[];
  assetEntries: AssetEntry[];
  oweEntries: OweEntry[];
  lendEntries: LendEntry[];
  budgetEnvelopes: BudgetEnvelope[];
  recurringTemplates: RecurringTemplate[];
  appSettings: AppSettings;
  isHydrated: boolean;
}

interface LedgerContextValue extends LedgerState {
  setupPin: (pin: string) => void;
  unlock: (pin: string) => boolean;
  lock: () => void;
  changePin: (newPin: string) => void;
  wipeData: () => void;
  addTransaction: (tx: Omit<Transaction, "id">) => string;
  removeTransaction: (id: string) => void;
  setCurrency: (currency: Currency) => void;
  loadTransactions: (txs: Transaction[]) => void;
  formatAmount: (amount: number) => string;
  setBiometricEnabled: (enabled: boolean) => void;
  setAutoBackupEnabled: (enabled: boolean) => void;
  setAutoBackupFolderUri: (uri: string | null) => void;
  setAutoBackupPassword: (password: string | null) => void;
  recordBackupResult: (time: string, path: string) => void;
  addSavingsTransaction: (st: Omit<SavingsTransaction, "id">) => void;
  addSavingsGoal: (g: Omit<SavingsGoal, "id">) => void;
  deleteSavingsGoal: (id: string) => void;
  addAssetEntry: (a: Omit<AssetEntry, "id">) => void;
  updateAssetEntry: (id: string, updates: Partial<AssetEntry>) => void;
  deleteAssetEntry: (id: string) => void;
  addOweEntry: (o: Omit<OweEntry, "id">) => void;
  updateOweEntry: (
    id: string,
    updates: Partial<Omit<OweEntry, "id" | "repayments">>
  ) => void;
  deleteOweEntry: (id: string) => void;
  repayOweEntry: (oweId: string, repayment: Omit<OweRepayment, "id">) => void;
  addLendEntry: (l: Omit<LendEntry, "id">) => void;
  updateLendEntry: (
    id: string,
    updates: Partial<Omit<LendEntry, "id" | "repayments">>
  ) => void;
  deleteLendEntry: (id: string) => void;
  repayLendEntry: (lendId: string, repayment: Omit<LendRepayment, "id">) => void;
  toggleLendNetWorth: (lendId: string) => void;
  addBudgetEnvelope: (b: Omit<BudgetEnvelope, "id">) => void;
  deleteBudgetEnvelope: (id: string) => void;
  addRecurringTemplate: (t: Omit<RecurringTemplate, "id">) => void;
  toggleRecurringTemplate: (id: string) => void;
  deleteRecurringTemplate: (id: string) => void;
  updateAppSettings: (updates: Partial<AppSettings>) => void;
  loadFullState: (state: Partial<LedgerState>) => void;
  resetLastActivity: () => void;
  lastActivityRef: React.MutableRefObject<number>;
  isHydrated: boolean;
  persistNow: () => Promise<void>;
}

const LedgerContext = createContext<LedgerContextValue | null>(null);

const DEFAULT_SETTINGS: AppSettings = {
  autoLockMinutes: null,
  theme: "dark",
  defaultCurrencyCode: "BDT",
  language: "en",
};

export function LedgerProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pin, setPin] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [currency, setCurrencyState] = useState<Currency>(CURRENCIES[0]);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [autoBackupEnabled, setAutoBackupEnabledState] = useState(false);
  const [autoBackupFolderUri, setAutoBackupFolderUriState] = useState<string | null>(null);
  const [autoBackupPassword, setAutoBackupPasswordState] = useState<string | null>(null);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);
  const [lastBackupPath, setLastBackupPath] = useState<string | null>(null);
  const [savingsTransactions, setSavingsTransactions] = useState<SavingsTransaction[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [assetEntries, setAssetEntries] = useState<AssetEntry[]>([]);
  const [oweEntries, setOweEntries] = useState<OweEntry[]>([]);
  const [lendEntries, setLendEntries] = useState<LendEntry[]>([]);
  const [budgetEnvelopes, setBudgetEnvelopes] = useState<BudgetEnvelope[]>([]);
  const [recurringTemplates, setRecurringTemplates] = useState<RecurringTemplate[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isHydrated, setIsHydrated] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pinRef = useRef<string | null>(null);

  // Keep pinRef in sync
  useEffect(() => { pinRef.current = pin; }, [pin]);

  // Hydrate security state on mount so the lock screen can prompt for biometrics immediately.
  useEffect(() => {
    (async () => {
      const storedSecurity = await loadStoredSecurityState();
      if (storedSecurity.pin) {
        setPin(storedSecurity.pin);
        pinRef.current = storedSecurity.pin;
      }
      setBiometricEnabledState(storedSecurity.biometricEnabled);
      setIsHydrated(true);
    })();
  }, []);

  const buildPersistedState = useCallback(
    () => ({
      transactions,
      savingsTransactions,
      savingsGoals,
      assetEntries,
      oweEntries,
      lendEntries,
      budgetEnvelopes,
      recurringTemplates,
      appSettings,
      currency,
      biometricEnabled,
      autoBackupEnabled,
      autoBackupFolderUri,
      autoBackupPassword,
      lastBackupTime,
      lastBackupPath,
    }),
    [
      transactions,
      savingsTransactions,
      savingsGoals,
      assetEntries,
      oweEntries,
      lendEntries,
      budgetEnvelopes,
      recurringTemplates,
      appSettings,
      currency,
      biometricEnabled,
      autoBackupEnabled,
      autoBackupFolderUri,
      autoBackupPassword,
      lastBackupTime,
      lastBackupPath,
    ]
  );

  // Debounced persist helper
  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      const currentPin = pinRef.current;
      if (!currentPin) return;
      void saveVault(currentPin, buildPersistedState());
    }, 500);
  }, [buildPersistedState]);

  // Auto-save whenever state changes (only when unlocked and hydrated)
  useEffect(() => {
    if (isHydrated && isUnlocked && pin) scheduleSave();
  }, [isHydrated, isUnlocked, pin, scheduleSave]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" || !isHydrated || !isUnlocked || !pinRef.current) {
        return;
      }
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      void saveVault(pinRef.current, buildPersistedState());
    });
    return () => subscription.remove();
  }, [buildPersistedState, isHydrated, isUnlocked]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const persistNow = useCallback(async () => {
    if (!pinRef.current) return;
    await saveVault(pinRef.current, buildPersistedState());
  }, [buildPersistedState]);

  const setupPin = useCallback((newPin: string) => {
    setPin(newPin);
    pinRef.current = newPin;
    setIsUnlocked(true);
    const today = todayStr();
    setRecurringTemplates((prev) => {
      const { newTxs, updatedTemplates } = generateRecurringTransactions(prev, today);
      if (newTxs.length > 0) {
        setTransactions((txPrev) => {
          const generated = newTxs.map((tx) => ({ ...tx, id: generateId() }));
          return [...generated, ...txPrev];
        });
      }
      return updatedTemplates;
    });
    // Save initial database state
    void saveVault(newPin, {
      transactions: [],
      savingsTransactions: [],
      savingsGoals: [],
      assetEntries: [],
      oweEntries: [],
      lendEntries: [],
      budgetEnvelopes: [],
      recurringTemplates: [],
      appSettings: DEFAULT_SETTINGS,
      currency: CURRENCIES[0],
      biometricEnabled: false,
      autoBackupEnabled: false,
      autoBackupFolderUri: null,
      autoBackupPassword: null,
      lastBackupTime: null,
      lastBackupPath: null,
    });
  }, []);

  const unlock = useCallback(
    (attempt: string): boolean => {
      if (attempt === pin) {
        // Load persisted state from local storage
        loadVault(attempt).then((stored) => {
          if (stored) {
            if (stored.transactions) setTransactions(stored.transactions);
            if (stored.savingsTransactions) setSavingsTransactions(stored.savingsTransactions);
            if (stored.savingsGoals) setSavingsGoals(stored.savingsGoals);
            if (stored.assetEntries) setAssetEntries(stored.assetEntries);
            if (stored.oweEntries) setOweEntries(stored.oweEntries);
            if (stored.lendEntries) setLendEntries(stored.lendEntries);
            if (stored.budgetEnvelopes) setBudgetEnvelopes(stored.budgetEnvelopes);
            if (stored.recurringTemplates) setRecurringTemplates(stored.recurringTemplates);
            if (stored.appSettings) {
              setAppSettings({ ...DEFAULT_SETTINGS, ...stored.appSettings });
            }
            if (stored.currency) setCurrencyState(stored.currency);
            if (stored.biometricEnabled !== undefined) setBiometricEnabledState(stored.biometricEnabled);
            if (stored.autoBackupEnabled !== undefined) setAutoBackupEnabledState(stored.autoBackupEnabled);
            if (stored.autoBackupFolderUri !== undefined) setAutoBackupFolderUriState(stored.autoBackupFolderUri);
            if (stored.autoBackupPassword !== undefined) setAutoBackupPasswordState(stored.autoBackupPassword);
            if (stored.lastBackupTime !== undefined) setLastBackupTime(stored.lastBackupTime);
            if (stored.lastBackupPath !== undefined) setLastBackupPath(stored.lastBackupPath);
          }
          // Generate recurring after loading
          const today = todayStr();
          setRecurringTemplates((prev) => {
            const { newTxs, updatedTemplates } = generateRecurringTransactions(prev, today);
            if (newTxs.length > 0) {
              setTransactions((txPrev) => {
                const generated = newTxs.map((tx) => ({ ...tx, id: generateId() }));
                return [...generated, ...txPrev];
              });
            }
            return updatedTemplates;
          });
        });
        setIsUnlocked(true);
        lastActivityRef.current = Date.now();
        return true;
      }
      return false;
    },
    [pin]
  );

  const lock = useCallback(() => {
    setIsUnlocked(false);
  }, []);

  const changePin = useCallback((newPin: string) => {
    setPin(newPin);
    pinRef.current = newPin;
  }, []);

  const wipeData = useCallback(() => {
    setTransactions([]);
    setSavingsTransactions([]);
    setSavingsGoals([]);
    setAssetEntries([]);
    setOweEntries([]);
    setLendEntries([]);
    setBudgetEnvelopes([]);
    setRecurringTemplates([]);
    setLastAddedId(null);
    deleteVault();
  }, []);

  const addTransaction = useCallback((tx: Omit<Transaction, "id">): string => {
    const id = generateId();
    setTransactions((prev) => [{ ...tx, id }, ...prev]);
    setLastAddedId(id);
    return id;
  }, []);

  const removeTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
  }, []);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
  }, []);

  const loadTransactions = useCallback((txs: Transaction[]) => {
    setTransactions(txs);
  }, []);

  const formatAmount = useCallback(
    (amount: number): string => {
      const sym = currency.symbol;
      if (currency.code === "JPY") {
        return `${sym}${Math.round(amount).toLocaleString()}`;
      }
      return `${sym}${amount.toFixed(2)}`;
    },
    [currency]
  );

  const setBiometricEnabled = useCallback((enabled: boolean) => {
    setBiometricEnabledState(enabled);
  }, []);

  const setAutoBackupEnabled = useCallback((enabled: boolean) => {
    setAutoBackupEnabledState(enabled);
  }, []);

  const setAutoBackupFolderUri = useCallback((uri: string | null) => {
    setAutoBackupFolderUriState(uri);
  }, []);

  const setAutoBackupPassword = useCallback((password: string | null) => {
    setAutoBackupPasswordState(password);
  }, []);

  const recordBackupResult = useCallback((time: string, path: string) => {
    setLastBackupTime(time);
    setLastBackupPath(path);
  }, []);

  const addSavingsTransaction = useCallback((st: Omit<SavingsTransaction, "id">) => {
    const id = generateId();
    setSavingsTransactions((prev) => [{ ...st, id }, ...prev]);
    if (st.goalId) {
      setSavingsGoals((prev) =>
        prev.map((g) =>
          g.id === st.goalId
            ? { ...g, allocatedAmount: g.allocatedAmount + (st.direction === "in" ? st.amount : -st.amount) }
            : g
        )
      );
    }
  }, []);

  const addSavingsGoal = useCallback((g: Omit<SavingsGoal, "id">) => {
    const id = generateId();
    setSavingsGoals((prev) => [...prev, { ...g, id }]);
  }, []);

  const deleteSavingsGoal = useCallback((id: string) => {
    setSavingsGoals((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const addAssetEntry = useCallback((a: Omit<AssetEntry, "id">) => {
    const id = generateId();
    setAssetEntries((prev) => [...prev, { ...a, id }]);
  }, []);

  const updateAssetEntry = useCallback((id: string, updates: Partial<AssetEntry>) => {
    setAssetEntries((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  }, []);

  const deleteAssetEntry = useCallback((id: string) => {
    setAssetEntries((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const addOweEntry = useCallback((o: Omit<OweEntry, "id">) => {
    const id = generateId();
    setOweEntries((prev) => [{ ...o, id }, ...prev]);
  }, []);

  const updateOweEntry = useCallback(
    (
      id: string,
      updates: Partial<Omit<OweEntry, "id" | "repayments">>
    ) => {
      setOweEntries((prev) =>
        prev.map((entry) => {
          if (entry.id !== id) return entry;
          const nextOriginalAmount =
            updates.originalAmount ?? entry.originalAmount;
          const nextRemainingAmount =
            updates.remainingAmount ?? entry.remainingAmount;
          const nextStatus =
            updates.status ??
            (nextRemainingAmount <= 0
              ? "settled"
              : nextRemainingAmount < nextOriginalAmount
              ? "partial"
              : "unpaid");

          return {
            ...entry,
            ...updates,
            originalAmount: nextOriginalAmount,
            remainingAmount: nextRemainingAmount,
            status: nextStatus,
          };
        })
      );
    },
    []
  );

  const deleteOweEntry = useCallback((id: string) => {
    setOweEntries((prev) => {
      const target = prev.find((entry) => entry.id === id);
      if (target) {
        const repaymentTxIds = new Set(
          target.repayments.map((repayment) => repayment.ledgerTxId)
        );
        if (repaymentTxIds.size > 0) {
          setTransactions((current) =>
            current.filter((tx) => !repaymentTxIds.has(tx.id))
          );
        }
      }
      return prev.filter((entry) => entry.id !== id);
    });
  }, []);

  const repayOweEntry = useCallback(
    (oweId: string, repayment: Omit<OweRepayment, "id">) => {
      const repId = generateId();
      setOweEntries((prev) =>
        prev.map((o) => {
          if (o.id !== oweId) return o;
          const newRemaining = Math.max(0, o.remainingAmount - repayment.amount);
          const newStatus: OweEntry["status"] =
            newRemaining <= 0 ? "settled" : "partial";
          return {
            ...o,
            remainingAmount: newRemaining,
            status: newStatus,
            repayments: [...o.repayments, { ...repayment, id: repId }],
          };
        })
      );
    },
    []
  );

  const addLendEntry = useCallback((l: Omit<LendEntry, "id">) => {
    const id = generateId();
    setLendEntries((prev) => [{ ...l, id }, ...prev]);
  }, []);

  const updateLendEntry = useCallback(
    (
      id: string,
      updates: Partial<Omit<LendEntry, "id" | "repayments">>
    ) => {
      setLendEntries((prev) =>
        prev.map((entry) => {
          if (entry.id !== id) return entry;
          const nextOriginalAmount =
            updates.originalAmount ?? entry.originalAmount;
          const nextRemainingAmount =
            updates.remainingAmount ?? entry.remainingAmount;
          const nextStatus =
            updates.status ??
            (nextRemainingAmount <= 0
              ? "returned"
              : nextRemainingAmount < nextOriginalAmount
              ? "partial"
              : "outstanding");

          return {
            ...entry,
            ...updates,
            originalAmount: nextOriginalAmount,
            remainingAmount: nextRemainingAmount,
            status: nextStatus,
          };
        })
      );
    },
    []
  );

  const deleteLendEntry = useCallback((id: string) => {
    setLendEntries((prev) => {
      const target = prev.find((entry) => entry.id === id);
      if (target) {
        const repaymentTxIds = new Set(
          target.repayments.map((repayment) => repayment.ledgerTxId)
        );
        if (repaymentTxIds.size > 0) {
          setTransactions((current) =>
            current.filter((tx) => !repaymentTxIds.has(tx.id))
          );
        }
      }
      return prev.filter((entry) => entry.id !== id);
    });
  }, []);

  const repayLendEntry = useCallback(
    (lendId: string, repayment: Omit<LendRepayment, "id">) => {
      const repId = generateId();
      setLendEntries((prev) =>
        prev.map((l) => {
          if (l.id !== lendId) return l;
          const newRemaining = Math.max(0, l.remainingAmount - repayment.amount);
          const newStatus: LendEntry["status"] =
            newRemaining <= 0 ? "returned" : "partial";
          return {
            ...l,
            remainingAmount: newRemaining,
            status: newStatus,
            repayments: [...l.repayments, { ...repayment, id: repId }],
          };
        })
      );
    },
    []
  );

  const toggleLendNetWorth = useCallback((lendId: string) => {
    setLendEntries((prev) =>
      prev.map((l) =>
        l.id === lendId ? { ...l, countInNetWorth: !l.countInNetWorth } : l
      )
    );
  }, []);

  const addBudgetEnvelope = useCallback((b: Omit<BudgetEnvelope, "id">) => {
    const id = generateId();
    setBudgetEnvelopes((prev) => [...prev, { ...b, id }]);
  }, []);

  const deleteBudgetEnvelope = useCallback((id: string) => {
    setBudgetEnvelopes((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const addRecurringTemplate = useCallback((t: Omit<RecurringTemplate, "id">) => {
    const id = generateId();
    setRecurringTemplates((prev) => [...prev, { ...t, id }]);
  }, []);

  const toggleRecurringTemplate = useCallback((id: string) => {
    setRecurringTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, active: !t.active } : t))
    );
  }, []);

  const deleteRecurringTemplate = useCallback((id: string) => {
    setRecurringTemplates((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateAppSettings = useCallback((updates: Partial<AppSettings>) => {
    setAppSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const loadFullState = useCallback((state: Partial<LedgerState>) => {
    if (state.transactions) setTransactions(state.transactions);
    if (state.savingsTransactions) setSavingsTransactions(state.savingsTransactions);
    if (state.savingsGoals) setSavingsGoals(state.savingsGoals);
    if (state.assetEntries) setAssetEntries(state.assetEntries);
    if (state.oweEntries) setOweEntries(state.oweEntries);
    if (state.lendEntries) setLendEntries(state.lendEntries);
    if (state.budgetEnvelopes) setBudgetEnvelopes(state.budgetEnvelopes);
    if (state.recurringTemplates) setRecurringTemplates(state.recurringTemplates);
    if (state.appSettings) setAppSettings({ ...DEFAULT_SETTINGS, ...state.appSettings });
    if (state.currency) setCurrencyState(state.currency);
  }, []);

  const resetLastActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const value = useMemo<LedgerContextValue>(
    () => ({
      transactions,
      pin,
      isUnlocked,
      currency,
      lastAddedId,
      biometricEnabled,
      autoBackupEnabled,
      autoBackupFolderUri,
      autoBackupPassword,
      lastBackupTime,
      lastBackupPath,
      savingsTransactions,
      savingsGoals,
      assetEntries,
      oweEntries,
      lendEntries,
      budgetEnvelopes,
      recurringTemplates,
      appSettings,
      setupPin,
      unlock,
      lock,
      changePin,
      wipeData,
      addTransaction,
      removeTransaction,
      setCurrency,
      loadTransactions,
      formatAmount,
      setBiometricEnabled,
      setAutoBackupEnabled,
      setAutoBackupFolderUri,
      setAutoBackupPassword,
      recordBackupResult,
      addSavingsTransaction,
      addSavingsGoal,
      deleteSavingsGoal,
      addAssetEntry,
      updateAssetEntry,
      deleteAssetEntry,
      addOweEntry,
      updateOweEntry,
      deleteOweEntry,
      repayOweEntry,
      addLendEntry,
      updateLendEntry,
      deleteLendEntry,
      repayLendEntry,
      toggleLendNetWorth,
      addBudgetEnvelope,
      deleteBudgetEnvelope,
      addRecurringTemplate,
      toggleRecurringTemplate,
      deleteRecurringTemplate,
      updateAppSettings,
      loadFullState,
      resetLastActivity,
      lastActivityRef,
      isHydrated,
      persistNow,
    }),
    [
      transactions,
      pin,
      isUnlocked,
      currency,
      lastAddedId,
      biometricEnabled,
      autoBackupEnabled,
      autoBackupFolderUri,
      autoBackupPassword,
      lastBackupTime,
      lastBackupPath,
      savingsTransactions,
      savingsGoals,
      assetEntries,
      oweEntries,
      lendEntries,
      budgetEnvelopes,
      recurringTemplates,
      appSettings,
      setupPin,
      unlock,
      lock,
      changePin,
      wipeData,
      addTransaction,
      removeTransaction,
      setCurrency,
      loadTransactions,
      formatAmount,
      setBiometricEnabled,
      setAutoBackupEnabled,
      setAutoBackupFolderUri,
      setAutoBackupPassword,
      recordBackupResult,
      addSavingsTransaction,
      addSavingsGoal,
      deleteSavingsGoal,
      addAssetEntry,
      updateAssetEntry,
      deleteAssetEntry,
      addOweEntry,
      updateOweEntry,
      deleteOweEntry,
      repayOweEntry,
      addLendEntry,
      updateLendEntry,
      deleteLendEntry,
      repayLendEntry,
      toggleLendNetWorth,
      addBudgetEnvelope,
      deleteBudgetEnvelope,
      addRecurringTemplate,
      toggleRecurringTemplate,
      deleteRecurringTemplate,
      updateAppSettings,
      loadFullState,
      resetLastActivity,
      isHydrated,
      persistNow,
    ]
  );

  return (
    <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>
  );
}

export function useLedger(): LedgerContextValue {
  const ctx = useContext(LedgerContext);
  if (!ctx) throw new Error("useLedger must be used inside LedgerProvider");
  return ctx;
}
