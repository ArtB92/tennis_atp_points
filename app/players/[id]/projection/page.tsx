import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DefenceList, type DefenceRow } from "@/components/defence-list";
import { FloorChart, type FloorStep } from "@/components/floor-chart";
import { LevelLegend } from "@/components/level";
import { dataDay, getDataset, getPlayer } from "@/lib/data";
import { addDays, formatDate } from "@/lib/dates";
import { computeProjection } from "@/lib/projection";

const fmt = new Intl.NumberFormat("en-US");

export async function generateMetadata({ params }: PageProps<"/players/[id]/projection">): Promise<Metadata> {
  const { id } = await params;
  const p = getPlayer(id);
  return { title: p ? `${p.name}: points to defend` : "Points to defend" };
}

export default async function ProjectionPage({ params }: PageProps<"/players/[id]/projection">) {
  const { id } = await params;
  const proj = computeProjection(getDataset(), id);
  if (!proj) notFound();
  const { player, asOf, entries, floor, otherPoints } = proj;

  // Attach each drop to the week it lands in.
  const steps: FloorStep[] = floor.map((f, i) => {
    const prev = i === 0 ? addDays(f.date, -7) : floor[i - 1].date;
    const drops = entries
      .filter((e) => e.points > 0 && e.drops > prev && e.drops <= f.date)
      .map((e) => ({ name: e.tournament.name, points: e.points, level: e.tournament.level }));
    return { ...f, drops };
  });

  const today = dataDay();
  const rows: DefenceRow[] = entries.map((e, i) => {
    const droppedSoFar = entries.slice(0, i + 1).reduce((s, x) => s + x.points, 0);
    return {
      id: e.tournament.id,
      name: e.tournament.name,
      level: e.tournament.level,
      surface: e.tournament.surface,
      nextStart: e.nextStart,
      started: e.nextStart <= today,
      drops: e.drops,
      points: e.points,
      finish: e.result?.finish ?? null,
      floorAfter: Math.max(0, player.points - droppedSoFar),
    };
  });

  const within = (weeks: number) =>
    entries.filter((e) => e.drops <= addDays(asOf, weeks * 7)).reduce((s, e) => s + e.points, 0);
  const windows = [
    { label: "Next 4 weeks", value: within(4) },
    { label: "Next 3 months", value: within(13) },
    { label: "Next 6 months", value: within(26) },
    { label: "Next 52 weeks", value: within(52) },
  ];
  const biggest = [...entries].sort((a, b) => b.points - a.points)[0];
  const end = floor[floor.length - 1];

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6">
      <section className="mt-10" aria-labelledby="floor">
        <h2 id="floor" className="display text-3xl font-semibold">
          If he earned nothing from here
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-2">
          Each step down is last year&rsquo;s result at an event dropping off. With no new points, {player.name} would
          fall to {fmt.format(end.floor)} points by {formatDate(end.date)}, enough for rank {end.rank} if everyone
          else stood still too.
          {biggest && biggest.points > 0 && (
            <>
              {" "}
              The biggest single drop is {fmt.format(biggest.points)} points at {biggest.tournament.name}.
            </>
          )}
        </p>
        <div className="mt-6">
          <FloorChart steps={steps} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink-2">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-0.5 w-4 rounded bg-accent" />
            Points floor
          </span>
          <span className="text-ink-3">Dots and bars by event dropping:</span>
          <LevelLegend />
        </div>
      </section>

      <dl className="mt-10 grid grid-cols-2 gap-y-6 border-y border-rule py-8 sm:grid-cols-4">
        {windows.map((w) => (
          <div key={w.label}>
            <dt className="text-sm text-ink-3">{w.label}</dt>
            <dd className="display num mt-1 text-4xl font-semibold">{fmt.format(w.value)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm text-ink-3">
        Points to defend at Grand Slam, Masters, 500, 250 and Finals events.
        {otherPoints > 0 && <> His other {fmt.format(otherPoints)} points (Challengers and other events) aren&rsquo;t projected.</>}
      </p>

      <section className="mt-12" aria-labelledby="calendar">
        <h2 id="calendar" className="display text-3xl font-semibold">
          The year ahead
        </h2>
        <p className="mb-4 mt-1 text-sm text-ink-2">
          Upcoming events in calendar order, with the points from last year&rsquo;s edition he has to defend there.
        </p>
        <DefenceList rows={rows} />
      </section>
    </main>
  );
}
