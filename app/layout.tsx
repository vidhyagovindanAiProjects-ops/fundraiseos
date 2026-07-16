import type { Metadata } from "next";
import "./globals.css";
import "./graph.css";
import "./vars.css";
import "./demo.css";
import "./story.css";
import "./story-fix.css";

export const metadata: Metadata = {
  title: "LP Brain | LP Discovery & Relationship Intelligence",
  description: "AI-native LP discovery and relationship intelligence for emerging venture fund managers.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
