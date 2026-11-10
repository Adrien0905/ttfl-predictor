import { Modal, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { colors } from '@/theme/colors';

interface ConfirmModalProps {
  visible: boolean;
  playerName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmModal({ visible, playerName, onCancel, onConfirm }: ConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Valider ce pick ?</Text>
          <Text style={styles.body}>
            {playerName} disparaît des picks du soir pendant 30 jours. Il reste visible dans le vestiaire jusqu’à sa date de retour.
          </Text>
          <View style={styles.actions}>
            <Button label="Annuler" variant="secondary" onPress={onCancel} style={styles.action} />
            <Button label="Valider" onPress={onConfirm} style={styles.action} />
          </View>
        </View>
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
    padding: 20,
    gap: 12,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  body: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  action: {
    flex: 1,
  },
});
