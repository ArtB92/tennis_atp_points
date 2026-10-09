"use client";

import { useState } from "react";
import { formatShortDate } from "@/lib/dates";
import { FINISH_LABEL, LEVEL_LABEL } from "@/lib/points";
import type { Finish, Level } from "@/lib/types";
import { LevelDot } from "./level";

export interface DefenceRow {
  id: string;
  name: string;
  level: Level;
  surface: string;
  nextStart: string;
  drops: string;
  points: number;
  finish: Finish | null;
  floorAfter: number;
}

const fmt = new Intl.NumberFormat("en-US");
const monthKey = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

/** Upcoming events in calendar order, with what he has to defend at each. */
export function DefenceList({ rows }: { rows: DefenceRow[] }) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? rows : rows.filter((r) => r.points > 0);
  const skipped = rows.length - rows.filter((r) => r.points > 0).length;

  const groups = new Map<string, DefenceRow[]>();
  for (const r of shown) {
    const k = monthKey.format(new Date(`${r.nextStart}T00:00:00Z`));
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }

  return (
    <div>
      <label className="mb-6 inline-flex cursor-pointer items-center gap-2 text-sm text-ink-2">
        <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="size-4 accent-[var(--accent)]" />
        Also show the {skipped} events he skipped or that earned him nothing
      </label>

      <div className="hidden grid-cols-[5.5rem_1fr_9rem_6rem_6rem] gap-4 border-b border-rule pb-2 text-sm text-ink-3 md:grid">
        <span>Starts</span>
        <span>Event</span>
        <span>Last year</span>
        <span className="text-right">To defend</span>
        <span className="text-right">Floor after</span>
      </div>

      {[...groups].map(([month, items]) => (
        <section key={month} aria-label={month}>
          <h3 className="display border-b border-rule pb-1 pt-6 text-xl font-semibold text-ink-2">{month}</h3>
          <ul>
            {items.map((r) => (
              <li
                key={r.id}
                className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-0.5 border-b border-rule/60 py-3 md:grid-cols-[5.5rem_1fr_9rem_6rem_6rem]"
              >
                <span className="num order-3 text-sm text-ink-3 md:order-none">{formatShortDate(r.nextStart)}</span>
                <span className="flex min-w-0 items-center gap-2">
                  <LevelDot level={r.level} />
                  <span className={`truncate font-medium ${r.points > 0 ? "text-ink" : "text-ink-3"}`}>{r.name}</span>
                  <span className="hidden text-xs text-ink-3 sm:inline">
                    {LEVEL_LABEL[r.level]}, {r.surface}
                  </span>
                </span>
                <span className="order-4 text-sm text-ink-2 md:order-none">{r.finish ? FINISH_LABEL[r.finish] : "Did not play"}</span>
                <span className={`num text-right font-semibold ${r.points > 0 ? "text-drop" : "text-ink-3"}`}>
                  {r.points > 0 ? `−${fmt.format(r.points)}` : "0"}
                </span>
                <span className="num order-5 text-right text-sm text-ink-2 md:order-none">
                  <span className="text-ink-3 md:hidden">Floor after </span>
                  {fmt.format(r.floorAfter)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {shown.length === 0 && <p className="py-6 text-ink-2">Nothing to defend in the next 52 weeks.</p>}
    </div>
  );
}
