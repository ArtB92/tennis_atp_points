import { notFound } from "next/navigation";
import { Flag } from "@/components/flag";
import { PlayerTabs } from "@/components/player-tabs";
import { SiteHeader } from "@/components/site-header";
import { getDataset, getPlayer } from "@/lib/data";
import { ageOn } from "@/lib/dates";

const fmt = new Intl.NumberFormat("en-US");
const HAND: Record<string, string> = { R: "Right-handed", L: "Left-handed" };

export function generateStaticParams() {
  return getDataset().players.map((p) => ({ id: p.id }));
}

export default async function PlayerLayout({ children, params }: LayoutProps<"/players/[id]">) {
  const { id } = await params;
  const player = getPlayer(id);
  if (!player) notFound();
  const age = ageOn(player.dob, getDataset().meta.rankingDate);
  const facts = [player.country, age !== null ? `${age} years old` : null, HAND[player.hand]].filter(Boolean);

  return (
    <>
      <SiteHeader>
        <div className="flex flex-wrap items-end gap-x-8 gap-y-2 pb-8 pt-6 sm:pt-10">
          <p className="display num text-[6rem] font-bold leading-none text-on-court/90 sm:text-[9rem]">
            <span className="sr-only">Rank </span>
            {player.rank}
          </p>
          <div className="pb-2 sm:pb-4">
            <h1 className="display text-4xl font-bold sm:text-6xl">{player.name}</h1>
            <p className="mt-2 flex items-center gap-2.5 text-on-court-2">
              <Flag country={player.country} className="text-[18px]" />
              {facts.join(", ")}
            </p>
          </div>
          <p className="pb-2 sm:ml-auto sm:pb-4 sm:text-right">
            <span className="display num block text-4xl font-semibold sm:text-5xl">{fmt.format(player.points)}</span>
            <span className="text-sm text-on-court-2">ranking points</span>
          </p>
        </div>
        <PlayerTabs id={player.id} />
      </SiteHeader>
      {children}
    </>
  );
}
