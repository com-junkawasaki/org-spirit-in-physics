import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { baseLocale, getLocale } from "../src/paraglide/runtime";
import * as m from "../src/paraglide/messages";
import { ApolloProvider } from "../src/components/providers/ApolloProvider";

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
        <ApolloProvider>
          {children}
        </ApolloProvider>
      </body>
    </html>
  );
} 