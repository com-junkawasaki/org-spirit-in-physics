// Merkle DAG: api.analysis.emotion_distance
// 感情距離計算API
// 依存: Neo4j, 感情データ, 時系列データ

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getClient } from '@/lib/client';
import { gql } from '@apollo/client';

const CALCULATE_EMOTION_DISTANCE_MUTATION = gql`
  mutation CalculateEmotionDistance($input: EmotionDistanceInput!) {
    calculateEmotionDistance(input: $input)
  }
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      participantId, 
      experimentId,
      method = 'fusion',
      embeddingMethod = 'pca',
      dimensions = 2,
      k = 6,
      gamma = 0.1,
      alpha = 0.6,
      topKEmotions = ['joy', 'calm', 'anger', 'fear', 'surprise'],
      normalization = 'trace',
      nonNegativeWeights = true,
      timeKernel
    } = body;

    if (!participantId) {
      return NextResponse.json({
        error: 'participantId is required'
      }, { status: 400 });
    }

    const client = getClient();
    
    const { data } = await client.mutate({
      mutation: CALCULATE_EMOTION_DISTANCE_MUTATION,
      variables: {
        input: {
          participant_id: participantId,
          experiment_id: experimentId,
          method,
          embedding_method: embeddingMethod,
          dimensions,
          k,
          gamma,
          alpha,
          top_k_emotions: topKEmotions,
          normalization,
          non_negative_weights: nonNegativeWeights,
          time_kernel: timeKernel,
        }
      }
    });

    const resultData = JSON.parse(data.calculateEmotionDistance);

    return NextResponse.json(resultData);

  } catch (error) {
    console.error('Emotion distance calculation error:', error);
    return NextResponse.json({
      error: 'Failed to calculate emotion distance',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
