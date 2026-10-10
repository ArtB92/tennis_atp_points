import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getDataset, rankingRows } from "@/lib/data";
import { formatDate } from "@/lib/dates";
import type { Level } from "@/lib/types";

export const alt = "Tennis ATP Points: the ATP ranking, points to defend and every draw";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Light-theme level colors from globals.css; the image can't read CSS variables. */
const COLORS: Record<Level | "other", string> = {
  G: "#2a78d6",
  M: "#eb6834",
  "500": "#1baf7a",
  "250": "#eda100",
  F: "#e87ba4",
  other: "#b8c3cd",
};
const BALL = "#d7f03a";
const fmt = new Intl.NumberFormat("en-US");

const font = (pkg: string, file: string) =>
  readFile(path.join(process.cwd(), "node_modules/@fontsource", pkg, "files", file));

const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><defs><radialGradient id="b" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#f4ff8a"/><stop offset=".55" stop-color="#d7f03a"/><stop offset="1" stop-color="#9fbf12"/></radialGradient></defs><circle cx="20" cy="20" r="18" fill="url(#b)"/><path d="M5.5 11.5C12 14 15 19.5 14.5 27.5M34.5 28.5C28 26 25 20.5 25.5 12.5" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><path d="M9 30l7-6 5 3 9-10M26 17h4v4" fill="none" stroke="#0f2a44" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/** Social preview card: brand, tagline and the current top five with where their points came from. */
export default async function Image() {
  const [display, body] = await Promise.all([
    font("barlow-condensed", "barlow-condensed-latin-700-normal.woff"),
    font("barlow", "barlow-latin-500-normal.woff"),
  ]);
  const top = rankingRows().slice(0, 5);
  const max = top[0]?.points || 1;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          padding: "64px 72px",
          background: "linear-gradient(135deg, #0f2a44 0%, #17395b 100%)",
          color: "#fff",
          fontFamily: "Barlow",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 470 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <img src={`data:image/svg+xml,${encodeURIComponent(mark)}`} width={88} height={88} alt="" />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 18, letterSpacing: 7, color: BALL }}>TENNIS</span>
              <span style={{ fontFamily: "Barlow Condensed", fontSize: 56, lineHeight: 1 }}>
                ATP<span style={{ color: BALL }}>·</span>Points
              </span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <span style={{ fontFamily: "Barlow Condensed", fontSize: 60, lineHeight: 1.02 }}>
              The ranking, the points to defend, and every draw.
            </span>
            <span style={{ fontSize: 24, color: "#b9c8d8" }}>
              Official ATP ranking of {formatDate(getDataset().meta.rankingDate)}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 22, marginLeft: 56, flex: 1 }}>
          {top.map((r) => {
            const segments = [
              ...(["G", "M", "500", "250", "F"] as Level[]).map((l) => ({ key: l, value: r.byLevel[l] })),
              { key: "other" as const, value: r.other },
            ].filter((s) => s.value > 0);
            return (
              <div key={r.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "baseline", fontSize: 24 }}>
                  <span style={{ fontFamily: "Barlow Condensed", fontSize: 30, width: 34, color: "#b9c8d8" }}>{r.rank}</span>
                  <span style={{ flex: 1 }}>{r.name}</span>
                  <span style={{ color: "#b9c8d8" }}>{fmt.format(r.points)}</span>
                </div>
                <div style={{ display: "flex", marginLeft: 34, height: 18, borderRadius: 9, background: "rgba(255,255,255,0.08)" }}>
                  <div style={{ display: "flex", width: `${(r.points / max) * 100}%`, borderRadius: 9, overflow: "hidden" }}>
                    {segments.map((s) => (
                      <div key={s.key} style={{ flexGrow: s.value, flexBasis: 0, background: COLORS[s.key] }} />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Barlow Condensed", data: display, weight: 700, style: "normal" },
        { name: "Barlow", data: body, weight: 500, style: "normal" },
      ],
    },
  );
}
