import AsyncStorage from '@react-native-async-storage/async-storage';

import { daysUntilRelease } from '@/utils/lock';

const STORAGE_KEY = 'ttfl-saved-picks';

export interface SavedPick {
  id: string | number;
  name: string;
  pickedAt: string;
}

type Listener = () => void;

const listeners = new Set<Listener>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeSavedPicks(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function isSavedPick(value: unknown): value is SavedPick {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const pick = value as Partial<SavedPick>;
  const idIsValid = typeof pick.id === 'string' || typeof pick.id === 'number';
  return idIsValid && typeof pick.name === 'string' && typeof pick.pickedAt === 'string';
}

function sameId(left: string | number, right: string | number): boolean {
  return String(left) === String(right);
}

async function writePicks(picks: SavedPick[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(picks));
  notify();
}

export async function getSavedPicks(): Promise<SavedPick[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter(isSavedPick);
}

export async function savePick(pick: Pick<SavedPick, 'id' | 'name'>, pickedAt = new Date().toISOString()): Promise<SavedPick> {
  const saved: SavedPick = { id: pick.id, name: pick.name, pickedAt };
  const picks = await getSavedPicks();
  const next = picks.some((item) => sameId(item.id, pick.id))
    ? picks.map((item) => (sameId(item.id, pick.id) ? saved : item))
    : [...picks, saved];
  await writePicks(next);
  return saved;
}

export async function removePick(id: string | number): Promise<void> {
  const picks = await getSavedPicks();
  await writePicks(picks.filter((pick) => !sameId(pick.id, id)));
}

/** Jours calendaires restants avant la fin du blocage de 30 jours. */
export function getRemainingDays(pickedAt: string, now: Date = new Date()): number {
  return Math.max(0, daysUntilRelease(pickedAt, now));
}

/** Vrai tant que moins de 30 jours calendaires se sont écoulés depuis le pick. */
export async function isPlayerLocked(id: string | number, now: Date = new Date()): Promise<boolean> {
  const picks = await getSavedPicks();
  const match = picks.find((pick) => sameId(pick.id, id));
  return match ? getRemainingDays(match.pickedAt, now) > 0 : false;
}
