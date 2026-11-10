export type PlayerPosition = 'PG' | 'SG' | 'SF' | 'PF' | 'C';

/** Moyennes de saison utilisées par la formule TTFL. Les ratés sont déjà dérivés (tentatives − réussites). */
export interface PlayerAverages {
  pts: number;
  reb: number;
  oreb: number;
  dreb: number;
  ast: number;
  stl: number;
  blk: number;
  fgm: number;
  fg3m: number;
  ftm: number;
  tov: number;
  fgMissed: number;
  fg3Missed: number;
  ftMissed: number;
}

export interface TeamStats {
  defRebPct: number;
  offRebPct: number;
}

export interface Player {
  id: string;
  name: string;
  team: string;
  /** Absent du endpoint leaguedashplayerstats. */
  position: PlayerPosition | null;
  /** Absents des anciennes fiches : traités comme 0 par le moteur. */
  oreb: number;
  dreb: number;
  currentAverages: PlayerAverages;
}

export interface PickRecommendation {
  player: Player;
  opponent: string;
  projectedScore: number;
  /** Score sans modificateur de pace, conservé pour la comparaison V1/V2. */
  projectedScoreV1: number;
  drtgModifier: number;
  paceModifier: number;
  rebDelta: number;
  orebDelta: number;
  drebDelta: number;
  tovDelta: number;
  ftDeltaPoints: number;
  /** ISO 8601 */
  matchDate: string;
}

export interface LockedPlayer {
  player: Player;
  /** ISO 8601 — instant de validation du pick. */
  pickedAt: string;
}
