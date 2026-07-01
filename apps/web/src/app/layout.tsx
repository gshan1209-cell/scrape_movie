import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scrape Movie",
  description: "Movie scraping dashboard built with Next.js.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
