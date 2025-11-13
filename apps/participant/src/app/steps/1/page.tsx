'use client';

import { useEffect } from 'react';
import ConsentForm from '@/app/ConsentForm';
import { useKawasakiStore } from '@/components/jung-voice-assessment/store';
import { useRouter } from 'next/navigation';
import * as m from '@/paraglide/messages';
import { useCreateParticipant } from '@/lib/graphql/hooks';

type Agreements = {
  understand: boolean;
  voluntary: boolean;
  withdraw: boolean;
  recording: boolean;
};

export default function ConsentPage() {
  const initializeParticipant = useKawasakiStore((state) => state.initializeParticipant);
  const startPreflight = useKawasakiStore((state) => state.startPreflight);
  const participantId = useKawasakiStore((state) => state.participantId);
  const [createParticipant, { loading, error }] = useCreateParticipant();

  const router = useRouter();

  useEffect(() => {
    // コンポーネントがマウントされたときに参加者IDを初期化
    if (!participantId) {
      initializeParticipant();
    }
  }, [initializeParticipant, participantId]);

  const handleConsent = async (participantId: string, signature: string, agreements: Agreements) => {
    try {
      // GraphQL mutationを使用して参加者データを保存
      const result = await createParticipant({
        variables: {
          input: {
            id: participantId,
            signature,
            agreements: agreements,
            agreed_at: new Date().toISOString(),
          },
        },
      });

      if (result.errors) {
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

  if (loading) {
    return <div>{m.participant_id_generating()}</div>;
  }

  if (error) {
    console.error('GraphQL error:', error);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-24">
      <div className="w-full max-w-2xl bg-card/50 backdrop-blur-sm border rounded-xl shadow-lg">
        <ConsentForm onConsent={handleConsent} participantId={participantId} />
      </div>
    </main>
  );
}
