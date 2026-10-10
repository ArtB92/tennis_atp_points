"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { RankingRow } from "@/lib/data";
import { LEVEL_LABEL } from "@/lib/points";
import { Flag } from "./flag";
import { LEVEL_COLOR, LEVELS, OTHER_COLOR } from "./level";
import { RankMove } from "./rank-move";

const fmt = new Intl.NumberFormat("en-US");
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

/** Top players' totals as stacked pill bars, split by where the points came from. */
export function PointsLadder({ rows }: { rows: RankingRow[] }) {
  const [active, setActive] = useState<string | null>(null);
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const max = Math.max(...rows.map((r) => r.points));

  return (
    <ol className="space-y-1" onMouseLeave={() => setActive(null)}>
      {rows.map((r, i) => {
        const segments = [
          ...LEVELS.map((l) => ({ key: l, label: LEVEL_LABEL[l], value: r.byLevel[l], color: LEVEL_COLOR[l] })),
          { key: "other", label: "Challengers and other", value: r.other, color: OTHER_COLOR },
        ].filter((s) => s.value > 0);
        const isActive = active === r.id;
        const dim = active !== null && !isActive;
        const width = (r.points / max) * 100;
        return (
          <li key={r.id} className="relative">
            <Link
              href={`/players/${r.id}`}
              onMouseEnter={() => setActive(r.id)}
              onFocus={() => setActive(r.id)}
              onBlur={() => setActive(null)}
              className={`grid grid-cols-[1.75rem_1fr] items-center gap-x-3 rounded-xl px-2 py-1.5 transition-colors sm:grid-cols-[2rem_13rem_1fr] ${
                isActive ? "bg-raised shadow-sm" : ""
              }`}
            >
              <span className={`display num row-span-2 text-right text-lg font-semibold sm:row-span-1 ${i < 3 ? "text-ink" : "text-ink-3"}`}>
                {r.rank}
              </span>
              <span className={`flex min-w-0 items-center gap-2 text-sm transition-colors ${isActive ? "font-semibold text-ink" : "text-ink-2"}`}>
                <Flag country={r.country} className="text-[12px]" />
                <span className="truncate">{r.name}</span>
                <RankMove move={r.move} className="ml-auto" />
              </span>
              {/* On phones the bar sits under the name, so it gets the full width. */}
              <span className="relative flex h-7 items-center">
                {/* Track; the last 4.5rem is room for the total. */}
                <span aria-hidden className="absolute inset-y-1 left-0 right-[4.5rem] rounded-full bg-sunken/70" />
                <span className="relative flex h-full items-center gap-2" style={{ width: "calc(100% - 4.5rem)" }}>
                  <span
                    className="flex h-full shrink-0 overflow-hidden rounded-full shadow-[inset_0_-2px_0_rgb(0_0_0/0.12)] transition-[width,opacity] duration-700 ease-out"
                    style={{ width: grown ? `${width}%` : "0%", transitionDelay: `${i * 35}ms`, opacity: dim ? 0.35 : 1 }}
                  >
                    {segments.map((s, j) => {
                      const share = (s.value / r.points) * width;
                      return (
                        <span
                          key={s.key}
                          className="relative flex items-center justify-center overflow-hidden"
                          style={{
                            flexGrow: s.value,
                            flexBasis: 0,
                            background: `linear-gradient(180deg, color-mix(in oklab, ${s.color} 78%, white), ${s.color} 55%)`,
                            boxShadow: j > 0 ? "inset 1.5px 0 0 rgb(255 255 255 / 0.55)" : undefined,
                          }}
                        >
                          {isActive && share > 7 && (
                            <span className="num px-1 text-[11px] font-semibold text-white drop-shadow-[0_1px_1px_rgb(0_0_0/0.35)]">
                              {compact.format(s.value)}
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </span>
                  <span
                    className={`num shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold transition-colors ${
                      isActive ? "bg-ink text-surface" : "bg-raised text-ink-2 shadow-[0_0_0_1px_var(--rule)]"
                    }`}
                  >
                    {fmt.format(r.points)}
                  </span>
                </span>
              </span>
            </Link>
            {isActive && (
              <div
                role="tooltip"
                className="pointer-events-none absolute right-0 top-full z-10 mt-1 w-64 rounded-xl border border-rule bg-raised/95 p-3 text-sm shadow-xl backdrop-blur"
              >
                <p className="mb-2 flex items-center gap-2 font-semibold text-ink">
                  <Flag country={r.country} className="text-[12px]" />
                  {r.name}
                </p>
                <dl className="space-y-1">
                  {segments.map((s) => (
                    <div key={s.key} className="grid grid-cols-[1fr_auto] items-center gap-x-3">
                      <dt className="flex items-center gap-1.5 text-ink-2">
                        <span className="size-2.5 rounded-full" style={{ background: s.color }} />
                        {s.label}
                      </dt>
                      <dd className="num text-ink">
                        {fmt.format(s.value)} <span className="text-xs text-ink-3">{Math.round((s.value / r.points) * 100)}%</span>
                      </dd>
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
