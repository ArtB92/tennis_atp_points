import type { OfficialRanking } from "./build";

/**
 * Read one page of TennisExplorer's ATP ranking (tennisexplorer.com/ranking/atp-men/),
 * which republishes the official list each Monday. Names come as "Last First".
 */
export function parseTennisExplorerPage(html: string): OfficialRanking {
  const date = html.match(/<option value="(\d{4}-\d{2}-\d{2})"[^>]*selected/)?.[1];
  if (!date) throw new Error("TennisExplorer page has no ranking date");
  const entries: OfficialRanking["entries"] = [];
  const row = /class="rank[^"]*">\s*(\d+)\.[\s\S]*?\/player\/[^"]+\/">([^<]+)<[\s\S]*?class="long-point">\s*(\d+)/g;
  for (const m of html.matchAll(row)) {
    entries.push({ rank: Number(m[1]), name: decode(m[2]).trim(), points: Number(m[3]) });
  }
  return { date, entries };
}

function decode(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&quot;/g, '"');
}
