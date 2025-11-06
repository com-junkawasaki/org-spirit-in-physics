'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { JungVoiceTest, useKawasakiStore, setAudioBasePath } from '@spiritinphysics/components';
import { apolloClient } from '@/lib/graphql/client';

export default function TestPage() {
  const router = useRouter();
  const setGraphQLClientFactory = useKawasakiStore((state) => state.setGraphQLClientFactory);

  useEffect(() => {
    // 音声ファイルのベースパスを設定
    setAudioBasePath('/audio/jung-voice-assessment');
    
    // GraphQLクライアントファクトリーをストアに設定
    setGraphQLClientFactory(() => apolloClient);
  }, [setGraphQLClientFactory]);

  const handleTestComplete = () => {
    console.log('Test completed, navigating to completion page.');
    router.push('/steps/complete');
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-24">
      <div className="w-full max-w-2xl bg-card/50 backdrop-blur-sm border rounded-xl shadow-lg">
        <JungVoiceTest onComplete={handleTestComplete} />
      </div>
    </main>
  );
} 