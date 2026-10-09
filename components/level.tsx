import { LEVEL_LABEL } from "@/lib/points";
import type { Level } from "@/lib/types";

export const LEVELS: Level[] = ["G", "M", "500", "250", "F"];

export const LEVEL_COLOR: Record<Level, string> = {
  G: "var(--lvl-g)",
  M: "var(--lvl-m)",
  "500": "var(--lvl-500)",
  "250": "var(--lvl-250)",
  F: "var(--lvl-f)",
};

export const OTHER_COLOR = "var(--lvl-other)";

export function LevelDot({ level, size = 8 }: { level: Level; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, background: LEVEL_COLOR[level] }}
    />
  );
}

export function LevelTag({ level }: { level: Level }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-ink-2">
      <LevelDot level={level} />
      {LEVEL_LABEL[level]}
    </span>
  );
}

export function LevelLegend({ withOther = false }: { withOther?: boolean }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
      {LEVELS.map((l) => (
        <li key={l} className="inline-flex items-center gap-1.5">
          <LevelDot level={l} />
          {LEVEL_LABEL[l]}
        </li>
      ))}
      {withOther && (
        <li className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block size-2 rounded-full" style={{ background: OTHER_COLOR }} />
          Challengers and other
        </li>
      )}
    </ul>
  );
}
