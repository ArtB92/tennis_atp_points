import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bracket } from "@/components/bracket";
import { BracketTree } from "@/components/bracket-tree";
import { Flag } from "@/components/flag";
import { LEVEL_COLOR } from "@/components/level";
import { SiteHeader } from "@/components/site-header";
import { TournamentBadge } from "@/components/tournament-badge";
import { ViewToggle } from "@/components/view-toggle";
import { getDataset, getDraw, getPlayer, getTournament } from "@/lib/data";
import { addDays, formatDate, formatShortDate } from "@/lib/dates";
import { bracket } from "@/lib/draw";
import { FINISH_LABEL, LEVEL_LABEL } from "@/lib/points";
import type { DrawEntrant, Finish } from "@/lib/types";

const fmt = new Intl.NumberFormat("en-US");
const FINISH_ORDER: Finish[] = ["W", "F", "SF", "QF", "RR", "R16", "R32", "R64", "R128"];

export function generateStaticParams() {
  return getDataset().tournaments.map((t) => ({ id: t.id }));
}

export async function generateMetadata({ params }: PageProps<"/calendar/[id]">): Promise<Metadata> {
  const { id } = await params;
  const t = getTournament(id);
  return { title: t ? `${t.name} ${t.start.slice(0, 4)}` : "Tournament" };
}

export default async function TournamentPage({ params }: PageProps<"/calendar/[id]">) {
  const { id } = await params;
  const t = getTournament(id);
  if (!t) notFound();
  const draw = getDraw(id);
  const entrants = draw?.entrants ?? [];
  const ranked = entrants.filter((e) => getPlayer(e.id)).map((e) => e.id);
  const rounds = draw ? bracket(draw) : [];
  const rr = draw?.matches.filter((m) => m.round === "RR") ?? [];
  const byId = new Map(entrants.map((e) => [e.id, e]));

  const groups = FINISH_ORDER.map((f) => ({ finish: f, players: entrants.filter((e) => e.finish === f) })).filter(
    (g) => g.players.length > 0,
  );
  const roundPoints: Record<string, number> = {};
  for (const g of groups) roundPoints[g.finish] = Math.max(...g.players.map((p) => p.points));

  const champion = entrants.find((e) => e.finish === "W");
  const nextStart = addDays(t.start, 364);

  const name = (e: DrawEntrant) =>
    ranked.includes(e.id) ? (
      <Link href={`/players/${e.id}`} className="hover:text-accent hover:underline">
        {e.name}
      </Link>
    ) : (
      e.name
    );

  const pointsList = (
    <div className="overflow-hidden rounded-xl border border-rule bg-raised">
      {groups.map((g) => (
        <div key={g.finish} className="grid gap-x-6 gap-y-2 border-b border-rule/70 px-4 py-3 last:border-0 sm:grid-cols-[10rem_1fr]">
          <p className="flex items-baseline justify-between gap-3 sm:block">
            <span className="font-semibold text-ink">{FINISH_LABEL[g.finish]}</span>
            <span className="num block text-sm text-drop sm:mt-0.5">
              {g.finish === "RR" ? "varies" : `${fmt.format(roundPoints[g.finish])} pts`}
            </span>
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
            {g.players.map((e) => (
              <li key={e.id} className="inline-flex items-center gap-1.5 text-ink-2">
                <Flag country={e.country} className="text-[12px]" />
                <span className={ranked.includes(e.id) ? "text-ink" : undefined}>{name(e)}</span>
                {g.finish === "RR" && <span className="num text-xs text-ink-3">{e.points}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <SiteHeader>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4 pb-10 pt-6 sm:pt-10">
          <TournamentBadge name={t.name} level={t.level} size={88} />
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: LEVEL_COLOR[t.level] }}>
              {LEVEL_LABEL[t.level]}
            </p>
            <h1 className="display text-5xl font-bold sm:text-6xl">
              {t.name} <span className="text-on-court-2">{t.start.slice(0, 4)}</span>
            </h1>
            <p className="mt-2 text-on-court-2">
              {formatShortDate(t.start)} – {formatDate(t.end)} · {t.surface} · {t.drawSize} draw
            </p>
          </div>
          <div className="sm:ml-auto sm:text-right">
            <p className="text-sm text-on-court-2">Next edition expected</p>
            <p className="display text-2xl font-semibold">{formatDate(nextStart)}</p>
            <p className="text-sm text-on-court-2">These points drop {formatDate(t.drops)}</p>
          </div>
        </div>
      </SiteHeader>

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        {!draw ? (
          <p className="mt-10 text-ink-2">The draw for this event isn&rsquo;t in the data yet; it appears after the next data refresh.</p>
        ) : (
          <>
            {champion && (
              <p className="mt-10 flex flex-wrap items-center gap-2 text-lg text-ink">
                <span aria-hidden>🏆</span>
                <Flag country={champion.country} className="text-[18px]" />
                <span className="font-semibold">{name(champion)}</span>
                <span className="text-ink-2">won and took {fmt.format(champion.points)} points.</span>
              </p>
            )}

            {rounds.length > 0 && (
              <section className="mt-10" aria-labelledby="draw">
                <h2 id="draw" className="display mb-4 text-3xl font-semibold">
                  Draw
                </h2>
                <Bracket rounds={rounds} entrants={entrants} ranked={ranked} roundPoints={roundPoints} />
              </section>
            )}

            {rr.length > 0 && (
              <section className="mt-12" aria-labelledby="rr">
                <h2 id="rr" className="display mb-4 text-3xl font-semibold">
                  Round robin
                </h2>
                <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {rr.map((m) => (
                    <li key={`${m.winnerId}-${m.loserId}`} className="rounded-md border border-rule bg-raised px-3 py-2 text-sm">
                      <span className="font-semibold text-ink">{byId.get(m.winnerId)?.name}</span>
                      <span className="text-ink-3"> d. </span>
                      <span className="text-ink-2">{byId.get(m.loserId)?.name}</span>
                      <span className="num ml-2 text-xs text-ink-3">{m.score}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="mt-12" aria-labelledby="points">
              <h2 id="points" className="display mb-1 text-3xl font-semibold">
                Points awarded
              </h2>
              <p className="mb-5 text-sm text-ink-2">Ranking points each player earned here; they count until {formatDate(t.drops)}.</p>
              <ViewToggle
                label="Points view"
                views={[
                  { key: "list", label: "By round", content: pointsList },
                  ...(rounds.length >= 2
                    ? [{ key: "tree", label: "Bracket", content: <BracketTree rounds={rounds} entrants={entrants} ranked={ranked} /> }]
                    : []),
                ]}
              />
            </section>
          </>
        )}
        <p className="mt-8 text-sm">
          <Link href="/calendar" className="text-accent hover:underline">
            ← Back to the calendar
          </Link>
        </p>
      </main>
    </>
  );
}
