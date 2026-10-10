import { parseCSV } from "./csv";
import { addDays, fromCompact, mondayOf, toISO } from "./dates";
import { classifyEvent, pointsForEvent, ROUND_ORDER } from "./points";
import type { Dataset, Draw, DrawEntrant, Level, Match, Player, Result, Round, Tournament } from "./types";

const KNOWN_ROUNDS = new Set<string>([...ROUND_ORDER, "RR"]);

export interface BuildInput {
  /**
   * Tour-level match files in Sackmann's column layout, any order: TennisMyLife's
   * yearly and ongoing files, where tourney_date is the day each match was played,
   * or Sackmann-style files, where it is the event's start date.
   */
  matchesCsvs: string[];
  /** An official ranking list as CSV (ranking_date, rank, player, points), keyed by player id. */
  rankingsCsv?: string;
  /** An official ranking list keyed by player name (TennisExplorer, ESPN). Without either list, rankings are estimated. */
  ranking?: OfficialRanking;
  /** The same source's list from the week before, for each player's rank change. */
  previousRanking?: OfficialRanking;
  /** Player bios (player_id, name_first, name_last, hand, dob, ioc). Without one, bios come from match rows. */
  playersCsv?: string;
  source: Dataset["meta"]["source"];
  /** Date to calculate for when no ranking list is given; defaults to today. */
  asOf?: string;
  /** How many ranked players to keep. */
  topN?: number;
  generatedAt?: string;
}

export interface OfficialRanking {
  /** Monday the list was published, ISO date. */
  date: string;
  entries: {
    rank: number;
    points: number;
    name: string;
    /** "First Last" spelling, when the source gives names surname first. */
    displayName?: string;
    /** IOC country code, when the source has it. */
    country?: string;
  }[];
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
  const official = Boolean(input.rankingsCsv || input.ranking);
  const asOf = rankingDateCompact
    ? fromCompact(rankingDateCompact)
    : (input.ranking?.date ?? input.asOf ?? toISO(new Date()));

  // Events.
  const grouped = new Map<string, Record<string, string>[]>();
  for (const m of matchRows) {
    const list = grouped.get(m.tourney_id);
    if (list) list.push(m);
    else grouped.set(m.tourney_id, [m]);
  }
  const events: Event[] = [];
  for (const [id, allRows] of grouped) {
    const first = allRows[0];
    const year = Number(id.slice(0, 4)) || Number(fromCompact(first.tourney_date).slice(0, 4));
    const name0 = allRows.find((r) => r.round === "F")?.tourney_name ?? first.tourney_name;
    const kind = classifyEvent(id, first.tourney_level, name0, year);
    if (!kind) continue;
    const { level, name } = kind;
    const drawSize = Math.max(...allRows.map((r) => Number(r.draw_size) || 0)) || 32;
    const weeks = eventWeeks(level, drawSize);
    // Rows dated well before the rest belong to another event filed under this id (the
    // source once put a Munich match into Rome); leave them out.
    const lastDay = allRows.map((r) => fromCompact(r.tourney_date)).sort().pop()!;
    const earliest = addDays(lastDay, -(7 * weeks + 3));
    const rows = allRows.filter((r) => fromCompact(r.tourney_date) >= earliest);
    const days = rows.map((r) => fromCompact(r.tourney_date)).sort();
    const last = days[days.length - 1];
    // Events that start on a Sunday (or mid-week) belong to the following/current ATP week.
    const start = mondayOf(addDays(days[0], 1));
    const end = [last, addDays(start, 7 * weeks - 1)].sort().pop()!;
    events.push({ id, name, level, surface: rows[0].surface, drawSize, start, end, drops: estimatedDrop(end), officialDrop: estimatedDrop(end), year, rows });
  }

  // Points drop the Monday after next year's edition ends. For an estimated live
  // ranking, they go as soon as that edition starts (the new result replaces them).
  const byKey = new Map<string, Event>();
  const suffix = (id: string) => id.replace(/^\d{4}-/, "");
  for (const e of events) {
    byKey.set(`id:${e.year}:${suffix(e.id)}`, e);
    byKey.set(`name:${e.year}:${e.name.toLowerCase()}`, e);
  }
  for (const e of events) {
    const next = byKey.get(`id:${e.year + 1}:${suffix(e.id)}`) ?? byKey.get(`name:${e.year + 1}:${e.name.toLowerCase()}`);
    if (!next) continue;
    e.next = { start: next.start, end: next.end };
    e.officialDrop = addDays(mondayOf(next.end), 7);
    e.drops = !official && next.start <= asOf ? next.start : e.officialDrop;
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

  const bios = snapshots(matchRows, asOf);
  const players = input.rankingsCsv
    ? officialPlayers(rankRows, rankingDateCompact, input.playersCsv ?? "", topN)
    : input.ranking
      ? namedPlayers(input.ranking, bios, topN, input.previousRanking)
      : estimatedPlayers(bios, allResults, asOf, topN);
  const kept = new Set(players.map((p) => p.id));

  // An official list only includes events finished before it was published.
  const counting = events.filter((e) => (official ? e.end < asOf : e.start <= asOf) && e.drops > asOf);
  const countingIds = new Set(counting.map((e) => e.id));
  const results: Result[] = [];
  const uncounted: Result[] = [];
  const pointsOf = new Map(players.map((p) => [p.id, p.points]));
  for (const [playerId, list] of allResults) {
    if (!kept.has(playerId)) continue;
    const mine = list.filter((r) => countingIds.has(r.event.id));
    const left = official ? notInTotal(mine, pointsOf.get(playerId)!) : new Set<(typeof mine)[number]>();
    for (const r of mine) {
      const { event, ...rest } = r;
      void event;
      (left.has(r) ? uncounted : results).push(rest);
    }
  }

  // Full draws of the counting editions, for every entrant (not only ranked players).
  const eventResults = new Map<string, Map<string, Result>>();
  for (const list of allResults.values()) {
    for (const { event, ...r } of list) {
      if (!countingIds.has(event.id)) continue;
      const byPlayer = eventResults.get(event.id) ?? new Map<string, Result>();
      byPlayer.set(r.playerId, r);
      eventResults.set(event.id, byPlayer);
    }
  }
  const draws: Draw[] = counting.map((e) => {
    const entrants = new Map<string, DrawEntrant>();
    const matches: Draw["matches"] = [];
    for (const m of e.rows) {
      if (!KNOWN_ROUNDS.has(m.round) || fromCompact(m.tourney_date) > asOf) continue;
      matches.push({ round: m.round as Round, winnerId: m.winner_id, loserId: m.loser_id, score: m.score });
      for (const side of ["winner", "loser"] as const) {
        const id = m[`${side}_id`];
        const r = eventResults.get(e.id)?.get(id);
        if (entrants.has(id) || !r) continue;
        entrants.set(id, {
          id,
          name: m[`${side}_name`],
          country: m[`${side}_ioc`] ?? "",
          seed: [m[`${side}_seed`], m[`${side}_entry`]].filter(Boolean).join(" "),
          finish: r.finish,
          points: r.points,
        });
      }
    }
    return { tournamentId: e.id, entrants: [...entrants.values()].sort((a, b) => b.points - a.points), matches };
  });

  const tournaments: Tournament[] = counting
    .map(({ id, name, level, surface, drawSize, start, end, drops, next }): Tournament => ({
      id,
      name,
      level,
      surface,
      drawSize,
      start,
      end,
      drops,
      ...(next ? { next } : {}),
    }))
    .sort((a, b) => a.start.localeCompare(b.start) || a.name.localeCompare(b.name));

  return {
    meta: {
      source: input.source,
      rankings: official ? "official" : "estimated",
      rankingDate: asOf,
      latestMatchDate,
      generatedAt: input.generatedAt ?? new Date().toISOString(),
    },
    players,
    tournaments,
    results,
    uncounted,
    draws,
  };
}

/** Events the ATP always counts, played or not: Slams, mandatory Masters and the Finals. */
function mandatory(e: Tournament): boolean {
  return e.level === "G" || e.level === "F" || (e.level === "M" && !e.id.endsWith("-410"));
}

/**
 * Results that can't all be in a player's official total. The ATP counts only his best
 * non-mandatory results (500s, 250s, Monte Carlo, Challengers), so when the results here
 * add up to more than the official total, the smallest set of non-mandatory results that
 * covers the excess is the likeliest to be the ones left out.
 */
export function notInTotal<R extends { points: number; event: Tournament }>(results: R[], official: number): Set<R> {
  const excess = results.reduce((s, r) => s + r.points, 0) - official;
  if (excess <= 0) return new Set();
  const optional = results.filter((r) => !mandatory(r.event) && r.points > 0).sort((a, b) => b.points - a.points);
  // Exhaustive search is cheap for the dozen or so optional results a player has.
  const pool = optional.slice(0, 16);
  let best: { sum: number; mask: number; count: number } | null = null;
  for (let mask = 1; mask < 1 << pool.length; mask++) {
    let sum = 0;
    let count = 0;
    for (let i = 0; i < pool.length; i++) {
      if (!(mask & (1 << i))) continue;
      sum += pool[i].points;
      count++;
    }
    if (sum < excess) continue;
    if (!best || sum < best.sum || (sum === best.sum && count < best.count)) best = { sum, mask, count };
  }
  // A small gap the cheapest set overshoots by more than the gap itself is likelier a
  // points-table or source difference than a result left out; leave it alone.
  if (!best || best.sum > 2 * excess) return new Set();
  return new Set(pool.filter((_, i) => best.mask & (1 << i)));
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

interface Snapshot {
  day: string;
  points: number;
  name: string;
  ioc: string;
  hand: string;
  dob: string;
}

/** Each player's most recent row in the last year: his bio and his official points that week. */
function snapshots(rows: Record<string, string>[], asOf: string): Map<string, Snapshot> {
  const cutoff = addDays(asOf, -364);
  const out = new Map<string, Snapshot>();
  for (const m of rows) {
    const day = fromCompact(m.tourney_date);
    if (day > asOf || day < cutoff) continue;
    for (const side of ["winner", "loser"] as const) {
      const id = m[`${side}_id`];
      const prev = out.get(id);
      const points = Number(m[`${side}_rank_points`] || NaN);
      // Prefer the latest row that carries ranking points.
      const better = !prev || (Number.isNaN(prev.points) ? !Number.isNaN(points) || day > prev.day : !Number.isNaN(points) && day > prev.day);
      if (!better) continue;
      const age = Number(m[`${side}_age`]);
      out.set(id, {
        day,
        points,
        name: m[`${side}_name`],
        ioc: m[`${side}_ioc`],
        hand: m[`${side}_hand`],
        dob: age > 0 ? toISO(new Date(Date.parse(`${day}T00:00:00Z`) - age * 365.25 * 86_400_000)) : "",
      });
    }
  }
  return out;
}

/**
 * Fold accents, case, punctuation and word order, so "Felix Auger-Aliassime",
 * "Félix Auger Aliassime" and "Auger Aliassime Felix" all match.
 */
export function nameKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

/** Edit distance, for spotting spelling variants of one name part. */
function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
  }
  return row[b.length];
}

/** Attach an official list keyed by name to the players in the match data. */
function namedPlayers(ranking: OfficialRanking, bios: Map<string, Snapshot>, topN: number, previous?: OfficialRanking): Player[] {
  const byName = new Map<string, string | null>();
  for (const [id, s] of bios) {
    const key = nameKey(s.name);
    byName.set(key, byName.has(key) ? null : id);
  }
  const entries = ranking.entries.filter((e) => e.rank <= topN).sort((a, b) => a.rank - b.rank);

  // Exact matches first, so a spelling-variant guess can never take an id someone else owns.
  const ids = new Map<(typeof entries)[number], string>();
  for (const e of entries) {
    const id = byName.get(nameKey(e.name));
    if (id && ![...ids.values()].includes(id)) ids.set(e, id);
  }
  const claimed = new Set(ids.values());
  // Fallback for spelling variants ("Alex/Alexander", "Felix/Félix"): the one unclaimed
  // player who shares every name part but one, where the odd parts are close, or whose
  // name is the other's with parts added or left out.
  const nearMatch = (key: string): string | null => {
    const parts = key.split(" ");
    if (parts.length < 2) return null;
    const hits = [...byName].filter(([k, id]) => {
      if (!id || claimed.has(id)) return false;
      const other = k.split(" ");
      const mine = parts.filter((p) => !other.includes(p));
      const theirs = other.filter((p) => !parts.includes(p));
      // One spelling has extra name parts ("Daniel Merida Aguilar" / "Daniel Merida"): at least two shared.
      if (mine.length === 0 || theirs.length === 0) return parts.length - mine.length >= 2;
      if (other.length !== parts.length || mine.length !== 1 || theirs.length !== 1) return false;
      const [a, b] = [mine[0], theirs[0]];
      return a.startsWith(b) || b.startsWith(a) || distance(a, b) <= 2;
    });
    return hits.length === 1 ? hits[0][1] : null;
  };
  for (const e of entries) {
    if (ids.has(e)) continue;
    const id = nearMatch(nameKey(e.name));
    if (id) {
      ids.set(e, id);
      claimed.add(id);
    }
  }

  // Both lists come from one source, so its own spelling links them.
  const before = previous && new Map(previous.entries.map((e) => [nameKey(e.name), e.rank]));
  return entries.map((e) => {
    const id = ids.get(e);
    const bio = id ? bios.get(id) : undefined;
    return {
      id: id ?? `x-${nameKey(e.name).replace(/ /g, "-")}`,
      // Prefer the match data's "First Last" spelling.
      name: bio?.name ?? e.displayName ?? e.name,
      country: bio?.ioc || e.country || "",
      hand: bio?.hand ?? "",
      dob: bio?.dob ?? "",
      rank: e.rank,
      points: e.points,
      ...(before ? { prevRank: before.get(nameKey(e.name)) ?? null } : {}),
    };
  });
}

/**
 * Estimate today's ranking from match rows. Each row carries a player's official
 * points for that event's week; from his latest one we add what he has earned
 * since and take off what has dropped since.
 */
function estimatedPlayers(
  bios: Map<string, Snapshot>,
  results: Map<string, (Result & { event: Event })[]>,
  asOf: string,
  topN: number,
): Player[] {
  const estimates = [...bios].filter(([, s]) => Number.isFinite(s.points)).map(([id, s]) => {
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
