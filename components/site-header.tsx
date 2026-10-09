import { getDataset } from "@/lib/data";
import { formatDate } from "@/lib/dates";
import { SiteNav } from "./site-nav";

/** Court lines drawn behind the header: baseline, service line and centre mark of a half court. */
function CourtLines() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
      viewBox="0 0 1200 400"
    >
      <g fill="none" stroke="var(--court-line)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" opacity="0.25">
        <rect x="60" y="-40" width="1080" height="560" />
        <line x1="195" y1="-40" x2="195" y2="520" />
        <line x1="1005" y1="-40" x2="1005" y2="520" />
        <line x1="195" y1="250" x2="1005" y2="250" />
        <line x1="600" y1="-40" x2="600" y2="250" />
      </g>
    </svg>
  );
}

export function SiteHeader({ children }: { children?: React.ReactNode }) {
  const { meta } = getDataset();
  return (
    <header className="relative overflow-hidden bg-court text-on-court">
      <CourtLines />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="pt-4">
          <SiteNav date={formatDate(meta.rankingDate)} />
        </div>
        {children}
      </div>
    </header>
  );
}

export function DataNotice() {
  const { meta } = getDataset();
  if (meta.source === "demo") {
    return (
      <div role="note" className="border-b border-rule bg-sunken">
        <p className="mx-auto max-w-6xl px-4 py-2 text-sm text-ink-2 sm:px-6">
          You are looking at demo data with fictional players. Run <code className="font-semibold">npm run sync-data</code>{" "}
          to load the real ATP rankings and results.
        </p>
      </div>
    );
  }
  return null;
}

export function SiteFooter() {
  const { meta } = getDataset();
  return (
    <footer className="mt-16 border-t border-rule">
      <div className="mx-auto max-w-6xl space-y-2 px-4 py-8 text-sm text-ink-3 sm:px-6">
        <p>
          Rankings for {formatDate(meta.rankingDate)}. Latest match in the data: {formatDate(meta.latestMatchDate)}.
          {meta.source === "tennismylife" && (
            <>
              {" "}
              Match data from the{" "}
              <a className="underline hover:text-ink" href="https://stats.tennismylife.org/tennis-match-database">
                TennisMyLife database
              </a>
              .
            </>
          )}
        </p>
        {meta.rankings === "official" && meta.source === "tennismylife" && (
          <p>Ranks and point totals are copied from the official ATP list for that week.</p>
        )}
        {meta.rankings === "estimated" && (
          <p>
            Rankings are a live estimate: each player&rsquo;s official points at his latest event, plus what he has
            earned since and minus what has dropped since. Challenger points earned since then aren&rsquo;t included.
          </p>
        )}
        <p>
          Points per event are worked out from the round reached and the ATP points table. Grand Slams, Masters 1000,
          ATP 500, ATP 250 and the ATP Finals are tracked; the rest of each total (mostly Challengers) is shown as
          &ldquo;other&rdquo;. Drop dates are estimates: the Monday after next year&rsquo;s edition ends.
        </p>
      </div>
    </footer>
  );
}
