import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

import playersDb from '@/data/players_db.json';
import { Button } from '@/components/Button';
import { StatusBadge } from '@/components/StatusBadge';
import type { PickRecommendation } from '@/services/nbaApi';
import { colors } from '@/theme/colors';
import { formatScore } from '@/utils/format';
import { explainSmartScore, type StrategicStatus } from '@/utils/predictionEngine';

interface PlayerDetailModalProps {
  pick: PickRecommendation | null;
  onClose: () => void;
}

const STAT_LABELS = [
  ['pts', 'PTS'],
  ['reb', 'REB'],
  ['ast', 'AST'],
  ['stl', 'STL'],
  ['blk', 'BLK'],
  ['tov', 'TOV'],
] as const;

const STATUS_COPY: Record<StrategicStatus, string> = {
  GO: 'Ce soir vaut au moins la meilleure fenêtre des 30 prochains jours. Le coût d’opportunité est faible.',
  OK: 'L’écart avec le meilleur VORP à venir reste modéré. Le pick est jouable, sans être la fenêtre idéale.',
  HOLD: 'Une soirée future dégage un VORP nettement plus haut. Mieux vaut conserver ce joueur pour ce créneau.',
};

function formatVorp(value: number): string {
  const formatted = formatScore(value);
  return value > 0 ? `+${formatted}` : formatted;
}

function formatFactor(value: number): string {
  return `x${value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pointsShown(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatSignedPoints(value: number): string {
  const shown = pointsShown(value);
  const formatted = formatScore(shown);
  return shown > 0 ? `+${formatted} pts` : `${formatted} pts`;
}

function deltaColor(value: number): string {
  if (value > 0) {
    return '#4ADE80';
  }
  if (value < 0) {
    return '#F87171';
  }
  return colors.muted;
}

function AdjustmentRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.adjustmentRow}>
      <Text style={styles.adjustmentLabel}>{label}</Text>
      <Text style={[styles.adjustmentValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

export function PlayerDetailModal({ pick, onClose }: PlayerDetailModalProps) {
  const player = pick ? playersDb.find((candidate) => String(candidate.id) === String(pick.id)) : undefined;
  const breakdown = player ? explainSmartScore(player, pick?.opponentAbbreviation ?? '') : null;

  return (
    <Modal visible={pick !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent} bounces={false}>
          <Text style={styles.title}>{pick?.name ?? ''}</Text>
          <Text style={styles.subtitle}>
            {pick ? `${pick.teamAbbr} vs ${pick.opponentAbbreviation}` : ''}
          </Text>

          <Text style={styles.section}>Moyennes</Text>
          {player ? (
            <View style={styles.stats}>
              {STAT_LABELS.map(([key, label]) => (
                <View key={key} style={styles.stat}>
                  <Text style={styles.statValue}>{formatScore(player[key])}</Text>
                  <Text style={styles.statLabel}>{label}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.missing}>Moyennes indisponibles dans la base locale.</Text>
          )}

          <Text style={styles.section}>Projection TTFL</Text>
          {breakdown ? (
            <View style={styles.projection}>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Score de base</Text>
                <Text style={styles.rowValue}>{formatScore(breakdown.baseScore)}</Text>
              </View>
              <View style={styles.factors}>
                <Text style={styles.factorsTitle}>Facteurs d’ajustement</Text>
                <AdjustmentRow label="Défense (DRtg)" value={formatFactor(breakdown.drtgModifier)} />
                <AdjustmentRow label="Rythme (Pace)" value={formatFactor(breakdown.paceModifier)} />
                <Text style={styles.profileTitle}>Ajustements de profil</Text>
                <AdjustmentRow
                  label="Rebonds offensifs"
                  value={formatSignedPoints(breakdown.orebDelta)}
                  valueColor={deltaColor(pointsShown(breakdown.orebDelta))}
                />
                <AdjustmentRow
                  label="Rebonds défensifs"
                  value={formatSignedPoints(breakdown.drebDelta)}
                  valueColor={deltaColor(pointsShown(breakdown.drebDelta))}
                />
                <AdjustmentRow
                  label="Turnovers"
                  value={formatSignedPoints(-breakdown.tovDelta)}
                  valueColor={deltaColor(pointsShown(-breakdown.tovDelta))}
                />
                <AdjustmentRow
                  label="Lancers-francs"
                  value={formatSignedPoints(breakdown.ftDeltaPoints)}
                  valueColor={deltaColor(pointsShown(breakdown.ftDeltaPoints))}
                />
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Score projeté</Text>
                <Text style={styles.projected}>{formatScore(breakdown.projectedScore)} pts</Text>
                <Text style={styles.projectedV1}>(V1: {formatScore(breakdown.projectedScoreV1)} pts)</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.missing}>Projection indisponible sans les moyennes du joueur.</Text>
          )}

          {pick ? (
            <>
              <Text style={styles.section}>Analyse Stratégique 30 Jours</Text>
              <StatusBadge status={pick.strategicStatus} />
              <View style={styles.projection}>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>VORP de ce soir</Text>
                  <Text style={styles.rowValue}>{formatVorp(pick.vorp)}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Meilleur VORP sur 30 jours</Text>
                  <Text style={styles.rowValue}>{formatVorp(pick.maxFutureVorp)}</Text>
                </View>
              </View>
              <Text style={styles.explain}>{STATUS_COPY[pick.strategicStatus]}</Text>
            </>
          ) : null}

          <Button label="Fermer" variant="secondary" onPress={onClose} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: '86%',
  },
  sheetContent: {
    padding: 20,
    gap: 12,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
  },
  section: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stat: {
    width: '31%',
    backgroundColor: colors.surfaceRaised,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  missing: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  explain: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
  projection: {
    gap: 10,
  },
  row: {
    gap: 2,
  },
  rowLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  rowValue: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
  },
  factors: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  factorsTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  profileTitle: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  adjustmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  adjustmentLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  adjustmentValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  projected: {
    color: '#FF6B00',
    fontSize: 22,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  projectedV1: {
    color: '#8A8A8A',
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
