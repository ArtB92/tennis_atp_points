import type { OfficialRanking } from "./build";
import { countryCode } from "./countries";

/**
 * Read one page of TennisExplorer's ATP ranking (tennisexplorer.com/ranking/atp-men/),
 * which republishes the official list each Monday. Names come as "Last First"; the
 * player link's slug holds the surname, which turns them round to "First Last".
 */
export function parseTennisExplorerPage(html: string): OfficialRanking & { dates: string[] } {
  const date = html.match(/<option value="(\d{4}-\d{2}-\d{2})"[^>]*selected/)?.[1];
  if (!date) throw new Error("TennisExplorer page has no ranking date");
  const dates = [...html.matchAll(/<option value="(\d{4}-\d{2}-\d{2})"/g)].map((m) => m[1]);
  const entries: OfficialRanking["entries"] = [];
  const row = /class="rank[^"]*">\s*(\d+)\.[\s\S]*?\/player\/([^"/]+)\/">([^<]+)<\/a>([\s\S]*?)class="long-point">\s*(\d+)/g;
  for (const m of html.matchAll(row)) {
    const name = decode(m[3]).trim();
    entries.push({ rank: Number(m[1]), name, points: Number(m[5]), displayName: firstLast(name, m[2]), country: country(m[4]) });
  }
  return { date, dates, entries };
}

/** "Merida Aguilar Daniel" with slug "merida-aguilar" → "Daniel Merida Aguilar". */
export function firstLast(name: string, slug: string): string {
  const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const words = name.split(/\s+/);
  const slugParts = new Set(fold(slug).split("-"));
  // The surname is the leading run of words the slug spells out.
  let n = 0;
  while (n < words.length - 1 && fold(words[n]).split(/[^a-z]+/).filter(Boolean).every((p) => slugParts.has(p))) n++;
  if (n === 0) n = 1;
  return [...words.slice(n), ...words.slice(0, n)].join(" ");
}

/** The country between the name and the points: the cell naming it, or a ?country=XXX link. */
function country(cells: string): string {
  const code = cells.match(/country=([A-Z]{3})/)?.[1];
  if (code) return code;
  for (const c of cells.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)) {
    const found = countryCode(decode(c[1].replace(/<[^>]+>/g, "")).trim());
    if (found) return found;
  }
  return "";
}

function decode(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&quot;/g, '"');
}
