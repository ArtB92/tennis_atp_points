import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { DataNotice, SiteFooter } from "@/components/site-header";
import "flag-icons/css/flag-icons.min.css";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Tennis ATP Points", template: "%s · Tennis ATP Points" },
  description: "ATP rankings, each player's last 52 weeks, and the points he has to defend in the year ahead.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <DataNotice />
        {children}
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  );
}
