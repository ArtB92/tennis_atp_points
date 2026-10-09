import type { Level } from "@/lib/types";
import { LEVEL_COLOR } from "./level";

const FILLER = new Set(["open", "masters", "championships", "tennis", "atp", "cup", "the", "de", "club"]);

/** Two-letter monogram for an event: "Roland Garros" → RG, "Indian Wells Masters" → IW, "Basel" → BA. */
export function monogram(name: string): string {
  const words = name
    .replace(/['’]/g, "")
    .split(/[\s-]+/)
    .filter((w) => w && !FILLER.has(w.toLowerCase()));
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  const w = words[0] ?? name;
  return w.slice(0, 2).toUpperCase();
}

/** Logo stand-in: a monogram tile in the event's category colour. */
export function TournamentBadge({ name, level, size = 44 }: { name: string; level: Level; size?: number }) {
  return (
    <span
      aria-hidden
      className="display inline-grid shrink-0 place-items-center rounded-xl font-bold tracking-wide text-white shadow-sm"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `linear-gradient(145deg, ${LEVEL_COLOR[level]}, color-mix(in oklab, ${LEVEL_COLOR[level]} 70%, black))`,
      }}
    >
      {monogram(name)}
    </span>
  );
}
