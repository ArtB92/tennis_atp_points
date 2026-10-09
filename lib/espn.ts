import { mondayOf } from "./dates";
import type { OfficialRanking } from "./build";

interface EspnPayload {
  rankings?: {
    type?: string;
    update?: string;
    ranks?: { current: number; points: number; athlete?: { displayName?: string } }[];
  }[];
}

/** Read ESPN's ATP rankings payload (site.api.espn.com/apis/site/v2/sports/tennis/atp/rankings). */
export function parseEspnRanking(json: EspnPayload): OfficialRanking {
  const list = json.rankings?.find((r) => r.type === "atp") ?? json.rankings?.[0];
  if (!list?.ranks?.length || !list.update) throw new Error("ESPN payload has no ATP ranking list");
  return {
    // Lists are published on Mondays; ESPN stamps the time it loaded them.
    date: mondayOf(list.update.slice(0, 10)),
    entries: list.ranks
      .filter((r) => r.athlete?.displayName && Number.isFinite(r.points))
      .map((r) => ({ rank: r.current, points: Math.round(r.points), name: r.athlete!.displayName! })),
  };
}
