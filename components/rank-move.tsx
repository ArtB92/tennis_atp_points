/** Places gained or lost since last week's list: ▲3, ▼1, "–" for no change, NEW when he wasn't on it. */
export function RankMove({ move, className = "" }: { move?: number | null; className?: string }) {
  if (move === undefined) return null;
  const base = `num inline-flex shrink-0 items-center text-xs font-semibold ${className}`;
  if (move === null) {
    return (
      <span className={`${base} rounded bg-accent/12 px-1 text-[10px] uppercase tracking-wide text-accent`} title="New in the ranking this week">
        New
      </span>
    );
  }
  if (move === 0) {
    return (
      <span className={`${base} text-ink-3`} title="Same rank as last week">
        <span aria-hidden>–</span>
        <span className="sr-only">no change</span>
      </span>
    );
  }
  const up = move > 0;
  return (
    <span className={`${base} ${up ? "text-rise" : "text-drop"}`} title={`${up ? "Up" : "Down"} ${Math.abs(move)} since last week`}>
      <span aria-hidden className="mr-0.5 text-[9px]">
        {up ? "▲" : "▼"}
      </span>
      <span className="sr-only">{up ? "up " : "down "}</span>
      {Math.abs(move)}
    </span>
  );
}
