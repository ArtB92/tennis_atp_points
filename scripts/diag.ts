import { parseCSV } from "../lib/csv";
const BASE = "https://stats.tennismylife.org/data";
const files = ["2025.csv", "2026.csv", "ongoing_tourneys.csv"];
const rows = (await Promise.all(files.map(async (f) => parseCSV(await (await fetch(`${BASE}/${f}`)).text())))).flat();
const by = new Map<string, Record<string, string>[]>();
for (const r of rows) (by.get(r.tourney_id) ?? by.set(r.tourney_id, []).get(r.tourney_id)!).push(r);
for (const [id, rs] of by) {
  if (!/747|329|5014|416|308|7485|9410|429|352|337/.test(id)) continue;
  const d = rs.map((r) => r.tourney_date).sort();
  const fin = rs.filter((r) => r.round === "F").map((r) => `${r.tourney_date} ${r.winner_name} d ${r.loser_name}`);
  const rounds = [...new Set(rs.map((r) => r.round))].join(",");
  console.log(id, rs[0].tourney_name, rs[0].tourney_level, "n", rs.length, d[0], d[d.length - 1], "F:", fin.join("; "), "rounds", rounds);
}
const sin = rows.filter((r) => r.tourney_id.startsWith("2026") && (r.winner_name === "Jannik Sinner" || r.loser_name === "Jannik Sinner"));
console.log("Sinner 2026 events:", [...new Set(sin.map((r) => r.tourney_id + " " + r.tourney_name + " " + r.tourney_date))].join(" | "));
