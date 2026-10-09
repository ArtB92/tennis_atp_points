/**
 * Download TennisMyLife's ATP match database and write the compact dataset the
 * app reads (data/atp.json). Run with `npm run sync-data`.
 *
 * The files follow Jeff Sackmann's column layout and are updated daily, with
 * matches from events still in progress in ongoing_tourneys.csv.
 * ATP_DATA_BASE_URL points at another copy with the same file names.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildDataset } from "../lib/build";
import { toISO } from "../lib/dates";

const BASE = (process.env.ATP_DATA_BASE_URL || "https://stats.tennismylife.org/data").replace(/\/$/, "");
const OUT = path.join(import.meta.dirname, "..", "data", "atp.json");

async function get(file: string): Promise<string> {
  const url = `${BASE}/${file}`;
  const res = await fetch(url, { headers: { "user-agent": "baseline-atp-points (github.com/ArtB92/tennis_atp_points)" } });
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`);
  const text = await res.text();
  if (!text.startsWith("tourney_id,")) throw new Error(`GET ${url} did not return a match CSV`);
  return text;
}

async function main() {
  const today = toISO(new Date());
  const year = Number(today.slice(0, 4));
  // Last season is needed for the points that still count and for the estimate's baseline.
  const files = [`${year - 1}.csv`, `${year}.csv`, "ongoing_tourneys.csv"];
  const matchesCsvs = await Promise.all(files.map(get));

  const ds = buildDataset({ matchesCsvs, source: "tennismylife", asOf: today });
  if (ds.players.length < 100 || ds.tournaments.length < 20) {
    throw new Error(`Suspiciously small dataset (${ds.players.length} players, ${ds.tournaments.length} events); not writing it`);
  }

  // Leave the file alone when only the timestamp would change, so the refresh job commits real updates only.
  const strip = (d: typeof ds) => JSON.stringify({ ...d, meta: { ...d.meta, generatedAt: "" } });
  const previous = await readFile(OUT, "utf8").then(JSON.parse).catch(() => null);
  if (previous && strip(previous) === strip(ds)) {
    console.log("data unchanged");
    return;
  }
  await writeFile(OUT, JSON.stringify(ds));
  const top = ds.players.slice(0, 5).map((p) => `${p.rank}. ${p.name} ${p.points}`).join(", ");
  console.log(
    `wrote ${path.relative(process.cwd(), OUT)} for ${ds.meta.rankingDate}: latest match ${ds.meta.latestMatchDate}, ` +
      `${ds.players.length} players, ${ds.tournaments.length} events, ${ds.results.length} results\n${top}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
