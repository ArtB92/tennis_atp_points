/**
 * Download TennisMyLife's ATP match database and write the compact dataset the
 * app reads (data/atp.json). Run with `npm run sync-data`.
 *
 * The files follow Jeff Sackmann's column layout and are updated daily, with
 * matches from events still in progress in ongoing_tourneys.csv.
 * ATP_DATA_BASE_URL points at another copy with the same file names.
 *
 * Ranking totals come from the official ATP list as published by ESPN
 * (ATP_RANKING_URL overrides it); without it they are estimated.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildDataset, type OfficialRanking } from "../lib/build";
import { toISO } from "../lib/dates";
import { parseEspnRanking } from "../lib/espn";

const BASE = (process.env.ATP_DATA_BASE_URL || "https://stats.tennismylife.org/data").replace(/\/$/, "");
const RANKING_URL = process.env.ATP_RANKING_URL || "https://site.api.espn.com/apis/site/v2/sports/tennis/atp/rankings";
const OUT = path.join(import.meta.dirname, "..", "data", "atp.json");

async function get(file: string): Promise<string> {
  const url = `${BASE}/${file}`;
  const res = await fetch(url, { headers: { "user-agent": "baseline-atp-points (github.com/ArtB92/tennis_atp_points)" } });
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`);
  const text = await res.text();
  if (!text.startsWith("tourney_id,")) throw new Error(`GET ${url} did not return a match CSV`);
  return text;
}

/** The official ATP list (ESPN mirrors it). Returns null if it can't be read, so the sync falls back to an estimate. */
async function officialRanking(): Promise<OfficialRanking | null> {
  try {
    const res = await fetch(RANKING_URL);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const ranking = parseEspnRanking(await res.json());
    if (ranking.entries.length < 100) throw new Error(`only ${ranking.entries.length} players`);
    return ranking;
  } catch (err) {
    console.warn(`::warning::Official ranking unavailable (${RANKING_URL}): ${err}. Falling back to an estimate.`);
    return null;
  }
}

async function main() {
  const today = toISO(new Date());
  const year = Number(today.slice(0, 4));
  // Last season is needed for the points that still count and for the estimate's baseline.
  const files = [`${year - 1}.csv`, `${year}.csv`, "ongoing_tourneys.csv"];
  const [ranking, ...matchesCsvs] = await Promise.all([officialRanking(), ...files.map(get)]);

  const ds = buildDataset({ matchesCsvs, ranking: ranking ?? undefined, source: "tennismylife", asOf: today });
  const unmatched = ds.players.filter((p) => p.id.startsWith("x-")).map((p) => p.name);
  if (unmatched.length) console.warn(`No match data found for: ${unmatched.join(", ")}`);
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
    `wrote ${path.relative(process.cwd(), OUT)} (${ds.meta.rankings} ranking of ${ds.meta.rankingDate}): latest match ${ds.meta.latestMatchDate}, ` +
      `${ds.players.length} players, ${ds.tournaments.length} events, ${ds.results.length} results\n${top}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
