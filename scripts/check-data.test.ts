import { describe, expect, it } from "vitest";
import type { Dataset } from "../lib/types";
import { checkDataset } from "./check-data";

const player = (id: string, rank: number, points: number) => ({ id, rank, points, name: `P${rank}`, country: "", hand: "", dob: "" });

describe("checkDataset", () => {
  it("flags reused ids, overlong events and totals the results exceed", () => {
    const ds = {
      meta: { rankings: "official" },
      players: [player("A", 1, 1000), player("B", 2, 500), player("A", 3, 400)],
      tournaments: [{ id: "2026-416", name: "Rome", level: "M", surface: "Clay", drawSize: 96, start: "2026-04-13", end: "2026-05-17", drops: "x" }],
      results: [{ playerId: "B", tournamentId: "2026-416", finish: "W", points: 1000, matches: [] }],
      draws: [],
    } as unknown as Dataset;
    const { errors, warnings } = checkDataset(ds);
    expect(errors).toEqual(["#3 P3 has the same id (A) as #1", "Rome 2026 runs 35 days (2026-04-13 to 2026-05-17)"]);
    expect(warnings).toEqual(["#2 P2: tracked 1000 > official 500"]);
  });
});
