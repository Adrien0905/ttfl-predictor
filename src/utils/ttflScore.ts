import type { PlayerAverages } from '@/types';

/**
 * Score TTFL =
 * (PTS + REB + AST + STL + BLK + FGM + 3PM + FTM) − (TOV + tirs ratés + 3pts ratés + LF ratés).
 * Les 3pts comptent à la fois dans les tirs et dans les 3pts, comme dans le barème TTFL.
 */
export function computeTtflScore(stats: PlayerAverages): number {
  const positive =
    stats.pts +
    stats.reb +
    stats.ast +
    stats.stl +
    stats.blk +
    stats.fgm +
    stats.fg3m +
    stats.ftm;
  const negative = stats.tov + stats.fgMissed + stats.fg3Missed + stats.ftMissed;
  return Math.round((positive - negative) * 10) / 10;
}
