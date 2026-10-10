import { describe, expect, it } from "vitest";
import { firstLast, parseTennisExplorerPage } from "./tennisexplorer";

const html = `
<select name="date"><option value="2026-09-28">28. 09. 2026</option><option value="2026-10-05" selected="selected">05. 10. 2026</option></select>
<table class="result"><tbody>
<tr class="one"><td class="rank first">1.</td> <td class="prevrank"><div>-</div></td> <td class="t-name"><a href="/player/sinner-8b8e8/">Sinner Jannik</a></td> <td class="tl"><a href="/ranking/atp-men/?country=italy"> <span class="fl fl-it">&nbsp;</span>Italy</a></td> <td class="long-point">11000</td> </tr>
<tr class="two"><td class="rank first">2.</td> <td class="prevrank"><div>-</div></td> <td class="t-name"><a href="/player/auger-aliassime/">Auger Aliassime F&#233;lix</a></td> <td class="tl"><a href="/ranking/atp-men/?country=canada"> <span class="fl fl-ca">&nbsp;</span>Canada</a></td> <td class="long-point">3890</td> </tr>
</tbody></table>`;

describe("parseTennisExplorerPage", () => {
  it("reads the list date, the weeks on offer, ranks, names, countries and points", () => {
    expect(parseTennisExplorerPage(html)).toEqual({
      date: "2026-10-05",
      dates: ["2026-09-28", "2026-10-05"],
      entries: [
        { rank: 1, name: "Sinner Jannik", displayName: "Jannik Sinner", country: "ITA", points: 11000 },
        { rank: 2, name: "Auger Aliassime Félix", displayName: "Félix Auger Aliassime", country: "CAN", points: 3890 },
      ],
    });
  });
});

describe("firstLast", () => {
  it("moves the surname the slug spells out to the end", () => {
    expect(firstLast("Merida Aguilar Daniel", "merida-aguilar")).toBe("Daniel Merida Aguilar");
    expect(firstLast("Barrios Vera Marcelo Tomas", "barrios-vera")).toBe("Marcelo Tomas Barrios Vera");
    expect(firstLast("Montes-De La Torre Inaki", "montes-de-la-torre")).toBe("Inaki Montes-De La Torre");
  });

  it("falls back to the first word when the slug is an id", () => {
    expect(firstLast("Kwon Soon Woo", "kwon-2a1b3")).toBe("Soon Woo Kwon");
  });
});
