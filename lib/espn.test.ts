import { describe, expect, it } from "vitest";
import { parseEspnRanking } from "./espn";

describe("parseEspnRanking", () => {
  it("reads the ATP list and dates it to its Monday", () => {
    const r = parseEspnRanking({
      rankings: [
        {
          type: "atp",
          update: "2026-10-01T07:00Z",
          ranks: [
            { current: 1, points: 11000.0, athlete: { displayName: "Jannik Sinner" } },
            { current: 2, points: 9720.0, athlete: { displayName: "Alexander Zverev" } },
          ],
        },
      ],
    });
    expect(r).toEqual({
      date: "2026-09-28",
      entries: [
        { rank: 1, points: 11000, name: "Jannik Sinner" },
        { rank: 2, points: 9720, name: "Alexander Zverev" },
      ],
    });
  });

  it("rejects a payload without a list", () => {
    expect(() => parseEspnRanking({ rankings: [] })).toThrow();
  });
});
