"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Rankings", current: (p: string) => p === "/" },
  { href: "/projection", label: "Projection", current: (p: string) => p === "/projection" || p.endsWith("/projection") },
  { href: "/calendar", label: "Calendar", current: (p: string) => p.startsWith("/calendar") },
];

export function SiteNav({ date }: { date: string }) {
  const path = usePathname();
  return (
    <nav
      aria-label="Main"
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/[0.07] p-2 shadow-[0_8px_30px_rgb(0_0_0/0.25)] backdrop-blur-md"
    >
      <Link href="/" className="flex items-center gap-2.5 rounded-xl px-3 py-2 hover:bg-white/10">
        <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="9.5" />
          <path d="M4.5 6.5c3 2 4.5 5 4.5 8.5M19.5 17.5c-3-2-4.5-5-4.5-8.5" />
        </svg>
        <span className="display text-2xl font-bold tracking-tight">Homepage</span>
      </Link>
      <div className="flex items-center gap-1.5">
        {LINKS.map((l) => {
          const current = l.current(path);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={current ? "page" : undefined}
              className={`display rounded-xl px-4 py-2 text-lg font-semibold tracking-wide uppercase transition-colors sm:px-5 sm:text-xl ${
                current ? "bg-on-court text-court shadow-sm" : "text-on-court-2 hover:bg-white/10 hover:text-on-court"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
        <span className="num hidden px-3 text-sm text-on-court-2 md:inline">{date}</span>
      </div>
    </nav>
  );
}
