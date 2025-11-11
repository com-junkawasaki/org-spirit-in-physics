// Merkle DAG: hooks.word_aggregates
// Word aggregates hook using GraphQL materialized view
// Provides pre-aggregated data for efficient client-side processing

import { useState, useEffect, useCallback } from 'react';
import { graphqlClient, GetWordAggregatesDocument, GetEmotionVectorsDocument, GetWordStatisticsDocument } from '@/lib/graphql/client';
import type { GetWordAggregatesQueryResult, GetEmotionVectorsQueryResult, GetWordStatisticsQueryResult } from '@/generated/graphql';

export interface WordAggregateData {
  word: string;
  count: number;
  avgReactionValue: number;
  sumReactionValue: number;
  avgReactionTime: number;
  sumReactionTime: number;
  avgPhysiological: number;
  sumPhysAbs: number;
  physSeries: number[];
  rtSeries: number[];
  rvSeries: number[];
}

export interface EmotionVectorData {
  word: string;
  joySum: number;
  sadnessSum: number;
  angerSum: number;
  fearSum: number;
  surpriseSum: number;
  disgustSum: number;
  calmSum: number;
  focusSum: number;
  excitementSum: number;
  confusionSum: number;
  emotionEntryCount: number;
  emotionByModality?: any;
}

export interface WordStatisticsData {
  word: string;
  count: number;
  avgReactionTime: number;
  stdReactionTime: number;
  varReactionTime: number;
  avgReactionValue: number;
  stdReactionValue: number;
  varReactionValue: number;
  avgPhysiological: number;
  stdPhysiological: number;
  varPhysiological: number;
  speedIndex: number;
  physSeries: number[];
  rtSeries: number[];
}

export function useWordAggregates(participantId: string, sessionId?: string) {
  const [wordAggregates, setWordAggregates] = useState<WordAggregateData[]>([]);
  const [emotionVectors, setEmotionVectors] = useState<EmotionVectorData[]>([]);
  const [wordStatistics, setWordStatistics] = useState<WordStatisticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAggregates = useCallback(async () => {
    if (!participantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch all three types of aggregated data in parallel
      const [aggregatesResult, vectorsResult, statisticsResult] = await Promise.all([
        graphqlClient.request<GetWordAggregatesQueryResult>(GetWordAggregatesDocument, {
          participantId,
          sessionId: sessionId || undefined,
        }),
        graphqlClient.request<GetEmotionVectorsQueryResult>(GetEmotionVectorsDocument, {
          participantId,
          sessionId: sessionId || undefined,
        }),
        graphqlClient.request<GetWordStatisticsQueryResult>(GetWordStatisticsDocument, {
          participantId,
          sessionId: sessionId || undefined,
        }),
      ]);

      // Transform word aggregates
      const transformedAggregates: WordAggregateData[] = (aggregatesResult.wordAggregates || []).map((agg) => ({
        word: agg.word || '',
        count: agg.count || 0,
        avgReactionValue: agg.avgReactionValue ?? 0,
        sumReactionValue: agg.sumReactionValue ?? 0,
        avgReactionTime: agg.avgReactionTime ?? 0,
        sumReactionTime: agg.sumReactionTime ?? 0,
        avgPhysiological: agg.avgPhysiological ?? 0,
        sumPhysAbs: agg.sumPhysAbs ?? 0,
        physSeries: (agg.physSeries || []).filter((v): v is number => v != null && typeof v === 'number'),
        rtSeries: (agg.rtSeries || []).filter((v): v is number => v != null && typeof v === 'number'),
        rvSeries: (agg.rvSeries || []).filter((v): v is number => v != null && typeof v === 'number'),
      }));

      // Transform emotion vectors
      const transformedVectors: EmotionVectorData[] = (vectorsResult.emotionVectors || []).map((vec) => ({
        word: vec.word || '',
        joySum: vec.joySum ?? 0,
        sadnessSum: vec.sadnessSum ?? 0,
        angerSum: vec.angerSum ?? 0,
        fearSum: vec.fearSum ?? 0,
        surpriseSum: vec.surpriseSum ?? 0,
        disgustSum: (vec as any).disgustSum ?? (vec as any).disinfectSum ?? 0, // Handle both possible field names
        calmSum: vec.calmSum ?? 0,
        focusSum: vec.focusSum ?? 0,
        excitementSum: vec.excitementSum ?? 0,
        confusionSum: vec.confusionSum ?? 0,
        emotionEntryCount: vec.emotionEntryCount || 0,
        emotionByModality: vec.emotionByModality,
      }));

      // Transform word statistics
      const transformedStatistics: WordStatisticsData[] = (statisticsResult.wordStatistics || []).map((stat) => ({
        word: stat.word || '',
        count: stat.count || 0,
        avgReactionTime: stat.avgReactionTime ?? 0,
        stdReactionTime: stat.stdReactionTime ?? 0,
        varReactionTime: stat.varReactionTime ?? 0,
        avgReactionValue: stat.avgReactionValue ?? 0,
        stdReactionValue: stat.stdReactionValue ?? 0,
        varReactionValue: stat.varReactionValue ?? 0,
        avgPhysiological: stat.avgPhysiological ?? 0,
        stdPhysiological: stat.stdPhysiological ?? 0,
        varPhysiological: stat.varPhysiological ?? 0,
        speedIndex: stat.speedIndex ?? 0,
        physSeries: (stat.physSeries || []).filter((v): v is number => v != null && typeof v === 'number'),
        rtSeries: (stat.rtSeries || []).filter((v): v is number => v != null && typeof v === 'number'),
      }));

      setWordAggregates(transformedAggregates);
      setEmotionVectors(transformedVectors);
      setWordStatistics(transformedStatistics);
    } catch (err) {
      console.error('Error fetching word aggregates:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Fallback to empty arrays
      setWordAggregates([]);
      setEmotionVectors([]);
      setWordStatistics([]);
    } finally {
      setLoading(false);
    }
  }, [participantId, sessionId]);

  useEffect(() => {
    fetchAggregates();
  }, [fetchAggregates]);

  return {
    wordAggregates,
    emotionVectors,
    wordStatistics,
    loading,
    error,
    refetch: fetchAggregates,
  };
}

