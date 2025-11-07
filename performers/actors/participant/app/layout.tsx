import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientClerkProvider from "./components/ClientClerkProvider";

const inter = Inter({ subsets: ["latin"] });

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Spirit is Physics",
  description: "Extended evaluation of human illusion by Jungian psychology and computational models.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <ClientClerkProvider>
          {children}
        </ClientClerkProvider>
      </body>
    </html>
  );
} 