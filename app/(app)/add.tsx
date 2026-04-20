import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  Switch,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  useLedger,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  TransactionType,
} from "@/context/LedgerContext";
import { getThemeColors } from "@/constants/colors";

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nowTime(): string {
  const d = new Date();
  let h = d.getHours();
  const min = String(d.getMinutes()).padStart(2, "0");
  const sec = String(d.getSeconds()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${min}:${sec} ${ampm}`;
}

function FieldLabel({
  label,
  optional,
  C,
}: {
  label: string;
  optional?: boolean;
  C: ReturnType<typeof getThemeColors>;
}) {
  return (
    <View style={styles.fieldLabelRow}>
      <Text style={[styles.fieldLabel, { color: C.ghostText }]}>{label}</Text>
      {optional && <Text style={[styles.optionalLabel, { color: C.ghostText }]}>(OPTIONAL)</Text>}
    </View>
  );
}

const FREQ_OPTIONS: { label: string; value: "daily" | "weekly" | "monthly" }[] = [
  { label: "DAILY", value: "daily" },
  { label: "WEEKLY", value: "weekly" },
  { label: "MONTHLY", value: "monthly" },
];

type TransactionCategory =
  | (typeof INCOME_CATEGORIES)[number]
  | (typeof EXPENSE_CATEGORIES)[number];

export default function AddScreen() {
  const { addTransaction, addRecurringTemplate, currency, appSettings } = useLedger();
  const C = getThemeColors(appSettings.theme);

  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<TransactionCategory>(
    EXPENSE_CATEGORIES[0]
  );
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today());
  const [time, setTime] = useState(nowTime());
  const [amountError, setAmountError] = useState("");
  const amountShake = useRef(new Animated.Value(0)).current;

  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFreq, setRecurringFreq] = useState<"daily" | "weekly" | "monthly">("monthly");

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const setType2 = (t: TransactionType) => {
    setType(t);
    setCategory(t === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
  };

  const shakeAmount = () => {
    Animated.sequence([
      Animated.timing(amountShake, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(amountShake, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(amountShake, { toValue: 4, duration: 50, useNativeDriver: true }),
      Animated.timing(amountShake, { toValue: -4, duration: 50, useNativeDriver: true }),
      Animated.timing(amountShake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleNowTime = () => setTime(nowTime());

  const handleSubmit = () => {
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setAmountError("Enter a valid positive amount");
      shakeAmount();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setAmountError("");

    addTransaction({
      type,
      amount: parsed,
      category,
      note: note.trim(),
      date,
      time: time.trim() || undefined,
    });

    if (isRecurring) {
      addRecurringTemplate({
        type,
        amount: parsed,
        category,
        note: note.trim(),
        frequency: recurringFreq,
        startDate: date,
        lastGeneratedDate: date,
        active: true,
      });
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAmount("");
    setNote("");
    setTime(nowTime());
    setIsRecurring(false);
    router.navigate("/(app)/dashboard");
  };

  const typeColor = type === "income" ? C.creditGreen : C.debitRed;

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: C.forgeBlack }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.formCard, { backgroundColor: C.vaultDark, borderColor: C.wireGray }]}>
        <Text style={[styles.sectionLabel, { color: C.ghostText }]}>NEW TRANSACTION</Text>

        <View style={styles.typeToggle}>
          <TouchableOpacity
            style={[
              styles.typeBtn,
              { borderColor: C.wireGray },
              type === "income" && { borderColor: C.creditGreen, backgroundColor: "rgba(34,197,94,0.15)" },
            ]}
            onPress={() => setType2("income")}
          >
            <Feather name="arrow-up" size={14} color={type === "income" ? C.creditGreen : C.ghostText} />
            <Text style={[styles.typeBtnText, { color: type === "income" ? C.creditGreen : C.ghostText }]}>INCOME</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeBtn,
              { borderColor: C.wireGray },
              type === "expense" && { borderColor: C.debitRed, backgroundColor: "rgba(239,68,68,0.15)" },
            ]}
            onPress={() => setType2("expense")}
          >
            <Feather name="arrow-down" size={14} color={type === "expense" ? C.debitRed : C.ghostText} />
            <Text style={[styles.typeBtnText, { color: type === "expense" ? C.debitRed : C.ghostText }]}>EXPENSE</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.field}>
          <FieldLabel label="AMOUNT" C={C} />
          <Animated.View style={{ transform: [{ translateX: amountShake }] }}>
            <View style={[styles.amountInputWrapper, { backgroundColor: C.forgeBlack, borderColor: C.wireGray }]}>
              <Text style={[styles.currencySymbol, { color: C.slateText }]}>{currency.symbol}</Text>
              <TextInput
                style={[styles.amountInput, { color: C.cipherWhite }]}
                value={amount}
                onChangeText={(v) => { setAmount(v); setAmountError(""); }}
                placeholder="0.00"
                placeholderTextColor={C.ghostText}
                keyboardType="decimal-pad"
              />
            </View>
          </Animated.View>
          {!!amountError && <Text style={[styles.fieldError, { color: C.debitRed }]}>{amountError}</Text>}
        </View>

        <View style={styles.field}>
          <FieldLabel label="CATEGORY" C={C} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            <View style={styles.categoryRow}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    { borderColor: C.wireGray },
                    category === cat && { borderColor: typeColor, backgroundColor: `${typeColor}20` },
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.categoryChipText, { color: category === cat ? typeColor : C.slateText }]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.field}>
          <FieldLabel label="NOTE" optional C={C} />
          <TextInput
            style={[styles.input, { backgroundColor: C.forgeBlack, borderColor: C.wireGray, color: C.cipherWhite }]}
            value={note}
            onChangeText={setNote}
            placeholder="Describe this entry..."
            placeholderTextColor={C.ghostText}
          />
        </View>

        <View style={styles.field}>
          <FieldLabel label="DATE" C={C} />
          <TextInput
            style={[styles.input, { backgroundColor: C.forgeBlack, borderColor: C.wireGray, color: C.cipherWhite }]}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={C.ghostText}
          />
        </View>

        <View style={styles.field}>
          <View style={styles.fieldLabelRow}>
            <Text style={[styles.fieldLabel, { color: C.ghostText }]}>TIME</Text>
            <TouchableOpacity
              style={[styles.nowBtn, { borderColor: `${C.amberSignal}60` }]}
              onPress={handleNowTime}
            >
              <Feather name="clock" size={10} color={C.amberSignal} />
              <Text style={[styles.nowBtnText, { color: C.amberSignal }]}>NOW</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.input, { backgroundColor: C.forgeBlack, borderColor: C.wireGray, color: C.cipherWhite }]}
            value={time}
            onChangeText={setTime}
            placeholder="HH:MM:SS AM/PM"
            placeholderTextColor={C.ghostText}
            autoCapitalize="characters"
          />
          <Text style={[styles.timeHint, { color: C.ghostText }]}>{"Format: 09:42:07 AM — tap NOW to refresh"}</Text>
        </View>

        {/* RECURRING TOGGLE */}
        <View style={[styles.recurringSection, { borderColor: C.wireGray }]}>
          <View style={styles.recurringRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.recurringLabel, { color: C.cipherWhite }]}>RECURRING</Text>
              <Text style={[styles.recurringSub, { color: C.slateText }]}>Auto-generate this entry on a schedule</Text>
            </View>
            <Switch
              value={isRecurring}
              onValueChange={setIsRecurring}
              trackColor={{ false: C.wireGray, true: `${C.amberSignal}60` }}
              thumbColor={isRecurring ? C.amberSignal : C.slateText}
            />
          </View>
          {isRecurring && (
            <View style={styles.freqRow}>
              {FREQ_OPTIONS.map((f) => (
                <TouchableOpacity
                  key={f.value}
                  style={[
                    styles.freqChip,
                    { borderColor: recurringFreq === f.value ? C.amberSignal : C.wireGray },
                    recurringFreq === f.value && { backgroundColor: `${C.amberSignal}15` },
                  ]}
                  onPress={() => setRecurringFreq(f.value)}
                >
                  <Text style={[styles.freqChipText, { color: recurringFreq === f.value ? C.amberSignal : C.slateText }]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, { borderColor: C.amberSignal, backgroundColor: `${C.amberSignal}15` }]}
          onPress={handleSubmit}
        >
          <Text style={[styles.submitBtnText, { color: C.amberSignal }]}>+ RECORD TRANSACTION</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, alignItems: "center", paddingBottom: 32 },
  formCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    width: "100%",
    maxWidth: 480,
    gap: 16,
  },
  sectionLabel: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  typeToggle: { flexDirection: "row", gap: 8 },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  typeBtnText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  field: { gap: 8 },
  fieldLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  fieldLabel: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  optionalLabel: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  nowBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginLeft: 4,
  },
  nowBtnText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 8,
    letterSpacing: 1,
  },
  timeHint: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 10,
    marginTop: -4,
  },
  amountInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 22,
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 22,
    paddingVertical: 12,
    outlineStyle: "none" as any,
  },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 16,
    outlineStyle: "none" as any,
  },
  categoryScroll: { marginHorizontal: -4 },
  categoryRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 4,
    paddingBottom: 4,
    flexWrap: "wrap",
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  categoryChipText: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 12,
  },
  fieldError: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 11,
  },
  recurringSection: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    gap: 12,
  },
  recurringRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  recurringLabel: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 11,
    letterSpacing: 1,
  },
  recurringSub: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 10,
    marginTop: 2,
  },
  freqRow: {
    flexDirection: "row",
    gap: 8,
  },
  freqChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: "center",
  },
  freqChipText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 9,
    letterSpacing: 1,
  },
  submitBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  submitBtnText: {
    fontFamily: "SyneMono_400Regular",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
});
