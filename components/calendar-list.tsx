"use client";

import Link from "next/link";
import { useState } from "react";
import { formatShortDate } from "@/lib/dates";
import { LEVEL_LABEL } from "@/lib/points";
import type { Level } from "@/lib/types";
import { Flag } from "./flag";
import { LEVEL_COLOR, LEVELS } from "./level";
import { TournamentBadge } from "./tournament-badge";

export interface CalendarRow {
  id: string;
  name: string;
  level: Level;
  surface: string;
  drawSize: number;
  nextStart: string;
  nextEnd: string;
  /** Where this year's edition stands on the ranking date. */
  status: "upcoming" | "now" | "played";
  champion: { name: string; country: string } | null;
  runnerUp: { name: string; country: string } | null;
}

const MONTH = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

export function CalendarList({ rows }: { rows: CalendarRow[] }) {
  const [shown, setShown] = useState<Set<Level>>(new Set(LEVELS));
  const filtered = rows.filter((r) => shown.has(r.level));

  const months: { key: string; label: string; rows: CalendarRow[] }[] = [];
  for (const r of filtered) {
    const key = r.nextStart.slice(0, 7);
    const last = months[months.length - 1];
    if (last?.key === key) last.rows.push(r);
    else months.push({ key, label: MONTH.format(new Date(`${key}-01T00:00:00Z`)), rows: [r] });
  }

  function toggle(l: Level) {
    setShown((s) => {
      const next = new Set(s);
      if (next.has(l)) next.delete(l);
      else next.add(l);
      return next.size === 0 ? new Set(LEVELS) : next;
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Show categories">
        {LEVELS.map((l) => {
          const on = shown.has(l);
          return (
            <button
              key={l}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(l)}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                on ? "border-transparent text-white" : "border-rule bg-raised text-ink-3 hover:text-ink"
              }`}
              style={on ? { background: LEVEL_COLOR[l] } : undefined}
            >
              {LEVEL_LABEL[l]}
            </button>
          );
        })}
      </div>

      {months.map((m) => (
        <section key={m.key} className="mt-10" aria-label={m.label}>
          <h2 className="display mb-3 text-2xl font-semibold text-ink">{m.label}</h2>
          <ul className="divide-y divide-rule/70 overflow-hidden rounded-xl border border-rule bg-raised">
            {m.rows.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/calendar/${r.id}`}
                  className="group grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 p-4 hover:bg-sunken/60 sm:grid-cols-[auto_minmax(0,1.3fr)_minmax(0,1fr)_auto]"
                >
                  <TournamentBadge name={r.name} level={r.level} />
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-ink group-hover:text-accent">{r.name}</p>
                    <p className="text-sm text-ink-2">
                      <span className="font-medium" style={{ color: LEVEL_COLOR[r.level] }}>
                        {LEVEL_LABEL[r.level]}
                      </span>
                      {" · "}
                      {r.surface}
                      {" · "}
                      {r.drawSize} draw
                    </p>
                  </div>
                  <div className="col-span-2 min-w-0 text-sm sm:col-span-1">
                    {r.champion ? (
                      <>
                        <p className="flex items-center gap-2 truncate text-ink">
                          <span className="text-ink-3">Last champion</span>
                          <Flag country={r.champion.country} className="text-[12px]" />
                          <span className="truncate font-medium">{r.champion.name}</span>
                        </p>
                        {r.runnerUp && (
                          <p className="mt-0.5 flex items-center gap-2 truncate text-ink-3">
                            <span>beat</span>
                            <Flag country={r.runnerUp.country} className="text-[12px]" />
                            <span className="truncate">{r.runnerUp.name}</span>
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-ink-3">Last edition&rsquo;s draw</p>
                    )}
                  </div>
                  <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:block sm:text-right">
                    {r.status !== "upcoming" && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold sm:mb-1 sm:inline-block ${
                          r.status === "now" ? "bg-accent/15 text-accent" : "bg-sunken text-ink-3"
                        }`}
                      >
                        {r.status === "now" ? "Under way" : "Just played"}
                      </span>
                    )}
                    <p className="num font-medium text-ink">
                      {formatShortDate(r.nextStart)} – {formatShortDate(r.nextEnd)}
                    </p>
                    <p className="text-xs text-ink-3">expected dates</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
