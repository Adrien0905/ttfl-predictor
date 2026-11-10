export interface UsedPick {
  date: string;
  player: string;
}

export interface PlayerAvailability {
  available: boolean;
  availableDate?: string;
}

export interface CooldownEntry {
  player: string;
  playedDate: string;
  availableDate: string;
}

const COOLDOWN_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const USER_PICKS_HISTORY: UsedPick[] = [
  { date: '2026-10-20', player: 'Victor Wembanyama' },
  { date: '2026-10-21', player: 'Luka Dončić' },
  { date: '2026-10-22', player: 'Shai Gilgeous-Alexander' },
  { date: '2026-10-23', player: 'Jayson Tatum' },
  { date: '2026-10-24', player: 'Nikola Jokić' },
  { date: '2026-10-25', player: 'Ty Jerome' },
  { date: '2026-10-26', player: 'Giannis Antetokounmpo' },
  { date: '2026-10-27', player: 'Deni Avdija' },
  { date: '2026-10-28', player: 'Cade Cunningham' },
  { date: '2026-10-29', player: 'Domantas Sabonis' },
  { date: '2026-10-30', player: 'Jalen Brunson' },
  { date: '2026-10-31', player: 'Jaylen Brown' },
  { date: '2026-11-01', player: 'Scottie Barnes' },
  { date: '2026-11-02', player: 'Cooper Flagg' },
  { date: '2026-11-04', player: 'Karl-Anthony Towns' },
  { date: '2026-11-05', player: 'Stephen Curry' },
  { date: '2026-11-06', player: 'Tyrese Maxey' },
  { date: '2026-11-07', player: 'Alperen Sengun' },
  { date: '2026-11-08', player: 'Keyonte George' },
  { date: '2026-11-09', player: 'Donovan Mitchell' },
];

function parseIsoDate(isoDate: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    return null;
  }
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addCooldown(pickDate: string): string {
  const date = parseIsoDate(pickDate);
  if (!date) {
    return pickDate;
  }
  date.setUTCDate(date.getUTCDate() + COOLDOWN_DAYS);
  return formatIsoDate(date);
}

function daysFromPick(pickDate: string, currentDate: string): number {
  const start = parseIsoDate(pickDate);
  const end = parseIsoDate(currentDate);
  if (!start || !end) {
    return COOLDOWN_DAYS;
  }
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
}

function samePlayer(left: string, right: string): boolean {
  return left.trim().toLocaleLowerCase('fr') === right.trim().toLocaleLowerCase('fr');
}

function latestPick(playerName: string, picks: UsedPick[]): UsedPick | undefined {
  return picks
    .filter((pick) => samePlayer(pick.player, playerName))
    .reduce<UsedPick | undefined>((latest, pick) => (!latest || pick.date > latest.date ? pick : latest), undefined);
}

/** Pick déjà posé pour une date YYYY-MM-DD, s'il existe. */
export function pickRecordedOn(date: string): UsedPick | undefined {
  return USER_PICKS_HISTORY.find((pick) => pick.date === date);
}

/** Indisponible tant que moins de 30 jours se sont écoulés depuis le dernier pick. */
export function isPlayerAvailable(playerName: string, currentDate: string): PlayerAvailability {
  const pick = latestPick(playerName, USER_PICKS_HISTORY);
  if (!pick) {
    return { available: true };
  }

  const availableDate = addCooldown(pick.date);
  return {
    available: daysFromPick(pick.date, currentDate) >= COOLDOWN_DAYS,
    availableDate,
  };
}

/** Joueurs encore bloqués, du retour le plus proche au plus lointain. */
export function playersOnCooldown(currentDate: string, extraPicks: UsedPick[] = []): CooldownEntry[] {
  const byName = new Map<string, UsedPick>();

  for (const pick of [...USER_PICKS_HISTORY, ...extraPicks]) {
    const key = pick.player.trim().toLocaleLowerCase('fr');
    const current = byName.get(key);
    if (!current || pick.date > current.date) {
      byName.set(key, pick);
    }
  }

  return [...byName.values()]
    .flatMap((pick) => {
      const availableDate = addCooldown(pick.date);
      if (daysFromPick(pick.date, currentDate) >= COOLDOWN_DAYS) {
        return [];
      }
      return [{ player: pick.player, playedDate: pick.date, availableDate }];
    })
    .sort((left, right) => left.availableDate.localeCompare(right.availableDate) || left.player.localeCompare(right.player, 'fr'));
}
