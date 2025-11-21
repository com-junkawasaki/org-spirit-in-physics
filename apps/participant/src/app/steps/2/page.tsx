'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { JungVoiceTest, useKawasakiStore } from '@spirit-in-physics/jung-voice-assessment';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { apolloClient } from '@/lib/graphql';
import { CREATE_SESSION, UPLOAD_ARTIFACT } from '@/lib/graphql/mutations';

export default function TestPage() {
  const router = useRouter();
  const testStatus = useKawasakiStore((state) => state.testStatus);
  const startPreflight = useKawasakiStore((state) => state.startPreflight);
  const participantId = useKawasakiStore((state) => state.participantId);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // 参加者IDがない場合は同意ページにリダイレクト
    if (!participantId) {
      setIsRedirecting(true);
      router.push('/steps/1');
      return;
    }

    // testStatusがidleの場合はpreflightを開始
    if (testStatus === 'idle') {
      console.log('[TestPage] Starting preflight...');
      startPreflight();
    }
  }, [participantId, testStatus, startPreflight, router]);

  const handleTestComplete = () => {
    console.log('Test completed, navigating to completion page.');
    router.push('/steps/complete');
  };

  // リダイレクト中はローディングメッセージを表示
  if (isRedirecting || !participantId) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-24">
        <div className="text-center">
          <p>参加者情報を確認中...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-24">
      <div className="w-full max-w-2xl bg-card/50 backdrop-blur-sm border rounded-xl shadow-lg">
        <JungVoiceTest 
          onComplete={handleTestComplete}
          apolloClient={apolloClient}
          graphQLMutations={{
            createSession: CREATE_SESSION,
            uploadArtifact: UPLOAD_ARTIFACT,
          }}
          Button={Button}
          Card={Card}
          CardHeader={CardHeader}
          CardTitle={CardTitle}
          CardContent={CardContent}
        />
      </div>
    </main>
  );
} 