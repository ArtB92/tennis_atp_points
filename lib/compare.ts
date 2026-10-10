import { getDataset, getPlayer, rankingRows, resultsFor, uncountedFor, type RankingRow } from "./data";
import { addDays } from "./dates";
import { computeProjection, type FloorPoint } from "./projection";
import type { Level, Player } from "./types";

export interface DropMonth {
  /** First day of the month, ISO date. */
  month: string;
  points: number;
  events: { name: string; level: Level; points: number }[];
}

export interface CompareSide {
  player: Player;
  row: RankingRow;
  events: number;
  wins: number;
  losses: number;
  titles: number;
  /** Points coming off within 4, 13, 26 and 52 weeks. */
  defend: { weeks: number; points: number }[];
  floor: FloorPoint[];
  /** What drops off in each of the next 12 months. */
  months: DropMonth[];
}

let rowsById: Map<string, RankingRow> | null = null;

/** Everything the compare page shows for one player, or null if he isn't ranked. */
export function compareSide(id: string): CompareSide | null {
  const player = getPlayer(id);
  const ds = getDataset();
  const proj = computeProjection(ds, id);
  if (!player || !proj) return null;
  rowsById ??= new Map(rankingRows().map((r) => [r.id, r]));
  const played = [...resultsFor(id), ...uncountedFor(id)];
  const matches = played.flatMap((r) => r.matches);

  const asOf = ds.meta.rankingDate;
  const months: DropMonth[] = [];
  for (let i = 0; i < 12; i++) {
    const [y, m] = asOf.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + i, 1));
    months.push({ month: d.toISOString().slice(0, 10), points: 0, events: [] });
  }
  for (const e of proj.entries) {
    const slot = months.find((m) => m.month.slice(0, 7) === e.drops.slice(0, 7));
    if (!slot || e.points <= 0) continue;
    slot.points += e.points;
    slot.events.push({ name: e.tournament.name, level: e.tournament.level, points: e.points });
  }

  const within = (weeks: number) => {
    const until = addDays(asOf, weeks * 7);
    return proj.entries.filter((e) => e.drops <= until).reduce((s, e) => s + e.points, 0);
  };

  return {
    player,
    row: rowsById.get(id)!,
    events: played.length,
    wins: matches.filter((m) => m.won).length,
    losses: matches.filter((m) => !m.won).length,
    titles: played.filter((r) => r.finish === "W").length,
    defend: [4, 13, 26, 52].map((weeks) => ({ weeks, points: within(weeks) })),
    floor: proj.floor,
    months,
  };
}
