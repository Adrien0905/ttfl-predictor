import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { LockedPlayer, Player } from '@/types';
import { isStillLocked } from '@/utils/lock';

interface TTFLState {
  lockedPlayers: LockedPlayer[];
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  lockPlayer: (player: Player, pickedAt?: string) => void;
  cleanExpiredLocks: (now?: Date) => void;
  isPlayerLocked: (playerId: string, now?: Date) => boolean;
}

export const useTTFLStore = create<TTFLState>()(
  persist(
    (set, get) => ({
      lockedPlayers: [],
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      cleanExpiredLocks: (now = new Date()) => {
        set({
          lockedPlayers: get().lockedPlayers.filter((lock) => isStillLocked(lock.pickedAt, now)),
        });
      },
      lockPlayer: (player, pickedAt = new Date().toISOString()) => {
        const activeLocks = get().lockedPlayers.filter((lock) => isStillLocked(lock.pickedAt));
        if (activeLocks.some((lock) => lock.player.id === player.id)) {
          set({ lockedPlayers: activeLocks });
          return;
        }

        set({
          lockedPlayers: [...activeLocks, { player, pickedAt }],
        });
      },
      isPlayerLocked: (playerId, now = new Date()) =>
        get().lockedPlayers.some((lock) => lock.player.id === playerId && isStillLocked(lock.pickedAt, now)),
    }),
    {
      name: 'ttfl-predictor-locks',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ lockedPlayers: state.lockedPlayers }),
      version: 1,
      onRehydrateStorage: () => (_state, error) => {
        if (!error) {
          useTTFLStore.getState().cleanExpiredLocks();
        }
        useTTFLStore.getState().setHasHydrated(true);
      },
    },
  ),
);
