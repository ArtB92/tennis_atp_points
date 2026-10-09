"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function PlayerTabs({ id }: { id: string }) {
  const path = usePathname();
  const tabs = [
    { href: `/players/${id}`, label: "Last 52 weeks" },
    { href: `/players/${id}/projection`, label: "Points to defend" },
  ];
  return (
    <nav aria-label="Player views" className="flex gap-6">
      {tabs.map((t) => {
        const current = path === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={current ? "page" : undefined}
            className={`border-b-2 pb-3 text-sm font-medium ${
              current ? "border-on-court text-on-court" : "border-transparent text-on-court-2 hover:text-on-court"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
