import scheduleDb from '../data/schedule_db.json';
import teamAdvancedStats from '../data/team_advanced_stats.json';

function readStat(stats: Record<string, unknown>, key: string): number {
  const value = stats[key];
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

interface SmartScoreInput {
  pts?: number;
  reb?: number;
  ast?: number;
  stl?: number;
  blk?: number;
  fgm?: number;
  fga?: number;
  fg3m?: number;
  fg3a?: number;
  ftm?: number;
  fta?: number;
  tov?: number;
  turnover?: number;
}

export interface TtflBreakdown {
  /** Formule TTFL avant le coefficient défensif. */
  baseScore: number;
  /** DRtg adverse / DRtg moyen de la ligue. 1 si l'équipe est absente. */
  drtgModifier: number;
  /** V1 : base × DRtg, sans le rythme adverse. */
  projectedScoreV1: number;
  /** Pace adverse / pace moyen de la ligue. 1 si l'équipe est absente. */
  paceModifier: number;
  /** Rebonds attendus − rebonds moyens. 0 si l'adversaire est absent. */
  rebDelta: number;
  /** Turnovers attendus − turnovers moyens. Soustrait du score V2. */
  tovDelta: number;
  /** Points TTFL ajoutés par le volume de lancers francs attendu. */
  ftDeltaPoints: number;
  /** V2 : V1 × pace + rebonds − turnovers + lancers. Base du VORP et du statut. */
  projectedScore: number;
}

interface TeamAdvancedStat {
  teamAbbr: string;
  pace: number;
  drtg: number;
  defRebPct: number;
  oppTovPct: number;
  oppFtaRate: number;
}

interface ProfileDeltas {
  rebDelta: number;
  tovDelta: number;
  ftDeltaPoints: number;
}

const advancedStats = teamAdvancedStats as TeamAdvancedStat[];

function averageOf(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Moyennes des 30 franchises présentes dans team_advanced_stats.json. */
export const leagueAveragePace = averageOf(advancedStats.map((team) => team.pace));
export const leagueAverageDrtg = averageOf(advancedStats.map((team) => team.drtg));
export const leagueAvgDefRebPct = averageOf(advancedStats.map((team) => team.defRebPct));
export const leagueAvgTovPct = averageOf(advancedStats.map((team) => team.oppTovPct));
export const leagueAvgFtaRate = averageOf(advancedStats.map((team) => team.oppFtaRate));

const statsByTeam = new Map(
  advancedStats.map((team) => [team.teamAbbr.trim().toUpperCase(), team]),
);

/** 1.0 si la stat ou la moyenne de ligue est inutilisable. */
function ratioOrNeutral(value: number | undefined, average: number): number {
  if (value == null || !Number.isFinite(value) || !Number.isFinite(average) || average === 0) {
    return 1;
  }
  return value / average;
}

/** 1.0 si l'adversaire est inconnu ou si la moyenne de ligue est nulle. */
export function getPaceModifier(opponentAbbreviation: string): number {
  return ratioOrNeutral(statsByTeam.get(opponentAbbreviation.trim().toUpperCase())?.pace, leagueAveragePace);
}

/**
 * DRtg élevé = mauvaise défense, donc modificateur > 1 et bonus pour l'attaquant.
 * 1.0 si l'adversaire est inconnu.
 */
export function getDrtgModifier(opponentAbbreviation: string): number {
  return ratioOrNeutral(statsByTeam.get(opponentAbbreviation.trim().toUpperCase())?.drtg, leagueAverageDrtg);
}

const NEUTRAL_DELTAS: ProfileDeltas = { rebDelta: 0, tovDelta: 0, ftDeltaPoints: 0 };

/**
 * Écarts de profil face à l'adversaire, en plus du DRtg.
 * Rebonds : une défense qui capte plus de rebonds défensifs en retire au joueur.
 * Turnovers : une défense qui force plus de pertes en ajoute.
 * Lancers : un adversaire qui provoque plus de fautes en ajoute, convertis au pourcentage du joueur (×2).
 */
function profileDeltas(reb: number, turnover: number, ftm: number, fta: number, opponentAbbreviation: string): ProfileDeltas {
  const opponent = statsByTeam.get(opponentAbbreviation.trim().toUpperCase());
  if (!opponent) {
    return NEUTRAL_DELTAS;
  }

  const rebDelta =
    opponent.defRebPct > 0 && leagueAvgDefRebPct > 0 ? reb * (leagueAvgDefRebPct / opponent.defRebPct) - reb : 0;
  const tovDelta = leagueAvgTovPct > 0 ? turnover * (opponent.oppTovPct / leagueAvgTovPct) - turnover : 0;
  const ftaDelta = leagueAvgFtaRate > 0 ? fta * (opponent.oppFtaRate / leagueAvgFtaRate) - fta : 0;
  const ftRatio = fta > 0 ? ftm / fta : 0;

  return {
    rebDelta,
    tovDelta,
    ftDeltaPoints: ftaDelta * ftRatio * 2,
  };
}

function roundScore(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Score TTFL ajusté du soir.
 * Base = (pts + reb + ast + stl + blk + fgm + fg3m + ftm)
 *        − (tov + (fga − fgm) + (fg3a − fg3m) + (fta − ftm))
 * puis × (DRtg adverse / DRtg moyen ligue) = V1,
 * puis × (pace adverse / pace moyen ligue) + deltas rebonds, turnovers et lancers = V2.
 */
export function explainSmartScore(stats: SmartScoreInput | null | undefined, opponentAbbreviation: string): TtflBreakdown {
  const source = (stats ?? {}) as Record<string, unknown>;
  const pts = readStat(source, 'pts');
  const reb = readStat(source, 'reb');
  const ast = readStat(source, 'ast');
  const stl = readStat(source, 'stl');
  const blk = readStat(source, 'blk');
  const fgm = readStat(source, 'fgm');
  const fg3m = readStat(source, 'fg3m');
  const ftm = readStat(source, 'ftm');
  const turnover =
    source.turnover != null && source.turnover !== '' ? readStat(source, 'turnover') : readStat(source, 'tov');
  const fga = readStat(source, 'fga');
  const fg3a = readStat(source, 'fg3a');
  const fta = readStat(source, 'fta');

  const base =
    pts + reb + ast + stl + blk + fgm + fg3m + ftm - (turnover + (fga - fgm) + (fg3a - fg3m) + (fta - ftm));
  const drtgModifier = getDrtgModifier(opponentAbbreviation);
  const projectedScoreV1 = base * drtgModifier;
  const paceModifier = getPaceModifier(opponentAbbreviation);
  const deltas = profileDeltas(reb, turnover, ftm, fta, opponentAbbreviation);
  const paceAdjusted = projectedScoreV1 * paceModifier;

  return {
    baseScore: roundScore(base),
    drtgModifier,
    projectedScoreV1: roundScore(projectedScoreV1),
    paceModifier,
    rebDelta: deltas.rebDelta,
    tovDelta: deltas.tovDelta,
    ftDeltaPoints: deltas.ftDeltaPoints,
    projectedScore: roundScore(paceAdjusted + deltas.rebDelta - deltas.tovDelta + deltas.ftDeltaPoints),
  };
}

export function calculateSmartScore(stats: SmartScoreInput | null | undefined, opponentAbbreviation: string): number {
  return explainSmartScore(stats, opponentAbbreviation).projectedScore;
}

export type StrategicStatus = 'GO' | 'OK' | 'HOLD';

export interface StrategicEvaluation {
  /** Score V2 (pace et deltas de profil). Base du VORP et du statut GO/OK/HOLD. */
  projectedScore: number;
  /** Score V1 (défense seule), exposé pour la comparaison dans l'UI. */
  projectedScoreV1: number;
  /** DRtg adverse / DRtg moyen. 1 si l'équipe est absente. */
  drtgModifier: number;
  /** Pace adverse / pace moyen. 1 si l'équipe est absente. */
  paceModifier: number;
  /** Rebonds attendus − rebonds moyens. */
  rebDelta: number;
  /** Turnovers attendus − turnovers moyens. Le score V2 soustrait cette valeur. */
  tovDelta: number;
  /** Points TTFL liés au volume de lancers francs attendu. */
  ftDeltaPoints: number;
  currentVorp: number;
  maxFutureVorp: number;
  strategicStatus: StrategicStatus;
}

interface ScheduleGame {
  team1: string;
  team2: string;
}

interface ScheduleDay {
  totalGames: number;
  games: ScheduleGame[];
}

interface StrategicPlayer extends SmartScoreInput {
  name?: string;
  teamAbbr?: string;
}

const HORIZON_DAYS = 30;
const schedule = scheduleDb as Record<string, ScheduleDay>;

interface TeamNight {
  date: string;
  totalGames: number;
}

const nightsByTeam = new Map<string, TeamNight[]>();

for (const [date, day] of Object.entries(schedule)) {
  const totalGames = day.totalGames ?? day.games.length;
  for (const game of day.games) {
    for (const team of [game.team1, game.team2]) {
      const abbreviation = team.trim().toUpperCase();
      if (!abbreviation || abbreviation === 'TBD') {
        continue;
      }
      const nights = nightsByTeam.get(abbreviation) ?? [];
      nights.push({ date, totalGames });
      nightsByTeam.set(abbreviation, nights);
    }
  }
}

/** Score TTFL médian d'un pick de remplacement, selon la densité de la soirée. */
export function getReplacementScore(numGames: number): number {
  if (numGames >= 10) {
    return 45;
  }
  if (numGames >= 7) {
    return 40;
  }
  if (numGames >= 4) {
    return 35;
  }
  return 30;
}

export function gamesOnDate(date: string): number {
  const day = schedule[date];
  return day?.totalGames ?? day?.games.length ?? 0;
}

function shiftIsoDate(isoDate: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    return isoDate;
  }

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * GO si ce soir atteint 90 % du pic, OK entre 70 % et 90 %, HOLD en dessous.
 * Un pic futur nul ou négatif rend ce soir jouable : c'est le moins mauvais créneau.
 */
function statusFor(currentVorp: number, maxFutureVorp: number): StrategicStatus {
  if (maxFutureVorp <= 0) {
    return 'GO';
  }

  const vorpRatio = currentVorp / maxFutureVorp;
  if (vorpRatio >= 0.9) {
    return 'GO';
  }
  if (vorpRatio >= 0.7) {
    return 'OK';
  }
  return 'HOLD';
}

/**
 * Compare le VORP de ce soir au meilleur VORP estimé sur les 30 prochains jours.
 * Le statut est un ratio, pas un écart en points : un même calendrier donne
 * le même GO/OK/HOLD à un rôle-player et à une superstar.
 * Le VORP futur utilise le score moyen du joueur, sans matchup défensif.
 */
export function evaluateStrategicPick(
  player: StrategicPlayer,
  opponentAbbreviation: string,
  currentDateString: string,
  gamesTonight = gamesOnDate(currentDateString),
): StrategicEvaluation {
  const breakdown = explainSmartScore(player, opponentAbbreviation);
  const projectedScore = breakdown.projectedScore;
  const projectedScoreV1 = breakdown.projectedScoreV1;
  const currentVorp = roundScore(projectedScore - getReplacementScore(gamesTonight));
  const averageScore = explainSmartScore(player, '').projectedScore;
  const team = (player.teamAbbr ?? '').trim().toUpperCase();
  const horizonEnd = shiftIsoDate(currentDateString, HORIZON_DAYS);
  let maxFutureVorp = Number.NEGATIVE_INFINITY;

  for (const night of nightsByTeam.get(team) ?? []) {
    if (night.date <= currentDateString || night.date > horizonEnd) {
      continue;
    }
    const futureVorp = roundScore(averageScore - getReplacementScore(night.totalGames));
    if (futureVorp > maxFutureVorp) {
      maxFutureVorp = futureVorp;
    }
  }

  if (!Number.isFinite(maxFutureVorp)) {
    maxFutureVorp = currentVorp;
  }

  const strategicStatus = statusFor(currentVorp, maxFutureVorp);

  if (player.name && ['Dončić', 'Giannis', 'Shai', 'Wembanyama'].some((token) => player.name?.includes(token))) {
    console.log('[TTFL deltas]', {
      joueur: player.name,
      adversaire: opponentAbbreviation,
      rebDelta: roundScore(breakdown.rebDelta),
      tovDelta: roundScore(breakdown.tovDelta),
      ftDeltaPoints: roundScore(breakdown.ftDeltaPoints),
      scoreV1: projectedScoreV1,
      scoreV2: projectedScore,
    });
  }

  if (player.name?.includes('Luka')) {
    const futureMatchesLog = (nightsByTeam.get(team) ?? [])
      .filter((night) => night.date > currentDateString && night.date <= horizonEnd)
      .map((night) => ({
        date: night.date,
        totalGames: night.totalGames,
        vorp: roundScore(averageScore - getReplacementScore(night.totalGames)),
      }));

    console.log('\n--- DEBUG STRATÉGIE : LUKA DONCIC ---');
    console.log('Projection de ce soir', {
      scoreProjetéV1: projectedScoreV1,
      scoreProjeté: projectedScore,
      paceModifier: breakdown.paceModifier,
      adversaire: opponentAbbreviation,
      matchsNbaCeSoir: gamesTonight,
      vorpActuel: currentVorp,
    });
    console.table(futureMatchesLog);
    const vorpRatio = maxFutureVorp > 0 ? currentVorp / maxFutureVorp : null;
    console.log('Décision finale', {
      maxFutureVorp,
      vorpRatio: vorpRatio === null ? 'pic <= 0 → GO' : Math.round(vorpRatio * 1000) / 1000,
      seuils: 'GO ≥ 90 % · OK ≥ 70 % · HOLD < 70 %',
      strategicStatus,
    });
  }

  return {
    projectedScore,
    projectedScoreV1,
    drtgModifier: breakdown.drtgModifier,
    paceModifier: breakdown.paceModifier,
    rebDelta: breakdown.rebDelta,
    tovDelta: breakdown.tovDelta,
    ftDeltaPoints: breakdown.ftDeltaPoints,
    currentVorp,
    maxFutureVorp,
    strategicStatus,
  };
}
