'use client';

import React from 'react';

export const dynamic = 'force-dynamic';

export default function NotFoundCatchAll() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-4">404 - ページが見つかりません</h1>
        <p className="text-lg text-muted-foreground mb-8">
          お探しのページは存在しないか、移動された可能性があります。
        </p>
        <a
          href="/"
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
        >
          ホームに戻る
        </a>
      </div>
    </div>
  );
}
