"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { RankingRow } from "@/lib/data";
import { formatShortDate } from "@/lib/dates";
import { Flag } from "./flag";
import { LevelDot } from "./level";
import { RankMove } from "./rank-move";

const fmt = new Intl.NumberFormat("en-US");
const PAGE = 50;

export function RankingsTable({ rows }: { rows: RankingRow[] }) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.country.toLowerCase() === q);
  }, [rows, query]);
  const shown = filtered.slice(0, limit);
  const moves = rows.some((r) => r.move !== undefined);

  return (
    <div>
      <label className="mb-4 flex max-w-sm items-center gap-2 rounded-md border border-rule bg-raised px-3 py-2 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25">
        <svg aria-hidden viewBox="0 0 20 20" className="size-4 text-ink-3" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="9" r="6" />
          <path d="m14 14 4 4" />
        </svg>
        <span className="sr-only">Find a player</span>
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(PAGE);
          }}
          placeholder="Find a player or country code"
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
        />
      </label>

      <div className="-mx-4 overflow-x-auto sm:mx-0">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-rule text-left text-ink-3">
              <th scope="col" className="w-12 py-2 pl-4 pr-2 text-right font-medium sm:pl-0">Rank</th>
              {moves && (
                <th scope="col" className="w-10 py-2 pr-1 font-medium">
                  <span className="sr-only">Change since last week</span>
                  <span aria-hidden>+/−</span>
                </th>
              )}
              <th scope="col" className="px-3 py-2 font-medium">Player</th>
              <th scope="col" className="hidden px-3 py-2 font-medium sm:table-cell">Age</th>
              <th scope="col" className="px-3 py-2 pr-4 text-right font-medium sm:pr-3">Points</th>
              <th scope="col" className="hidden py-2 pl-6 font-medium md:table-cell">Next points to drop</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="group border-b border-rule/70 hover:bg-raised">
                <td className="num py-2.5 pl-4 pr-2 text-right font-display text-lg font-semibold text-ink-2 sm:pl-0">{r.rank}</td>
                {moves && (
                  <td className="py-2.5 pr-1">
                    <RankMove move={r.move} />
                  </td>
                )}
                <td className="px-3 py-2.5">
                  <span className="flex items-center gap-2.5">
                    <Flag country={r.country} />
                    <Link href={`/players/${r.id}`} className="font-medium text-ink group-hover:text-accent">
                      {r.name}
                    </Link>
                  </span>
                  {/* On phones the next drop sits under the name instead of in its own column. */}
                  {r.nextDrop && (
                    <span className="mt-0.5 flex items-center gap-1.5 pl-7 text-xs text-ink-3 md:hidden">
                      <LevelDot level={r.nextDrop.level} />
                      <span className="truncate">{r.nextDrop.event}</span>
                      <span className="num font-semibold text-drop">−{fmt.format(r.nextDrop.points)}</span>
                      <span className="num">{formatShortDate(r.nextDrop.date)}</span>
                    </span>
                  )}
                </td>
                <td className="num hidden px-3 py-2.5 text-ink-2 sm:table-cell">{r.age ?? "–"}</td>
                <td className="num px-3 py-2.5 pr-4 text-right font-semibold text-ink sm:pr-3">{fmt.format(r.points)}</td>
                <td className="hidden py-2.5 pl-6 md:table-cell">
                  {r.nextDrop ? (
                    <Link href={`/players/${r.id}/projection`} className="flex items-center gap-2 text-ink-2 hover:text-ink">
                      <LevelDot level={r.nextDrop.level} />
                      <span className="truncate">{r.nextDrop.event}</span>
                      <span className="num font-semibold text-drop">−{fmt.format(r.nextDrop.points)}</span>
                      <span className="num text-ink-3">{formatShortDate(r.nextDrop.date)}</span>
                    </Link>
                  ) : (
                    <span className="text-ink-3">Nothing tracked</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && <p className="py-6 text-sm text-ink-2">No ranked player matches &ldquo;{query}&rdquo;.</p>}
      {filtered.length > limit && (
        <button
          type="button"
          onClick={() => setLimit((l) => l + PAGE)}
          className="mt-4 rounded-md border border-rule bg-raised px-4 py-2 text-sm font-medium text-ink hover:border-accent"
        >
          Show {Math.min(PAGE, filtered.length - limit)} more players
        </button>
      )}
    </div>
  );
}
