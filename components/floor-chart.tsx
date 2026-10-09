"use client";

import { useState } from "react";
import { addDays, daysBetween, formatMonth, formatShortDate } from "@/lib/dates";
import type { Level } from "@/lib/types";
import { LEVEL_COLOR, LevelDot } from "./level";
import { useWidth } from "./use-width";

export interface FloorStep {
  date: string;
  floor: number;
  rank: number;
  /** Events whose points come off in the week starting at `date`. */
  drops: { name: string; points: number; level: Level }[];
}

const fmt = new Intl.NumberFormat("en-US");
const H = 420;
const PAD = { top: 28, right: 56, bottom: 30, left: 52 };

function niceStep(max: number) {
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
}

/**
 * Step chart of a player's points floor: what he keeps if he earns nothing
 * more. Each step down is a result from last year dropping off.
 */
export function FloorChart({ steps }: { steps: FloorStep[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const from = steps[0].date;
  const to = steps[steps.length - 1].date;
  const span = daysBetween(from, to);
  const innerW = Math.max(200, width - PAD.left - PAD.right);
  const innerH = H - PAD.top - PAD.bottom;
  const x = (iso: string) => PAD.left + (daysBetween(from, iso) / span) * innerW;
  const step = niceStep(steps[0].floor || 1);
  const yMax = Math.ceil((steps[0].floor || 1) / step) * step;
  const y = (v: number) => PAD.top + innerH - (v / yMax) * innerH;
  const ticks = Array.from({ length: Math.round(yMax / step) + 1 }, (_, i) => i * step);

  // Right axis: points dropping each week, drawn as bars from zero in the lower half of the chart.
  const weekDrop = (s: FloorStep) => s.drops.reduce((t, d) => t + d.points, 0);
  const dStep = niceStep(Math.max(...steps.map(weekDrop), 1) / 2);
  const dMax = Math.ceil(Math.max(...steps.map(weekDrop), 1) / dStep) * dStep;
  const yd = (v: number) => PAD.top + innerH - (v / (dMax * 2)) * innerH;
  const dTicks = Array.from({ length: Math.round(dMax / dStep) + 1 }, (_, i) => i * dStep).slice(1);
  const barW = Math.max(6, Math.min(16, (innerW * 7) / span - 3));

  let line = `M${x(steps[0].date)},${y(steps[0].floor)}`;
  for (let i = 1; i < steps.length; i++) line += ` H${x(steps[i].date)} V${y(steps[i].floor)}`;
  const area = `${line} V${PAD.top + innerH} H${x(from)} Z`;

  const months: string[] = [];
  for (let d = from.slice(0, 8) + "01"; d <= to; ) {
    if (d > from) months.push(d);
    const [yy, mm] = d.split("-").map(Number);
    d = mm === 12 ? `${yy + 1}-01-01` : `${yy}-${String(mm + 1).padStart(2, "0")}-01`;
  }

  const last = steps[steps.length - 1];
  const active = hover !== null ? steps[hover] : null;

  function onMove(e: React.MouseEvent<SVGRectElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const t = (e.clientX - box.left) / box.width;
    const i = Math.round(t * (steps.length - 1));
    setHover(Math.max(0, Math.min(steps.length - 1, i)));
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") setHover((h) => Math.min(steps.length - 1, (h ?? -1) + 1));
    if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? 1) - 1));
  }

  return (
    <div ref={ref} className="relative">
      <svg
        width={width}
        height={H}
        role="img"
        aria-label={`Points floor falls from ${fmt.format(steps[0].floor)} to ${fmt.format(last.floor)} over the next 52 weeks if he earns nothing`}
        className="block"
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={PAD.left + innerW} y1={y(t)} y2={y(t)} stroke="var(--rule)" strokeWidth="1" />
            <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="num fill-[var(--ink-3)] text-[11px]">
              {fmt.format(t)}
            </text>
          </g>
        ))}
        {dTicks.map((t) => (
          <text key={t} x={PAD.left + innerW + 8} y={yd(t)} dy="0.32em" className="num fill-[var(--ink-3)] text-[11px]">
            {fmt.format(t)}
          </text>
        ))}
        <text x={PAD.left - 8} y={PAD.top - 14} textAnchor="end" className="fill-[var(--ink-2)] text-[11px] font-medium">
          Floor
        </text>
        <text x={PAD.left + innerW + 8} y={yd(dMax) - 16} className="fill-[var(--ink-2)] text-[11px] font-medium">
          Dropping
        </text>
        {months.map((m, i) =>
          i % (width < 560 ? 2 : 1) === 0 ? (
            <text key={m} x={x(m)} y={H - 8} textAnchor="middle" className="fill-[var(--ink-3)] text-[11px]">
              {formatMonth(m)}
            </text>
          ) : null,
        )}
        {/* Each week's drops as bars from zero, stacked and colored by event category. */}
        {steps.map((s, i) => {
          let base = 0;
          return s.drops.map((d) => {
            const top = yd(base + d.points);
            const bottom = yd(base);
            base += d.points;
            return (
              <rect
                key={`${s.date}-${d.name}`}
                x={x(s.date) - barW / 2}
                y={top}
                width={barW}
                height={Math.max(1, bottom - top - 1)}
                rx={2}
                fill={LEVEL_COLOR[d.level]}
                opacity={hover === null || hover === i ? 0.85 : 0.35}
              />
            );
          });
        })}
        <path d={area} fill="var(--accent)" opacity="0.08" />
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {steps.map((s, i) =>
          s.drops.length > 0 ? (
            <circle
              key={s.date}
              cx={x(s.date)}
              cy={y(s.floor)}
              r="4"
              fill="var(--drop)"
              stroke="var(--surface)"
              strokeWidth="2"
              opacity={hover === null || hover === i ? 1 : 0.5}
            />
          ) : null,
        )}

        {active && (
          <line x1={x(active.date)} x2={x(active.date)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--ink-3)" strokeWidth="1" />
        )}
        <rect
          x={PAD.left}
          y={PAD.top}
          width={innerW}
          height={innerH}
          fill="transparent"
          tabIndex={0}
          aria-label="Explore the floor week by week with the arrow keys"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
          onKeyDown={onKey}
          onFocus={() => setHover((h) => h ?? 0)}
          onBlur={() => setHover(null)}
        />
      </svg>
      {active && (
        <div
          role="status"
          className="pointer-events-none absolute z-10 w-60 rounded-md border border-rule bg-raised p-3 text-sm shadow-lg"
          style={{ left: Math.min(Math.max(0, x(active.date) + 12), width - 240), top: 8 }}
        >
          <p className="text-ink-3">
            Week of {formatShortDate(active.date)} to {formatShortDate(addDays(active.date, 6))}
          </p>
          <p className="mt-1 flex items-baseline justify-between">
            <span className="num text-lg font-semibold text-ink">{fmt.format(active.floor)} pts</span>
            <span className="text-ink-2">rank {active.rank}</span>
          </p>
          {active.drops.length > 0 && (
            <ul className="mt-2 space-y-0.5 border-t border-rule pt-2">
              {active.drops.map((d) => (
                <li key={d.name} className="flex items-center justify-between gap-3 text-ink-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <LevelDot level={d.level} />
                    <span className="truncate">{d.name}</span>
                  </span>
                  <span className="num font-semibold text-drop">−{fmt.format(d.points)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
