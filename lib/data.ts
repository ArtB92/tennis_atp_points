import raw from "@/data/atp.json";
import { addDays, ageOn } from "./dates";
import type { Dataset, Draw, DrawEntrant, Level, Player, Result, Tournament } from "./types";

const ds = raw as Dataset;

const playersById = new Map(ds.players.map((p) => [p.id, p]));
const tournamentsById = new Map(ds.tournaments.map((t) => [t.id, t]));
function byPlayer(results: Result[]): Map<string, Result[]> {
  const out = new Map<string, Result[]>();
  for (const r of results) {
    const list = out.get(r.playerId);
    if (list) list.push(r);
    else out.set(r.playerId, [r]);
  }
  return out;
}
const resultsByPlayer = byPlayer(ds.results);
const uncountedByPlayer = byPlayer(ds.uncounted ?? []);

/** The day the data was refreshed: what "under way" and "just played" are measured against. */
export function dataDay(): string {
  return ds.meta.generatedAt.slice(0, 10) > ds.meta.rankingDate ? ds.meta.generatedAt.slice(0, 10) : ds.meta.rankingDate;
}

/** Dates of an event's next edition: real ones once it is in the data, else the same week next year. */
export function nextDates(t: Tournament): { start: string; end: string; estimated: boolean } {
  return t.next ? { ...t.next, estimated: false } : { start: addDays(t.start, 364), end: addDays(t.end, 364), estimated: true };
}

export function getDataset(): Dataset {
  return ds;
}

export function getPlayer(id: string): Player | undefined {
  return playersById.get(id);
}

export interface PlayedEvent extends Result {
  tournament: Tournament;
  drops: string;
}

function played(list: Result[]): PlayedEvent[] {
  return list
    .map((r) => {
      const tournament = tournamentsById.get(r.tournamentId)!;
      return { ...r, tournament, drops: tournament.drops };
    })
    .sort((a, b) => b.tournament.start.localeCompare(a.tournament.start));
}

/** A player's counting results, most recent first. */
export function resultsFor(playerId: string): PlayedEvent[] {
  return played(resultsByPlayer.get(playerId) ?? []);
}

/** Results from counting events that his official total leaves out, most recent first. */
export function uncountedFor(playerId: string): PlayedEvent[] {
  return played(uncountedByPlayer.get(playerId) ?? []);
}

export type LevelPoints = Record<Level, number>;

export interface RankingRow {
  id: string;
  rank: number;
  name: string;
  country: string;
  age: number | null;
  points: number;
  byLevel: LevelPoints;
  other: number;
  /** Places gained since last week's list (negative when he fell); null when he wasn't on it, undefined when unknown. */
  move?: number | null;
  /** The next result to come off his total. */
  nextDrop: { event: string; level: Level; points: number; date: string } | null;
}

export function emptyLevels(): LevelPoints {
  return { G: 0, M: 0, "500": 0, "250": 0, F: 0 };
}

export function rankingRows(): RankingRow[] {
  const asOf = ds.meta.rankingDate;
  return ds.players.map((p) => {
    const results = resultsFor(p.id);
    const byLevel = emptyLevels();
    for (const r of results) byLevel[r.tournament.level] += r.points;
    const tracked = results.reduce((s, r) => s + r.points, 0);
    const next = results
      .filter((r) => r.points > 0 && r.drops > asOf)
      .sort((a, b) => a.drops.localeCompare(b.drops))[0];
    return {
      id: p.id,
      rank: p.rank,
      name: p.name,
      country: p.country,
      age: ageOn(p.dob, asOf),
      points: p.points,
      byLevel,
      other: Math.max(0, p.points - tracked),
      ...(p.prevRank !== undefined ? { move: p.prevRank === null ? null : p.prevRank - p.rank } : {}),
      nextDrop: next ? { event: next.tournament.name, level: next.tournament.level, points: next.points, date: next.drops } : null,
    };
  });
}

const drawsById = new Map((ds.draws ?? []).map((d) => [d.tournamentId, d]));

export function getTournament(id: string): Tournament | undefined {
  return tournamentsById.get(id);
}

export function getDraw(id: string): Draw | undefined {
  return drawsById.get(id);
}

export interface CalendarEntry {
  tournament: Tournament;
  /** Dates of the next edition (see nextDates). */
  nextStart: string;
  nextEnd: string;
  estimated: boolean;
  champion: DrawEntrant | null;
  runnerUp: DrawEntrant | null;
}

/** The next edition of every tracked event, in date order. */
export function calendar(): CalendarEntry[] {
  return ds.tournaments
    .map((t) => {
      const entrants = drawsById.get(t.id)?.entrants ?? [];
      const next = nextDates(t);
      return {
        tournament: t,
        nextStart: next.start,
        nextEnd: next.end,
        estimated: next.estimated,
        champion: entrants.find((e) => e.finish === "W") ?? null,
        runnerUp: entrants.find((e) => e.finish === "F") ?? null,
      };
    })
    .sort((a, b) => a.nextStart.localeCompare(b.nextStart) || a.tournament.name.localeCompare(b.tournament.name));
}

/** Matches two players played against each other in the counting events, most recent first. */
export function meetings(a: string, b: string): { tournament: Tournament; round: string; winnerId: string; score: string }[] {
  return [...resultsFor(a), ...uncountedFor(a)]
    .flatMap((r) =>
      r.matches
        .filter((m) => m.opponentId === b)
        .map((m) => ({ tournament: r.tournament, round: m.round, winnerId: m.won ? a : b, score: m.score })),
    )
    .sort((x, y) => y.tournament.start.localeCompare(x.tournament.start));
}
