import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { LockedPlayerCard } from '@/components/LockedPlayerCard';
import { Screen } from '@/components/Screen';
import { playersOnCooldown } from '@/constants/userHistory';
import { useSavedPicks } from '@/hooks/useSavedPicks';
import { colors } from '@/theme/colors';

function playedOn(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso.slice(0, 10);
  }
  return date.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

export function LockedPlayersScreen() {
  const savedPicks = useSavedPicks();
  const cooldown = useMemo(() => {
    const todayIso = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
    return playersOnCooldown(
      todayIso,
      savedPicks.map((pick) => ({ date: playedOn(pick.pickedAt), player: pick.name })),
    );
  }, [savedPicks]);

  return (
    <Screen>
      <FlatList
        data={cooldown}
        keyExtractor={(item) => item.player}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Vestiaire</Text>
            <Text style={styles.subtitle}>
              {cooldown.length === 0
                ? 'Aucun joueur sous la règle des 30 jours.'
                : `${cooldown.length} joueur${cooldown.length > 1 ? 's' : ''} en cooldown, du retour le plus proche au plus lointain`}
            </Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>Les joueurs utilisés pendant 30 jours apparaîtront ici.</Text>}
        renderItem={({ item }) => <LockedPlayerCard entry={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  header: {
    gap: 6,
    marginBottom: 16,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  separator: {
    height: 12,
  },
  empty: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
});
