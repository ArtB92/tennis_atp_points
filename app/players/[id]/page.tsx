import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { LevelDot, LevelLegend } from "@/components/level";
import { ResultsTimeline } from "@/components/results-timeline";
import { getDataset, getPlayer, resultsFor } from "@/lib/data";
import { addDays, formatDate, formatShortDate } from "@/lib/dates";
import { FINISH_LABEL, LEVEL_LABEL } from "@/lib/points";

const fmt = new Intl.NumberFormat("en-US");

export async function generateMetadata({ params }: PageProps<"/players/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: getPlayer(id)?.name ?? "Player" };
}

export default async function PlayerPage({ params }: PageProps<"/players/[id]">) {
  const { id } = await params;
  const player = getPlayer(id);
  if (!player) notFound();
  const { meta } = getDataset();
  const results = resultsFor(id);

  const tracked = results.reduce((s, r) => s + r.points, 0);
  const wins = results.reduce((s, r) => s + r.matches.filter((m) => m.won).length, 0);
  const losses = results.reduce((s, r) => s + r.matches.filter((m) => !m.won).length, 0);
  const titles = results.filter((r) => r.finish === "W");
  const best = [...results].sort((a, b) => b.points - a.points)[0];

  const stats = [
    { label: "Events played", value: String(results.length) },
    { label: "Win-loss", value: `${wins}-${losses}` },
    { label: "Titles", value: String(titles.length) },
    { label: "Points from tracked events", value: fmt.format(tracked) },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6">
      <dl className="mt-10 grid grid-cols-2 gap-y-6 border-b border-rule pb-8 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label}>
            <dt className="text-sm text-ink-3">{s.label}</dt>
            <dd className="display num mt-1 text-4xl font-semibold">{s.value}</dd>
          </div>
        ))}
      </dl>

      {results.length === 0 ? (
        <p className="mt-10 max-w-prose text-ink-2">
          {player.name} has no results at Grand Slam, Masters, 500, 250 or Finals level in the last 52 weeks. His{" "}
          {fmt.format(player.points)} points come from Challengers and other events this app doesn&rsquo;t track.
        </p>
      ) : (
        <>
          <section className="mt-10" aria-labelledby="season">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 id="season" className="display text-3xl font-semibold">
                  His last 52 weeks
                </h2>
                <p className="mt-1 text-sm text-ink-2">
                  Points earned at each event.
                  {best && (
                    <>
                      {" "}
                      Best result: {FINISH_LABEL[best.finish].toLowerCase()} at {best.tournament.name}, worth{" "}
                      {fmt.format(best.points)} points.
                    </>
                  )}
                </p>
              </div>
              <LevelLegend />
            </div>
            <ResultsTimeline
              from={addDays(meta.rankingDate, -371)}
              to={meta.rankingDate}
              events={results.map((r) => ({
                id: r.tournament.id,
                name: r.tournament.name,
                level: r.tournament.level,
                start: r.tournament.start,
                end: r.tournament.end,
                points: r.points,
                finish: r.finish,
              }))}
            />
          </section>

          <section className="mt-12" aria-labelledby="events">
            <h2 id="events" className="display mb-4 text-3xl font-semibold">
              Event by event
            </h2>
            <div className="hidden grid-cols-[6rem_1fr_8rem_5rem_7rem] gap-4 border-b border-rule pb-2 text-sm text-ink-3 md:grid">
              <span>Week of</span>
              <span>Event</span>
              <span>Result</span>
              <span className="text-right">Points</span>
              <span className="text-right">Drops off</span>
            </div>
            <ul>
              {results.map((r) => (
                <li key={r.tournament.id} className="border-b border-rule/70">
                  <details className="group">
                    <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto] gap-x-4 gap-y-1 py-3 hover:bg-raised md:grid-cols-[6rem_1fr_8rem_5rem_7rem] md:items-center [&::-webkit-details-marker]:hidden">
                      <span className="num order-3 text-sm text-ink-3 md:order-none">{formatShortDate(r.tournament.start)}</span>
                      <span className="flex items-center gap-2 font-medium text-ink">
                        <LevelDot level={r.tournament.level} />
                        {r.tournament.name}
                        <span className="text-xs font-normal text-ink-3">{r.tournament.surface}</span>
                        <svg aria-hidden viewBox="0 0 12 12" className="size-3 text-ink-3 transition-transform group-open:rotate-90">
                          <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                      </span>
                      <span className="order-4 text-sm text-ink-2 md:order-none">{FINISH_LABEL[r.finish]}</span>
                      <span className="num text-right font-semibold text-ink">{fmt.format(r.points)}</span>
                      <span className="num order-5 hidden text-right text-sm text-ink-3 md:order-none md:block">
                        {formatDate(r.drops)}
                      </span>
                    </summary>
                    <div className="pb-4 pl-0 md:pl-28">
                      <p className="mb-2 text-sm text-ink-3">
                        {LEVEL_LABEL[r.tournament.level]}, {r.tournament.drawSize}-player draw. Points drop off on{" "}
                        {formatDate(r.drops)}.
                      </p>
                      <table className="w-full max-w-2xl text-sm">
                        <tbody>
                          {r.matches.map((m, i) => (
                            <tr key={i} className="border-t border-rule/50">
                              <td className="w-14 py-1.5 text-ink-3">{m.round}</td>
                              <td className={`w-6 py-1.5 font-semibold ${m.won ? "text-ink" : "text-drop"}`}>{m.won ? "W" : "L"}</td>
                              <td className="py-1.5 text-ink-2">
                                {getPlayer(m.opponentId) ? (
                                  <Link className="hover:text-accent hover:underline" href={`/players/${m.opponentId}`}>
                                    {m.opponent}
                                  </Link>
                                ) : (
                                  m.opponent
                                )}
                                {m.opponentRank && <span className="num ml-1.5 text-xs text-ink-3">#{m.opponentRank}</span>}
                              </td>
                              <td className="num py-1.5 text-right text-ink-2">{m.score}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
