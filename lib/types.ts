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
  /** ATP ranking points at the ranking date (official or estimated, see DatasetMeta.rankings). */
  points: number;
  /** Rank on the previous weekly list: null when he wasn't on it, absent when that list isn't known. */
  prevRank?: number | null;
}

export interface Tournament {
  id: string;
  name: string;
  level: Level;
  surface: string;
  drawSize: number;
  /** Monday the event starts, ISO date. */
  start: string;
  /** Last day of the event, ISO date. */
  end: string;
  /** Date these results stop counting, ISO date. */
  drops: string;
  /** Dates of the next edition, once it is in the match data. */
  next?: { start: string; end: string };
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

/** One match of a tournament draw. */
export interface DrawMatch {
  round: Round;
  winnerId: string;
  loserId: string;
  score: string;
}

/** A player in a tournament draw, with how far he went and the points he earned. */
export interface DrawEntrant {
  id: string;
  name: string;
  country: string;
  /** Seed or entry tag (Q, WC, LL) when the source has one. */
  seed: string;
  finish: Finish;
  points: number;
}

/** Every match and entrant of one counting edition of a tournament. */
export interface Draw {
  tournamentId: string;
  entrants: DrawEntrant[];
  matches: DrawMatch[];
}

export interface DatasetMeta {
  source: "tennismylife" | "demo";
  /**
   * "official": an ATP ranking list was supplied. "estimated": each player's
   * official points at his latest event, updated with results since.
   */
  rankings: "official" | "estimated";
  /** Date the rankings and projections are calculated for, ISO date. */
  rankingDate: string;
  /** Date of the most recent match in the data, ISO date. */
  latestMatchDate: string;
  generatedAt: string;
}

export interface Dataset {
  meta: DatasetMeta;
  players: Player[];
  tournaments: Tournament[];
  results: Result[];
  /**
   * Results from counting events that the official total leaves out (only his best
   * non-mandatory results count). Shown on player pages, kept out of every sum.
   */
  uncounted?: Result[];
  draws: Draw[];
}
