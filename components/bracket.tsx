"use client";

import Link from "next/link";
import { useState } from "react";
import type { BracketRound } from "@/lib/draw";
import { FINISH_LABEL } from "@/lib/points";
import type { DrawEntrant, DrawMatch } from "@/lib/types";
import { Flag } from "./flag";

const SLOT = 92;

function Side({ e, won, ranked }: { e?: DrawEntrant; won: boolean; ranked: boolean }) {
  const name = e?.name ?? "Unknown";
  return (
    <div className={`flex items-center gap-2 px-2.5 py-0.5 ${won ? "font-semibold text-ink" : "text-ink-3"}`}>
      {e && <Flag country={e.country} className="text-[11px]" />}
      {ranked && e ? (
        <Link href={`/players/${e.id}`} className="truncate hover:text-accent hover:underline">
          {name}
        </Link>
      ) : (
        <span className="truncate">{name}</span>
      )}
      {e?.seed && <span className="text-[11px] font-normal text-ink-3">{e.seed}</span>}
    </div>
  );
}

function MatchCard({ m, entrants, ranked }: { m: DrawMatch | null; entrants: Map<string, DrawEntrant>; ranked: Set<string> }) {
  if (!m) {
    return <div className="h-[78px] rounded-md border border-dashed border-rule/80" aria-label="Bye" />;
  }
  return (
    <div className="overflow-hidden rounded-md border border-rule bg-raised text-sm shadow-[0_1px_0_rgb(0_0_0/0.03)]">
      <Side e={entrants.get(m.winnerId)} won ranked={ranked.has(m.winnerId)} />
      <Side e={entrants.get(m.loserId)} won={false} ranked={ranked.has(m.loserId)} />
      <p className="num border-t border-rule/70 bg-sunken/50 px-2.5 py-0.5 text-[11px] text-ink-2">{m.score}</p>
    </div>
  );
}

export function Bracket({
  rounds,
  entrants: list,
  ranked: rankedIds,
  roundPoints,
}: {
  rounds: BracketRound[];
  entrants: DrawEntrant[];
  ranked: string[];
  /** Points a player who loses in each round takes home, plus "W" for the champion. */
  roundPoints: Record<string, number>;
}) {
  const entrants = new Map(list.map((e) => [e.id, e]));
  const ranked = new Set(rankedIds);
  // Open on the last four rounds, which fit on a laptop screen; earlier rounds are a click away.
  const firstReadable = Math.max(0, rounds.length - 4);
  const [start, setStart] = useState(firstReadable);
  const shown = rounds.slice(start);
  const height = Math.max(1, shown[0]?.slots.length ?? 1) * SLOT;
  const champion = list.find((e) => e.finish === "W");

  return (
    <div>
      {rounds.length > 3 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ink-3">Start from</span>
          {rounds.map((r, i) => (
            <button
              key={r.round}
              type="button"
              aria-pressed={i === start}
              onClick={() => setStart(i)}
              className={`rounded-full px-3 py-1 font-medium ${i === start ? "bg-ink text-surface" : "bg-sunken text-ink-2 hover:text-ink"}`}
            >
              {r.round}
            </button>
          ))}
        </div>
      )}
      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        <div className="flex gap-4">
          {shown.map((r) => (
            <div key={r.round} className="w-52 shrink-0">
              <p className="mb-2 flex items-baseline justify-between border-b border-rule pb-1 text-sm">
                <span className="font-semibold text-ink">{FINISH_LABEL[r.round]}</span>
                {roundPoints[r.round] !== undefined && (
                  <span className="num text-xs text-ink-3">loser {roundPoints[r.round]} pts</span>
                )}
              </p>
              <div className="flex flex-col justify-around" style={{ height }}>
                {r.slots.map((m, i) => (
                  <MatchCard key={m ? `${m.winnerId}-${m.loserId}` : `bye-${i}`} m={m} entrants={entrants} ranked={ranked} />
                ))}
              </div>
            </div>
          ))}
          {champion && (
            <div className="w-44 shrink-0">
              <p className="mb-2 flex items-baseline justify-between border-b border-rule pb-1 text-sm">
                <span className="font-semibold text-ink">Champion</span>
                <span className="num text-xs text-ink-3">{roundPoints.W} pts</span>
              </p>
              <div className="flex flex-col justify-around" style={{ height }}>
                <div className="flex items-center gap-2 rounded-md border-2 border-accent bg-raised px-3 py-3 font-semibold text-ink">
                  <span aria-hidden>🏆</span>
                  <Flag country={champion.country} />
                  <span className="leading-tight">{champion.name}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
