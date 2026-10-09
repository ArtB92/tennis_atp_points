import type { Finish, Level, Round } from "./types";

export const ROUND_ORDER: Round[] = ["R128", "R64", "R32", "R16", "QF", "SF", "F"];

/**
 * ATP 500 events, matched case-insensitively against the tournament name.
 * Sackmann's data labels every 500 and 250 event as level "A", so this list
 * is what tells them apart. `from` is the first season the event was a 500.
 */
const ATP_500: { match: string; from: number }[] = [
  { match: "rotterdam", from: 2009 },
  { match: "rio de janeiro", from: 2014 },
  { match: "acapulco", from: 2014 },
  { match: "dubai", from: 2009 },
  { match: "doha", from: 2025 },
  { match: "barcelona", from: 2009 },
  { match: "munich", from: 2025 },
  { match: "halle", from: 2015 },
  { match: "queen's", from: 2015 },
  { match: "hamburg", from: 2009 },
  { match: "washington", from: 2009 },
  { match: "beijing", from: 2009 },
  { match: "tokyo", from: 2009 },
  { match: "vienna", from: 2015 },
  { match: "basel", from: 2009 },
  { match: "dallas", from: 2026 },
];

/** Events Sackmann lists that award no ATP ranking points. */
const NO_POINTS = ["next gen", "nextgen", "united cup", "laver cup", "davis cup", "olympics"];

/** Map a Sackmann tourney_level + name to our level, or null for events that award no points. */
export function classifyLevel(sackmannLevel: string, name: string, year: number): Level | null {
  const lower = name.toLowerCase();
  if (NO_POINTS.some((n) => lower.includes(n))) return null;
  switch (sackmannLevel) {
    case "G":
      return "G";
    case "M":
      return "M";
    case "F":
      return "F";
    case "A":
      return ATP_500.some((e) => year >= e.from && lower.includes(e.match)) ? "500" : "250";
    default:
      return null;
  }
}

type Table = Partial<Record<Finish, number>>;

const TABLES: Record<Exclude<Level, "F">, Table> = {
  G: { W: 2000, F: 1300, SF: 800, QF: 400, R16: 200, R32: 100, R64: 50, R128: 10 },
  M: { W: 1000, F: 650, SF: 400, QF: 200, R16: 100, R32: 50, R64: 30, R128: 10 },
  "500": { W: 500, F: 330, SF: 200, QF: 100, R16: 50, R32: 25, R64: 0 },
  "250": { W: 250, F: 165, SF: 100, QF: 50, R16: 25, R32: 13, R64: 0 },
};

/** The first round of a main draw of this size. */
export function firstRound(drawSize: number): Round {
  if (drawSize > 64) return "R128";
  if (drawSize > 32) return "R64";
  if (drawSize > 16) return "R32";
  return "R16";
}

/**
 * Points for losing in (or winning) a given stage. In smaller draws the first
 * round pays the lowest tier: a Masters with a 56 draw pays 10 for R64, a
 * 250 with a 28/32 draw pays nothing for R32.
 */
export function pointsForFinish(level: Exclude<Level, "F">, finish: Finish, drawSize: number): number {
  if (finish === "RR") return 0;
  if (finish !== "W" && finish === firstRound(drawSize)) {
    if (level === "G" || level === "M") return 10;
    return 0;
  }
  return TABLES[level][finish] ?? 0;
}

/** ATP Finals: 200 per round-robin win, 400 for the semifinal win, 500 for the final win. */
export function finalsPoints(rrWins: number, wonSemi: boolean, wonFinal: boolean): number {
  return rrWins * 200 + (wonSemi ? 400 : 0) + (wonFinal ? 500 : 0);
}

export interface PlayedMatch {
  round: Round;
  won: boolean;
}

/** Furthest stage reached given every match a player played at one event. */
export function finishFrom(matches: PlayedMatch[]): Finish {
  // Round-robin losses don't end a player's event; only knockout matches decide the finish.
  const knockout = matches.filter((m) => m.round !== "RR");
  const lost = knockout.find((m) => !m.won);
  if (lost) return lost.round;
  if (knockout.some((m) => m.round === "F")) return "W";
  if (knockout.length === 0) return "RR";
  // Still alive (event in progress): credit the deepest round played.
  return knockout.reduce((a, b) => (ROUND_ORDER.indexOf(b.round) > ROUND_ORDER.indexOf(a.round) ? b : a)).round;
}

/** Ranking points a player earned at one event from the matches he played there. */
export function pointsForEvent(level: Level, drawSize: number, matches: PlayedMatch[]): { finish: Finish; points: number } {
  const finish = finishFrom(matches);
  if (level === "F") {
    const rrWins = matches.filter((m) => m.round === "RR" && m.won).length;
    const wonSemi = matches.some((m) => m.round === "SF" && m.won);
    const wonFinal = matches.some((m) => m.round === "F" && m.won);
    return { finish, points: finalsPoints(rrWins, wonSemi, wonFinal) };
  }
  // A player with a first-round bye who loses his opening match gets first-round points.
  const opener = firstRound(drawSize);
  const secondRound = ROUND_ORDER[ROUND_ORDER.indexOf(opener) + 1];
  if (matches.length === 1 && !matches[0].won && matches[0].round === secondRound) {
    return { finish, points: pointsForFinish(level, opener, drawSize) };
  }
  return { finish, points: pointsForFinish(level, finish, drawSize) };
}

export const LEVEL_LABEL: Record<Level, string> = {
  G: "Grand Slam",
  M: "Masters 1000",
  "500": "ATP 500",
  "250": "ATP 250",
  F: "ATP Finals",
};

export const FINISH_LABEL: Record<Finish, string> = {
  W: "Champion",
  F: "Final",
  SF: "Semifinal",
  QF: "Quarterfinal",
  R16: "Round of 16",
  R32: "Round of 32",
  R64: "Round of 64",
  R128: "Round of 128",
  RR: "Round robin",
};
