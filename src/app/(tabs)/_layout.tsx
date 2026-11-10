import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import { playersOnCooldown } from '@/constants/userHistory';
import { useSavedPicks } from '@/hooks/useSavedPicks';
import { colors } from '@/theme/colors';

function tabIconColor(color: string | undefined): string {
  return color ?? colors.muted;
}

export default function TabsLayout() {
  const savedPicks = useSavedPicks();
  const todayIso = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  const activeCount = playersOnCooldown(
    todayIso,
    savedPicks.map((pick) => {
      const pickedAt = new Date(pick.pickedAt);
      return {
        date: Number.isNaN(pickedAt.getTime())
          ? pick.pickedAt.slice(0, 10)
          : pickedAt.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }),
        player: pick.name,
      };
    }),
  ).length;

  return (
    <Tabs
      screenOptions={{
        headerTitle: 'TTFL Predictor',
        headerTitleAlign: 'center',
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800', fontSize: 18 },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Picks du Soir',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'basketball' : 'basketball-outline'}
              size={22}
              color={tabIconColor(typeof color === 'string' ? color : undefined)}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="vestiaire"
        options={{
          title: 'Vestiaire',
          tabBarBadge: activeCount > 0 ? activeCount : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.accent, color: '#1A0B00' },
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'lock-closed' : 'lock-closed-outline'}
              size={22}
              color={tabIconColor(typeof color === 'string' ? color : undefined)}
            />
          ),
        }}
      />
    </Tabs>
  );
}
