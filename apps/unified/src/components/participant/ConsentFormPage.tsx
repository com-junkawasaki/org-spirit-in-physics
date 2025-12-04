'use client';

import { useEffect } from 'react';
import ConsentForm from '@/components/ConsentForm';
import { useKawasakiStore } from '@spirit-in-physics/jung-voice-assessment';

export default function ConsentFormPage() {
  const initializeParticipant = useKawasakiStore((state) => state.initializeParticipant);
  const startPreflight = useKawasakiStore((state) => state.startPreflight);
  const participantId = useKawasakiStore((state) => state.participantId);

  useEffect(() => {
    // コンポーネントがマウントされたときに参加者IDを初期化
    if (!participantId) {
      initializeParticipant();
    }
  }, [initializeParticipant, participantId]);

  const handleConsent = async (participantId: string, signature: string, agreements: any) => {
    try {
      const response = await fetch('/api/save-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'consent',
          data: {
            participantId,
            signature,
            agreements,
            agreedAt: new Date().toISOString(),
          }
        }),
      });

      if (!response.ok) {
        throw new Error('データの保存に失敗しました。');
      }
      startPreflight();
      window.location.href = '/steps/2';
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

