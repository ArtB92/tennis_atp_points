import raw from "@/data/atp.json";
import { ageOn } from "./dates";
import type { Dataset, Level, Player, Result, Tournament } from "./types";

const ds = raw as Dataset;

const playersById = new Map(ds.players.map((p) => [p.id, p]));
const tournamentsById = new Map(ds.tournaments.map((t) => [t.id, t]));
const resultsByPlayer = new Map<string, Result[]>();
for (const r of ds.results) {
  const list = resultsByPlayer.get(r.playerId);
  if (list) list.push(r);
  else resultsByPlayer.set(r.playerId, [r]);
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

/** A player's counting results, most recent first. */
export function resultsFor(playerId: string): PlayedEvent[] {
  return (resultsByPlayer.get(playerId) ?? [])
    .map((r) => {
      const tournament = tournamentsById.get(r.tournamentId)!;
      return { ...r, tournament, drops: tournament.drops };
    })
    .sort((a, b) => b.tournament.start.localeCompare(a.tournament.start));
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
      nextDrop: next ? { event: next.tournament.name, level: next.tournament.level, points: next.points, date: next.drops } : null,
    };
  });
}
