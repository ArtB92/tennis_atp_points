import Link from "next/link";
import type { BracketRound } from "@/lib/draw";
import { FINISH_LABEL } from "@/lib/points";
import type { DrawEntrant, DrawMatch, Round } from "@/lib/types";
import { Flag } from "./flag";

const fmt = new Intl.NumberFormat("en-US");
const COL = 136;
const GAP = 22;
const CARD_H = 62;
const SLOT_H = 84;

function surname(name: string) {
  const parts = name.split(" ");
  return parts.length > 1 ? `${name[0]}. ${parts.slice(1).join(" ")}` : name;
}

function Row({ e, won, ranked }: { e?: DrawEntrant; won: boolean; ranked: boolean }) {
  if (!e) return <div className="h-[29px] px-2 text-xs leading-[29px] text-ink-3">Bye</div>;
  const label = surname(e.name);
  return (
    <div className={`flex h-[29px] items-center gap-1.5 px-2 text-xs ${won ? "font-semibold text-ink" : "text-ink-3"}`}>
      <Flag country={e.country} className="text-[10px]" />
      {ranked ? (
        <Link href={`/players/${e.id}`} className="truncate hover:text-accent hover:underline" title={e.name}>
          {label}
        </Link>
      ) : (
        <span className="truncate" title={e.name}>
          {label}
        </span>
      )}
      <span className={`num ml-auto shrink-0 pl-1 ${won ? "text-ink-2" : "text-drop"}`}>
        {won ? "" : `+${fmt.format(e.points)}`}
      </span>
    </div>
  );
}

/**
 * Last four rounds as a two-sided tree meeting at the final, like a playoff
 * bracket. Each loser shows the points he took home.
 */
export function BracketTree({
  rounds: all,
  entrants: list,
  ranked: rankedIds,
}: {
  rounds: BracketRound[];
  entrants: DrawEntrant[];
  ranked: string[];
}) {
  const entrants = new Map(list.map((e) => [e.id, e]));
  const ranked = new Set(rankedIds);
  const rounds = all.slice(-4);
  if (rounds.length < 2) return null;
  const final = rounds[rounds.length - 1];
  const sides = rounds.slice(0, -1);
  const depth = sides.length;
  const firstSlots = Math.ceil(sides[0].slots.length / 2);
  const height = Math.max(1, firstSlots) * SLOT_H + 40;
  const width = (depth * 2 + 1) * COL + depth * 2 * GAP;
  const top = 40;
  const inner = height - top;

  // Column x for a side round (0 = outermost) on the left or right.
  const xLeft = (i: number) => i * (COL + GAP);
  const xRight = (i: number) => width - COL - i * (COL + GAP);
  const xFinal = depth * (COL + GAP);
  const yCenter = (slot: number, count: number) => top + ((slot + 0.5) * inner) / count;

  type Placed = { m: DrawMatch | null; x: number; y: number; round: Round; side: "L" | "R" | "C" };
  const placed: Placed[] = [];
  sides.forEach((r, i) => {
    const half = Math.ceil(r.slots.length / 2);
    r.slots.forEach((m, s) => {
      const left = s < half;
      const idx = left ? s : s - half;
      placed.push({ m, round: r.round, side: left ? "L" : "R", x: left ? xLeft(i) : xRight(i), y: yCenter(idx, half) });
    });
  });
  placed.push({ m: final.slots[0] ?? null, round: final.round, side: "C", x: xFinal, y: top + inner / 2 });

  // Connectors: each match joins the match it feeds in the next round.
  const lines: string[] = [];
  sides.forEach((r, i) => {
    const half = Math.ceil(r.slots.length / 2);
    const nextHalf = i + 1 < depth ? Math.ceil(sides[i + 1].slots.length / 2) : 1;
    for (let s = 0; s < r.slots.length; s++) {
      const left = s < half;
      const idx = left ? s : s - half;
      const y1 = yCenter(idx, half);
      const y2 = i + 1 < depth ? yCenter(Math.floor(idx / 2), nextHalf) : top + inner / 2;
      const xa = left ? xLeft(i) + COL : xRight(i);
      const xb = i + 1 < depth ? (left ? xLeft(i + 1) : xRight(i + 1) + COL) : left ? xFinal : xFinal + COL;
      const xm = (xa + xb) / 2;
      lines.push(`M${xa},${y1} H${xm} V${y2} H${xb}`);
    }
  });

  const champion = list.find((e) => e.finish === "W");
  const labels = [...sides.map((r, i) => ({ r: r.round, x: xLeft(i) })), { r: final.round, x: xFinal }, ...sides.map((r, i) => ({ r: r.round, x: xRight(i) }))];

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      <div className="relative mx-auto" style={{ width, height: height + 70 }}>
        {labels.map((l, i) => (
          <p key={i} className="absolute top-0 text-center text-xs font-semibold uppercase tracking-wider text-ink-3" style={{ left: l.x, width: COL }}>
            {FINISH_LABEL[l.r]}
          </p>
        ))}
        <svg className="absolute inset-0" width={width} height={height} aria-hidden>
          {lines.map((d, i) => (
            <path key={i} d={d} fill="none" stroke="var(--rule)" strokeWidth="1.5" />
          ))}
        </svg>
        {placed.map((p, i) => (
          <div
            key={i}
            className={`absolute overflow-hidden rounded-lg border bg-raised shadow-sm ${p.side === "C" ? "border-accent ring-2 ring-accent/20" : "border-rule"}`}
            style={{ left: p.x, top: p.y - CARD_H / 2, width: COL, height: CARD_H }}
          >
            {p.m ? (
              <>
                <Row e={entrants.get(p.m.winnerId)} won ranked={ranked.has(p.m.winnerId)} />
                <div className="border-t border-rule/70" />
                <Row e={entrants.get(p.m.loserId)} won={false} ranked={ranked.has(p.m.loserId)} />
              </>
            ) : (
              <p className="px-2 py-5 text-center text-xs text-ink-3">Bye</p>
            )}
          </div>
        ))}
        {champion && (
          <div className="absolute text-center" style={{ left: xFinal - 20, width: COL + 40, top: top + inner / 2 + CARD_H / 2 + 14 }}>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">Champion</p>
            <p className="mt-1 flex items-center justify-center gap-1.5 font-semibold text-ink">
              <span aria-hidden>🏆</span>
              <Flag country={champion.country} className="text-[13px]" />
              <span className="truncate">{champion.name}</span>
            </p>
            <p className="num text-sm text-drop">+{fmt.format(champion.points)} pts</p>
          </div>
        )}
      </div>
    </div>
  );
}
