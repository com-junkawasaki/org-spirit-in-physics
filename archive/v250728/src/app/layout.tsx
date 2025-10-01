import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.ts";

const inter = Inter({ subsets: ["latin"] });

const siteUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Spirit in Physics",
  description: "Jung's Word Association Test Embedding Model for quantifying the human spirit.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
} 