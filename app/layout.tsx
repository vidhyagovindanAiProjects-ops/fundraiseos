import type { Metadata } from "next";
import "./globals.css";
import "./graph.css";
import "./vars.css";
import "./demo.css";
import "./story.css";
import "./story-fix.css";

export const metadata: Metadata = {
  title: "FundraiseOS — Your fundraising memory",
  description: "An AI-native fundraising memory system for emerging fund managers.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
