import { parseCSV } from "./csv";
import { addDays, fromCompact, mondayOf, toISO } from "./dates";
import { classifyLevel, pointsForEvent, ROUND_ORDER } from "./points";
import type { Dataset, Level, Match, Player, Result, Round, Tournament } from "./types";

const KNOWN_ROUNDS = new Set<string>([...ROUND_ORDER, "RR"]);

export interface BuildInput {
  /**
   * Tour-level match files in Sackmann's column layout, any order: TennisMyLife's
   * yearly and ongoing files, where tourney_date is the day each match was played,
   * or Sackmann-style files, where it is the event's start date.
   */
  matchesCsvs: string[];
  /** An official ranking list (ranking_date, rank, player, points). Without one, rankings are estimated. */
  rankingsCsv?: string;
  /** Player bios (player_id, name_first, name_last, hand, dob, ioc). Without one, bios come from match rows. */
  playersCsv?: string;
  source: Dataset["meta"]["source"];
  /** Date to calculate for when no ranking list is given; defaults to today. */
  asOf?: string;
  /** How many ranked players to keep. */
  topN?: number;
  generatedAt?: string;
}

/** Expected start of the next edition: same week next year. */
export function nextEdition(t: Pick<Tournament, "start">): string {
  return addDays(t.start, 364);
}

/** The Monday after next year's edition should end, when this edition's points come off. */
export function estimatedDrop(end: string): string {
  return addDays(mondayOf(addDays(end, 364)), 7);
}

function eventWeeks(level: Level, drawSize: number): number {
  if (level === "G") return 2;
  if (level === "M" && drawSize > 64) return 2;
  return 1;
}

interface Event extends Tournament {
  year: number;
  /** When the ATP itself drops these points: the Monday after next year's edition ends. */
  officialDrop: string;
  rows: Record<string, string>[];
}

function dedupeKey(m: Record<string, string>) {
  return `${m.tourney_id}|${m.round}|${m.winner_id}|${m.loser_id}`;
}

export function buildDataset(input: BuildInput): Dataset {
  const topN = input.topN ?? 200;

  // Matches: the ongoing file overlaps the yearly one, so dedupe.
  const seen = new Set<string>();
  const matchRows: Record<string, string>[] = [];
  let latestMatchDate = "";
  for (const m of input.matchesCsvs.flatMap(parseCSV)) {
    if (!m.tourney_id || !/^\d{8}$/.test(m.tourney_date ?? "")) continue;
    const key = dedupeKey(m);
    if (seen.has(key)) continue;
    seen.add(key);
    matchRows.push(m);
    const day = fromCompact(m.tourney_date);
    if (day > latestMatchDate) latestMatchDate = day;
  }

  // Ranking date: the official list's, or the date we calculate for.
  const rankRows = input.rankingsCsv ? parseCSV(input.rankingsCsv) : [];
  const rankingDateCompact = rankRows.reduce((max, r) => (r.ranking_date > max ? r.ranking_date : max), "");
  if (input.rankingsCsv && !rankingDateCompact) throw new Error("Rankings file has no ranking_date values");
  const asOf = rankingDateCompact ? fromCompact(rankingDateCompact) : (input.asOf ?? toISO(new Date()));

  // Events.
  const grouped = new Map<string, Record<string, string>[]>();
  for (const m of matchRows) {
    const list = grouped.get(m.tourney_id);
    if (list) list.push(m);
    else grouped.set(m.tourney_id, [m]);
  }
  const events: Event[] = [];
  for (const [id, rows] of grouped) {
    const days = rows.map((r) => fromCompact(r.tourney_date)).sort();
    const first = rows[0];
    const year = Number(days[0].slice(0, 4));
    const level = classifyLevel(first.tourney_level, first.tourney_name, year);
    if (!level) continue;
    const drawSize = Math.max(...rows.map((r) => Number(r.draw_size) || 0)) || 32;
    // Events that start on a Sunday (or mid-week) belong to the following/current ATP week.
    const start = mondayOf(addDays(days[0], 1));
    const end = [days[days.length - 1], addDays(start, 7 * eventWeeks(level, drawSize) - 1)].sort().pop()!;
    events.push({ id, name: first.tourney_name, level, surface: first.surface, drawSize, start, end, drops: estimatedDrop(end), officialDrop: estimatedDrop(end), year, rows });
  }

  // When next year's edition has already started, last year's points are gone
  // (live-ranking convention: the new result replaces the old one).
  const byKey = new Map<string, Event>();
  const suffix = (id: string) => id.replace(/^\d{4}-/, "");
  for (const e of events) {
    byKey.set(`id:${e.year}:${suffix(e.id)}`, e);
    byKey.set(`name:${e.year}:${e.name.toLowerCase()}`, e);
  }
  for (const e of events) {
    const next = byKey.get(`id:${e.year + 1}:${suffix(e.id)}`) ?? byKey.get(`name:${e.year + 1}:${e.name.toLowerCase()}`);
    if (!next) continue;
    e.officialDrop = addDays(mondayOf(next.end), 7);
    e.drops = next.start <= asOf ? next.start : e.officialDrop;
  }

  // Results per player for every event up to the ranking date (including ones that
  // already dropped: the ranking estimate needs those).
  const allResults = new Map<string, (Result & { event: Event })[]>();
  for (const e of events) {
    if (e.start > asOf) continue;
    const perPlayer = new Map<string, Match[]>();
    for (const m of e.rows) {
      if (!KNOWN_ROUNDS.has(m.round) || fromCompact(m.tourney_date) > asOf) continue;
      for (const side of ["winner", "loser"] as const) {
        const opp = side === "winner" ? "loser" : "winner";
        const pid = m[`${side}_id`];
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
      const { finish, points } = pointsForEvent(e.level, e.drawSize, matches);
      const r = { playerId, tournamentId: e.id, finish, points, matches, event: e };
      const list = allResults.get(playerId);
      if (list) list.push(r);
      else allResults.set(playerId, [r]);
    }
  }

  const players = input.rankingsCsv
    ? officialPlayers(rankRows, rankingDateCompact, input.playersCsv ?? "", topN)
    : estimatedPlayers(matchRows, allResults, asOf, topN);
  const kept = new Set(players.map((p) => p.id));

  const counting = events.filter((e) => e.start <= asOf && e.drops > asOf);
  const countingIds = new Set(counting.map((e) => e.id));
  const results: Result[] = [];
  for (const [playerId, list] of allResults) {
    if (!kept.has(playerId)) continue;
    for (const { event, ...r } of list) if (countingIds.has(event.id)) results.push(r);
  }

  const tournaments: Tournament[] = counting
    .map(({ id, name, level, surface, drawSize, start, end, drops }): Tournament => ({ id, name, level, surface, drawSize, start, end, drops }))
    .sort((a, b) => a.start.localeCompare(b.start) || a.name.localeCompare(b.name));

  return {
    meta: {
      source: input.source,
      rankings: input.rankingsCsv ? "official" : "estimated",
      rankingDate: asOf,
      latestMatchDate,
      generatedAt: input.generatedAt ?? new Date().toISOString(),
    },
    players,
    tournaments,
    results,
  };
}

function officialPlayers(rankRows: Record<string, string>[], date: string, playersCsv: string, topN: number): Player[] {
  const latest = rankRows
    .filter((r) => r.ranking_date === date)
    .map((r) => ({ id: r.player, rank: Number(r.rank), points: Number(r.points) }))
    .filter((r) => r.rank > 0 && r.rank <= topN)
    .sort((a, b) => a.rank - b.rank);
  const bios = new Map(parseCSV(playersCsv).map((p) => [p.player_id, p]));
  return latest.map((r) => {
    const bio = bios.get(r.id);
    return {
      id: r.id,
      name: bio ? `${bio.name_first} ${bio.name_last}`.trim() : `Player ${r.id}`,
      country: bio?.ioc ?? "",
      hand: bio?.hand ?? "",
      dob: bio?.dob && bio.dob.length === 8 ? fromCompact(bio.dob) : "",
      rank: r.rank,
      points: r.points,
    };
  });
}

/**
 * Estimate today's ranking from match rows. Each row carries a player's official
 * points for that event's week; from his latest one we add what he has earned
 * since and take off what has dropped since.
 */
function estimatedPlayers(
  rows: Record<string, string>[],
  results: Map<string, (Result & { event: Event })[]>,
  asOf: string,
  topN: number,
): Player[] {
  const cutoff = addDays(asOf, -364);
  const snapshot = new Map<string, { day: string; points: number; name: string; ioc: string; hand: string; dob: string }>();
  for (const m of rows) {
    const day = fromCompact(m.tourney_date);
    if (day > asOf || day < cutoff) continue;
    for (const side of ["winner", "loser"] as const) {
      const pts = m[`${side}_rank_points`];
      if (!pts) continue;
      const id = m[`${side}_id`];
      const prev = snapshot.get(id);
      if (prev && prev.day >= day) continue;
      const age = Number(m[`${side}_age`]);
      snapshot.set(id, {
        day,
        points: Number(pts),
        name: m[`${side}_name`],
        ioc: m[`${side}_ioc`],
        hand: m[`${side}_hand`],
        dob: age > 0 ? toISO(new Date(Date.parse(`${day}T00:00:00Z`) - age * 365.25 * 86_400_000)) : "",
      });
    }
  }

  const estimates = [...snapshot].map(([id, s]) => {
    // Rank points on a row are as of the Monday its event started.
    const mine = results.get(id) ?? [];
    const latestEvent = mine.filter((r) => r.event.start <= s.day).sort((a, b) => b.event.start.localeCompare(a.event.start))[0];
    const week = latestEvent?.event.start ?? mondayOf(s.day);
    const earned = mine.filter((r) => r.event.start >= week).reduce((t, r) => t + r.points, 0);
    // Still inside his official total that week, but gone by the ranking date.
    const dropped = mine
      .filter((r) => r.event.start < week && r.event.officialDrop > week && r.event.drops <= asOf)
      .reduce((t, r) => t + r.points, 0);
    return { id, s, points: Math.max(0, s.points + earned - dropped) };
  });

  estimates.sort((a, b) => b.points - a.points || a.s.name.localeCompare(b.s.name));
  return estimates.slice(0, topN).map((e, i) => ({
    id: e.id,
    name: e.s.name,
    country: e.s.ioc,
    hand: e.s.hand,
    dob: e.s.dob,
    rank: i + 1,
    points: e.points,
  }));
}

function roundIndex(r: Round): number {
  return r === "RR" ? -1 : ROUND_ORDER.indexOf(r);
}
