// Merkle DAG: api.analysis.emotion_distance
// 感情距離計算API
// 依存: Supabase, 感情データ, 時系列データ

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { calculateEmotionDistanceMatrix } from '@/lib/emotion-distance-calculator';
import { calculateTimeSeriesDistanceMatrix } from '@/lib/soft-dtw-calculator';
import { calculateEmbedding } from '@/lib/embedding-calculator';
import { processDistanceMatrix } from '@/lib/distance-matrix-processor';
import { fuseKernels } from '@/lib/kernel-fusion';
import { getParticipantData } from '@/lib/data';

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
      topKEmotions = ['joy', 'calm', 'anger', 'fear', 'surprise'],
      // kernel fusion options
      normalization = 'trace', // 'trace' | 'fro'
      nonNegativeWeights = true,
      timeKernel: timeKernelOpt
    } = body;

    if (!participantId) {
      return NextResponse.json({
        error: 'participantId is required'
      }, { status: 400 });
    }

    // Merkle DAG: api.analysis.emotion_distance.data_extraction
    // データの抽出（Supabaseベース）
    const participantData = await getParticipantData(participantId);

    if (!participantData || participantData.sessions.length === 0) {
      return NextResponse.json({
        error: 'No session data found',
        participantId,
        experimentId
      }, { status: 404 });
    }

    // セッションデータを統合（イベント形式に変換）
    const sessionEvents = participantData.sessions.flatMap((session, sessionIndex) =>
      session.responses.map((response, responseIndex) => ({
        event_type: 'word_displayed',
        timestamp: sessionIndex * 1000 + responseIndex, // セッションとレスポンスのインデックスからタイムスタンプを生成
        payload: { word: response.response_word }
      }))
    );

    // 感情データをイベント形式に変換
    const emotionData = participantData.sessions.flatMap((session, sessionIndex) =>
      session.responses
        .filter(response => response.emotion)
        .map((response, responseIndex) => ({
          beginTime: sessionIndex * 1000 + responseIndex,
          endTime: sessionIndex * 1000 + responseIndex + 1000, // 適当な終了時間
          emotions: [{ name: response.emotion!, score: response.emotion_confidence || 0 }],
          confidence: response.emotion_confidence || 0,
          file_type: 'response'
        }))
    );

    // 生理データ（モックデータ）
    const physiologicalData: Array<{ channel?: string; value: number; timestamp: number; quality?: number }> = [];

    // Merkle DAG: api.analysis.emotion_distance.distance_calculation
    // 通常モード or 融合モードを分岐
    if (method === 'fusion') {
      // 1) 窓定義
      const windows = defineEmotionWindows(sessionEvents, emotionData, physiologicalData);

      type WindowT = {
        id: string;
        word: string;
        startTime: number;
        endTime: number;
        reactionTimeMs?: number;
        emotions: Array<{ name: string; score: number; confidence?: number; beginTime: number; endTime: number; duration: number; source?: string }>;
        physiological?: Array<{ channel: string; value: number; timestamp: number; quality?: number }>;
      };

      const typedWindows = windows as WindowT[];

      // 2) モダリティ別ベクトル/スカラー抽出
      const buildEmotionVectorsBySource = (src: string): number[][] => {
        // ユニオン感情集合
        const names = new Set<string>();
      for (const w of typedWindows) {
        for (const e of w.emotions || []) if (e.source === src) names.add(e.name);
      }
        const emotionList = Array.from(names);
        const idxMap = new Map<string, number>(emotionList.map((n, i) => [n, i]));

        const vectors: number[][] = typedWindows.map(w => {
          const v = Array(emotionList.length).fill(0);
          for (const e of w.emotions || []) {
            if (e.source === src) {
              const idx = idxMap.get(e.name);
              if (idx !== undefined) v[idx] += e.score * (e.duration || 1);
            }
          }
          // L2正規化
          const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
          return v.map(x => x / norm);
        });
        return vectors;
      };

      const buildCosineDistance = (vectors: number[][]): number[][] => {
        const n = vectors.length;
        const M = Array.from({ length: n }, () => Array(n).fill(0));
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            if (i === j) { M[i][j] = 0; continue; }
            const vi = vectors[i];
            const vj = vectors[j];
            let dot = 0, n1 = 0, n2 = 0;
            for (let d = 0; d < vi.length; d++) { dot += vi[d] * vj[d]; n1 += vi[d] * vi[d]; n2 += vj[d] * vj[d]; }
            const sim = (Math.sqrt(n1) > 0 && Math.sqrt(n2) > 0) ? dot / (Math.sqrt(n1) * Math.sqrt(n2)) : 0;
            M[i][j] = 1 - sim;
          }
        }
        return M;
      };

      const buildScalarDistance = (values: number[]): number[][] => {
        const n = values.length;
        const minV = Math.min(...values);
        const maxV = Math.max(...values);
        const range = maxV - minV || 1;
        const M = Array.from({ length: n }, () => Array(n).fill(0));
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            if (i === j) { M[i][j] = 0; continue; }
            M[i][j] = Math.abs(values[i] - values[j]) / range;
          }
        }
        return M;
      };

      const burstVecs = buildEmotionVectorsBySource('burst');
      const faceVecs = buildEmotionVectorsBySource('face');

      const burstDist = burstVecs.length > 0 ? buildCosineDistance(burstVecs) : null;
      const faceDist = faceVecs.length > 0 ? buildCosineDistance(faceVecs) : null;

      // 反応時間（ミリ秒）
      const rtValues = typedWindows.map(w => w.reactionTimeMs ?? 0);
      const rtDist = buildScalarDistance(rtValues);

      // 生理（各窓のチャネル平均をさらに平均）
      const physioValues = typedWindows.map(w => {
        const arr = (w.physiological || []).map(p => p.value);
        return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      });
      const physioDist = buildScalarDistance(physioValues);

      const inputs: Array<{ name: string; matrix: number[][]; kind: 'distance' | 'similarity' }> = [];
      if (burstDist) inputs.push({ name: 'burst', matrix: burstDist, kind: 'distance' });
      if (faceDist) inputs.push({ name: 'face', matrix: faceDist, kind: 'distance' });
      inputs.push({ name: 'reaction_time', matrix: rtDist, kind: 'distance' });
      inputs.push({ name: 'physiological', matrix: physioDist, kind: 'distance' });

      // 3) カーネル融合
      const fusion = fuseKernels(inputs, {
        normalization: normalization === 'fro' ? 'fro' : 'trace',
        nonNegativeWeights: !!nonNegativeWeights,
        timeKernel: (timeKernelOpt && Array.isArray(timeKernelOpt.timestamps) && typeof timeKernelOpt.tau === 'number' && typeof timeKernelOpt.weight === 'number')
          ? { timestamps: timeKernelOpt.timestamps as number[], tau: timeKernelOpt.tau as number, weight: timeKernelOpt.weight as number }
          : null,
        rank: dimensions,
      });

      // 4) 統合カーネル → 距離行列 D^2 = K_ii + K_jj - 2K_ij
      const n = fusion.fusedKernel.length;
      const fusedDistance: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          const d2 = Math.max(0, fusion.fusedKernel[i][i] + fusion.fusedKernel[j][j] - 2 * fusion.fusedKernel[i][j]);
          fusedDistance[i][j] = i === j ? 0 : Math.sqrt(d2);
        }
      }

      // 5) 可視化データ生成（埋め込みはfusion.embeddingを使用）
      const words = typedWindows.map(w => w.word);
      const embedding = {
        points: fusion.embedding.map((coords, index) => ({
          x: coords[0] ?? 0,
          y: coords[1] ?? 0,
          z: (dimensions === 3 ? (coords[2] ?? 0) : undefined),
          word: words[index] || `word_${index}`,
          index,
        })),
        method: 'pca' as const, // 互換のためのラベル。実体は kernel-fusion
        dimensions: (dimensions as 2 | 3),
        metadata: { totalPoints: n },
      };

      const result = processDistanceMatrix(
        fusedDistance,
        words,
        'fusion',
        {
          k,
          embedding,
          exportFormats: ['json']
        }
      );

      const response = {
        status: 'completed',
        participantId,
        experimentId,
        method: 'fusion',
        embeddingMethod: embedding.method,
        dimensions: embedding.dimensions,
        metadata: {
          totalWords: words.length,
          totalWindows: words.length,
          averageObservationRatio: 1,
          featureDimensions: 0
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
          matrix: fusedDistance,
          words,
          method: 'fusion',
          metadata: { totalWords: words.length, averageDistance: result.statistics.averageDistance, minDistance: 0, maxDistance: 0, standardDeviation: 0 }
        },
        fusion: { weights: fusion.weights },
        timeSeriesMatrix: null
      };

      return NextResponse.json(response);
    }

    // 通常モード
    const distanceMatrix = calculateEmotionDistanceMatrix(
      sessionEvents,
      emotionData,
      physiologicalData,
      method as 'cosine' | 'weighted_cosine' | 'gower'
    );

    // Merkle DAG: api.analysis.emotion_distance.timeseries_calculation
    // 時系列距離の計算（オプション）
    let timeSeriesMatrix = null;
    if (method === 'combined') {
      const windows = defineEmotionWindows(sessionEvents, emotionData, physiologicalData);
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
// セッションデータの抽出（未使用 - getParticipantData()がSupabase対応済み）
// 注意: この関数は使用されていません。getParticipantData()がSupabase対応済みで使用されています。
// 将来的に削除を検討してください。
/*
async function extractSessionData(
  client: unknown,
  participantId: string,
  experimentId?: string
): Promise<Array<{ event_type: string; timestamp: number; payload?: { word?: string } }>> {
  // 未使用: Neo4j Cypherクエリベースの実装
  // 実際にはgetParticipantData()がSupabase対応済みで使用されている
  return [];
}
*/

// Merkle DAG: api.analysis.emotion_distance.emotion_data_extraction
// 感情データの抽出（未使用 - getParticipantData()がSupabase対応済み）
// 注意: この関数は使用されていません。getParticipantData()がSupabase対応済みで使用されています。
// 将来的に削除を検討してください。
/*
async function extractEmotionData(client: unknown, participantId: string, experimentId?: string): Promise<Array<{
  emotions: Array<{ name: string; score: number }>;
  file_type?: string;
  beginTime: number;
  endTime: number;
  confidence?: number;
}>> {
  // 未使用: Neo4j Cypherクエリベースの実装
  // 実際にはgetParticipantData()がSupabase対応済みで使用されている
  return [];
}
*/

// Merkle DAG: api.analysis.emotion_distance.physiological_data_extraction
// 生理データの抽出（未使用 - getParticipantData()がSupabase対応済み）
// 注意: この関数は使用されていません。getParticipantData()がSupabase対応済みで使用されています。
// 将来的に削除を検討してください。
/*
async function extractPhysiologicalData(client: unknown, participantId: string, experimentId?: string): Promise<Array<{
  channel: string;
  value: number;
  timestamp: number;
  quality?: number;
}>> {
  // 未使用: Neo4j Cypherクエリベースの実装
  // 実際にはgetParticipantData()がSupabase対応済みで使用されている
  return [];
}
*/

// Merkle DAG: api.analysis.emotion_distance.window_definition
// 窓の定義（単語出現ごとに一意の窓）
function defineEmotionWindows(
  sessionEvents: Array<{ event_type: string; timestamp: number; payload?: { word?: string } }>,
  emotionData: Array<{
    beginTime: number;
    endTime: number;
    emotions?: Array<{ name: string; score: number }>;
    confidence?: number;
    file_type?: string;
  }>,
  physiologicalData: Array<{ channel?: string; value: number; timestamp: number; quality?: number }> = []
): Array<{
  id: string;
  word: string;
  startTime: number;
  endTime: number;
  reactionTimeMs?: number;
  emotions: Array<{
    name: string;
    score: number;
    confidence?: number;
    beginTime: number;
    endTime: number;
    duration: number;
    source: string;
  }>;
  physiological: Array<{ channel: string; value: number; timestamp: number; quality: number }>;
}> {
  const windows: Array<{
    id: string;
    word: string;
    startTime: number;
    endTime: number;
    reactionTimeMs?: number;
    emotions: Array<{
      name: string;
      score: number;
      confidence?: number;
      beginTime: number;
      endTime: number;
      duration: number;
      source: string;
    }>;
    physiological: Array<{ channel: string; value: number; timestamp: number; quality: number }>;
  }> = [];
  
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
  emotionData: Array<{
    beginTime: number;
    endTime: number;
    emotions?: Array<{ name: string; score: number }>;
    confidence?: number;
    file_type?: string;
  }>,
  startTime: number,
  endTime: number
): Array<{
  name: string;
  score: number;
  confidence?: number;
  beginTime: number;
  endTime: number;
  duration: number;
  source: string;
}> {
  const emotionMap = new Map<string, {
    name: string;
    score: number;
    confidence?: number;
    beginTime: number;
    endTime: number;
    duration: number;
    source: string;
  }>();
  
  emotionData.forEach(emotion => {
    // 時間範囲でマッチング
    if (emotion.beginTime >= startTime && emotion.endTime <= endTime) {
      const duration = emotion.endTime - emotion.beginTime;
      
      if (emotion.emotions && Array.isArray(emotion.emotions)) {
        emotion.emotions.forEach((e: { name: string; score: number }) => {
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
  physiologicalData: Array<{ channel?: string; value: number; timestamp: number; quality?: number }>,
  startTime: number,
  endTime: number
): Array<{ channel: string; value: number; timestamp: number; quality: number }> {
  const channelMap = new Map<string, number[]>();
  
  physiologicalData.forEach(physio => {
    if (physio.timestamp >= startTime && physio.timestamp <= endTime) {
      const channel = physio.channel || 'unknown';
      if (!channelMap.has(channel)) {
        channelMap.set(channel, []);
      }
      const arr = channelMap.get(channel);
      if (arr) arr.push(physio.value);
    }
  });
  
  return Array.from(channelMap.entries()).map(([channel, values]) => ({
    channel,
    value: values.reduce((a, b) => a + b, 0) / values.length, // 平均
    timestamp: (startTime + endTime) / 2,
    quality: values.length / ((endTime - startTime) / 1000) // サンプリング密度
  }));
}
