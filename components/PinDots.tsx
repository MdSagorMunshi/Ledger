import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import colors from "@/constants/colors";

interface PinDotsProps {
  length: number;
  filled: number;
  shake?: boolean;
}

export function PinDots({ length, filled, shake }: PinDotsProps) {
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (shake) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 4, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -4, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 2, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [shake, shakeAnim]);

  return (
    <Animated.View
      style={[styles.row, { transform: [{ translateX: shakeAnim }] }]}
    >
      {Array.from({ length }).map((_, i) => (
        <DotItem key={i} filled={i < filled} />
      ))}
    </Animated.View>
  );
}

function DotItem({ filled }: { filled: boolean }) {
  const anim = useRef(new Animated.Value(0)).current;
  const prevFilled = useRef(false);

  useEffect(() => {
    if (filled && !prevFilled.current) {
      Animated.timing(anim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: false,
      }).start();
    } else if (!filled && prevFilled.current) {
      Animated.timing(anim, {
        toValue: 0,
        duration: 80,
        useNativeDriver: false,
      }).start();
    }
    prevFilled.current = filled;
  }, [filled, anim]);

  const bgColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["transparent", colors.light.amberSignal],
  });

  const borderColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.light.wireGray, colors.light.amberSignal],
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          backgroundColor: bgColor,
          borderColor: borderColor,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
  },
});
