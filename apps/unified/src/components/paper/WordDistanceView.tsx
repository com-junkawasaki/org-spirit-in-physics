'use client';

// Merkle DAG: components.word_distance_view
// Word distance visualization component for research app

import { useMemo } from 'react';
import type { ExperimentalData } from '../../types/paper/experimental';
import {
  WordDistanceVisualization,
  calculateWordDistances,
} from '@spirit-in-physics/visualization-components';

interface WordDistanceViewProps {
  data: ExperimentalData;
  width?: number;
  height?: number;
  topK?: number;
}

export default function WordDistanceView({
  data,
  width = 1000,
  height = 600,
  topK = 20,
}: WordDistanceViewProps) {
  // Calculate word distances from responses
  // Convert AnalysisResult[] to WordResponseData[] format
  const distances = useMemo(() => {
    const wordResponseData = data.responses.map((r) => ({
      stimulusWord: r.stimulusWord,
      ...(r.reactionTimeMs !== undefined ? { reactionTimeMs: r.reactionTimeMs } : {}),
      wordAssociationProbability: r.wordAssociationProbability,
      ...(r.emotionData !== undefined ? { emotionData: r.emotionData } : {}),
      ...(Array.isArray(r.physiologicalData)
        ? { physiologicalData: r.physiologicalData }
        : r.physiologicalData !== undefined
        ? { physiologicalData: r.physiologicalData }
        : {}),
      ...(r.skinPotentialComponent !== undefined
        ? { skinPotentialComponent: r.skinPotentialComponent }
        : {}),
    }));
    return calculateWordDistances(wordResponseData);
  }, [data.responses]);

  return (
    <div className="word-distance-view w-full">
      <WordDistanceVisualization distances={distances} width={width} height={height} topK={topK} />
    </div>
  );
}
