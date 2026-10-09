import { ROUND_ORDER } from "./points";
import type { Draw, DrawMatch, Round } from "./types";

export interface BracketRound {
  round: Round;
  /** Matches in bracket order; null where a player came through on a bye (or a match is missing from the source). */
  slots: (DrawMatch | null)[];
}

/**
 * Knockout rounds in draw order, rebuilt from the final backwards: each match
 * sits next to the one its winner's next opponent came through.
 */
export function bracket(draw: Draw): BracketRound[] {
  const byRound = new Map<Round, DrawMatch[]>();
  for (const m of draw.matches) {
    if (m.round === "RR") continue;
    byRound.set(m.round, [...(byRound.get(m.round) ?? []), m]);
  }
  const rounds = ROUND_ORDER.filter((r) => byRound.has(r));
  if (rounds.length === 0) return [];

  const out: BracketRound[] = [];
  let next: (DrawMatch | null)[] = byRound.get(rounds[rounds.length - 1])!;
  out.unshift({ round: rounds[rounds.length - 1], slots: next });
  for (let i = rounds.length - 2; i >= 0; i--) {
    const pool = [...byRound.get(rounds[i])!];
    const take = (playerId: string | undefined) => {
      const at = playerId ? pool.findIndex((m) => m.winnerId === playerId) : -1;
      return at < 0 ? null : pool.splice(at, 1)[0];
    };
    const slots: (DrawMatch | null)[] = [];
    for (const m of next) slots.push(take(m?.winnerId), take(m?.loserId));
    // Anything the walk could not place (incomplete source data) goes at the end.
    slots.push(...pool);
    out.unshift({ round: rounds[i], slots });
    next = slots;
  }
  return out;
}
