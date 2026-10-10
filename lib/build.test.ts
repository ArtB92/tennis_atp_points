import { describe, expect, it } from "vitest";
import { buildDataset, notInTotal } from "./build";
import type { Level, Tournament } from "./types";
import { computeProjection } from "./projection";

const H =
  "tourney_id,tourney_name,surface,draw_size,tourney_level,tourney_date,match_num,winner_id,winner_name,winner_ioc,winner_hand,winner_age,winner_rank,winner_rank_points,loser_id,loser_name,loser_ioc,loser_hand,loser_age,loser_rank,loser_rank_points,score,round";

describe("with an official ranking list", () => {
  const rankingsCsv = `ranking_date,rank,player,points
20260928,1,1,4000
20261005,1,1,3500
20261005,2,2,2600
20261005,3,3,900`;
  const playersCsv = `player_id,name_first,name_last,hand,dob,ioc
1,Ana,One,R,20000101,ESP
2,Ben,Two,L,19990505,ITA
3,Cal,Three,R,20020202,FRA`;
  const matchesCsv = [
    H,
    // US Open 2025: dropped after the 2026 edition.
    "2025-560,US Open,Hard,128,G,20250825,1,1,Ana One,,,,,,2,Ben Two,,,,,,6-4 6-4 6-4,F",
    // Paris 2025: still counts.
    "2025-352,Paris Masters,Hard,56,M,20251027,1,2,Ben Two,,,,,,1,Ana One,,,,,,7-5 6-3,F",
    // Wimbledon 2026.
    "2026-540,Wimbledon,Grass,128,G,20260629,1,1,Ana One,,,,,,3,Cal Three,,,,,,6-1 6-1 6-1,QF",
    "2026-540,Wimbledon,Grass,128,G,20260629,2,2,Ben Two,,,,,,1,Ana One,,,,,,6-4 3-6 6-4 6-4,SF",
    // No points.
    "2026-D01,Davis Cup Finals,Hard,8,D,20260914,1,1,Ana One,,,,,,2,Ben Two,,,,,,6-3 6-3,RR",
  ].join("\n");
  const ds = buildDataset({ rankingsCsv, playersCsv, matchesCsvs: [matchesCsv], source: "demo", generatedAt: "x" });

  it("uses the latest list", () => {
    expect(ds.meta.rankings).toBe("official");
    expect(ds.meta.rankingDate).toBe("2026-10-05");
    expect(ds.players.map((p) => [p.name, p.rank, p.points])).toEqual([
      ["Ana One", 1, 3500],
      ["Ben Two", 2, 2600],
      ["Cal Three", 3, 900],
    ]);
  });

  it("keeps only events whose points still count", () => {
    expect(ds.tournaments.map((t) => [t.name, t.end, t.drops])).toEqual([
      ["Paris Masters", "2025-11-02", "2026-11-02"],
      ["Wimbledon", "2026-07-12", "2027-07-12"],
    ]);
  });

  it("scores results per player", () => {
    expect(ds.results.filter((r) => r.playerId === "1").map((r) => [r.tournamentId, r.finish, r.points])).toEqual([
      ["2025-352", "F", 650],
      ["2026-540", "SF", 800],
    ]);
  });

  it("projects the defence calendar and floor", () => {
    const p = computeProjection(ds, "1")!;
    expect(p.entries.map((e) => [e.tournament.name, e.points])).toEqual([
      ["Paris Masters", 650],
      ["Wimbledon", 800],
    ]);
    expect(p.trackedPoints).toBe(1450);
    expect(p.otherPoints).toBe(2050);
    expect(p.floor[0]).toEqual({ date: "2026-10-05", floor: 3500, rank: 1 });
    const afterParis = p.floor.find((f) => f.date >= "2026-11-02")!;
    expect(afterParis.floor).toBe(2850);
    // Ben drops Paris (1000) the same day: 2600 -> 1600.
    expect(afterParis.rank).toBe(1);
  });
});

describe("estimating the ranking from match rows", () => {
  // TennisMyLife style: tourney_date is the day each match was played.
  const rows = [
    H,
    // Shanghai 2025 (Wed 1 Oct start): Ana wins, Ben loses the final.
    "2025-5014,Shanghai,Hard,96,M,20251012,1,A,Ana One,ESP,R,25.5,1,9000,B,Ben Two,ITA,L,24.1,2,8000,6-4 6-4,F",
    // Basel 2025: Ben wins.
    "2025-328,Basel,Hard,32,500,20251026,1,B,Ben Two,ITA,L,24.2,2,8000,A,Ana One,ESP,R,25.6,1,10000,6-3 6-3,F",
    // Shanghai 2026 is under way: Ana won her opening match, Ben lost his.
    "2026-5014,Shanghai,Hard,96,M,20261002,1,A,Ana One,ESP,R,26.5,1,9500,C,Cal Three,FRA,R,21,40,1200,6-1 6-1,R64",
    "2026-5014,Shanghai,Hard,96,M,20261003,2,C,Cal Three,FRA,R,21,40,1200,B,Ben Two,ITA,L,25.1,2,8800,7-6 6-4,R32",
  ].join("\n");
  const ds = buildDataset({ matchesCsvs: [rows], source: "tennismylife", asOf: "2026-10-09", generatedAt: "x" });

  it("dates events by their ATP week", () => {
    const shanghai = ds.tournaments.find((t) => t.id === "2026-5014")!;
    expect(shanghai.start).toBe("2026-09-28");
  });

  it("drops last year's points once this year's edition starts", () => {
    expect(ds.tournaments.map((t) => t.id)).toEqual(["2025-328", "2026-5014"]);
  });

  it("starts from official points at the latest event and applies changes since", () => {
    // Ana: 9500 at Shanghai 2026, minus 1000 from Shanghai 2025, plus 30 secured by winning her R64 match.
    const ana = ds.players.find((p) => p.id === "A")!;
    expect(ana.points).toBe(9500 - 1000 + 30);
    // Ben: 8800, minus 650 from Shanghai 2025, plus 50 for losing in the R32.
    const ben = ds.players.find((p) => p.id === "B")!;
    expect(ben.points).toBe(8800 - 650 + 50);
    expect(ds.players.map((p) => p.id)).toEqual(["A", "B", "C"]);
    expect(ana.dob.slice(0, 4)).toBe("2000");
  });
});

describe("with an official list keyed by name", () => {
  const rows = [
    H,
    "2025-5014,Shanghai,Hard,96,M,20251012,1,A,Ana One,ESP,R,25.5,1,9000,B,Bén Two-Tone,ITA,L,24.1,2,8000,6-4 6-4,F",
    // This year's Shanghai is still running on the list's date, so neither edition changes yet.
    "2026-5014,Shanghai,Hard,96,M,20261002,1,A,Ana One,ESP,R,26.5,1,9500,C,Cal Three,FRA,R,21,40,1200,6-1 6-1,R64",
  ].join("\n");
  const ds = buildDataset({
    matchesCsvs: [rows],
    ranking: {
      date: "2026-10-05",
      entries: [
        { rank: 2, points: 8800, name: "Two Tone Ben" },
        { rank: 1, points: 9500, name: "Ana One" },
        { rank: 3, points: 1000, name: "Zed Unknown" },
      ],
    },
    source: "tennismylife",
    generatedAt: "x",
  });

  it("uses the official points and matches names to players", () => {
    expect(ds.meta.rankings).toBe("official");
    expect(ds.players.map((p) => [p.rank, p.id, p.points, p.country])).toEqual([
      [1, "A", 9500, "ESP"],
      [2, "B", 8800, "ITA"],
      [3, "x-unknown-zed", 1000, ""],
    ]);
  });

  it("keeps last year's points until this year's edition ends", () => {
    expect(ds.tournaments.map((t) => [t.id, t.drops])).toEqual([["2025-5014", "2026-10-12"]]);
    expect(ds.results.filter((r) => r.playerId === "A").map((r) => r.points)).toEqual([1000]);
  });
});

describe("tournament draws", () => {
  const rows = [
    H,
    "2025-339,Brisbane,Hard,32,A,20250105,1,A,Ana One,ESP,R,25,1,9000,B,Ben Two,ITA,L,24,2,8000,6-4 6-4,F",
    "2025-339,Brisbane,Hard,32,A,20250104,2,A,Ana One,ESP,R,25,1,9000,C,Cal Three,FRA,R,21,40,1200,6-1 6-1,SF",
  ].join("\n");
  const ds = buildDataset({ matchesCsvs: [rows], source: "tennismylife", asOf: "2025-03-01", generatedAt: "x" });

  it("keeps every match and entrant with the points each earned", () => {
    const draw = ds.draws.find((d) => d.tournamentId === "2025-339")!;
    expect(draw.matches.map((m) => [m.round, m.winnerId, m.loserId])).toEqual([
      ["F", "A", "B"],
      ["SF", "A", "C"],
    ]);
    expect(draw.entrants.map((e) => [e.id, e.country, e.finish, e.points])).toEqual([
      ["A", "ESP", "W", 250],
      ["B", "ITA", "F", 165],
      ["C", "FRA", "SF", 100],
    ]);
  });
});

describe("matching a named list without reusing a player", () => {
  const rows = [
    H,
    "2025-5014,Shanghai,Hard,96,M,20251012,1,MM,Daniil Medvedev,RUS,R,29,5,4000,CH,Jan Choinski,GBR,R,29,91,700,6-4 6-4,R64",
    "2025-5014,Shanghai,Hard,96,M,20251012,2,AF,Alex de Minaur,AUS,R,26,8,3000,MD,Daniel Merida,ESP,R,21,44,900,6-4 6-4,R32",
  ].join("\n");
  const ds = buildDataset({
    matchesCsvs: [rows],
    ranking: {
      date: "2026-10-05",
      entries: [
        { rank: 5, points: 4010, name: "Medvedev Daniil" },
        // Another Medvedev: shares all name parts but one, yet the id is taken.
        { rank: 178, points: 324, name: "Medvedev Andrey", displayName: "Andrey Medvedev", country: "RUS" },
        { rank: 8, points: 3000, name: "De Minaur Alexander" },
        { rank: 44, points: 900, name: "Merida Aguilar Daniel", displayName: "Daniel Merida Aguilar", country: "ESP" },
      ],
    },
    previousRanking: {
      date: "2026-09-28",
      entries: [
        { rank: 4, points: 4200, name: "Medvedev Daniil" },
        { rank: 10, points: 2900, name: "De Minaur Alexander" },
        { rank: 44, points: 900, name: "Merida Aguilar Daniel" },
      ],
    },
    source: "tennismylife",
    generatedAt: "x",
  });

  it("never gives two ranked players the same id", () => {
    expect(ds.players.map((p) => [p.rank, p.id, p.name, p.country])).toEqual([
      [5, "MM", "Daniil Medvedev", "RUS"],
      [8, "AF", "Alex de Minaur", "AUS"],
      // Unmatched, but shown "First Last" with the source's country.
      [44, "x-aguilar-daniel-merida", "Daniel Merida Aguilar", "ESP"],
      [178, "x-andrey-medvedev", "Andrey Medvedev", "RUS"],
    ]);
  });

  it("records last week's rank, null for a player who wasn't on that list", () => {
    expect(ds.players.map((p) => [p.rank, p.prevRank])).toEqual([
      [5, 4],
      [8, 10],
      [44, 44],
      [178, null],
    ]);
  });
});

describe("event dates", () => {
  const rows = [
    H,
    // The source filed one Munich match (week of 13 Apr) under Rome's id.
    "2026-416,Munich,Clay,32,A,20260415,1,A,Ana One,ESP,R,25,1,9000,B,Ben Two,ITA,L,24,2,8000,6-4 6-4,R32",
    "2026-416,Rome Masters,Clay,96,M,20260506,2,A,Ana One,ESP,R,25,1,9000,C,Cal Three,FRA,R,21,40,1200,6-1 6-1,R64",
    "2026-416,Rome Masters,Clay,96,M,20260517,3,A,Ana One,ESP,R,25,1,9000,B,Ben Two,ITA,L,24,2,8000,6-4 6-4,F",
    // Beijing 2025, and 2026 played after the list's date.
    "2025-747,Beijing,Hard,32,500,20251001,1,B,Ben Two,ITA,L,24,2,8000,C,Cal Three,FRA,R,21,40,1200,6-4 6-4,F",
    "2026-747,Beijing,Hard,32,500,20260930,2,C,Cal Three,FRA,R,21,40,1200,A,Ana One,ESP,R,25,1,9000,6-4 6-4,R32",
    "2026-747,Beijing,Hard,32,500,20261006,1,C,Cal Three,FRA,R,21,40,1200,B,Ben Two,ITA,L,24,2,8000,6-4 6-4,F",
  ].join("\n");
  const ds = buildDataset({
    matchesCsvs: [rows],
    ranking: { date: "2026-10-05", entries: [{ rank: 1, points: 9000, name: "Ana One" }, { rank: 2, points: 8000, name: "Ben Two" }] },
    source: "tennismylife",
    generatedAt: "x",
  });

  it("leaves out rows dated well before the rest of the event", () => {
    const rome = ds.tournaments.find((t) => t.id === "2026-416")!;
    expect([rome.name, rome.start, rome.end]).toEqual(["Rome Masters", "2026-05-04", "2026-05-17"]);
  });

  it("keeps the next edition's real dates", () => {
    const beijing = ds.tournaments.find((t) => t.id === "2025-747")!;
    expect(beijing.next).toEqual({ start: "2026-09-28", end: "2026-10-06" });
    expect(beijing.drops).toBe("2026-10-12");
  });
});

describe("notInTotal", () => {
  const ev = (id: string, level: Level) => ({ id, level }) as Tournament;
  const r = (id: string, level: Level, points: number) => ({ points, event: ev(id, level) });

  it("leaves out the smallest set of optional results that covers the excess", () => {
    const results = [r("2026-560", "G", 2000), r("2026-747", "500", 500), r("2026-321", "250", 250), r("2026-322", "250", 100)];
    // 2850 tracked against 2600 official: 250 too many, best covered by the 250 alone.
    expect([...notInTotal(results, 2600)].map((x) => x.event.id)).toEqual(["2026-321"]);
  });

  it("never drops a mandatory result, but may drop Monte Carlo", () => {
    const results = [r("2026-560", "G", 2000), r("2026-410", "M", 400), r("2026-404", "M", 1000)];
    expect([...notInTotal(results, 3000)].map((x) => x.event.id)).toEqual(["2026-410"]);
  });

  it("returns nothing when the results fit the total", () => {
    expect(notInTotal([r("2026-747", "500", 500)], 600).size).toBe(0);
  });
});
