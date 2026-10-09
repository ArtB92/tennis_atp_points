import type { Metadata } from "next";
import { DataNotice, SiteFooter } from "@/components/site-header";
import "flag-icons/css/flag-icons.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ATP points tracker", template: "%s · ATP points tracker" },
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
