// Merkle DAG: lib.soft_dtw_calculator
// Soft-DTW を用いた時系列距離計算システム
// 依存: 感情時系列データ、生理時系列データ

export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
  confidence?: number;
}

export interface EmotionTimeSeries {
  emotion: string;
  points: TimeSeriesPoint[];
  source: 'burst' | 'face' | 'language' | 'prosody';
}

export interface SoftDTWResult {
  distance: number;
  alignment: Array<{i: number, j: number}>;
  gamma: number;
}

export interface TimeSeriesDistanceMatrix {
  matrix: number[][];
  emotions: string[];
  method: 'soft_dtw';
  metadata: {
    totalSeries: number;
    averageLength: number;
    gamma: number;
    topKEmotions: string[];
  };
}

// Merkle DAG: soft_dtw_calculator.time_series_extraction
// 時系列データの抽出（各窓で時間軸を等間隔サンプリング）
export function extractEmotionTimeSeries(
  windows: Array<{
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
    physiological?: Array<{
      channel: string;
      value: number;
      timestamp: number;
      quality?: number;
    }>;
  }>,
  samplingRate: number = 10, // 10Hz
  maxDuration: number = 6 // 最大6秒
): EmotionTimeSeries[] {
  const emotionSeriesMap = new Map<string, EmotionTimeSeries>();
  
  windows.forEach(window => {
    const duration = Math.min(window.endTime - window.startTime, maxDuration * 1000);
    const numPoints = Math.floor(duration * samplingRate / 1000);
    
    if (numPoints === 0) return;
    
    // 各感情について時系列を構築
    window.emotions.forEach((emotion) => {
      const key = `${emotion.name}_${emotion.source}`;
      
      if (!emotionSeriesMap.has(key)) {
        emotionSeriesMap.set(key, {
          emotion: emotion.name,
          points: [],
          source: emotion.source
        });
      }
      
      const series = emotionSeriesMap.get(key)!;
      
      // 等間隔サンプリング
      for (let i = 0; i < numPoints; i++) {
        const timestamp = window.startTime + (i * duration / numPoints);
        const relativeTime = (timestamp - window.startTime) / 1000; // 秒単位
        
        // 感情スコアの時間減衰（線形補間）
        const emotionDuration = emotion.endTime - emotion.beginTime;
        const emotionRelativeTime = (emotion.beginTime - window.startTime) / 1000;
        
        let value = 0;
        if (relativeTime >= emotionRelativeTime && relativeTime <= emotionRelativeTime + emotionDuration / 1000) {
          // 感情期間内
          const decayFactor = 1 - Math.min(1, (relativeTime - emotionRelativeTime) / (emotionDuration / 1000));
          value = emotion.score * decayFactor;
        }
        
        series.points.push({
          timestamp,
          value,
          confidence: emotion.confidence
        });
      }
    });
  });
  
  return Array.from(emotionSeriesMap.values());
}

// Merkle DAG: soft_dtw_calculator.soft_dtw_algorithm
// Soft-DTW アルゴリズムの実装
export function calculateSoftDTW(
  series1: TimeSeriesPoint[],
  series2: TimeSeriesPoint[],
  gamma: number = 0.1
): SoftDTWResult {
  const m = series1.length;
  const n = series2.length;
  
  if (m === 0 || n === 0) {
    return {
      distance: Infinity,
      alignment: [],
      gamma
    };
  }
  
  // 距離行列の計算
  const distanceMatrix: number[][] = Array(m).fill(null).map(() => Array(n).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      const diff = series1[i].value - series2[j].value;
      distanceMatrix[i][j] = diff * diff; // ユークリッド距離の二乗
    }
  }
  
  // Soft-DTW 動的プログラミング
  const softDTWMatrix: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(Infinity));
  softDTWMatrix[0][0] = 0;
  
  // Soft minimum関数
  const softMin = (a: number, b: number, c: number): number => {
    const minVal = Math.min(a, b, c);
    const sum = Math.exp(-gamma * (a - minVal)) + Math.exp(-gamma * (b - minVal)) + Math.exp(-gamma * (c - minVal));
    return minVal - (1 / gamma) * Math.log(sum);
  };
  
  // DPテーブルの構築
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = distanceMatrix[i - 1][j - 1];
      softDTWMatrix[i][j] = cost + softMin(
        softDTWMatrix[i - 1][j],     // 挿入
        softDTWMatrix[i][j - 1],     // 削除
        softDTWMatrix[i - 1][j - 1]  // 置換
      );
    }
  }
  
  // アライメントの復元
  const alignment: Array<{i: number, j: number}> = [];
  let i = m, j = n;
  
  while (i > 0 && j > 0) {
    alignment.unshift({ i: i - 1, j: j - 1 });
    
    const prevI = softDTWMatrix[i - 1][j];
    const prevJ = softDTWMatrix[i][j - 1];
    const prevIJ = softDTWMatrix[i - 1][j - 1];
    
    if (prevIJ <= prevI && prevIJ <= prevJ) {
      i--; j--;
    } else if (prevI <= prevJ) {
      i--;
    } else {
      j--;
    }
  }
  
  return {
    distance: softDTWMatrix[m][n],
    alignment,
    gamma
  };
}

// Merkle DAG: soft_dtw_calculator.emotion_series_distance
// 感情系列間の距離計算
export function calculateEmotionSeriesDistance(
  series1: EmotionTimeSeries,
  series2: EmotionTimeSeries,
  gamma: number = 0.1
): number {
  // 同じ感情でない場合は最大距離
  if (series1.emotion !== series2.emotion) {
    return Infinity;
  }
  
  const result = calculateSoftDTW(series1.points, series2.points, gamma);
  return result.distance;
}

// Merkle DAG: soft_dtw_calculator.top_k_emotions
// 上位K感情の選択
export function selectTopKEmotions(
  emotionSeries: EmotionTimeSeries[],
  k: number = 5
): string[] {
  const emotionCounts = new Map<string, number>();
  
  emotionSeries.forEach(series => {
    const count = emotionCounts.get(series.emotion) || 0;
    emotionCounts.set(series.emotion, count + 1);
  });
  
  return Array.from(emotionCounts.entries())
    .sort(([,a], [,b]) => b - a)
    .slice(0, k)
    .map(([emotion]) => emotion);
}

// Merkle DAG: soft_dtw_calculator.weighted_soft_dtw_distance
// 加重Soft-DTW距離の計算
export function calculateWeightedSoftDTWDistance(
  emotionSeries: EmotionTimeSeries[],
  topKEmotions: string[],
  weights: Record<string, number> = {},
  gamma: number = 0.1
): TimeSeriesDistanceMatrix {
  const n = emotionSeries.length;
  const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  
  // デフォルト重みの設定
  const defaultWeight = 1.0 / topKEmotions.length;
  topKEmotions.forEach(emotion => {
    if (!weights[emotion]) {
      weights[emotion] = defaultWeight;
    }
  });
  
  // 各系列ペアの距離を計算
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 0;
        continue;
      }
      
      const series1 = emotionSeries[i];
      const series2 = emotionSeries[j];
      
      // 同じ感情の系列のみを比較
      if (series1.emotion === series2.emotion && topKEmotions.includes(series1.emotion)) {
        const softDTWResult = calculateSoftDTW(series1.points, series2.points, gamma);
        const weightedDistance = softDTWResult.distance * (weights[series1.emotion] || defaultWeight);
        matrix[i][j] = weightedDistance;
      } else {
        matrix[i][j] = Infinity; // 異なる感情または上位K外
      }
    }
  }
  
  // 距離の正規化
  const allDistances = matrix.flat().filter(d => d !== Infinity && d !== 0);
  if (allDistances.length > 0) {
    const maxDistance = Math.max(...allDistances);
    const minDistance = Math.min(...allDistances);
    const range = maxDistance - minDistance || 1;
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (matrix[i][j] !== Infinity && matrix[i][j] !== 0) {
          matrix[i][j] = (matrix[i][j] - minDistance) / range;
        }
      }
    }
  }
  
  return {
    matrix,
    emotions: emotionSeries.map(s => s.emotion),
    method: 'soft_dtw',
    metadata: {
      totalSeries: n,
      averageLength: emotionSeries.reduce((sum, s) => sum + s.points.length, 0) / n,
      gamma,
      topKEmotions
    }
  };
}

// Merkle DAG: soft_dtw_calculator.combined_distance
// コサイン距離とSoft-DTW距離の結合
export function calculateCombinedDistance(
  cosineMatrix: number[][],
  softDTWMatrix: number[][],
  alpha: number = 0.6
): number[][] {
  const n = cosineMatrix.length;
  const combinedMatrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const cosineDist = cosineMatrix[i][j];
      const softDTWDist = softDTWMatrix[i][j];
      
      // 無限大の処理
      const validCosine = Number.isFinite(cosineDist) ? cosineDist : 1;
      const validSoftDTW = Number.isFinite(softDTWDist) ? softDTWDist : 1;
      
      combinedMatrix[i][j] = alpha * validCosine + (1 - alpha) * validSoftDTW;
    }
  }
  
  return combinedMatrix;
}

// Merkle DAG: soft_dtw_calculator.main_calculation
// メイン計算関数
export function calculateTimeSeriesDistanceMatrix(
  windows: Array<{
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
    physiological?: Array<{
      channel: string;
      value: number;
      timestamp: number;
      quality?: number;
    }>;
  }>,
  topKEmotions: string[] = ['joy', 'calm', 'anger', 'fear', 'surprise'],
  gamma: number = 0.1,
  alpha: number = 0.6
): TimeSeriesDistanceMatrix {
  // 1. 時系列データの抽出
  const emotionSeries = extractEmotionTimeSeries(windows);
  
  // 2. 上位K感情の選択
  const selectedEmotions = selectTopKEmotions(emotionSeries, topKEmotions.length);
  
  // 3. 重みの設定
  const weights: Record<string, number> = {};
  selectedEmotions.forEach(emotion => {
    weights[emotion] = 1.0 / selectedEmotions.length;
  });
  
  // 4. 加重Soft-DTW距離の計算
  const distanceMatrix = calculateWeightedSoftDTWDistance(
    emotionSeries,
    selectedEmotions,
    weights,
    gamma
  );
  
  return distanceMatrix;
}
