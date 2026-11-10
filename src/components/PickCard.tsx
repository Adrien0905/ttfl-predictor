import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { colors } from '@/theme/colors';
import type { PickRecommendation } from '@/services/nbaApi';
import { formatScore } from '@/utils/format';

interface PickCardProps {
  pick: PickRecommendation;
  canValidate?: boolean;
  onOpen: (pick: PickRecommendation) => void;
  onValidate: (pick: PickRecommendation) => void;
}

export function PickCard({ pick, canValidate = true, onOpen, onValidate }: PickCardProps) {
  return (
    <Card style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Fiche de ${pick.name}`}
        onPress={() => onOpen(pick)}
        style={styles.header}
      >
        <View style={styles.identity}>
          <Text style={styles.name}>{pick.name}</Text>
          <Text style={styles.meta}>
            {pick.teamAbbr} vs {pick.opponentAbbreviation}
          </Text>
          <StatusBadge status={pick.strategicStatus} />
        </View>
        <View style={styles.scoreBlock}>
          <Text style={styles.score}>{formatScore(pick.projectedScore)} pts</Text>
          <Text style={styles.scoreV1}>(V1: {formatScore(pick.projectedScoreV1)} pts)</Text>
          <Text style={styles.scoreLabel}>Projeté</Text>
        </View>
      </Pressable>
      {pick.isLocked || canValidate ? (
        <View style={styles.footer}>
          {pick.isLocked ? (
            <View style={styles.badge}>
              <Text style={styles.badgeLabel}>Verrouillé ({pick.remainingDays} j)</Text>
            </View>
          ) : (
            <Button label="Valider ce pick" onPress={() => onValidate(pick)} style={styles.validate} />
          )}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderColor: '#2C2C2C',
    padding: 20,
    gap: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  identity: {
    flex: 1,
    gap: 6,
  },
  name: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  scoreBlock: {
    alignItems: 'flex-end',
    minWidth: 108,
    gap: 2,
  },
  score: {
    color: '#FF6B00',
    fontSize: 28,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    lineHeight: 32,
  },
  scoreV1: {
    color: '#8A8A8A',
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    lineHeight: 16,
  },
  scoreLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  validate: {
    minHeight: 40,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  badge: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  badgeLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
});
