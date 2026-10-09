export type Level = "G" | "M" | "500" | "250" | "F";

export type Round = "R128" | "R64" | "R32" | "R16" | "QF" | "SF" | "F" | "RR";

/** Furthest stage a player reached at an event; "W" means he won it. */
export type Finish = Round | "W";

export interface Player {
  id: string;
  name: string;
  country: string;
  hand: string;
  /** ISO date (yyyy-mm-dd) or empty when unknown. */
  dob: string;
  rank: number;
  /** Official ATP ranking points at the ranking date. */
  points: number;
}

export interface Tournament {
  id: string;
  name: string;
  level: Level;
  surface: string;
  drawSize: number;
  /** Monday the event starts, ISO date. */
  start: string;
  /** Length of the event in weeks (1 or 2). */
  weeks: number;
}

export interface Match {
  round: Round;
  won: boolean;
  opponent: string;
  opponentId: string;
  opponentRank: number | null;
  score: string;
}

export interface Result {
  playerId: string;
  tournamentId: string;
  finish: Finish;
  points: number;
  matches: Match[];
}

export interface DatasetMeta {
  source: "sackmann" | "demo";
  /** Monday of the ranking list the dataset uses, ISO date. */
  rankingDate: string;
  /** Start date of the most recent event with results, ISO date. */
  latestEventDate: string;
  generatedAt: string;
}

export interface Dataset {
  meta: DatasetMeta;
  players: Player[];
  tournaments: Tournament[];
  results: Result[];
}
