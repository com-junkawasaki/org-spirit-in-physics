'use client';

import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ConsentForm from '@/app/ConsentForm';
import { useKawasakiStore } from '@/store/kawasakiStore';
import { useRouter } from 'next/navigation';

export default function ConsentPage() {
  const [participantId, setParticipantId] = useState<string>('');
  const setParticipantIdInStore = useKawasakiStore((state) => state.setParticipantId);
  const startTest = useKawasakiStore((state) => state.startTest);
  const router = useRouter();

  useEffect(() => {
    const newParticipantId = uuidv4();
    setParticipantId(newParticipantId);
    setParticipantIdInStore(newParticipantId);
  }, [setParticipantIdInStore]);

  const handleConsent = async (participantId: string, signature: string) => {
    try {
      const consentData = {
        type: 'consent' as const,
        participantId,
        signature,
        agreedAt: new Date().toISOString(),
      };

      const response = await fetch('/api/save-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'consent',
          data: consentData,
        }),
      });

      if (!response.ok) {
        throw new Error('データの保存に失敗しました。');
      }
      startTest();
      router.push('/steps/2');
    } catch (error) {
      console.error('同意データの保存中にエラーが発生しました:', error);
      // TODO: ユーザーにエラーを通知するUIを実装
    }
  };

  if (!participantId) {
    return <div>参加者IDを生成中...</div>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-24">
      <div className="w-full max-w-2xl bg-card/50 backdrop-blur-sm border rounded-xl shadow-lg">
        <ConsentForm onConsent={handleConsent} participantId={participantId} />
      </div>
    </main>
  );
}
