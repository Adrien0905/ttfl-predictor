/** Durée calendaire pendant laquelle un joueur validé reste indisponible. */
export const LOCK_DURATION_DAYS = 30;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function localDayIndex(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Nombre de jours calendaires écoulés depuis le pick, minuit local contre minuit local. */
export function calendarDaysSince(pickedAtIso: string, now: Date = new Date()): number {
  const pickedAt = new Date(pickedAtIso);
  if (Number.isNaN(pickedAt.getTime())) {
    return LOCK_DURATION_DAYS;
  }

  const elapsed = localDayIndex(now) - localDayIndex(pickedAt);
  return Math.max(0, Math.round(elapsed / MS_PER_DAY));
}

/** Jours restants avant libération. 0 signifie que le joueur est de nouveau disponible. */
export function daysUntilRelease(pickedAtIso: string, now: Date = new Date()): number {
  return LOCK_DURATION_DAYS - calendarDaysSince(pickedAtIso, now);
}

export function isStillLocked(pickedAtIso: string, now: Date = new Date()): boolean {
  return daysUntilRelease(pickedAtIso, now) > 0;
}
