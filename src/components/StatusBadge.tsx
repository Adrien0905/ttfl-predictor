import { StyleSheet, Text, View } from 'react-native';

import type { StrategicStatus } from '@/utils/predictionEngine';

const STATUS_STYLE: Record<StrategicStatus, { label: string; background: string; color: string }> = {
  GO: { label: '🔥 GO', background: '#14532D', color: '#BBF7D0' },
  OK: { label: '👍 OK', background: '#713F12', color: '#FDE68A' },
  HOLD: { label: '🛑 HOLD', background: '#7F1D1D', color: '#FECACA' },
};

interface StatusBadgeProps {
  status: StrategicStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const palette = STATUS_STYLE[status];

  return (
    <View style={[styles.badge, { backgroundColor: palette.background }]}>
      <Text style={[styles.label, { color: palette.color }]}>{palette.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
  },
});
