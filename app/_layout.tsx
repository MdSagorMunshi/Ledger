import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
  useFonts as useJetBrainsMono,
} from "@expo-google-fonts/jetbrains-mono";
import {
  Syne_400Regular,
  Syne_600SemiBold,
  Syne_700Bold,
  useFonts as useSyne,
} from "@expo-google-fonts/syne";
import {
  SyneMono_400Regular,
  useFonts as useSyneMono,
} from "@expo-google-fonts/syne-mono";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LedgerProvider } from "@/context/LedgerContext";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [jbFontsLoaded, jbFontError] = useJetBrainsMono({
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
  });
  const [syneFontsLoaded, syneFontError] = useSyne({
    Syne_400Regular,
    Syne_600SemiBold,
    Syne_700Bold,
  });
  const [syneMonoFontsLoaded, syneMonoFontError] = useSyneMono({
    SyneMono_400Regular,
  });

  const fontsLoaded = jbFontsLoaded && syneFontsLoaded && syneMonoFontsLoaded;
  const fontError = jbFontError || syneFontError || syneMonoFontError;

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <LedgerProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <Slot />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </LedgerProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
