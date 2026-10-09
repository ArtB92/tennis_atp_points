import { describe, expect, it } from "vitest";
import { parseTennisExplorerPage } from "./tennisexplorer";

const html = `
<select name="date"><option value="2026-09-28">28. 09. 2026</option><option value="2026-10-05" selected="selected">05. 10. 2026</option></select>
<table class="result"><tbody>
<tr><td class="rank first">1.</td><td class="t-name"><a href="/player/sinner-8b8e8/">Sinner Jannik</a></td><td class="tl"><a href="/ranking/atp-men/?country=ITA">Italy</a></td><td class="long-point">11000</td></tr>
<tr><td class="rank first">2.</td><td class="t-name"><a href="/player/auger-aliassime/">Auger Aliassime F&#233;lix</a></td><td class="tl">Canada</td><td class="long-point">3890</td></tr>
</tbody></table>`;

describe("parseTennisExplorerPage", () => {
  it("reads the list date, ranks, names and points", () => {
    expect(parseTennisExplorerPage(html)).toEqual({
      date: "2026-10-05",
      entries: [
        { rank: 1, name: "Sinner Jannik", points: 11000 },
        { rank: 2, name: "Auger Aliassime Félix", points: 3890 },
      ],
    });
  });
});
