import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { baseLocale, getLocale } from "../paraglide/runtime";
import * as m from "../paraglide/messages";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: m.app_title(),
  description: m.app_description(),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // サーバーサイドで言語を取得（デフォルトはbaseLocale）
  const locale = typeof window === "undefined" ? baseLocale : getLocale();
  
  return (
    <html lang={locale}>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
} 