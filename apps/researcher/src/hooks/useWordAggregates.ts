// Merkle DAG: hooks.word_aggregates
// Word aggregates hook using Connect RPC
// Provides pre-aggregated data for efficient client-side processing

import { useWordAggregates as useWordAggregatesConnect, useEmotionVectors as useEmotionVectorsConnect, useWordStatistics as useWordStatisticsConnect } from '@/lib/connect/hooks/useWordAggregates';
import { useMemo } from 'react';

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
  emotionByModality?: Record<string, unknown>;
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
  // Use Connect RPC hooks
  const { data: aggregatesData, isLoading: aggregatesLoading, error: aggregatesError } = useWordAggregatesConnect(participantId, sessionId);
  const { data: vectorsData, isLoading: vectorsLoading, error: vectorsError } = useEmotionVectorsConnect(participantId, sessionId);
  const { data: statisticsData, isLoading: statisticsLoading, error: statisticsError } = useWordStatisticsConnect(participantId, sessionId);

  const loading = aggregatesLoading || vectorsLoading || statisticsLoading;
  const error = aggregatesError || vectorsError || statisticsError;

  // Transform Connect RPC data to expected format
  const wordAggregates: WordAggregateData[] = useMemo(() => {
    return (aggregatesData || []).map((agg) => ({
      word: agg.word || '',
      count: agg.count || 0,
      avgReactionValue: agg.avgReactionValue ?? 0,
      sumReactionValue: agg.sumReactionValue ?? 0,
      avgReactionTime: agg.avgReactionTime ?? 0,
      sumReactionTime: agg.sumReactionTime ?? 0,
      avgPhysiological: agg.avgPhysiological ?? 0,
      sumPhysAbs: agg.sumPhysAbs ?? 0,
      physSeries: Array.isArray(agg.physSeries) ? agg.physSeries.filter((v: unknown): v is number => v != null && typeof v === 'number') : [],
      rtSeries: Array.isArray(agg.rtSeries) ? agg.rtSeries.filter((v: unknown): v is number => v != null && typeof v === 'number') : [],
      rvSeries: Array.isArray(agg.rvSeries) ? agg.rvSeries.filter((v: unknown): v is number => v != null && typeof v === 'number') : [],
    }));
  }, [aggregatesData]);

  const emotionVectors: EmotionVectorData[] = useMemo(() => {
    return (vectorsData || []).map((vec) => ({
      word: vec.word || '',
      joySum: vec.joySum ?? 0,
      sadnessSum: vec.sadnessSum ?? 0,
      angerSum: vec.angerSum ?? 0,
      fearSum: vec.fearSum ?? 0,
      surpriseSum: vec.surpriseSum ?? 0,
      disgustSum: vec.disinfectSum ?? 0, // Generated type uses disgustSum
      calmSum: vec.calmSum ?? 0,
      focusSum: vec.focusSum ?? 0,
      excitementSum: vec.excitementSum ?? 0,
      confusionSum: vec.confusionSum ?? 0,
      emotionEntryCount: vec.emotionEntryCount || 0,
      emotionByModality: vec.emotionByModality as Record<string, unknown> | undefined,
    }));
  }, [vectorsData]);

  const wordStatistics: WordStatisticsData[] = useMemo(() => {
    return (statisticsData || []).map((stat) => ({
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
      physSeries: Array.isArray(stat.physSeries) ? stat.physSeries.filter((v: unknown): v is number => v != null && typeof v === 'number') : [],
      rtSeries: Array.isArray(stat.rtSeries) ? stat.rtSeries.filter((v: unknown): v is number => v != null && typeof v === 'number') : [],
    }));
  }, [statisticsData]);

  return {
    wordAggregates,
    emotionVectors,
    wordStatistics,
    loading,
    error: error ? (error instanceof Error ? error.message : 'Unknown error') : null,
    refetch: () => {}, // React Query handles refetching automatically
  };
}

