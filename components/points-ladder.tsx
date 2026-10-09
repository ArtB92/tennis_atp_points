"use client";

import Link from "next/link";
import { useState } from "react";
import type { RankingRow } from "@/lib/data";
import { LEVEL_LABEL } from "@/lib/points";
import { LEVEL_COLOR, LEVELS, OTHER_COLOR } from "./level";

const fmt = new Intl.NumberFormat("en-US");

/** Top players' totals as horizontal stacked bars, split by where the points came from. */
export function PointsLadder({ rows }: { rows: RankingRow[] }) {
  const [active, setActive] = useState<string | null>(null);
  const max = Math.max(...rows.map((r) => r.points));

  return (
    <ol className="space-y-1.5" onMouseLeave={() => setActive(null)}>
      {rows.map((r) => {
        const segments = [
          ...LEVELS.map((l) => ({ key: l, label: LEVEL_LABEL[l], value: r.byLevel[l], color: LEVEL_COLOR[l] })),
          { key: "other", label: "Challengers and other", value: r.other, color: OTHER_COLOR },
        ].filter((s) => s.value > 0);
        const isActive = active === r.id;
        return (
          <li key={r.id} className="relative">
            <Link
              href={`/players/${r.id}`}
              onMouseEnter={() => setActive(r.id)}
              onFocus={() => setActive(r.id)}
              onBlur={() => setActive(null)}
              className="grid grid-cols-[2rem_minmax(7rem,11rem)_1fr] items-center gap-3 rounded py-0.5 sm:grid-cols-[2rem_12rem_1fr]"
            >
              <span className="num text-right text-sm text-ink-3">{r.rank}</span>
              <span className={`truncate text-sm ${isActive ? "text-ink" : "text-ink-2"}`}>{r.name}</span>
              <span className="flex items-center gap-2">
                <span className="flex h-3.5 gap-[2px]" style={{ width: `${(r.points / max) * 85}%` }}>
                  {segments.map((s, i) => (
                    <span
                      key={s.key}
                      className={i === segments.length - 1 ? "rounded-r" : ""}
                      style={{ flexGrow: s.value, flexBasis: 0, background: s.color, opacity: active && !isActive ? 0.45 : 1 }}
                    />
                  ))}
                </span>
                <span className="num shrink-0 text-sm text-ink-2">{fmt.format(r.points)}</span>
              </span>
            </Link>
            {isActive && (
              <div
                role="tooltip"
                className="pointer-events-none absolute right-0 top-full z-10 mt-1 w-60 rounded-md border border-rule bg-raised p-3 text-sm shadow-lg"
              >
                <p className="mb-1.5 font-semibold text-ink">{r.name}</p>
                <dl className="space-y-0.5">
                  {segments.map((s) => (
                    <div key={s.key} className="flex items-center justify-between gap-3">
                      <dt className="flex items-center gap-1.5 text-ink-2">
                        <span className="size-2 rounded-full" style={{ background: s.color }} />
                        {s.label}
                      </dt>
                      <dd className="num text-ink">{fmt.format(s.value)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
