import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, AppState, StyleSheet, View } from 'react-native';

import { useTTFLStore } from '@/store/useTTFLStore';
import { colors } from '@/theme/colors';

export default function RootLayout() {
  const hasHydrated = useTTFLStore((state) => state.hasHydrated);
  const cleanExpiredLocks = useTTFLStore((state) => state.cleanExpiredLocks);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    cleanExpiredLocks();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        cleanExpiredLocks();
      }
    });

    return () => subscription.remove();
  }, [hasHydrated, cleanExpiredLocks]);

  if (!hasHydrated) {
    return (
      <View style={styles.boot}>
        <StatusBar style="light" />
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
