import type { MetadataRoute } from "next";
import { getDataset } from "@/lib/data";
import { SITE_URL } from "@/lib/site";

/** Every static page: the three sections, each ranked player's two pages and each event. */
export default function sitemap(): MetadataRoute.Sitemap {
  const { meta, players, tournaments } = getDataset();
  const lastModified = meta.generatedAt;
  const paths = [
    "/",
    "/projection",
    "/calendar",
    "/compare",
    ...players.flatMap((p) => [`/players/${p.id}`, `/players/${p.id}/projection`]),
    ...tournaments.map((t) => `/calendar/${t.id}`),
  ];
  return paths.map((p) => ({ url: `${SITE_URL}${p}`, lastModified }));
}
