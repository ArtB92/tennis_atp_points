"use client";

import { useState } from "react";
import { daysBetween, formatMonth, formatShortDate } from "@/lib/dates";
import type { FloorPoint } from "@/lib/projection";
import { SIDE_COLOR } from "./level";
import { useWidth } from "./use-width";

const fmt = new Intl.NumberFormat("en-US");
const H = 280;
const PAD = { top: 16, right: 16, bottom: 28, left: 52 };

function niceStep(max: number) {
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
}

/** Both players' points floors on one axis: what each keeps if neither earns anything more. */
export function CompareFloorChart({ series }: { series: { name: string; floor: FloorPoint[] }[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const weeks = series[0].floor;
  const from = weeks[0].date;
  const to = weeks[weeks.length - 1].date;
  const span = daysBetween(from, to);
  const innerW = Math.max(200, width - PAD.left - PAD.right);
  const innerH = H - PAD.top - PAD.bottom;
  const x = (iso: string) => PAD.left + (daysBetween(from, iso) / span) * innerW;
  const top = Math.max(...series.map((s) => s.floor[0].floor), 1);
  const step = niceStep(top);
  const yMax = Math.ceil(top / step) * step;
  const y = (v: number) => PAD.top + innerH - (v / yMax) * innerH;
  const ticks = Array.from({ length: Math.round(yMax / step) + 1 }, (_, i) => i * step);

  const months: string[] = [];
  for (let d = from.slice(0, 8) + "01"; d <= to; ) {
    if (d > from) months.push(d);
    const [yy, mm] = d.split("-").map(Number);
    d = mm === 12 ? `${yy + 1}-01-01` : `${yy}-${String(mm + 1).padStart(2, "0")}-01`;
  }

  const path = (floor: FloorPoint[]) => {
    let d = `M${x(floor[0].date)},${y(floor[0].floor)}`;
    for (let i = 1; i < floor.length; i++) d += ` H${x(floor[i].date)} V${y(floor[i].floor)}`;
    return d;
  };

  function onMove(e: React.MouseEvent<SVGRectElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - box.left) / box.width) * (weeks.length - 1));
    setHover(Math.max(0, Math.min(weeks.length - 1, i)));
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") setHover((h) => Math.min(weeks.length - 1, (h ?? -1) + 1));
    if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? 1) - 1));
  }

  return (
    <div ref={ref} className="relative">
      <svg width={width} height={H} role="img" aria-label="Both players' points floors over the next 52 weeks" className="block">
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
            <text key={m} x={x(m)} y={H - 8} textAnchor="middle" className="fill-[var(--ink-3)] text-[11px]">
              {formatMonth(m)}
            </text>
          ) : null,
        )}
        {series.map((s, i) => (
          <path
            key={s.name}
            d={path(s.floor)}
            fill="none"
            stroke={SIDE_COLOR[i]}
            strokeWidth="2.25"
            strokeDasharray={i === 1 ? "6 3" : undefined}
            strokeLinejoin="round"
          />
        ))}
        {hover !== null && (
          <>
            <line x1={x(weeks[hover].date)} x2={x(weeks[hover].date)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--ink-3)" />
            {series.map((s, i) => (
              <circle key={s.name} cx={x(s.floor[hover].date)} cy={y(s.floor[hover].floor)} r="4" fill={SIDE_COLOR[i]} />
            ))}
          </>
        )}
        <rect
          x={PAD.left}
          y={PAD.top}
          width={innerW}
          height={innerH}
          fill="transparent"
          tabIndex={0}
          aria-label="Explore both floors week by week with the arrow keys"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
          onKeyDown={onKey}
          onFocus={() => setHover((h) => h ?? 0)}
          onBlur={() => setHover(null)}
        />
      </svg>
      {hover !== null && (
        <div
          role="status"
          className="pointer-events-none absolute z-10 w-56 rounded-md border border-rule bg-raised p-3 text-sm shadow-lg"
          style={{ left: Math.min(Math.max(0, x(weeks[hover].date) + 12), width - 224), top: 8 }}
        >
          <p className="text-ink-3">Week of {formatShortDate(weeks[hover].date)}</p>
          {series.map((s, i) => (
            <p key={s.name} className="mt-1 flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-1.5 text-ink-2">
                <span aria-hidden className="inline-block h-0.5 w-3 shrink-0 rounded" style={{ background: SIDE_COLOR[i] }} />
                <span className="truncate">{s.name}</span>
              </span>
              <span className="num font-semibold text-ink">{fmt.format(s.floor[hover].floor)}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
