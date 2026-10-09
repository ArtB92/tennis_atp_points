import { parseCSV } from "./csv";
import { addDays, fromCompact } from "./dates";
import { classifyLevel, pointsForEvent, ROUND_ORDER } from "./points";
import type { Dataset, Match, Player, Result, Round, Tournament } from "./types";

const KNOWN_ROUNDS = new Set<string>([...ROUND_ORDER, "RR"]);

export interface BuildInput {
  rankingsCsv: string;
  playersCsv: string;
  /** Tour-level match files (atp_matches_YYYY.csv), any order. */
  matchesCsvs: string[];
  source: Dataset["meta"]["source"];
  /** How many ranked players to keep. */
  topN?: number;
  generatedAt?: string;
}

/** The date a result stops counting: the Monday after the next edition of the event ends. */
export function dropDate(t: Pick<Tournament, "start" | "weeks">): string {
  return addDays(t.start, 364 + 7 * t.weeks);
}

/** Expected start of the next edition: same week next year. */
export function nextEdition(t: Pick<Tournament, "start">): string {
  return addDays(t.start, 364);
}

function eventWeeks(level: Tournament["level"], drawSize: number): number {
  if (level === "G") return 2;
  if (level === "M" && drawSize > 64) return 2;
  return 1;
}

export function buildDataset(input: BuildInput): Dataset {
  const topN = input.topN ?? 200;

  // Rankings: keep only the most recent list.
  const rankRows = parseCSV(input.rankingsCsv);
  const rankingDateCompact = rankRows.reduce((max, r) => (r.ranking_date > max ? r.ranking_date : max), "");
  if (!rankingDateCompact) throw new Error("Rankings file has no ranking_date values");
  const rankingDate = fromCompact(rankingDateCompact);
  const latest = rankRows
    .filter((r) => r.ranking_date === rankingDateCompact)
    .map((r) => ({ id: r.player, rank: Number(r.rank), points: Number(r.points) }))
    .filter((r) => r.rank > 0 && r.rank <= topN)
    .sort((a, b) => a.rank - b.rank);
  const ranked = new Map(latest.map((r) => [r.id, r]));

  // Players: names and bios for the ranked players only.
  const bios = new Map<string, Record<string, string>>();
  for (const p of parseCSV(input.playersCsv)) {
    if (ranked.has(p.player_id)) bios.set(p.player_id, p);
  }
  const players: Player[] = latest.map((r) => {
    const bio = bios.get(r.id);
    const name = bio ? `${bio.name_first} ${bio.name_last}`.trim() : `Player ${r.id}`;
    return {
      id: r.id,
      name,
      country: bio?.ioc ?? "",
      hand: bio?.hand ?? "",
      dob: bio?.dob && bio.dob.length === 8 ? fromCompact(bio.dob) : "",
      rank: r.rank,
      points: r.points,
    };
  });

  // Matches: group by event, keep events whose points still count at the ranking date.
  const matchRows = input.matchesCsvs.flatMap(parseCSV);
  let latestEventDate = "";
  const byEvent = new Map<string, Record<string, string>[]>();
  for (const m of matchRows) {
    if (!m.tourney_id || !m.tourney_date) continue;
    const start = fromCompact(m.tourney_date);
    if (start > latestEventDate) latestEventDate = start;
    const list = byEvent.get(m.tourney_id);
    if (list) list.push(m);
    else byEvent.set(m.tourney_id, [m]);
  }

  const tournaments: Tournament[] = [];
  const results: Result[] = [];

  for (const [id, rows] of byEvent) {
    const first = rows[0];
    const start = fromCompact(first.tourney_date);
    const level = classifyLevel(first.tourney_level, first.tourney_name, Number(start.slice(0, 4)));
    if (!level) continue;
    const drawSize = Number(first.draw_size) || 32;
    const t: Tournament = {
      id,
      name: first.tourney_name,
      level,
      surface: first.surface,
      drawSize,
      start,
      weeks: eventWeeks(level, drawSize),
    };
    // Points from this event count until the next edition finishes.
    if (start >= rankingDate || dropDate(t) <= rankingDate) continue;
    tournaments.push(t);

    const perPlayer = new Map<string, Match[]>();
    for (const m of rows) {
      if (!KNOWN_ROUNDS.has(m.round)) continue;
      for (const side of ["winner", "loser"] as const) {
        const pid = m[`${side}_id`];
        if (!ranked.has(pid)) continue;
        const opp = side === "winner" ? "loser" : "winner";
        const match: Match = {
          round: m.round as Round,
          won: side === "winner",
          opponent: m[`${opp}_name`],
          opponentId: m[`${opp}_id`],
          opponentRank: m[`${opp}_rank`] ? Number(m[`${opp}_rank`]) : null,
          score: m.score,
        };
        const list = perPlayer.get(pid);
        if (list) list.push(match);
        else perPlayer.set(pid, [match]);
      }
    }
    for (const [playerId, matches] of perPlayer) {
      matches.sort((a, b) => roundIndex(a.round) - roundIndex(b.round));
      const { finish, points } = pointsForEvent(level, drawSize, matches);
      results.push({ playerId, tournamentId: id, finish, points, matches });
    }
  }

  tournaments.sort((a, b) => a.start.localeCompare(b.start) || a.name.localeCompare(b.name));

  return {
    meta: {
      source: input.source,
      rankingDate,
      latestEventDate,
      generatedAt: input.generatedAt ?? new Date().toISOString(),
    },
    players,
    tournaments,
    results,
  };
}

function roundIndex(r: Round): number {
  return r === "RR" ? -1 : ROUND_ORDER.indexOf(r);
}
