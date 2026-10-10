import { nextEdition } from "./build";
import { addDays } from "./dates";
import type { Dataset, Player, Result, Tournament } from "./types";

export interface DefenceEntry {
  tournament: Tournament;
  /** Last year's result, or null if the player skipped the event. */
  result: Result | null;
  points: number;
  /** Start of this year's edition: its real date once played, else expected. */
  nextStart: string;
  /** Date last year's points come off his total. */
  drops: string;
}

export interface FloorPoint {
  date: string;
  /** Points left if he earns nothing more from here on. */
  floor: number;
  /** Rank those points would give, assuming everyone else also earns nothing. */
  rank: number;
}

export interface Projection {
  player: Player;
  asOf: string;
  entries: DefenceEntry[];
  /** Points from events this app tracks (Slams, Masters, 500s, 250s, Finals). */
  trackedPoints: number;
  /** Rest of the official total: Challengers, United Cup, and anything else not tracked. */
  otherPoints: number;
  floor: FloorPoint[];
}

/** Points a player still holds at `date` if he earns nothing after the ranking date. */
function floorAt(player: Player, results: Result[], tById: Map<string, Tournament>, date: string): number {
  let dropped = 0;
  for (const r of results) {
    const t = tById.get(r.tournamentId);
    if (t && t.drops <= date) dropped += r.points;
  }
  return Math.max(0, player.points - dropped);
}

export function computeProjection(ds: Dataset, playerId: string, weeks = 52): Projection | null {
  const player = ds.players.find((p) => p.id === playerId);
  if (!player) return null;
  const asOf = ds.meta.rankingDate;
  const tById = new Map(ds.tournaments.map((t) => [t.id, t]));

  const resultsByPlayer = new Map<string, Result[]>();
  for (const r of ds.results) {
    const list = resultsByPlayer.get(r.playerId);
    if (list) list.push(r);
    else resultsByPlayer.set(r.playerId, [r]);
  }
  const mine = resultsByPlayer.get(playerId) ?? [];
  const mineByT = new Map(mine.map((r) => [r.tournamentId, r]));

  const entries: DefenceEntry[] = ds.tournaments
    .map((t) => {
      const result = mineByT.get(t.id) ?? null;
      return { tournament: t, result, points: result?.points ?? 0, nextStart: t.next?.start ?? nextEdition(t), drops: t.drops };
    })
    .filter((e) => e.drops > asOf)
    .sort((a, b) => a.drops.localeCompare(b.drops) || a.tournament.name.localeCompare(b.tournament.name));

  const trackedPoints = mine.reduce((s, r) => s + r.points, 0);

  const floor: FloorPoint[] = [];
  for (let w = 0; w <= weeks; w++) {
    const date = addDays(asOf, w * 7);
    const own = floorAt(player, mine, tById, date);
    let rank = 1;
    for (const other of ds.players) {
      if (other.id === playerId) continue;
      const theirs = floorAt(other, resultsByPlayer.get(other.id) ?? [], tById, date);
      if (theirs > own) rank++;
    }
    floor.push({ date, floor: own, rank });
  }

  return {
    player,
    asOf,
    entries,
    trackedPoints,
    otherPoints: Math.max(0, player.points - trackedPoints),
    floor,
  };
}
