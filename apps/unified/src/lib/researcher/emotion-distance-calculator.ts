// Merkle DAG: lib.emotion_distance_calculator
// 感情特徴の集約・ベクトル化・距離計算システム
// 依存: 時系列データ、感情データ、生理データ

export interface EmotionWindow {
  id: string;
  word: string;
  startTime: number; // word_displayed.timestamp
  endTime: number; // response_window_closed.timestamp or next word_displayed
  reactionTimeMs?: number; // speech_detected - response_window_opened
  emotions: EmotionData[];
  physiological?: PhysiologicalData[];
}

export interface EmotionData {
  name: string;
  score: number;
  confidence?: number;
  beginTime: number;
  endTime: number;
  duration: number;
  source: 'burst' | 'face' | 'language' | 'prosody';
}

export interface PhysiologicalData {
  measurementType: string;
  value: number;
  timestamp: string;
}

export interface FeatureVector {
  burstEmotions: number[]; // L2正規化済み
  faceEmotions: number[]; // L2正規化済み
  reactionTimeZScore: number;
  physiologicalAvg: number;
  physiologicalMax: number;
  physiologicalMin: number;
  observationRatio: number; // 観測比率
}

export interface DistanceMatrix {
  matrix: number[][];
  words: string[];
  method: 'cosine' | 'weighted_cosine' | 'gower';
  metadata: {
    totalWindows: number;
    averageObservationRatio: number;
    featureDimensions: number;
  };
}

// Merkle DAG: emotion_distance_calculator.window_definition
// 窓の定義（単語出現ごとに一意の窓）
export function defineEmotionWindows(
  sessionEvents: any[],
  emotionData: any[],
  physiologicalData: any[] = []
): EmotionWindow[] {
  const windows: EmotionWindow[] = [];
  
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
      reactionTimeMs: reactionTimeMs ?? 0,
      emotions: windowEmotions,
      physiological: windowPhysiological
    });
  }
  
  return windows;
}

// Merkle DAG: emotion_distance_calculator.emotion_aggregation
// 感情データの集約（重み付き平均）
function aggregateEmotionsInWindow(
  emotionData: any[],
  startTime: number,
  endTime: number
): EmotionData[] {
  const emotionMap = new Map<string, EmotionData>();
  
  emotionData.forEach(emotion => {
    // 時間範囲でマッチング
    if (emotion.beginTime >= startTime && emotion.endTime <= endTime) {
      const duration = emotion.endTime - emotion.beginTime;
      // Weight calculation reserved for future use
      // const weight = duration / (endTime - startTime);
      
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

// Merkle DAG: emotion_distance_calculator.physiological_aggregation
// 生理データの集約
function aggregatePhysiologicalInWindow(
  physiologicalData: any[],
  startTime: number,
  endTime: number
): PhysiologicalData[] {
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
    measurementType: channel,
    value: values.reduce((a, b) => a + b, 0) / values.length, // 平均
    timestamp: String((startTime + endTime) / 2),
  }));
}

// Merkle DAG: emotion_distance_calculator.feature_vector_design
// 特徴量ベクトル設計
export function createFeatureVectors(windows: EmotionWindow[]): FeatureVector[] {
  // 全感情名の辞書を作成
  const allEmotionNames = new Set<string>();
  windows.forEach(window => {
    window.emotions.forEach(emotion => {
      allEmotionNames.add(emotion.name);
    });
  });
  
  const emotionNames = Array.from(allEmotionNames);
  
  // 反応時間の統計を計算
  const reactionTimes = windows
    .map(w => w.reactionTimeMs)
    .filter(rt => rt !== undefined) as number[];
  
  const reactionTimeMean = reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length;
  const reactionTimeStd = Math.sqrt(
    reactionTimes.reduce((sum, rt) => sum + Math.pow(rt - reactionTimeMean, 2), 0) / reactionTimes.length
  );
  
  // 生理データの統計を計算
  const allPhysiologicalValues = windows
    .flatMap(w => w.physiological || [])
    .map(p => p.value);
  
  const physioMean = allPhysiologicalValues.reduce((a, b) => a + b, 0) / allPhysiologicalValues.length;
  const physioStd = Math.sqrt(
    allPhysiologicalValues.reduce((sum, val) => sum + Math.pow(val - physioMean, 2), 0) / allPhysiologicalValues.length
  );
  
  return windows.map(window => {
    // 感情分布の集約
    const burstEmotions = new Array(emotionNames.length).fill(0);
    const faceEmotions = new Array(emotionNames.length).fill(0);
    
    window.emotions.forEach(emotion => {
      const index = emotionNames.indexOf(emotion.name);
      if (index !== -1) {
        if (emotion.source === 'burst') {
          burstEmotions[index] += emotion.score * emotion.duration;
        } else if (emotion.source === 'face') {
          faceEmotions[index] += emotion.score * emotion.duration;
        }
      }
    });
    
    // L2正規化
    const normalize = (vec: number[]): number[] => {
      const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
      return norm > 0 ? vec.map(val => val / norm) : vec;
    };
    
    const burstEmotionsNorm = normalize(burstEmotions);
    const faceEmotionsNorm = normalize(faceEmotions);
    
    // 反応時間のz-score
    const reactionTimeZScore = window.reactionTimeMs 
      ? (window.reactionTimeMs - reactionTimeMean) / (reactionTimeStd || 1)
      : 0;
    
    // 生理データの統計
    const physioValues = window.physiological?.map(p => p.value) || [];
    const physiologicalAvg = physioValues.length > 0 
      ? (physioValues.reduce((a, b) => a + b, 0) / physioValues.length - physioMean) / (physioStd || 1)
      : 0;
    
    const physiologicalMax = physioValues.length > 0 
      ? (Math.max(...physioValues) - physioMean) / (physioStd || 1)
      : 0;
    
    const physiologicalMin = physioValues.length > 0 
      ? (Math.min(...physioValues) - physioMean) / (physioStd || 1)
      : 0;
    
    // 観測比率
    const observationRatio = Math.min(1, 
      (window.emotions.length + (window.physiological?.length || 0)) / 
      (emotionNames.length + 3) // 感情数 + 生理指標3つ
    );
    
    return {
      burstEmotions: burstEmotionsNorm,
      faceEmotions: faceEmotionsNorm,
      reactionTimeZScore,
      physiologicalAvg,
      physiologicalMax,
      physiologicalMin,
      observationRatio
    };
  });
}

// Merkle DAG: emotion_distance_calculator.cosine_distance
// コサイン距離の計算
export function calculateCosineDistance(vectors: FeatureVector[]): DistanceMatrix {
  const n = vectors.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    const row = matrix[i];
    if (!row) continue;
    
    for (let j = 0; j < n; j++) {
      if (i === j) {
        row[j] = 0;
        continue;
      }
      
      const v1 = vectors[i];
      const v2 = vectors[j];
      
      if (!v1 || !v2) {
        row[j] = 1;
        continue;
      }
      
      // ベクトルを結合
      const vec1 = [...v1.burstEmotions, ...v1.faceEmotions, v1.reactionTimeZScore, v1.physiologicalAvg, v1.physiologicalMax, v1.physiologicalMin];
      const vec2 = [...v2.burstEmotions, ...v2.faceEmotions, v2.reactionTimeZScore, v2.physiologicalAvg, v2.physiologicalMax, v2.physiologicalMin];
      
      // コサイン類似度
      const dotProduct = vec1.reduce((sum, val, idx) => {
        const val2 = vec2[idx];
        if (val2 === undefined) return sum;
        return sum + val * val2;
      }, 0);
      const norm1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
      const norm2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
      
      const cosineSimilarity = (norm1 > 0 && norm2 > 0) ? dotProduct / (norm1 * norm2) : 0;
      const cosineDistance = 1 - cosineSimilarity;
      
      row[j] = cosineDistance;
    }
  }
  
  return {
    matrix,
    words: [], // 後で設定
    method: 'cosine',
    metadata: {
      totalWindows: n,
      averageObservationRatio: vectors.reduce((sum, v) => sum + v.observationRatio, 0) / n,
      featureDimensions: vectors[0] ? ((vectors[0].burstEmotions?.length ?? 0) + (vectors[0].faceEmotions?.length ?? 0) + 4) : 0
    }
  };
}

// Merkle DAG: emotion_distance_calculator.weighted_cosine_distance
// 加重コサイン距離の計算
export function calculateWeightedCosineDistance(
  vectors: FeatureVector[],
  weights: { burst: number; face: number; reactionTime: number; physiological: number } = {
    burst: 0.4,
    face: 0.3,
    reactionTime: 0.2,
    physiological: 0.1
  }
): DistanceMatrix {
  const n = vectors.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    const row = matrix[i];
    if (!row) continue;
    
    for (let j = 0; j < n; j++) {
      if (i === j) {
        row[j] = 0;
        continue;
      }
      
      const v1 = vectors[i];
      const v2 = vectors[j];
      
      if (!v1 || !v2) {
        row[j] = 1;
        continue;
      }
      
      // 加重ベクトル
      const vec1 = [
        ...(v1.burstEmotions ?? []).map(val => val * Math.sqrt(weights.burst)),
        ...(v1.faceEmotions ?? []).map(val => val * Math.sqrt(weights.face)),
        (v1.reactionTimeZScore ?? 0) * Math.sqrt(weights.reactionTime),
        (v1.physiologicalAvg ?? 0) * Math.sqrt(weights.physiological),
        (v1.physiologicalMax ?? 0) * Math.sqrt(weights.physiological),
        (v1.physiologicalMin ?? 0) * Math.sqrt(weights.physiological)
      ];
      
      const vec2 = [
        ...(v2.burstEmotions ?? []).map(val => val * Math.sqrt(weights.burst)),
        ...(v2.faceEmotions ?? []).map(val => val * Math.sqrt(weights.face)),
        (v2.reactionTimeZScore ?? 0) * Math.sqrt(weights.reactionTime),
        (v2.physiologicalAvg ?? 0) * Math.sqrt(weights.physiological),
        (v2.physiologicalMax ?? 0) * Math.sqrt(weights.physiological),
        (v2.physiologicalMin ?? 0) * Math.sqrt(weights.physiological)
      ];
      
      // コサイン距離
      const dotProduct = vec1.reduce((sum, val, idx) => {
        const vec2Val = vec2[idx];
        return sum + val * (vec2Val ?? 0);
      }, 0);
      const norm1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
      const norm2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
      
      const cosineSimilarity = (norm1 > 0 && norm2 > 0) ? dotProduct / (norm1 * norm2) : 0;
      const cosineDistance = 1 - cosineSimilarity;
      
      row[j] = cosineDistance;
    }
  }
  
  const firstVector = vectors[0];
  return {
    matrix,
    words: [], // 後で設定
    method: 'weighted_cosine',
    metadata: {
      totalWindows: n,
      averageObservationRatio: vectors.reduce((sum, v) => sum + v.observationRatio, 0) / n,
      featureDimensions: firstVector ? ((firstVector.burstEmotions?.length ?? 0) + (firstVector.faceEmotions?.length ?? 0) + 4) : 0
    }
  };
}

// Merkle DAG: emotion_distance_calculator.gower_distance
// Gower距離の計算（異種特徴の混在対策）
export function calculateGowerDistance(vectors: FeatureVector[]): DistanceMatrix {
  const n = vectors.length;
  const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  
  // 各次元の範囲を計算
  const firstVector = vectors[0];
  const dimensions = firstVector
    ? (firstVector.burstEmotions?.length ?? 0) + (firstVector.faceEmotions?.length ?? 0) + 4
    : 0;
  const ranges: number[] = [];
  
  for (let d = 0; d < dimensions; d++) {
    const values: number[] = [];
    vectors.forEach(v => {
      const vec = [...v.burstEmotions, ...v.faceEmotions, v.reactionTimeZScore, v.physiologicalAvg, v.physiologicalMax, v.physiologicalMin];
      const value = vec[d];
      if (value !== undefined && !isNaN(value)) {
        values.push(value);
      }
    });
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    ranges[d] = max - min || 1; // 0除算回避
  }
  
  for (let i = 0; i < n; i++) {
    const row = matrix[i];
    if (!row) continue;
    for (let j = 0; j < n; j++) {
      if (i === j) {
        row[j] = 0;
        continue;
      }
      
      const v1 = vectors[i];
      const v2 = vectors[j];
      
      if (!v1 || !v2) continue;
      
      const vec1 = [...v1.burstEmotions, ...v1.faceEmotions, v1.reactionTimeZScore, v1.physiologicalAvg, v1.physiologicalMax, v1.physiologicalMin];
      const vec2 = [...v2.burstEmotions, ...v2.faceEmotions, v2.reactionTimeZScore, v2.physiologicalAvg, v2.physiologicalMax, v2.physiologicalMin];
      
      let gowerSum = 0;
      let validDimensions = 0;
      
      for (let d = 0; d < dimensions; d++) {
        const val1 = vec1[d];
        const val2 = vec2[d];
        
        // 欠損値チェック
        const range = ranges[d];
        if (val1 !== undefined && val2 !== undefined && range !== undefined && !isNaN(val1) && !isNaN(val2) && range > 0) {
          const delta = Math.abs(val1 - val2) / range;
          gowerSum += delta;
          validDimensions++;
        }
      }
      
      const gowerDistance = validDimensions > 0 ? gowerSum / validDimensions : 1;
      row[j] = gowerDistance;
    }
  }
  
  return {
    matrix,
    words: [], // 後で設定
    method: 'gower',
    metadata: {
      totalWindows: n,
      averageObservationRatio: vectors.reduce((sum, v) => sum + v.observationRatio, 0) / n,
      featureDimensions: dimensions
    }
  };
}

// Merkle DAG: emotion_distance_calculator.main_calculation
// メイン計算関数
export function calculateEmotionDistanceMatrix(
  sessionEvents: any[],
  emotionData: any[],
  physiologicalData: any[] = [],
  method: 'cosine' | 'weighted_cosine' | 'gower' = 'cosine'
): DistanceMatrix {
  // 1. 窓の定義
  const windows = defineEmotionWindows(sessionEvents, emotionData, physiologicalData);
  
  // 2. 特徴量ベクトルの作成
  const featureVectors = createFeatureVectors(windows);
  
  // 3. 距離行列の計算
  let distanceMatrix: DistanceMatrix;
  
  switch (method) {
    case 'cosine':
      distanceMatrix = calculateCosineDistance(featureVectors);
      break;
    case 'weighted_cosine':
      distanceMatrix = calculateWeightedCosineDistance(featureVectors);
      break;
    case 'gower':
      distanceMatrix = calculateGowerDistance(featureVectors);
      break;
    default:
      throw new Error(`Unknown distance method: ${method}`);
  }
  
  // 4. 単語リストを設定
  distanceMatrix.words = windows.map(w => w.word);
  
  return distanceMatrix;
}
