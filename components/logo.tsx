/** Brand mark: an optic-yellow ball whose seam doubles as a rising points line. */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden className="shrink-0">
      <defs>
        <radialGradient id="ball" cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#f4ff8a" />
          <stop offset="0.55" stopColor="#d7f03a" />
          <stop offset="1" stopColor="#9fbf12" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="18" fill="url(#ball)" />
      <path d="M5.5 11.5C12 14 15 19.5 14.5 27.5" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity="0.9" />
      <path d="M34.5 28.5C28 26 25 20.5 25.5 12.5" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity="0.9" />
      <path d="M9 30l7-6 5 3 9-10" fill="none" stroke="#0f2a44" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M26 17h4v4" fill="none" stroke="#0f2a44" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-3">
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#d7f03a]">Tennis</span>
        <span className="display text-2xl font-bold tracking-tight">
          ATP<span className="text-[#d7f03a]">·</span>Points
        </span>
      </span>
    </span>
  );
}
