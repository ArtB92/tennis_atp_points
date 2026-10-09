import { describe, expect, it } from "vitest";
import { classifyLevel, finishFrom, pointsForEvent } from "./points";

describe("classifyLevel", () => {
  it("separates 500s from 250s by name and season", () => {
    expect(classifyLevel("A", "Rotterdam", 2026)).toBe("500");
    expect(classifyLevel("A", "Doha", 2024)).toBe("250");
    expect(classifyLevel("A", "Doha", 2025)).toBe("500");
    expect(classifyLevel("A", "Marrakech", 2026)).toBe("250");
  });

  it("drops events that award no ranking points", () => {
    expect(classifyLevel("D", "Davis Cup Finals", 2025)).toBeNull();
    expect(classifyLevel("F", "NextGen Finals", 2025)).toBeNull();
    expect(classifyLevel("A", "United Cup", 2026)).toBeNull();
  });
});

describe("pointsForEvent", () => {
  it("pays the champion", () => {
    const run = ["R128", "R64", "R32", "R16", "QF", "SF", "F"].map((round) => ({ round: round as never, won: true }));
    expect(pointsForEvent("G", 128, run)).toEqual({ finish: "W", points: 2000 });
  });

  it("pays the round a player lost in", () => {
    const m = [
      { round: "R32" as const, won: true },
      { round: "R16" as const, won: true },
      { round: "QF" as const, won: false },
    ];
    expect(pointsForEvent("500", 32, m)).toEqual({ finish: "QF", points: 100 });
  });

  it("gives a seed who had a bye first-round points when he loses his opener", () => {
    expect(pointsForEvent("M", 96, [{ round: "R64", won: false }]).points).toBe(10);
    expect(pointsForEvent("250", 28, [{ round: "R16", won: false }]).points).toBe(0);
  });

  it("pays 30 for a Masters R64 loss only in 96-player draws", () => {
    const m = [
      { round: "R128" as const, won: true },
      { round: "R64" as const, won: false },
    ];
    expect(pointsForEvent("M", 96, m).points).toBe(30);
  });

  it("scores the ATP Finals per win", () => {
    const m = [
      { round: "RR" as const, won: true },
      { round: "RR" as const, won: true },
      { round: "RR" as const, won: false },
      { round: "SF" as const, won: true },
      { round: "F" as const, won: true },
    ];
    expect(pointsForEvent("F", 8, m)).toEqual({ finish: "W", points: 1300 });
  });
});

describe("finishFrom", () => {
  it("credits the deepest round for a player still alive", () => {
    expect(finishFrom([{ round: "R32", won: true }, { round: "R16", won: true }])).toBe("R16");
  });
});
