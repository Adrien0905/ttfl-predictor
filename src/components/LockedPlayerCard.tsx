import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import type { CooldownEntry } from '@/constants/userHistory';
import { colors } from '@/theme/colors';
import { formatCalendarDate } from '@/utils/format';

interface LockedPlayerCardProps {
  entry: CooldownEntry;
}

export function LockedPlayerCard({ entry }: LockedPlayerCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{entry.player}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>Cooldown</Text>
        </View>
      </View>
      <Text style={styles.meta}>Joué le {formatCalendarDate(entry.playedDate)}</Text>
      <Text style={styles.meta}>Retour le {formatCalendarDate(entry.availableDate)}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  name: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  badge: {
    backgroundColor: '#7F1D1D',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeLabel: {
    color: '#FECACA',
    fontSize: 12,
    fontWeight: '800',
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
