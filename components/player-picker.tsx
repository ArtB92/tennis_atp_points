"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Flag } from "./flag";

export interface PickerRow {
  id: string;
  rank: number;
  name: string;
  country: string;
  defendSoon: number;
  defendYear: number;
}

const fmt = new Intl.NumberFormat("en-US");

export function PlayerPicker({ rows }: { rows: PickerRow[] }) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows;
    return list.slice(0, 60);
  }, [rows, query]);

  return (
    <div>
      <label className="mb-6 flex max-w-md items-center gap-2 rounded-md border border-rule bg-raised px-3 py-2.5 focus-within:border-accent">
        <span className="sr-only">Find a player</span>
        <svg aria-hidden viewBox="0 0 20 20" className="size-4 text-ink-3" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="9" r="6" />
          <path d="m14 14 4 4" />
        </svg>
        <input
          type="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a player"
          className="w-full bg-transparent text-ink outline-none placeholder:text-ink-3"
        />
      </label>
      <div className="grid grid-cols-[2.5rem_1fr_auto_auto] gap-x-4 border-b border-rule pb-2 text-sm text-ink-3 sm:gap-x-8">
        <span className="text-right">Rank</span>
        <span>Player</span>
        <span className="text-right">Next 3 months</span>
        <span className="text-right">Next 52 weeks</span>
      </div>
      <ul>
        {shown.map((r) => (
          <li key={r.id}>
            <Link
              href={`/players/${r.id}/projection`}
              className="grid grid-cols-[2.5rem_1fr_auto_auto] items-center gap-x-4 border-b border-rule/60 py-2.5 hover:bg-raised sm:gap-x-8"
            >
              <span className="num display text-right text-lg font-semibold text-ink-2">{r.rank}</span>
              <span className="truncate font-medium text-ink">
                <Flag country={r.country} className="mr-2 text-[13px] align-[-1px]" />
                {r.name}
              </span>
              <span className="num w-24 text-right font-semibold text-drop">{fmt.format(r.defendSoon)}</span>
              <span className="num w-24 text-right text-ink-2">{fmt.format(r.defendYear)}</span>
            </Link>
          </li>
        ))}
      </ul>
      {shown.length === 0 && <p className="py-6 text-ink-2">No ranked player matches &ldquo;{query}&rdquo;.</p>}
    </div>
  );
}
