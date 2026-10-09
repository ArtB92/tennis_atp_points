import { describe, expect, it } from "vitest";
import { buildDataset, dropDate } from "./build";
import { computeProjection } from "./projection";

const rankingsCsv = `ranking_date,rank,player,points
20260928,1,1,4000
20260928,2,2,3000
20261005,1,1,3500
20261005,2,2,2600
20261005,3,3,900`;

const playersCsv = `player_id,name_first,name_last,hand,dob,ioc,height,wikidata_id
1,Ana,One,R,20000101,ESP,,
2,Ben,Two,L,19990505,ITA,,
3,Cal,Three,R,20020202,FRA,,`;

const H = "tourney_id,tourney_name,surface,draw_size,tourney_level,tourney_date,match_num,winner_id,winner_name,loser_id,loser_name,score,round,winner_rank,loser_rank";
const matchesCsv = [
  H,
  // US Open 2025: drops after the 2026 edition, already gone at 2026-10-05.
  "2025-560,US Open,Hard,128,G,20250825,1,1,Ana One,2,Ben Two,6-4 6-4 6-4,F,1,2",
  // Paris 2025: still counts, drops 2026-11-02.
  "2025-352,Paris Masters,Hard,56,M,20251027,1,2,Ben Two,1,Ana One,7-5 6-3,F,2,1",
  // Wimbledon 2026: counts until mid-July 2027.
  "2026-540,Wimbledon,Grass,128,G,20260629,1,1,Ana One,3,Cal Three,6-1 6-1 6-1,QF,1,3",
  "2026-540,Wimbledon,Grass,128,G,20260629,2,2,Ben Two,1,Ana One,6-4 3-6 6-4 6-4,SF,2,1",
  // A non-points event.
  "2026-D01,Davis Cup Finals,Hard,8,D,20260914,1,1,Ana One,2,Ben Two,6-3 6-3,RR,1,2",
].join("\n");

const ds = buildDataset({ rankingsCsv, playersCsv, matchesCsvs: [matchesCsv], source: "demo", generatedAt: "x" });

describe("buildDataset", () => {
  it("uses the latest ranking list", () => {
    expect(ds.meta.rankingDate).toBe("2026-10-05");
    expect(ds.players.map((p) => [p.name, p.rank, p.points])).toEqual([
      ["Ana One", 1, 3500],
      ["Ben Two", 2, 2600],
      ["Cal Three", 3, 900],
    ]);
  });

  it("keeps only events whose points still count", () => {
    expect(ds.tournaments.map((t) => t.name)).toEqual(["Paris Masters", "Wimbledon"]);
  });

  it("scores results per player", () => {
    const ana = ds.results.filter((r) => r.playerId === "1").map((r) => [r.tournamentId, r.finish, r.points]);
    expect(ana).toEqual([
      ["2025-352", "F", 650],
      ["2026-540", "SF", 800],
    ]);
  });
});

describe("computeProjection", () => {
  const p = computeProjection(ds, "1")!;

  it("lists events ordered by when their points drop", () => {
    expect(p.entries.map((e) => [e.tournament.name, e.points, e.drops])).toEqual([
      ["Paris Masters", 650, "2026-11-02"],
      ["Wimbledon", 800, "2027-07-12"],
    ]);
    expect(dropDate(ds.tournaments[0])).toBe("2026-11-02");
  });

  it("splits the total into tracked and other points", () => {
    expect(p.trackedPoints).toBe(1450);
    expect(p.otherPoints).toBe(2050);
  });

  it("projects the floor and its rank", () => {
    expect(p.floor[0]).toEqual({ date: "2026-10-05", floor: 3500, rank: 1 });
    const afterParis = p.floor.find((f) => f.date >= "2026-11-02")!;
    expect(afterParis.floor).toBe(2850);
    // Ben drops Paris (1000) at the same time: 2600 -> 1600, Ana stays first.
    expect(afterParis.rank).toBe(1);
  });
});
