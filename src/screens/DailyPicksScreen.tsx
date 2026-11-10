import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ConfirmModal } from '@/components/ConfirmModal';
import { PickCard } from '@/components/PickCard';
import { PlayerDetailModal } from '@/components/PlayerDetailModal';
import { Screen } from '@/components/Screen';
import { pickRecordedOn } from '@/constants/userHistory';
import { fetchDailyPicks, type PickRecommendation } from '@/services/nbaApi';
import { savePick } from '@/services/pickStorage';
import { colors } from '@/theme/colors';
import { formatMatchDay } from '@/utils/format';

function matchesQuery(pick: PickRecommendation, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase('fr');
  if (!needle) {
    return true;
  }
  return (
    pick.name.toLocaleLowerCase('fr').includes(needle) || pick.teamAbbr.toLocaleLowerCase('fr').includes(needle)
  );
}

export function DailyPicksScreen() {
  const [pending, setPending] = useState<PickRecommendation | null>(null);
  const [selected, setSelected] = useState<PickRecommendation | null>(null);
  const [slate, setSlate] = useState<PickRecommendation[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [today] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;

    fetchDailyPicks()
      .then((result) => {
        if (cancelled) {
          return;
        }
        setSlate(result);
      })
      .catch(() => {
        if (!cancelled) {
          setIsError(true);
          setSlate([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const slateDate = useMemo(() => {
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [today]);
  const recordedPick = useMemo(() => pickRecordedOn(slateDate), [slateDate]);
  const picks = useMemo(() => slate.filter((pick) => matchesQuery(pick, query)), [query, slate]);

  const confirmPick = () => {
    if (!pending || recordedPick) {
      return;
    }

    const chosen = pending;
    savePick({ id: chosen.id, name: chosen.name })
      .then(() => {
        setSlate((current) => current.filter((pick) => String(pick.id) !== String(chosen.id)));
        setPending(null);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[pickStorage] Enregistrement impossible : ${message}`);
      });
  };

  return (
    <Screen>
      <FlatList
        data={isLoading || isError ? [] : picks}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.date}>{formatMatchDay(today)}</Text>
            <Text style={styles.subtitle}>
              {isLoading
                ? 'Chargement des matchs du jour…'
                : isError
                  ? 'Les matchs du jour sont indisponibles.'
                  : picks.length === 0
                    ? query.trim()
                      ? 'Aucun résultat pour cette recherche.'
                      : 'Aucun pick disponible sur cette soirée.'
                    : `${picks.length} pick${picks.length > 1 ? 's' : ''} classé${picks.length > 1 ? 's' : ''} par score TTFL projeté`}
            </Text>
            {recordedPick ? (
              <View style={styles.banner}>
                <Text style={styles.bannerText}>Pick validé pour ce soir : {recordedPick.player}</Text>
              </View>
            ) : null}
            {!isLoading && !isError ? (
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Joueur ou franchise"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
                style={styles.search}
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color="#FF6B00" size="large" style={styles.spinner} />
          ) : isError ? (
            <View style={styles.errorBox}>
              <Text style={styles.empty}>Vérifie ta connexion, puis réessaie.</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setIsLoading(true);
                  setIsError(false);
                  setReloadKey((value) => value + 1);
                }}
                style={styles.retry}
              >
                <Text style={styles.retryLabel}>Réessayer</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.empty}>
              {query.trim() && slate.length > 0
                ? 'Aucun joueur ne correspond à cette recherche.'
                : 'Aucun match à projeter pour cette date.'}
            </Text>
          )
        }
        renderItem={({ item }) => (
          <PickCard pick={item} canValidate={!recordedPick} onOpen={setSelected} onValidate={setPending} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
      <PlayerDetailModal pick={selected} onClose={() => setSelected(null)} />
      <ConfirmModal
        visible={pending !== null}
        playerName={pending?.name ?? ''}
        onCancel={() => setPending(null)}
        onConfirm={confirmPick}
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
    gap: 8,
    marginBottom: 18,
  },
  date: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  banner: {
    backgroundColor: '#14532D',
    borderRadius: 12,
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bannerText: {
    color: '#BBF7D0',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  search: {
    marginTop: 6,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  separator: {
    height: 14,
  },
  spinner: {
    marginTop: 28,
  },
  errorBox: {
    gap: 14,
    marginTop: 8,
  },
  empty: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  retry: {
    alignSelf: 'flex-start',
    backgroundColor: '#FF6B00',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryLabel: {
    color: '#1A0B00',
    fontSize: 14,
    fontWeight: '700',
  },
});
