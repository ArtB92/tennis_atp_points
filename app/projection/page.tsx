import type { Metadata } from "next";
import { PlayerPicker, type PickerRow } from "@/components/player-picker";
import { SiteHeader } from "@/components/site-header";
import { getDataset, resultsFor } from "@/lib/data";
import { addDays } from "@/lib/dates";

export const metadata: Metadata = { title: "Points to defend" };

export default function ProjectionIndex() {
  const { meta, players } = getDataset();
  const soon = addDays(meta.rankingDate, 13 * 7);
  const rows: PickerRow[] = players.map((p) => {
    const upcoming = resultsFor(p.id).filter((r) => r.drops > meta.rankingDate);
    return {
      id: p.id,
      rank: p.rank,
      name: p.name,
      country: p.country,
      defendSoon: upcoming.filter((r) => r.drops <= soon).reduce((s, r) => s + r.points, 0),
      defendYear: upcoming.reduce((s, r) => s + r.points, 0),
    };
  });

  return (
    <>
      <SiteHeader>
        <div className="pb-12 pt-6 sm:pt-10">
          <h1 className="display text-5xl font-bold sm:text-7xl">Points to defend</h1>
          <p className="mt-3 max-w-xl text-on-court-2">
            Pick a player to see which events in the next 52 weeks put last year&rsquo;s points at stake, and how far he
            would slide without new results.
          </p>
        </div>
      </SiteHeader>
      <main className="mx-auto mt-10 max-w-6xl px-4 sm:px-6">
        <PlayerPicker rows={rows} />
      </main>
    </>
  );
}
