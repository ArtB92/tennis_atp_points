import { describe, expect, it } from "vitest";
import { buildDataset } from "./build";
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
