import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export const metadata: Metadata = {
  title: 'Spirit in Physics',
  description: 'Extended evaluation of human illusion by Jungian psychology and computational models.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="ja">
        <head>
          <meta charSet="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        </head>
        <body>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
