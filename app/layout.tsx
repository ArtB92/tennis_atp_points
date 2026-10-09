import type { Metadata } from "next";
import { DataNotice, SiteFooter } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Baseline: ATP points tracker", template: "%s · Baseline" },
  description: "ATP rankings, each player's last 52 weeks, and the points he has to defend in the year ahead.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <DataNotice />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
