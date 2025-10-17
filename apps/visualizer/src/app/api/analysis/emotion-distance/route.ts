// Merkle DAG: api.analysis.emotion_distance
// 感情距離計算API
// 依存: Neo4j, 感情データ, 時系列データ

import { NextRequest, NextResponse } from 'next/server';
import { createNeo4jClient } from '@/lib/neo4j';
import { calculateEmotionDistanceMatrix } from '@/lib/emotion-distance-calculator';
import { calculateTimeSeriesDistanceMatrix } from '@/lib/soft-dtw-calculator';
import { calculateEmbedding } from '@/lib/embedding-calculator';
import { processDistanceMatrix } from '@/lib/distance-matrix-processor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      participantId, 
      experimentId,
      method = 'cosine',
      embeddingMethod = 'pca',
      dimensions = 2,
      k = 6,
      gamma = 0.1,
      alpha = 0.6,
      topKEmotions = ['joy', 'calm', 'anger', 'fear', 'surprise']
    } = body;

    if (!participantId) {
      return NextResponse.json({
        error: 'participantId is required'
      }, { status: 400 });
    }

    const client = createNeo4jClient();

    // Merkle DAG: api.analysis.emotion_distance.data_extraction
    // データの抽出
    const sessionData = await extractSessionData(client, participantId, experimentId);
    const emotionData = await extractEmotionData(client, participantId, experimentId);
    const physiologicalData = await extractPhysiologicalData(client, participantId, experimentId);

    if (!sessionData || sessionData.length === 0) {
      return NextResponse.json({
        error: 'No session data found',
        participantId,
        experimentId
      }, { status: 404 });
    }

    // Merkle DAG: api.analysis.emotion_distance.distance_calculation
    // 距離行列の計算
    const distanceMatrix = calculateEmotionDistanceMatrix(
      sessionData,
      emotionData,
      physiologicalData,
      method
    );

    // Merkle DAG: api.analysis.emotion_distance.timeseries_calculation
    // 時系列距離の計算（オプション）
    let timeSeriesMatrix = null;
    if (method === 'combined') {
      const windows = defineEmotionWindows(sessionData, emotionData, physiologicalData);
      timeSeriesMatrix = calculateTimeSeriesDistanceMatrix(
        windows,
        topKEmotions,
        gamma,
        alpha
      );
    }

    // Merkle DAG: api.analysis.emotion_distance.embedding_calculation
    // 埋め込みの計算
    const embedding = calculateEmbedding(
      distanceMatrix.matrix,
      distanceMatrix.words,
      embeddingMethod,
      dimensions
    );

    // Merkle DAG: api.analysis.emotion_distance.visualization_generation
    // 可視化データセットの生成
    const result = processDistanceMatrix(
      distanceMatrix.matrix,
      distanceMatrix.words,
      distanceMatrix.method,
      {
        k,
        embedding,
        exportFormats: ['json']
      }
    );

    // Merkle DAG: api.analysis.emotion_distance.response_assembly
    // レスポンスの組み立て
    const response = {
      status: 'completed',
      participantId,
      experimentId,
      method: distanceMatrix.method,
      embeddingMethod: embedding.method,
      dimensions: embedding.dimensions,
      metadata: {
        totalWords: distanceMatrix.words.length,
        totalWindows: distanceMatrix.metadata.totalWindows,
        averageObservationRatio: distanceMatrix.metadata.averageObservationRatio,
        featureDimensions: distanceMatrix.metadata.featureDimensions
      },
      visualization: result.visualization,
      statistics: result.statistics,
      exports: result.exports,
      embedding: {
        points: embedding.points,
        method: embedding.method,
        dimensions: embedding.dimensions,
        metadata: embedding.metadata
      },
      distanceMatrix: {
        matrix: distanceMatrix.matrix,
        words: distanceMatrix.words,
        method: distanceMatrix.method,
        metadata: distanceMatrix.metadata
      },
      timeSeriesMatrix: timeSeriesMatrix ? {
        matrix: timeSeriesMatrix.matrix,
        emotions: timeSeriesMatrix.emotions,
        method: timeSeriesMatrix.method,
        metadata: timeSeriesMatrix.metadata
      } : null
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Emotion distance calculation error:', error);
    return NextResponse.json({
      error: 'Failed to calculate emotion distance',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Merkle DAG: api.analysis.emotion_distance.session_data_extraction
// セッションデータの抽出
async function extractSessionData(client: unknown, participantId: string, experimentId?: string): Promise<unknown[]> {
  const query = experimentId 
    ? `
      MATCH (p:Participant {id: $participantId})-[:HAS_EXPERIMENT]->(e:Experiment {id: $experimentId})-[:HAS_SESSION]->(s:ExperimentSession)
      MATCH (s)-[:HAS_RESPONSE]->(r:Response)
      RETURN s.session_data as sessionData
      ORDER BY s.created_at DESC
      LIMIT 1
    `
    : `
      MATCH (p:Participant {id: $participantId})-[:HAS_EXPERIMENT]->(e:Experiment)-[:HAS_SESSION]->(s:ExperimentSession)
      MATCH (s)-[:HAS_RESPONSE]->(r:Response)
      RETURN s.session_data as sessionData
      ORDER BY s.created_at DESC
      LIMIT 1
    `;

  const params = experimentId 
    ? { participantId, experimentId }
    : { participantId };

  const result = await client.query(query, params);
  
  if (result.length === 0) {
    return [];
  }

  const sessionData = result[0].sessionData;
  if (!sessionData || !sessionData.events) {
    return [];
  }

  return sessionData.events;
}

// Merkle DAG: api.analysis.emotion_distance.emotion_data_extraction
// 感情データの抽出
async function extractEmotionData(client: unknown, participantId: string, experimentId?: string): Promise<unknown[]> {
  const query = experimentId
    ? `
      MATCH (p:Participant {id: $participantId})-[:HAS_EXPERIMENT]->(e:Experiment {id: $experimentId})-[:HAS_SESSION]->(s:ExperimentSession)
      MATCH (s)-[:HAS_EMOTION_ANALYSIS]->(ea:EmotionAnalysis)
      RETURN ea.emotions as emotions, ea.file_type as fileType, ea.begin_time as beginTime, ea.end_time as endTime, ea.confidence as confidence
      ORDER BY ea.begin_time
    `
    : `
      MATCH (p:Participant {id: $participantId})-[:HAS_EXPERIMENT]->(e:Experiment)-[:HAS_SESSION]->(s:ExperimentSession)
      MATCH (s)-[:HAS_EMOTION_ANALYSIS]->(ea:EmotionAnalysis)
      RETURN ea.emotions as emotions, ea.file_type as fileType, ea.begin_time as beginTime, ea.end_time as endTime, ea.confidence as confidence
      ORDER BY ea.begin_time
    `;

  const params = experimentId 
    ? { participantId, experimentId }
    : { participantId };

  const result = await client.query(query, params);
  
  return result.map((row: any) => ({
    emotions: row.emotions ? JSON.parse(row.emotions) : [],
    file_type: row.fileType,
    beginTime: row.beginTime,
    endTime: row.endTime,
    confidence: row.confidence
  }));
}

// Merkle DAG: api.analysis.emotion_distance.physiological_data_extraction
// 生理データの抽出
async function extractPhysiologicalData(client: unknown, participantId: string, experimentId?: string): Promise<unknown[]> {
  const query = experimentId
    ? `
      MATCH (p:Participant {id: $participantId})-[:HAS_EXPERIMENT]->(e:Experiment {id: $experimentId})-[:HAS_SESSION]->(s:ExperimentSession)
      MATCH (s)-[:HAS_PHYSIOLOGICAL_DATA]->(pd:PhysiologicalData)
      RETURN pd.channel as channel, pd.value as value, pd.timestamp as timestamp, pd.quality as quality
      ORDER BY pd.timestamp
    `
    : `
      MATCH (p:Participant {id: $participantId})-[:HAS_EXPERIMENT]->(e:Experiment)-[:HAS_SESSION]->(s:ExperimentSession)
      MATCH (s)-[:HAS_PHYSIOLOGICAL_DATA]->(pd:PhysiologicalData)
      RETURN pd.channel as channel, pd.value as value, pd.timestamp as timestamp, pd.quality as quality
      ORDER BY pd.timestamp
    `;

  const params = experimentId 
    ? { participantId, experimentId }
    : { participantId };

  const result = await client.query(query, params);
  
  return result.map((row: any) => ({
    channel: row.channel,
    value: row.value,
    timestamp: row.timestamp,
    quality: row.quality
  }));
}

// Merkle DAG: api.analysis.emotion_distance.window_definition
// 窓の定義（単語出現ごとに一意の窓）
function defineEmotionWindows(
  sessionEvents: unknown[],
  emotionData: unknown[],
  physiologicalData: unknown[] = []
): unknown[] {
  const windows: any[] = [];
  
  // 単語表示イベントを抽出
  const wordEvents = sessionEvents.filter(e => e.event_type === 'word_displayed');
  
  for (let i = 0; i < wordEvents.length; i++) {
    const currentEvent = wordEvents[i];
    const nextEvent = wordEvents[i + 1];
    
    // 窓の定義
    const startTime = currentEvent.timestamp;
    const endTime = nextEvent 
      ? nextEvent.timestamp 
      : startTime + 6000; // 最大6秒
    
    // 反応時間の計算
    const speechEvent = sessionEvents.find(e => 
      e.event_type === 'speech_detected' && 
      e.timestamp > startTime && 
      e.timestamp < endTime
    );
    
    const reactionTimeMs = speechEvent 
      ? speechEvent.timestamp - startTime 
      : undefined;
    
    // 感情データの集約
    const windowEmotions = aggregateEmotionsInWindow(
      emotionData, 
      startTime, 
      endTime
    );
    
    // 生理データの集約
    const windowPhysiological = aggregatePhysiologicalInWindow(
      physiologicalData,
      startTime,
      endTime
    );
    
    windows.push({
      id: `window_${i}_${currentEvent.payload?.word || 'unknown'}`,
      word: currentEvent.payload?.word || 'unknown',
      startTime,
      endTime,
      reactionTimeMs,
      emotions: windowEmotions,
      physiological: windowPhysiological
    });
  }
  
  return windows;
}

// Merkle DAG: api.analysis.emotion_distance.emotion_aggregation
// 感情データの集約
function aggregateEmotionsInWindow(
  emotionData: unknown[],
  startTime: number,
  endTime: number
): unknown[] {
  const emotionMap = new Map<string, any>();
  
  emotionData.forEach(emotion => {
    // 時間範囲でマッチング
    if (emotion.beginTime >= startTime && emotion.endTime <= endTime) {
      const duration = emotion.endTime - emotion.beginTime;
      const weight = duration / (endTime - startTime);
      
      if (emotion.emotions && Array.isArray(emotion.emotions)) {
        emotion.emotions.forEach((e: any) => {
          const key = `${e.name}_${emotion.file_type || 'unknown'}`;
          const existing = emotionMap.get(key);
          
          if (existing) {
            // 重み付き平均
            const totalWeight = existing.duration + duration;
            existing.score = (existing.score * existing.duration + e.score * duration) / totalWeight;
            existing.duration = totalWeight;
          } else {
            emotionMap.set(key, {
              name: e.name,
              score: e.score,
              confidence: emotion.confidence,
              beginTime: emotion.beginTime,
              endTime: emotion.endTime,
              duration,
              source: emotion.file_type || 'unknown'
            });
          }
        });
      }
    }
  });
  
  return Array.from(emotionMap.values());
}

// Merkle DAG: api.analysis.emotion_distance.physiological_aggregation
// 生理データの集約
function aggregatePhysiologicalInWindow(
  physiologicalData: unknown[],
  startTime: number,
  endTime: number
): unknown[] {
  const channelMap = new Map<string, number[]>();
  
  physiologicalData.forEach(physio => {
    if (physio.timestamp >= startTime && physio.timestamp <= endTime) {
      const channel = physio.channel || 'unknown';
      if (!channelMap.has(channel)) {
        channelMap.set(channel, []);
      }
      channelMap.get(channel)!.push(physio.value);
    }
  });
  
  return Array.from(channelMap.entries()).map(([channel, values]) => ({
    channel,
    value: values.reduce((a, b) => a + b, 0) / values.length, // 平均
    timestamp: (startTime + endTime) / 2,
    quality: values.length / ((endTime - startTime) / 1000) // サンプリング密度
  }));
}
