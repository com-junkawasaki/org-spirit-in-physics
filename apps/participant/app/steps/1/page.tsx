'use client';

import React, { useEffect } from 'react';
import ConsentForm from 'scripts/src/app/ConsentForm';
import { useKawasakiStore } from 'scripts/src/components/jung-voice-assessment/store';
import { useRouter } from 'next/navigation';
import * as m from '../../../src/paraglide/messages';

export default function ConsentPage() {
  const initializeParticipant = useKawasakiStore((state) => state.initializeParticipant);
  const startPreflight = useKawasakiStore((state) => state.startPreflight);
  const participantId = useKawasakiStore((state) => state.participantId);

  const router = useRouter();

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
        throw new Error(m.data_save_error());
      }
      startPreflight();
      router.push('/steps/2');
    } catch (error) {
      console.error(m.consent_save_error(), error);
      // TODO: ユーザーにエラーを通知するUIを実装
    }
  };

  if (!participantId) {
    return <div>{m.participant_id_generating()}</div>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-24">
      <div className="w-full max-w-2xl bg-card/50 backdrop-blur-sm border rounded-xl shadow-lg">
        <ConsentForm onConsent={handleConsent} participantId={participantId} />
      </div>
    </main>
  );
}
