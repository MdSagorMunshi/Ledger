import React from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import colors from "@/constants/colors";

interface PinKeypadProps {
  onPress: (digit: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
}

const KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "⌫"],
];

export function PinKeypad({ onPress, onBackspace, disabled }: PinKeypadProps) {
  const handleKey = (key: string) => {
    if (disabled) return;
    if (key === "" ) return;
    if (key === "⌫") {
      onBackspace();
    } else {
      onPress(key);
    }
  };

  return (
    <View style={styles.container}>
      {KEYS.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((key, ki) => {
            if (key === "") {
              return <View key={ki} style={styles.emptyKey} />;
            }
            return (
              <TouchableOpacity
                key={ki}
                style={styles.key}
                onPress={() => handleKey(key)}
                activeOpacity={0.7}
              >
                {key === "⌫" ? (
                  <Feather
                    name="delete"
                    size={20}
                    color={colors.light.cipherWhite}
                  />
                ) : (
                  <Text style={styles.keyText}>{key}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    alignSelf: "center",
    width: "100%",
    maxWidth: 280,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  key: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: colors.light.vaultDark,
    borderWidth: 1,
    borderColor: colors.light.wireGray,
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web"
      ? { cursor: "pointer" as any }
      : {}),
  },
  emptyKey: {
    width: 80,
    height: 80,
  },
  keyText: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 22,
    color: colors.light.cipherWhite,
  },
});
