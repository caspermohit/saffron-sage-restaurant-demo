import type { Metadata } from "next";
import "./globals.css";
import { DemoBanner } from "@/components/demo-banner";
import { DEMO_MODE } from "@/lib/demo-config";
export const metadata: Metadata = {
  title: "Saffron & Sage · Restaurant workspace",
  description:
    "A little less waiting. A lot more hospitality. QR ordering, kitchen and floor management.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={DEMO_MODE ? "demo-mode" : undefined}>
        <DemoBanner />
        {children}
      </body>
    </html>
  );
}
