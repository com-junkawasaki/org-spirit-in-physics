'use client';

import React, { useEffect } from 'react';
import { ConsentForm, useKawasakiStore, setAudioBasePath, type DemographicData } from '@spiritinphysics/components';
import { useRouter } from 'next/navigation';
import { useSaveConsent } from '@/lib/graphql/hooks';
import { apolloClient } from '@/lib/graphql/client';

export default function ConsentPage() {
  const initializeParticipant = useKawasakiStore((state) => state.initializeParticipant);
  const startPreflight = useKawasakiStore((state) => state.startPreflight);
  const participantId = useKawasakiStore((state) => state.participantId);
  const setGraphQLClientFactory = useKawasakiStore((state) => state.setGraphQLClientFactory);

  const router = useRouter();
  const [saveConsent] = useSaveConsent();

  useEffect(() => {
    // 音声ファイルのベースパスを設定
    setAudioBasePath('/audio/jung-voice-assessment');
    
    // GraphQLクライアントファクトリーをストアに設定
    setGraphQLClientFactory(() => apolloClient);
  }, [setGraphQLClientFactory]);

  useEffect(() => {
    // コンポーネントがマウントされたときに参加者IDを初期化
    if (!participantId) {
      initializeParticipant();
    }
  }, [initializeParticipant, participantId]);

  const handleConsent = async (
    participantId: string, 
    signature: string, 
    agreements: any,
    demographicData?: DemographicData
  ) => {
    try {
      // GraphQL mutationを使用して同意データを保存
      const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : undefined;
      const ipAddress = undefined; // クライアント側では取得できないため、サーバー側で設定

      await saveConsent({
        variables: {
          input: {
            participantId,
            signature,
            agreements,
            agreedAt: new Date().toISOString(),
            consentVersion: '1.0',
            studyId: 'SPIRIT-IN-PHYSICS-2025',
            userAgent,
            ipAddress,
            consentText: 'Research Participation Consent for Spirit in Physics (Jung\'s Word Association Embedding Test)',
            demographicData: demographicData ? {
              ageGroup: demographicData.ageGroup,
              gender: demographicData.gender,
              ethnicity: demographicData.ethnicity,
              income: demographicData.income,
            } : undefined,
          },
        },
      });

      startPreflight();
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
