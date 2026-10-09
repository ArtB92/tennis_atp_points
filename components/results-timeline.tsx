"use client";

import { useState } from "react";
import { daysBetween, formatMonth, formatShortDate, addDays } from "@/lib/dates";
import { FINISH_LABEL, LEVEL_LABEL } from "@/lib/points";
import type { Finish, Level } from "@/lib/types";
import { LEVEL_COLOR } from "./level";
import { useWidth } from "./use-width";

export interface TimelineEvent {
  id: string;
  name: string;
  level: Level;
  start: string;
  end: string;
  points: number;
  finish: Finish;
}

const fmt = new Intl.NumberFormat("en-US");
const H = 220;
const PAD = { top: 16, right: 8, bottom: 28, left: 44 };

function niceMax(v: number) {
  const steps = [100, 250, 500, 1000, 1500, 2000, 2500];
  return steps.find((s) => s >= v) ?? Math.ceil(v / 500) * 500;
}

/** One column per event across the last 52 weeks: height is points earned, color is the event category. */
export function ResultsTimeline({ events, from, to }: { events: TimelineEvent[]; from: string; to: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<string | null>(null);

  const span = daysBetween(from, to);
  const innerW = Math.max(200, width - PAD.left - PAD.right);
  const innerH = H - PAD.top - PAD.bottom;
  const x = (iso: string) => PAD.left + (daysBetween(from, iso) / span) * innerW;
  const yMax = niceMax(Math.max(100, ...events.map((e) => e.points)));
  const y = (v: number) => PAD.top + innerH - (v / yMax) * innerH;
  const ticks = [0, yMax / 2, yMax];
  const barW = Math.min(14, Math.max(4, innerW / 60));

  // Month gridline labels.
  const months: string[] = [];
  for (let d = addDays(from, 0).slice(0, 8) + "01"; d <= to; ) {
    if (d >= from) months.push(d);
    const [yy, mm] = d.split("-").map(Number);
    d = mm === 12 ? `${yy + 1}-01-01` : `${yy}-${String(mm + 1).padStart(2, "0")}-01`;
  }

  const active = events.find((e) => e.id === hover);

  return (
    <div ref={ref} className="relative" onMouseLeave={() => setHover(null)}>
      <svg width={width} height={H} role="img" aria-label="Points earned at each event over the last 52 weeks" className="block">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={PAD.left + innerW} y1={y(t)} y2={y(t)} stroke="var(--rule)" strokeWidth="1" />
            <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="num fill-[var(--ink-3)] text-[11px]">
              {fmt.format(t)}
            </text>
          </g>
        ))}
        {months.map((m, i) =>
          i % (width < 560 ? 2 : 1) === 0 ? (
            <text key={m} x={x(m)} y={H - 8} className="fill-[var(--ink-3)] text-[11px]">
              {formatMonth(m)}
            </text>
          ) : null,
        )}
        {events.map((e) => {
          const cx = x(addDays(e.start, daysBetween(e.start, e.end) / 2));
          const top = y(Math.max(e.points, yMax * 0.012));
          const h = PAD.top + innerH - top;
          const r = Math.min(4, h / 2, barW / 2);
          return (
            <g key={e.id} opacity={hover && hover !== e.id ? 0.4 : 1}>
              <path
                d={`M${cx - barW / 2},${PAD.top + innerH} V${top + r} Q${cx - barW / 2},${top} ${cx - barW / 2 + r},${top} H${cx + barW / 2 - r} Q${cx + barW / 2},${top} ${cx + barW / 2},${top + r} V${PAD.top + innerH} Z`}
                fill={LEVEL_COLOR[e.level]}
              />
              {/* Wider invisible hit target. */}
              <rect
                x={cx - Math.max(barW, 12) / 2}
                y={PAD.top}
                width={Math.max(barW, 12)}
                height={innerH}
                fill="transparent"
                tabIndex={0}
                aria-label={`${e.name}: ${FINISH_LABEL[e.finish]}, ${e.points} points`}
                onMouseEnter={() => setHover(e.id)}
                onFocus={() => setHover(e.id)}
                onBlur={() => setHover(null)}
              />
            </g>
          );
        })}
      </svg>
      {active && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 w-56 rounded-md border border-rule bg-raised p-3 text-sm shadow-lg"
          style={{
            left: Math.min(Math.max(0, x(active.start) - 112), width - 224),
            top: 0,
          }}
        >
          <p className="font-semibold text-ink">{active.name}</p>
          <p className="text-ink-3">
            {LEVEL_LABEL[active.level]}, {formatShortDate(active.start)}
          </p>
          <p className="mt-1 flex justify-between text-ink-2">
            {FINISH_LABEL[active.finish]}
            <span className="num font-semibold text-ink">{fmt.format(active.points)} pts</span>
          </p>
        </div>
      )}
    </div>
  );
}
