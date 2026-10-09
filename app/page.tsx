import Link from "next/link";
import { LevelLegend } from "@/components/level";
import { PointsLadder } from "@/components/points-ladder";
import { RankingsTable } from "@/components/rankings-table";
import { SiteHeader } from "@/components/site-header";
import { getDataset, rankingRows } from "@/lib/data";
import { formatDate } from "@/lib/dates";

const fmt = new Intl.NumberFormat("en-US");

export default function RankingsPage() {
  const { meta } = getDataset();
  const rows = rankingRows();
  const podium = rows.slice(0, 3);
  const lead = rows.length > 1 ? rows[0].points - rows[1].points : 0;

  return (
    <>
      <SiteHeader>
        <div className="pb-10 pt-6 sm:pb-14 sm:pt-10">
          <h1 className="display text-5xl font-bold sm:text-7xl">ATP rankings</h1>
          <p className="mt-3 max-w-xl text-on-court-2">
            Singles, week of {formatDate(meta.rankingDate)}. The leader is {fmt.format(lead)} points clear.
          </p>
          <ol className="mt-10 grid gap-6 sm:grid-cols-3">
            {podium.map((p) => (
              <li key={p.id}>
                <Link href={`/players/${p.id}`} className="group flex items-end gap-4">
                  <span className="display num text-[5.5rem] font-bold text-on-court/90 sm:text-[7rem]">{p.rank}</span>
                  <span className="pb-3">
                    <span className="block text-lg font-semibold leading-tight group-hover:underline">{p.name}</span>
                    <span className="num block text-on-court-2">{fmt.format(p.points)} points</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </SiteHeader>

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <section className="mt-12" aria-labelledby="ladder">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="ladder" className="display text-3xl font-semibold">
                Where the top 20 got their points
              </h2>
              <p className="mt-1 text-sm text-ink-2">Ranking points from the last 52 weeks, by event category.</p>
            </div>
            <LevelLegend withOther />
          </div>
          <PointsLadder rows={rows.slice(0, 20)} />
        </section>

        <section className="mt-16" aria-labelledby="all">
          <h2 id="all" className="display mb-5 text-3xl font-semibold">
            Full ranking
          </h2>
          <RankingsTable rows={rows} />
        </section>
      </main>
    </>
  );
}
