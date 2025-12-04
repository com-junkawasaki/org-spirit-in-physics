'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { useKawasakiStore } from '@spirit-in-physics/jung-voice-assessment';

export default function CompletionPage() {
  const resetTest = useKawasakiStore((state) => state.resetTest);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-24">
      <div className="w-full max-w-2xl text-center bg-card/50 backdrop-blur-sm border rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-4">ご協力ありがとうございました。</h1>
        <p>実験はこれで終了です。ウィンドウを閉じてください。</p>
        <a href="/steps/1">
          <Button onClick={resetTest} className="mt-6">
            新しいセッションを開始する
          </Button>
        </a>
      </div>
    </main>
  );
}

