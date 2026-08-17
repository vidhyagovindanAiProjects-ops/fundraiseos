import type { Metadata } from "next";
import "./globals.css";
import "./graph.css";
import "./vars.css";
import "./demo.css";
import "./story.css";
import "./story-fix.css";

export const metadata: Metadata = {
  title: "LP Brain | AI Fundraising Chief of Staff",
  description: "AI Fundraising Chief of Staff and Relationship Intelligence Platform for Emerging Venture Fund Managers.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
