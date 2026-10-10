/**
 * Sanity checks on data/atp.json, run after each refresh. Fails on data that would
 * show wrong pages (a player id used twice, an event dated over more than 16 days) and
 * warns where the tracked results don't fit the official totals.
 * Run with `npm run check-data`.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { daysBetween } from "../lib/dates";
import type { Dataset } from "../lib/types";

const FILE = path.join(import.meta.dirname, "..", "data", "atp.json");

export function checkDataset(ds: Dataset): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const seen = new Map<string, number>();
  for (const p of ds.players) {
    const rank = seen.get(p.id);
    if (rank !== undefined) errors.push(`#${p.rank} ${p.name} has the same id (${p.id}) as #${rank}`);
    else seen.set(p.id, p.rank);
  }

  for (const t of ds.tournaments) {
    const days = daysBetween(t.start, t.end) + 1;
    if (days > 16) errors.push(`${t.name} ${t.start.slice(0, 4)} runs ${days} days (${t.start} to ${t.end})`);
  }

  const tracked = new Map<string, number>();
  for (const r of ds.results) tracked.set(r.playerId, (tracked.get(r.playerId) ?? 0) + r.points);
  if (ds.meta.rankings === "official") {
    for (const p of ds.players) {
      const t = tracked.get(p.id) ?? 0;
      if (t > p.points) warnings.push(`#${p.rank} ${p.name}: tracked ${t} > official ${p.points}`);
    }
  }

  const unmatched = ds.players.filter((p) => p.id.startsWith("x-"));
  if (unmatched.length) warnings.push(`${unmatched.length} ranked players have no match data: ${unmatched.map((p) => p.name).join(", ")}`);

  return { errors, warnings };
}

async function main() {
  const ds: Dataset = JSON.parse(await readFile(FILE, "utf8"));
  const { errors, warnings } = checkDataset(ds);
  for (const w of warnings) console.warn(`::warning::${w}`);
  for (const e of errors) console.error(`::error::${e}`);
  console.log(`checked ${ds.players.length} players, ${ds.tournaments.length} events: ${errors.length} errors, ${warnings.length} warnings`);
  if (errors.length) process.exit(1);
}

if (process.argv[1] && import.meta.filename === path.resolve(process.argv[1])) main();
