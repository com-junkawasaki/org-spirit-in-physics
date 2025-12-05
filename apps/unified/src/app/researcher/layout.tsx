import type { Metadata } from 'next';
import { getCombinedContext } from '@/lib/paper/semantic/load-schemas';
import ThemeToggle from '@/components/paper/ThemeToggle';

export const metadata: Metadata = {
  title: 'Research Papers - Spirit in Physics',
  description: 'Research papers and publications',
};

export default function ResearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const schemas = getCombinedContext();

  return (
    <>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
          crossOrigin="anonymous"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas, null, 2) }}
        />
      </head>
      <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
        <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
          <div className="container mx-auto px-4 py-3 flex items-center justify-end">
            <div className="flex items-center space-x-4">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="w-full max-w-full py-8">{children}</main>

        <footer className="mt-16 py-8 border-t border-gray-200 dark:border-gray-800 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>All rights reserved by Jun Kawasaki. @CC BY-NC-SA</p>
        </footer>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .katex-display {
          display: block;
          margin: 1em 0;
          text-align: center;
        }

        .katex-inline {
          display: inline-block;
        }

        @media print {
          nav {
            display: none;
          }
        }
      `}} />
    </>
  );
}
