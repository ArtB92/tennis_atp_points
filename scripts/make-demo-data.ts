/**
 * Generate a demo dataset with fictional players, so the app runs without
 * network access. It writes Sackmann-style CSVs (with an official ranking list) and feeds
 * them through the real pipeline. Run with `npm run demo-data`.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { buildDataset } from "../lib/build";
import { classifyLevel, pointsForEvent } from "../lib/points";
import type { Round } from "../lib/types";

const OUT = path.join(import.meta.dirname, "..", "data", "atp.json");
const RANKING_DATE = "20261005";

// Deterministic PRNG so the demo is stable between runs.
let seed = 20261005;
function rand() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const FIRST = ["Aurelio", "Bastian", "Cyril", "Dmitri", "Elias", "Fausto", "Gael", "Henrik", "Ilya", "Jonas", "Kenji", "Lorenzo", "Mateo", "Nils", "Oskar", "Pablo", "Quentin", "Rafael", "Soren", "Tomas", "Ugo", "Viktor", "Wes", "Xavier", "Yannick", "Zane", "Arno", "Bruno", "Caspar", "Dario", "Emil", "Felix", "Gustavo", "Hugo", "Ivo", "Jakub", "Kai", "Leon", "Marek", "Nico"];
const LAST = ["Albescu", "Brandt", "Castellano", "Duval", "Ekberg", "Ferreira", "Galloway", "Halvorsen", "Ivanic", "Jaramillo", "Kowalczyk", "Lindqvist", "Moreau", "Novak-Reyes", "Okafor", "Petrakis", "Quiroga", "Rasmussen", "Salvatori", "Takeda", "Ulrich", "Vasquez", "Whitlock", "Yilmaz", "Zelenko", "Arrieta", "Bergstrom", "Coutinho", "Dragovic", "Eriksen", "Fontaine", "Gutierrez", "Horvath", "Ianucci", "Jovanovic", "Kessler", "Laurent", "Marchetti", "Navarro", "Olsen"];
const IOC = ["ESP", "ITA", "FRA", "USA", "SRB", "GER", "AUS", "ARG", "GBR", "CAN", "NOR", "DEN", "CZE", "POL", "GRE", "JPN", "CHI", "NED", "SUI", "BRA", "KAZ", "CRO", "BEL", "POR"];

interface DemoPlayer {
  id: string;
  first: string;
  last: string;
  ioc: string;
  hand: string;
  dob: string;
  elo: number;
}

const used = new Set<string>();
const players: DemoPlayer[] = Array.from({ length: 300 }, (_, i) => {
  let first: string, last: string;
  do {
    first = pick(FIRST);
    last = pick(LAST);
  } while (used.has(first + last));
  used.add(first + last);
  const year = 1993 + Math.floor(rand() * 15);
  return {
    id: String(300000 + i),
    first,
    last,
    ioc: pick(IOC),
    hand: rand() < 0.15 ? "L" : "R",
    dob: `${year}${String(1 + Math.floor(rand() * 12)).padStart(2, "0")}${String(1 + Math.floor(rand() * 28)).padStart(2, "0")}`,
    // Strength falls off quickly at the top, then flattens.
    elo: 2350 - 420 * Math.log10(1 + i * 0.6) + (rand() - 0.5) * 40,
  };
});

// [name, source level, draw size, start yyyymmdd, surface]
type Ev = [string, string, number, string, string];
const CALENDAR: Ev[] = [
  ["Shanghai Masters", "M", 96, "20250929", "Hard"],
  ["Almaty", "A", 32, "20251013", "Hard"],
  ["Stockholm", "A", 28, "20251013", "Hard"],
  ["Brussels", "A", 28, "20251013", "Hard"],
  ["Basel", "A", 32, "20251020", "Hard"],
  ["Vienna", "A", 32, "20251020", "Hard"],
  ["Paris Masters", "M", 56, "20251027", "Hard"],
  ["Metz", "A", 28, "20251103", "Hard"],
  ["Athens", "A", 28, "20251103", "Hard"],
  ["Tour Finals", "F", 8, "20251110", "Hard"],
  ["Brisbane", "A", 32, "20260105", "Hard"],
  ["Hong Kong", "A", 28, "20260105", "Hard"],
  ["Adelaide", "A", 28, "20260112", "Hard"],
  ["Auckland", "A", 28, "20260112", "Hard"],
  ["Australian Open", "G", 128, "20260119", "Hard"],
  ["Montpellier", "A", 28, "20260202", "Hard"],
  ["Rotterdam", "A", 32, "20260209", "Hard"],
  ["Dallas", "A", 32, "20260209", "Hard"],
  ["Buenos Aires", "A", 28, "20260209", "Clay"],
  ["Doha", "A", 32, "20260216", "Hard"],
  ["Rio de Janeiro", "A", 32, "20260216", "Clay"],
  ["Delray Beach", "A", 28, "20260216", "Hard"],
  ["Dubai", "A", 32, "20260223", "Hard"],
  ["Acapulco", "A", 32, "20260223", "Hard"],
  ["Santiago", "A", 28, "20260223", "Clay"],
  ["Indian Wells Masters", "M", 96, "20260302", "Hard"],
  ["Miami Masters", "M", 96, "20260316", "Hard"],
  ["Houston", "A", 28, "20260330", "Clay"],
  ["Marrakech", "A", 28, "20260330", "Clay"],
  ["Monte Carlo Masters", "M", 56, "20260406", "Clay"],
  ["Barcelona", "A", 32, "20260413", "Clay"],
  ["Munich", "A", 32, "20260413", "Clay"],
  ["Madrid Masters", "M", 96, "20260420", "Clay"],
  ["Rome Masters", "M", 96, "20260504", "Clay"],
  ["Hamburg", "A", 32, "20260518", "Clay"],
  ["Geneva", "A", 28, "20260518", "Clay"],
  ["Roland Garros", "G", 128, "20260525", "Clay"],
  ["Stuttgart", "A", 28, "20260608", "Grass"],
  ["'s-Hertogenbosch", "A", 28, "20260608", "Grass"],
  ["Halle", "A", 32, "20260615", "Grass"],
  ["Queen's Club", "A", 32, "20260615", "Grass"],
  ["Mallorca", "A", 28, "20260622", "Grass"],
  ["Eastbourne", "A", 28, "20260622", "Grass"],
  ["Wimbledon", "G", 128, "20260629", "Grass"],
  ["Bastad", "A", 28, "20260713", "Clay"],
  ["Gstaad", "A", 28, "20260713", "Clay"],
  ["Washington", "A", 48, "20260720", "Hard"],
  ["Umag", "A", 28, "20260720", "Clay"],
  ["Canada Masters", "M", 96, "20260727", "Hard"],
  ["Cincinnati Masters", "M", 96, "20260810", "Hard"],
  ["Winston-Salem", "A", 48, "20260824", "Hard"],
  ["US Open", "G", 128, "20260831", "Hard"],
  ["Chengdu", "A", 28, "20260921", "Hard"],
  ["Beijing", "A", 32, "20260921", "Hard"],
  ["Tokyo", "A", 32, "20260921", "Hard"],
];

const ROUNDS_BY_BRACKET: Record<number, Round[]> = {
  128: ["R128", "R64", "R32", "R16", "QF", "SF", "F"],
  64: ["R64", "R32", "R16", "QF", "SF", "F"],
  32: ["R32", "R16", "QF", "SF", "F"],
};

function winProb(a: DemoPlayer, b: DemoPlayer) {
  return 1 / (1 + 10 ** ((b.elo - a.elo) / 400));
}

function score(bestOf: number): string {
  const sets = bestOf === 5 ? 3 + Math.floor(rand() * 3) : 2 + Math.floor(rand() * 2);
  const out: string[] = [];
  let loserSets = sets - (bestOf === 5 ? 3 : 2);
  for (let i = 0; i < sets; i++) {
    const loserTakes = loserSets > 0 && i < sets - 1 && rand() < 0.6;
    if (loserTakes) loserSets--;
    const tb = rand() < 0.2;
    const s = tb ? "7-6(" + (2 + Math.floor(rand() * 6)) + ")" : pick(["6-3", "6-4", "6-2", "7-5", "6-1"]);
    out.push(loserTakes ? s.replace(/^(\d)-(\d)/, "$2-$1").replace(/\(\d\)/, "") : s);
  }
  return out.join(" ");
}

const HEADER = "tourney_id,tourney_name,surface,draw_size,tourney_level,tourney_date,match_num,winner_id,winner_name,winner_ioc,loser_id,loser_name,loser_ioc,score,best_of,round,winner_rank,loser_rank";
const matchLines: string[] = [HEADER];
const earned = new Map<string, number>();
const busy = new Map<string, Set<string>>(); // week -> player ids
const initialRank = new Map(players.map((p, i) => [p.id, i + 1]));

function addMatch(evId: string, ev: Ev, n: number, w: DemoPlayer, l: DemoPlayer, round: Round, bestOf: number) {
  const name = (p: DemoPlayer) => `${p.first} ${p.last}`;
  matchLines.push(
    [evId, ev[0], ev[4], ev[2], ev[1], ev[3], n, w.id, name(w), w.ioc, l.id, name(l), l.ioc, score(bestOf), bestOf, round, initialRank.get(w.id), initialRank.get(l.id)].join(","),
  );
}

CALENDAR.forEach((ev, idx) => {
  const [name, lvl, draw, date] = ev;
  const evId = `${date.slice(0, 4)}-${String(9000 + idx)}`;
  const week = date;
  const taken = busy.get(week) ?? new Set<string>();
  busy.set(week, taken);
  const bestOf = lvl === "G" ? 5 : 3;
  const played: { id: string; round: Round; won: boolean }[] = [];
  let n = 0;

  if (lvl === "F") {
    const field = players.slice(0, 8);
    const groups = [[0, 3, 4, 7], [1, 2, 5, 6]].map((g) => g.map((i) => field[i]));
    const advancers: DemoPlayer[][] = [];
    for (const g of groups) {
      const wins = new Map(g.map((p) => [p.id, 0]));
      for (let i = 0; i < 4; i++)
        for (let j = i + 1; j < 4; j++) {
          const [a, b] = rand() < winProb(g[i], g[j]) ? [g[i], g[j]] : [g[j], g[i]];
          wins.set(a.id, wins.get(a.id)! + 1);
          addMatch(evId, ev, ++n, a, b, "RR", 3);
          played.push({ id: a.id, round: "RR", won: true }, { id: b.id, round: "RR", won: false });
        }
      advancers.push([...g].sort((a, b) => wins.get(b.id)! - wins.get(a.id)! || b.elo - a.elo).slice(0, 2));
    }
    const semis = [[advancers[0][0], advancers[1][1]], [advancers[1][0], advancers[0][1]]];
    const finalists = semis.map(([a, b]) => {
      const [w, l] = rand() < winProb(a, b) ? [a, b] : [b, a];
      addMatch(evId, ev, ++n, w, l, "SF", 3);
      played.push({ id: w.id, round: "SF", won: true }, { id: l.id, round: "SF", won: false });
      return w;
    });
    const [w, l] = rand() < winProb(finalists[0], finalists[1]) ? finalists : [finalists[1], finalists[0]];
    addMatch(evId, ev, ++n, w, l, "F", 3);
    played.push({ id: w.id, round: "F", won: true }, { id: l.id, round: "F", won: false });
  } else {
    // Who enters depends on the event's weight: big events draw the top of the list.
    const available = players.filter((p) => !taken.has(p.id));
    const rank = (p: DemoPlayer) => initialRank.get(p.id)!;
    const wants = (p: DemoPlayer) => {
      const r = rank(p);
      if (lvl === "G") return 0.98;
      if (lvl === "M") return r <= 60 ? 0.93 : 0.6;
      if (draw === 32 && ["Rotterdam", "Dallas", "Doha", "Rio de Janeiro", "Dubai", "Acapulco", "Barcelona", "Munich", "Hamburg", "Halle", "Queen's Club", "Beijing", "Tokyo", "Basel", "Vienna"].includes(name))
        return r <= 10 ? 0.45 : r <= 50 ? 0.5 : 0.25;
      return r <= 10 ? 0.06 : r <= 30 ? 0.3 : 0.45;
    };
    const entrants = available.filter((p) => rand() < wants(p)).slice(0, draw);
    for (const p of available) {
      if (entrants.length >= draw) break;
      if (!entrants.includes(p)) entrants.push(p);
    }
    entrants.sort((a, b) => rank(a) - rank(b));
    entrants.forEach((p) => taken.add(p.id));

    const bracket = draw > 64 ? 128 : draw > 32 ? 64 : 32;
    const byes = bracket - entrants.length;
    const seeds = entrants.slice(0, byes);
    const rest = shuffle(entrants.slice(byes));
    // First round: unseeded players pair off; seeds with byes join in round two.
    let alive: DemoPlayer[] = [];
    const rounds = ROUNDS_BY_BRACKET[bracket];
    for (let i = 0; i < rest.length; i += 2) {
      const [a, b] = [rest[i], rest[i + 1]];
      const [w, l] = rand() < winProb(a, b) ? [a, b] : [b, a];
      addMatch(evId, ev, ++n, w, l, rounds[0], bestOf);
      played.push({ id: w.id, round: rounds[0], won: true }, { id: l.id, round: rounds[0], won: false });
      alive.push(w);
    }
    alive = shuffle([...seeds, ...alive]);
    for (const round of rounds.slice(1)) {
      const next: DemoPlayer[] = [];
      for (let i = 0; i < alive.length; i += 2) {
        const [a, b] = [alive[i], alive[i + 1]];
        const [w, l] = rand() < winProb(a, b) ? [a, b] : [b, a];
        addMatch(evId, ev, ++n, w, l, round, bestOf);
        played.push({ id: w.id, round, won: true }, { id: l.id, round, won: false });
        next.push(w);
      }
      alive = next;
    }
  }

  const level = classifyLevel(lvl, name, Number(date.slice(0, 4)));
  if (!level) return;
  const byPlayer = new Map<string, { round: Round; won: boolean }[]>();
  for (const m of played) byPlayer.set(m.id, [...(byPlayer.get(m.id) ?? []), m]);
  for (const [id, ms] of byPlayer) earned.set(id, (earned.get(id) ?? 0) + pointsForEvent(level, draw, ms).points);
});

// Official totals also include Challenger results, which the demo invents as a lump.
const totals = players.map((p, i) => ({ id: p.id, points: (earned.get(p.id) ?? 0) + (i < 30 ? 0 : Math.round(80 + rand() * 420)) }));
totals.sort((a, b) => b.points - a.points);

const rankingsCsv = ["ranking_date,rank,player,points", ...totals.map((t, i) => `${RANKING_DATE},${i + 1},${t.id},${t.points}`)].join("\n");
const playersCsv = [
  "player_id,name_first,name_last,hand,dob,ioc,height,wikidata_id",
  ...players.map((p) => `${p.id},${p.first},${p.last},${p.hand},${p.dob},${p.ioc},,`),
].join("\n");

const ds = buildDataset({
  rankingsCsv,
  playersCsv,
  matchesCsvs: [matchLines.join("\n")],
  source: "demo",
  generatedAt: "2026-10-05T00:00:00.000Z",
});
await writeFile(OUT, JSON.stringify(ds));
console.log(`wrote demo dataset: ${ds.players.length} players, ${ds.tournaments.length} events, ${ds.results.length} results`);
