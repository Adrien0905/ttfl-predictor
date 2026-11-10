import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { LOCK_DURATION_DAYS } from '@/utils/lock';
import { formatDaysRemaining } from '@/utils/format';

interface LockGaugeProps {
  daysRemaining: number;
}

export function LockGauge({ daysRemaining }: LockGaugeProps) {
  const ratio = Math.min(1, Math.max(0, daysRemaining / LOCK_DURATION_DAYS));

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{formatDaysRemaining(daysRemaining)}</Text>
      <View style={styles.track} accessibilityRole="progressbar">
        <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  track: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.gaugeTrack,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.gauge,
  },
});
