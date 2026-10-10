"use client";

import { useRouter } from "next/navigation";

export interface PickOption {
  id: string;
  rank: number;
  name: string;
}

/** Two player menus; changing either loads that pairing. */
export function ComparePicker({ options, a, b }: { options: PickOption[]; a: string; b: string }) {
  const router = useRouter();
  const go = (na: string, nb: string) => router.push(`/compare?a=${encodeURIComponent(na)}&b=${encodeURIComponent(nb)}`);
  const select = (label: string, value: string, onChange: (v: string) => void, other: string) => (
    <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-on-court-2">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-base font-semibold text-on-court focus:border-white/60 [&>option]:text-ink"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id} disabled={o.id === other}>
            {o.rank}. {o.name}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="flex flex-wrap items-end gap-3">
      {select("Player", a, (v) => go(v, b), b)}
      <button
        type="button"
        onClick={() => go(b, a)}
        className="rounded-lg border border-white/20 px-3 py-2.5 text-sm font-semibold text-on-court hover:bg-white/10"
        aria-label="Swap the two players"
      >
        ⇄
      </button>
      {select("Against", b, (v) => go(a, v), a)}
    </div>
  );
}
