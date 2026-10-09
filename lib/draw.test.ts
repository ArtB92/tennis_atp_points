import { describe, expect, it } from "vitest";
import { bracket } from "./draw";
import type { Draw } from "./types";

const m = (round: "QF" | "SF" | "F", winnerId: string, loserId: string) => ({ round, winnerId, loserId, score: "6-4 6-4" });

describe("bracket", () => {
  it("orders each round by the matches it feeds, leaving gaps for byes", () => {
    const draw: Draw = {
      tournamentId: "t",
      entrants: [],
      matches: [m("F", "A", "C"), m("SF", "C", "D"), m("SF", "A", "B"), m("QF", "D", "H"), m("QF", "A", "E"), m("QF", "B", "F")],
    };
    const rounds = bracket(draw);
    expect(rounds.map((r) => r.round)).toEqual(["QF", "SF", "F"]);
    expect(rounds[1].slots.map((s) => s && `${s.winnerId}-${s.loserId}`)).toEqual(["A-B", "C-D"]);
    // C had a bye into the semis.
    expect(rounds[0].slots.map((s) => s && `${s.winnerId}-${s.loserId}`)).toEqual(["A-E", "B-F", null, "D-H"]);
  });
});
