// Merkle DAG: connect.hooks.useWordAggregatesCompat
// Compatibility wrapper for useWordAggregates hook
// Provides the same interface as the GraphQL version for easy migration

import { useWordAggregates, useEmotionVectors, useWordStatistics } from './useWordAggregates';
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

export function useWordAggregatesCompat(participantId: string, sessionId?: string) {
  const { data: aggregatesData, isLoading: aggregatesLoading, error: aggregatesError } = useWordAggregates(participantId, sessionId);
  const { data: vectorsData, isLoading: vectorsLoading, error: vectorsError } = useEmotionVectors(participantId, sessionId);
  const { data: statisticsData, isLoading: statisticsLoading, error: statisticsError } = useWordStatistics(participantId, sessionId);

  const loading = aggregatesLoading || vectorsLoading || statisticsLoading;
  const error = aggregatesError || vectorsError || statisticsError;

  // Transform Connect RPC data to match GraphQL format
  const wordAggregates = useMemo<WordAggregateData[]>(() => {
    if (!aggregatesData) return [];
    return aggregatesData.map((agg) => ({
      word: agg.word || '',
      count: agg.count || 0,
      avgReactionValue: agg.avgReactionValue ?? 0,
      sumReactionValue: agg.sumReactionValue ?? 0,
      avgReactionTime: agg.avgReactionTime ?? 0,
      sumReactionTime: agg.sumReactionTime ?? 0,
      avgPhysiological: agg.avgPhysiological ?? 0,
      sumPhysAbs: agg.sumPhysAbs ?? 0,
      physSeries: agg.physSeries || [],
      rtSeries: agg.rtSeries || [],
      rvSeries: agg.rvSeries || [],
    }));
  }, [aggregatesData]);

  const emotionVectors = useMemo<EmotionVectorData[]>(() => {
    if (!vectorsData) return [];
    return vectorsData.map((vec) => ({
      word: vec.word || '',
      joySum: vec.joySum ?? 0,
      sadnessSum: vec.sadnessSum ?? 0,
      angerSum: vec.angerSum ?? 0,
      fearSum: vec.fearSum ?? 0,
      surpriseSum: vec.surpriseSum ?? 0,
      disgustSum: vec.disgustSum ?? 0,
      calmSum: vec.calmSum ?? 0,
      focusSum: vec.focusSum ?? 0,
      excitementSum: vec.excitementSum ?? 0,
      confusionSum: vec.confusionSum ?? 0,
      emotionEntryCount: vec.emotionEntryCount || 0,
      emotionByModality: vec.emotionByModality,
    }));
  }, [vectorsData]);

  const wordStatistics = useMemo<WordStatisticsData[]>(() => {
    if (!statisticsData) return [];
    return statisticsData.map((stat) => ({
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
      physSeries: stat.physSeries || [],
      rtSeries: stat.rtSeries || [],
    }));
  }, [statisticsData]);

  return {
    wordAggregates,
    emotionVectors,
    wordStatistics,
    loading,
    error: error ? (error instanceof Error ? error.message : 'Unknown error') : null,
    refetch: () => {
      // React Query handles refetching automatically
      // This is a no-op for compatibility
    },
  };
}
