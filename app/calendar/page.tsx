import type { Metadata } from "next";
import { CalendarList, type CalendarRow } from "@/components/calendar-list";
import { SiteHeader } from "@/components/site-header";
import { calendar, getDataset } from "@/lib/data";

export const metadata: Metadata = { title: "Calendar" };

export default function CalendarPage() {
  const asOf = getDataset().meta.rankingDate;
  const rows: CalendarRow[] = calendar().map(({ tournament: t, nextStart, nextEnd, champion, runnerUp }) => ({
    id: t.id,
    name: t.name,
    level: t.level,
    surface: t.surface,
    drawSize: t.drawSize,
    nextStart,
    nextEnd,
    status: nextEnd < asOf ? "played" : nextStart <= asOf ? "now" : "upcoming",
    champion: champion && { name: champion.name, country: champion.country },
    runnerUp: runnerUp && { name: runnerUp.name, country: runnerUp.country },
  }));

  return (
    <>
      <SiteHeader>
        <div className="pb-12 pt-6 sm:pt-10">
          <h1 className="display text-5xl font-bold sm:text-7xl">Calendar</h1>
          <p className="mt-3 max-w-xl text-on-court-2">
            The tour-level events of the next 52 weeks, dated from last year&rsquo;s edition. Open one to see last
            year&rsquo;s draw and the points each player took home.
          </p>
        </div>
      </SiteHeader>
      <main className="mx-auto mt-10 max-w-6xl px-4 sm:px-6">
        <CalendarList rows={rows} />
      </main>
    </>
  );
}
