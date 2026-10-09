import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader>
        <div className="pb-12 pt-6 sm:pt-10">
          <h1 className="display text-5xl font-bold">Player not found</h1>
          <p className="mt-3 text-on-court-2">Only players in the current top 200 have a page.</p>
        </div>
      </SiteHeader>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Link href="/" className="font-medium text-accent hover:underline">
          Back to the rankings
        </Link>
      </main>
    </>
  );
}
