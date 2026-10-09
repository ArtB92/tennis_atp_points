/**
 * Download Jeff Sackmann's ATP CSVs and write the compact dataset the app reads
 * (data/atp.json). Run with `npm run sync-data`.
 *
 * ATP_DATA_BASE_URL points at any copy of the tennis_atp repository layout,
 * e.g. a fork, if the upstream one falls behind.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildDataset } from "../lib/build";

const BASE = (process.env.ATP_DATA_BASE_URL || "https://raw.githubusercontent.com/JeffSackmann/tennis_atp/master").replace(/\/$/, "");
const OUT = path.join(import.meta.dirname, "..", "data", "atp.json");

async function get(file: string, required: boolean): Promise<string | null> {
  const url = `${BASE}/${file}`;
  const res = await fetch(url);
  if (res.ok) return res.text();
  if (required) throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`);
  console.warn(`skipping ${file}: ${res.status}`);
  return null;
}

async function main() {
  const [rankingsCsv, playersCsv] = await Promise.all([get("atp_rankings_current.csv", true), get("atp_players.csv", true)]);

  // The ranking list decides which seasons we need: its year and the one before.
  const lastDate = rankingsCsv!.trim().split(/\r?\n/).slice(1).reduce((max, line) => {
    const d = line.split(",")[0];
    return d > max ? d : max;
  }, "");
  const year = Number(lastDate.slice(0, 4));
  const seasons = [year - 1, year];
  const matchFiles = await Promise.all(seasons.map((y, i) => get(`atp_matches_${y}.csv`, i === 0)));

  const ds = buildDataset({
    rankingsCsv: rankingsCsv!,
    playersCsv: playersCsv!,
    matchesCsvs: matchFiles.filter((f): f is string => f !== null),
    source: "sackmann",
  });

  // Leave the file alone when only the timestamp would change, so the refresh job commits real updates only.
  const previous = await readFile(OUT, "utf8").then(JSON.parse).catch(() => null);
  if (previous && JSON.stringify({ ...previous, meta: { ...previous.meta, generatedAt: "" } }) ===
      JSON.stringify({ ...ds, meta: { ...ds.meta, generatedAt: "" } })) {
    console.log("data unchanged");
    return;
  }
  await writeFile(OUT, JSON.stringify(ds));
  console.log(
    `wrote ${path.relative(process.cwd(), OUT)}: rankings ${ds.meta.rankingDate}, latest event ${ds.meta.latestEventDate}, ` +
      `${ds.players.length} players, ${ds.tournaments.length} events, ${ds.results.length} results`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
