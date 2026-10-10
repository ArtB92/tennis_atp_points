import type { Metadata } from "next";
import Link from "next/link";
import { CompareFloorChart } from "@/components/compare-floor-chart";
import { ComparePicker } from "@/components/compare-picker";
import { Flag } from "@/components/flag";
import { LEVEL_COLOR, LevelDot, LEVELS, OTHER_COLOR, SIDE_COLOR } from "@/components/level";
import { RankMove } from "@/components/rank-move";
import { SiteHeader } from "@/components/site-header";
import { compareSide, type CompareSide } from "@/lib/compare";
import { getDataset, getPlayer, meetings } from "@/lib/data";
import { ageOn, formatDate, formatMonth } from "@/lib/dates";
import { LEVEL_LABEL } from "@/lib/points";

const fmt = new Intl.NumberFormat("en-US");

/** The pair to show: the ones asked for when both are ranked and different, else the top two. */
async function pair(searchParams: PageProps<"/compare">["searchParams"]): Promise<[string, string]> {
  const q = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const ids = getDataset().players.map((p) => p.id);
  const a = one(q.a) && getPlayer(one(q.a)!) ? one(q.a)! : ids[0];
  const asked = one(q.b);
  const b = asked && asked !== a && getPlayer(asked) ? asked : ids.find((id) => id !== a)!;
  return [a, b];
}

export async function generateMetadata({ searchParams }: PageProps<"/compare">): Promise<Metadata> {
  const [a, b] = await pair(searchParams);
  return { title: `${getPlayer(a)?.name} vs ${getPlayer(b)?.name}` };
}

export default async function ComparePage({ searchParams }: PageProps<"/compare">) {
  const [a, b] = await pair(searchParams);
  const sides = [compareSide(a)!, compareSide(b)!] as const;
  const { meta, players } = getDataset();
  const h2h = meetings(a, b);
  const wins = [h2h.filter((m) => m.winnerId === a).length, h2h.filter((m) => m.winnerId === b).length];

  const categories = [
    ...LEVELS.map((l) => ({ key: l, label: LEVEL_LABEL[l], color: LEVEL_COLOR[l], values: sides.map((s) => s.row.byLevel[l]) })),
    { key: "other", label: "Challengers and other", color: OTHER_COLOR, values: sides.map((s) => s.row.other) },
  ];
  const catMax = Math.max(1, ...categories.flatMap((c) => c.values));
  const monthMax = Math.max(1, ...sides.flatMap((s) => s.months.map((m) => m.points)));

  return (
    <>
      <SiteHeader>
        <div className="pb-10 pt-6 sm:pt-10">
          <h1 className="display text-5xl font-bold sm:text-7xl">Compare</h1>
          <p className="mb-6 mt-3 max-w-xl text-on-court-2">
            Two players side by side: where their points come from, what they have to defend, and their meetings in the last 52
            weeks.
          </p>
          <ComparePicker options={players.map((p) => ({ id: p.id, rank: p.rank, name: p.name }))} a={a} b={b} />
        </div>
      </SiteHeader>

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <section className="mt-10 grid grid-cols-2 gap-4 sm:gap-8" aria-label="The two players">
          {sides.map((s, i) => (
            <PlayerCard key={s.player.id} side={s} color={SIDE_COLOR[i]} asOf={meta.rankingDate} />
          ))}
        </section>

        <section className="mt-12" aria-labelledby="sources">
          <h2 id="sources" className="display text-3xl font-semibold">
            Where their points come from
          </h2>
          <p className="mb-5 mt-1 text-sm text-ink-2">Ranking points from the last 52 weeks, by event category, on one scale.</p>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-3 gap-y-2 text-sm">
            <span className="truncate text-right font-semibold text-ink">{sides[0].player.name}</span>
            <span />
            <span className="truncate font-semibold text-ink">{sides[1].player.name}</span>
            {categories.map((c) => (
              <Butterfly key={c.key} label={c.label} color={c.color} values={c.values} max={catMax} />
            ))}
            <span className="num border-t border-rule pt-2 text-right font-semibold text-ink">{fmt.format(sides[0].player.points)}</span>
            <span className="border-t border-rule pt-2 text-center text-ink-3">Total</span>
            <span className="num border-t border-rule pt-2 font-semibold text-ink">{fmt.format(sides[1].player.points)}</span>
          </div>
        </section>

        <section className="mt-14" aria-labelledby="h2h">
          <h2 id="h2h" className="display text-3xl font-semibold">
            Head to head
          </h2>
          <p className="mb-4 mt-1 text-sm text-ink-2">
            {h2h.length === 0
              ? "They haven't met at a Grand Slam, Masters, 500, 250 or the Finals in the last 52 weeks."
              : `Meetings in the last 52 weeks at tour level: ${sides[0].player.name} ${wins[0]}, ${sides[1].player.name} ${wins[1]}.`}
          </p>
          {h2h.length > 0 && (
            <ul className="divide-y divide-rule/70 overflow-hidden rounded-xl border border-rule bg-raised">
              {h2h.map((m, i) => (
                <li key={i} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3 sm:grid-cols-[1fr_8rem_auto]">
                  <Link href={`/calendar/${m.tournament.id}`} className="flex min-w-0 items-center gap-2 font-medium text-ink hover:text-accent">
                    <LevelDot level={m.tournament.level} />
                    <span className="truncate">
                      {m.tournament.name} {m.tournament.start.slice(0, 4)}
                    </span>
                    <span className="text-xs font-normal text-ink-3">{m.round}</span>
                  </Link>
                  <span className="num order-3 col-span-2 text-sm text-ink-2 sm:order-none sm:col-span-1">{m.score}</span>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                    <span aria-hidden className="inline-block size-2 rounded-full" style={{ background: SIDE_COLOR[m.winnerId === a ? 0 : 1] }} />
                    {getPlayer(m.winnerId)?.name} won
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-14" aria-labelledby="defend">
          <h2 id="defend" className="display text-3xl font-semibold">
            Points to defend
          </h2>
          <p className="mb-5 mt-1 text-sm text-ink-2">
            Last year&rsquo;s points coming off their totals, and what each would keep if neither won another match.
          </p>
          <dl className="grid grid-cols-2 gap-y-5 border-y border-rule py-6 sm:grid-cols-4">
            {sides[0].defend.map((d, i) => (
              <div key={d.weeks}>
                <dt className="text-sm text-ink-3">{d.weeks === 13 ? "Next 3 months" : d.weeks === 26 ? "Next 6 months" : `Next ${d.weeks} weeks`}</dt>
                {sides.map((s, j) => (
                  <dd key={s.player.id} className="num mt-1 flex items-center gap-2 text-2xl font-semibold">
                    <span aria-hidden className="inline-block h-3 w-1 rounded" style={{ background: SIDE_COLOR[j] }} />
                    <span className="sr-only">{s.player.name}: </span>
                    {fmt.format(s.defend[i].points)}
                  </dd>
                ))}
              </div>
            ))}
          </dl>

          <div className="mt-8">
            <div className="mb-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-2">
              {sides.map((s, i) => (
                <span key={s.player.id} className="inline-flex items-center gap-1.5">
                  <svg aria-hidden width="18" height="4">
                    <line x1="0" x2="18" y1="2" y2="2" stroke={SIDE_COLOR[i]} strokeWidth="2.5" strokeDasharray={i === 1 ? "6 3" : undefined} />
                  </svg>
                  {s.player.name}&rsquo;s floor
                </span>
              ))}
            </div>
            <CompareFloorChart series={sides.map((s) => ({ name: s.player.name, floor: s.floor }))} />
          </div>

          <h3 className="display mt-10 text-2xl font-semibold">Month by month</h3>
          <div className="mt-3 grid grid-cols-[3.5rem_1fr_1fr] gap-x-3 border-b border-rule pb-2 text-sm text-ink-3 sm:grid-cols-[5rem_1fr_1fr]">
            <span>Month</span>
            {sides.map((s) => (
              <span key={s.player.id} className="truncate">
                {s.player.name}
              </span>
            ))}
          </div>
          <ul>
            {sides[0].months.map((m, i) => (
              <li key={m.month} className="grid grid-cols-[3.5rem_1fr_1fr] items-start gap-x-3 border-b border-rule/60 py-2.5 sm:grid-cols-[5rem_1fr_1fr]">
                <span className="text-sm font-medium text-ink-2">
                  {formatMonth(m.month)} <span className="text-ink-3">{m.month.slice(2, 4)}</span>
                </span>
                {sides.map((s) => (
                  <DropCell key={s.player.id} month={s.months[i]} max={monthMax} />
                ))}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}

function PlayerCard({ side, color, asOf }: { side: CompareSide; color: string; asOf: string }) {
  const { player, row } = side;
  const age = ageOn(player.dob, asOf);
  const facts = [
    { label: "Events", value: String(side.events) },
    { label: "Win-loss", value: `${side.wins}-${side.losses}` },
    { label: "Titles", value: String(side.titles) },
  ];
  return (
    <div className="min-w-0 rounded-xl border border-rule bg-raised p-4 sm:p-6" style={{ borderTop: `4px solid ${color}` }}>
      <p className="flex items-baseline gap-2">
        <span className="display num text-5xl font-bold text-ink sm:text-6xl">{player.rank}</span>
        <RankMove move={row.move} />
      </p>
      <Link href={`/players/${player.id}`} className="mt-1 block truncate text-lg font-semibold text-ink hover:text-accent sm:text-2xl">
        {player.name}
      </Link>
      <p className="mt-1 flex items-center gap-2 text-sm text-ink-2">
        <Flag country={player.country} />
        {[player.country, age !== null ? `${age}` : null].filter(Boolean).join(", ")}
      </p>
      <p className="display num mt-4 text-3xl font-semibold text-ink">
        {fmt.format(player.points)} <span className="font-sans text-sm font-normal text-ink-3">points</span>
      </p>
      <dl className="mt-4 grid gap-1 border-t border-rule pt-4 sm:grid-cols-3 sm:gap-2">
        {facts.map((f) => (
          <div key={f.label} className="flex min-w-0 items-baseline justify-between gap-2 sm:block">
            <dt className="truncate text-xs text-ink-3">{f.label}</dt>
            <dd className="num font-semibold text-ink sm:text-lg">{f.value}</dd>
          </div>
        ))}
      </dl>
      {row.nextDrop && (
        <p className="mt-3 truncate text-xs text-ink-3">
          Next drop: <span className="num font-semibold text-drop">−{fmt.format(row.nextDrop.points)}</span> {row.nextDrop.event},{" "}
          {formatDate(row.nextDrop.date)}
        </p>
      )}
    </div>
  );
}

/** One category as two bars growing out from the middle: first player left, second right. */
function Butterfly({ label, color, values, max }: { label: string; color: string; values: number[]; max: number }) {
  const bar = (v: number, side: "left" | "right") => (
    <span className={`flex items-center gap-2 ${side === "left" ? "flex-row-reverse" : ""}`}>
      <span
        className={`h-4 ${side === "left" ? "rounded-l-full" : "rounded-r-full"}`}
        style={{ width: `${(v / max) * 80}%`, minWidth: v > 0 ? 3 : 0, background: color }}
      />
      <span className={`num shrink-0 text-xs ${v > 0 ? "text-ink-2" : "text-ink-3"}`}>{fmt.format(v)}</span>
    </span>
  );
  return (
    <>
      {bar(values[0], "left")}
      <span className="w-20 text-center text-xs leading-tight text-ink-2 sm:w-36 sm:text-sm">{label}</span>
      {bar(values[1], "right")}
    </>
  );
}

function DropCell({ month, max }: { month: CompareSide["months"][number]; max: number }) {
  if (month.points === 0) return <span className="num text-sm text-ink-3">0</span>;
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-2">
        <span className="num w-12 shrink-0 text-sm font-semibold text-drop">−{fmt.format(month.points)}</span>
        <span className="flex h-2.5 overflow-hidden rounded-full" style={{ width: `${(month.points / max) * 100}%` }}>
          {month.events.map((e) => (
            <span key={e.name} style={{ flexGrow: e.points, background: LEVEL_COLOR[e.level] }} />
          ))}
        </span>
      </p>
      <p className="mt-0.5 truncate text-xs text-ink-3">{month.events.map((e) => e.name).join(", ")}</p>
    </div>
  );
}
