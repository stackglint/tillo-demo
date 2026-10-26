import type { Metadata, Viewport } from "next";
import "@fontsource-variable/schibsted-grotesk";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tillo · Stock & billing demo by StackGlint",
  description: "A demo point-of-sale and inventory app with stock forecasts, reorder lists, receipts and insights. Built by StackGlint.",
  robots: { index: false },
};
export const viewport: Viewport = { themeColor: "#F4F2EE", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
