import { isPlayerAvailable } from '../constants/userHistory';
import playersDb from '../data/players_db.json';
import { getRemainingDays, getSavedPicks, type SavedPick } from './pickStorage';
import { evaluateStrategicPick, gamesOnDate, type StrategicStatus } from '../utils/predictionEngine';

const TOP_PICKS = 50;

/** Tricodes ESPN vers les abréviations NBA.com stockées dans players_db.json. */
const ESPN_TO_NBA: Record<string, string> = {
  GS: 'GSW',
  NO: 'NOP',
  NY: 'NYK',
  SA: 'SAS',
  UTAH: 'UTA',
  WSH: 'WAS',
};

export interface PickRecommendation {
  id: string | number;
  name: string;
  teamAbbr: string;
  opponentAbbreviation: string;
  projectedScore: number;
  projectedScoreV1: number;
  drtgModifier: number;
  paceModifier: number;
  rebDelta: number;
  tovDelta: number;
  ftDeltaPoints: number;
  vorp: number;
  strategicStatus: StrategicStatus;
  maxFutureVorp: number;
  isLocked: boolean;
  remainingDays: number;
}

interface EspnCompetitor {
  team?: {
    abbreviation?: string;
  };
}

interface EspnEvent {
  competitions?: {
    competitors?: EspnCompetitor[];
  }[];
}

interface EspnScoreboard {
  events?: EspnEvent[];
}

export function normalizeTeamAbbr(abbr: string): string {
  const trimmed = abbr.trim();
  return ESPN_TO_NBA[trimmed.toUpperCase()] ?? trimmed;
}

function opponentByTeam(events: EspnEvent[]): Map<string, string> {
  const nights = new Map<string, string>();

  for (const event of events) {
    const competitors = event.competitions?.[0]?.competitors ?? [];
    const abbreviations = competitors
      .map((competitor) => normalizeTeamAbbr(competitor.team?.abbreviation ?? ''))
      .filter((abbreviation) => abbreviation.length > 0);

    if (abbreviations.length < 2) {
      continue;
    }

    const [first, second] = abbreviations;
    nights.set(first, second);
    nights.set(second, first);
  }

  return nights;
}

function lockState(saved: SavedPick[], playerId: string | number): { isLocked: boolean; remainingDays: number } {
  const match = saved.find((pick) => String(pick.id) === String(playerId));
  if (!match) {
    return { isLocked: false, remainingDays: 0 };
  }

  const remainingDays = getRemainingDays(match.pickedAt);
  return { isLocked: remainingDays > 0, remainingDays: remainingDays > 0 ? remainingDays : 0 };
}

/** Top 50 TTFL du soir : moyennes locales, adversaires du scoreboard ESPN. */
export async function fetchDailyPicks(): Promise<PickRecommendation[]> {
  try {
    const todayIso = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
    const todayUS = todayIso.replace(/-/g, '');
    const gamesTonight = gamesOnDate(todayIso);
    const espnUrl = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${todayUS}`;
    const response = await fetch(espnUrl);
    if (!response.ok) {
      throw new Error(`ESPN scoreboard HTTP ${response.status}.`);
    }

    const data = (await response.json()) as EspnScoreboard;
    const nights = opponentByTeam(data.events ?? []);
    let saved: SavedPick[] = [];
    try {
      saved = await getSavedPicks();
    } catch (storageError) {
      const storageMessage = storageError instanceof Error ? storageError.message : String(storageError);
      console.error(`[nbaApi] Lecture des picks sauvegardés impossible : ${storageMessage}`);
    }
    const picks: PickRecommendation[] = [];

    for (const player of playersDb) {
      const opponentAbbreviation = nights.get(normalizeTeamAbbr(player.teamAbbr));
      if (!opponentAbbreviation || !isPlayerAvailable(player.name, todayIso).available) {
        continue;
      }

      const lock = lockState(saved, player.id);
      if (lock.isLocked) {
        continue;
      }

      const evaluation = evaluateStrategicPick(player, opponentAbbreviation, todayIso, gamesTonight);
      picks.push({
        id: player.id,
        name: player.name,
        teamAbbr: player.teamAbbr,
        opponentAbbreviation,
        projectedScore: evaluation.projectedScore,
        projectedScoreV1: evaluation.projectedScoreV1,
        drtgModifier: evaluation.drtgModifier,
        paceModifier: evaluation.paceModifier,
        rebDelta: evaluation.rebDelta,
        tovDelta: evaluation.tovDelta,
        ftDeltaPoints: evaluation.ftDeltaPoints,
        vorp: evaluation.currentVorp,
        strategicStatus: evaluation.strategicStatus,
        maxFutureVorp: evaluation.maxFutureVorp,
        ...lock,
      });
    }

    return picks.sort((left, right) => right.projectedScore - left.projectedScore).slice(0, TOP_PICKS);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[nbaApi] Échec du scoreboard ESPN : ${message}`);
    throw error instanceof Error ? error : new Error(message);
  }
}
