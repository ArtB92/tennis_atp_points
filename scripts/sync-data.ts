/**
 * Download TennisMyLife's ATP match database and write the compact dataset the
 * app reads (data/atp.json). Run with `npm run sync-data`.
 *
 * The files follow Jeff Sackmann's column layout and are updated daily, with
 * matches from events still in progress in ongoing_tourneys.csv.
 * ATP_DATA_BASE_URL points at another copy with the same file names.
 *
 * Ranking totals are copied from the official ATP list, read from TennisExplorer
 * (current week) or else ESPN (can lag a week); without either they are estimated.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildDataset, type OfficialRanking } from "../lib/build";
import { toISO } from "../lib/dates";
import type { Dataset } from "../lib/types";
import { parseEspnRanking } from "../lib/espn";
import { parseTennisExplorerPage } from "../lib/tennisexplorer";

const BASE = (process.env.ATP_DATA_BASE_URL || "https://stats.tennismylife.org/data").replace(/\/$/, "");
const TE_URL = "https://www.tennisexplorer.com/ranking/atp-men/";
const ESPN_URL = "https://site.api.espn.com/apis/site/v2/sports/tennis/atp/rankings";
const BROWSER_UA = "Mozilla/5.0";
const TOP_N = 200;
const OUT = path.join(import.meta.dirname, "..", "data", "atp.json");

async function get(file: string): Promise<string> {
  const url = `${BASE}/${file}`;
  const res = await fetch(url, { headers: { "user-agent": "baseline-atp-points (github.com/ArtB92/tennis_atp_points)" } });
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`);
  const text = await res.text();
  if (!text.startsWith("tourney_id,")) throw new Error(`GET ${url} did not return a match CSV`);
  return text;
}

/**
 * TennisExplorer mirrors the official list, 50 players a page: the current week, or an
 * earlier one picked by date. `dates` lists every week it has, newest first.
 */
async function tennisExplorerRanking(week?: string, size = TOP_N): Promise<OfficialRanking & { dates: string[] }> {
  const entries = new Map<number, OfficialRanking["entries"][number]>();
  let date = "";
  let dates: string[] = [];
  for (let page = 1; page <= Math.ceil(size / 50) && entries.size < size; page++) {
    const url = `${TE_URL}?${week ? `date=${week}&` : ""}page=${page}`;
    const res = await fetch(url, { headers: { "user-agent": BROWSER_UA } });
    if (!res.ok) throw new Error(`GET ${url}: ${res.status} ${res.statusText}`);
    const ranking = parseTennisExplorerPage(await res.text());
    if (week && ranking.date !== week) throw new Error(`asked for ${week}, got ${ranking.date}`);
    if (date && ranking.date !== date) throw new Error(`page ${page} is for ${ranking.date}, not ${date}`);
    date = ranking.date;
    dates = ranking.dates;
    const before = entries.size;
    for (const e of ranking.entries) entries.set(e.rank, e);
    if (entries.size === before) break;
  }
  return { date, dates, entries: [...entries.values()].sort((a, b) => a.rank - b.rank).slice(0, size) };
}

/** Last week's list from TennisExplorer, for rank changes; null when it can't be read. */
async function previousWeek(current: OfficialRanking & { dates?: string[] }): Promise<OfficialRanking | null> {
  const week = current.dates?.filter((d) => d < current.date).sort().pop();
  if (!week) return null;
  try {
    // A little deeper than the top 200, so players just inside it show a rise, not "new".
    return await tennisExplorerRanking(week, TOP_N + 50);
  } catch (err) {
    console.warn(`::warning::Previous week's ranking unavailable: ${err}`);
    return null;
  }
}

/** ESPN's copy of the list, which can lag a week behind. */
async function espnRanking(): Promise<OfficialRanking> {
  const res = await fetch(ESPN_URL);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return parseEspnRanking(await res.json());
}

/** The official ATP list from the first source that serves it in full; null falls back to an estimate. */
async function officialRanking(): Promise<(OfficialRanking & { dates?: string[] }) | null> {
  for (const [name, read] of [
    ["TennisExplorer", tennisExplorerRanking],
    ["ESPN", espnRanking],
  ] as const) {
    try {
      const ranking = await read();
      if (ranking.entries.length < 100) throw new Error(`only ${ranking.entries.length} players`);
      console.log(`official ranking of ${ranking.date} from ${name}`);
      return ranking;
    } catch (err) {
      console.warn(`::warning::Official ranking unavailable from ${name}: ${err}`);
    }
  }
  console.warn("::warning::No official ranking source answered; falling back to an estimate.");
  return null;
}

async function main() {
  const today = toISO(new Date());
  const year = Number(today.slice(0, 4));
  // Last season is needed for the points that still count and for the estimate's baseline.
  const files = [`${year - 1}.csv`, `${year}.csv`, "ongoing_tourneys.csv"];
  const [ranking, ...matchesCsvs] = await Promise.all([officialRanking(), ...files.map(get)]);

  const previousRanking = ranking ? await previousWeek(ranking) : null;
  const ds = buildDataset({
    matchesCsvs,
    ranking: ranking ?? undefined,
    previousRanking: previousRanking ?? undefined,
    source: "tennismylife",
    asOf: today,
  });
  const unmatched = ds.players.filter((p) => p.id.startsWith("x-")).map((p) => p.name);
  if (unmatched.length) console.warn(`No match data found for: ${unmatched.join(", ")}`);
  if (ds.players.length < 100 || ds.tournaments.length < 20) {
    throw new Error(`Suspiciously small dataset (${ds.players.length} players, ${ds.tournaments.length} events); not writing it`);
  }

  const previous: Dataset | null = await readFile(OUT, "utf8").then(JSON.parse).catch(() => null);
  if (ds.meta.rankings === "official" && !previousRanking) carryRankChanges(ds, previous);

  // Leave the file alone when only the timestamp would change, so the refresh job commits real updates only.
  const strip = (d: typeof ds) => JSON.stringify({ ...d, meta: { ...d.meta, generatedAt: "" } });
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

/**
 * Without last week's list, rank changes come from the file this run replaces: kept as
 * they were within the same week, or measured against it once a new list is out.
 */
function carryRankChanges(ds: Dataset, previous: Dataset | null) {
  if (!previous || previous.meta.rankings !== "official" || previous.meta.rankingDate > ds.meta.rankingDate) return;
  const sameWeek = previous.meta.rankingDate === ds.meta.rankingDate;
  if (sameWeek && !previous.players.some((p) => p.prevRank !== undefined)) return;
  const before = new Map(previous.players.map((p) => [p.id, sameWeek ? p.prevRank : p.rank]));
  for (const p of ds.players) p.prevRank = before.get(p.id) ?? null;
  console.log(`rank changes ${sameWeek ? "kept from the previous run" : `measured against the list of ${previous.meta.rankingDate}`}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
