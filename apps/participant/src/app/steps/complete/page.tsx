'use client';

import React from 'react';
import { Button } from 'scripts/src/components/ui/button';
import { useKawasakiStore } from 'scripts/src/components/jung-voice-assessment/store';
import Link from 'next/link';
import * as m from '../../../src/paraglide/messages';

export default function CompletionPage() {
  const resetTest = useKawasakiStore((state) => state.resetTest);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-24">
      <div className="w-full max-w-2xl text-center bg-card/50 backdrop-blur-sm border rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-4">{m.completion_thank_you()}</h1>
        <p>{m.completion_message()}</p>
        <Link href="/steps/1" passHref>
          <Button onClick={resetTest} className="mt-6">
            {m.start_new_session()}
          </Button>
        </Link>
      </div>
    </main>
  );
} 