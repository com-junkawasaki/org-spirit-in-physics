// Merkle DAG: linear_algebra.transformations -> matrix_operations
// 線形代数的データ変換パイプライン
// visx + D3（関数写像）+ ml-matrix/mathjs による時系列データ処理

import { Matrix } from 'ml-matrix'

export interface TimelineDataPoint {
  timestamp: number
  word: string
  eventType: string
  emotions: {
    burst: number
    face: number
    language: number
    prosody: number
    total: number
  }
  physiological: {
    average: number
    max: number
    min: number
    channels: Record<string, number>
  }
  reactionValue: number
  metadata: {
    emotionCount: number
    physiologicalCount: number
  }
}

export interface TransformationMatrix {
  timeAlignment: Matrix
  resampling: Matrix
  smoothing: Matrix
  scaling: Matrix
}

// Merkle DAG: linear_algebra.time_alignment_matrix
// 時間整列行列: t_ms → 相対時刻 r = t_ms - t0
export function createTimeAlignmentMatrix(
  timestamps: number[],
  referenceTime: number
): Matrix {
  const n = timestamps.length
  const matrix = Matrix.zeros(n, 1)
  
  for (let i = 0; i < n; i++) {
    matrix.set(i, 0, timestamps[i] - referenceTime)
  }
  
  return matrix
}

// Merkle DAG: linear_algebra.resampling_matrix
// 再標本化行列: y_resampled = A · y
export function createResamplingMatrix(
  originalLength: number,
  targetLength: number,
  method: 'linear' | 'cubic' | 'nearest' = 'linear'
): Matrix {
  const matrix = Matrix.zeros(targetLength, originalLength)
  const ratio = originalLength / targetLength
  
  for (let i = 0; i < targetLength; i++) {
    const sourceIndex = i * ratio
    
    if (method === 'nearest') {
      const nearestIndex = Math.round(sourceIndex)
      if (nearestIndex < originalLength) {
        matrix.set(i, nearestIndex, 1)
      }
    } else if (method === 'linear') {
      const lowerIndex = Math.floor(sourceIndex)
      const upperIndex = Math.min(lowerIndex + 1, originalLength - 1)
      const weight = sourceIndex - lowerIndex
      
      if (lowerIndex < originalLength) {
        matrix.set(i, lowerIndex, 1 - weight)
      }
      if (upperIndex < originalLength && upperIndex !== lowerIndex) {
        matrix.set(i, upperIndex, weight)
      }
    }
  }
  
  return matrix
}

// Merkle DAG: linear_algebra.smoothing_matrix
// 平滑化行列: y_smooth = K · y（畳み込み行列）
export function createSmoothingMatrix(
  length: number,
  windowSize: number = 5,
  kernelType: 'gaussian' | 'moving_average' | 'savitzky_golay' = 'gaussian'
): Matrix {
  const matrix = Matrix.zeros(length, length)
  
  if (kernelType === 'moving_average') {
    const halfWindow = Math.floor(windowSize / 2)
    
    for (let i = 0; i < length; i++) {
      const start = Math.max(0, i - halfWindow)
      const end = Math.min(length - 1, i + halfWindow)
      const count = end - start + 1
      
      for (let j = start; j <= end; j++) {
        matrix.set(i, j, 1 / count)
      }
    }
  } else if (kernelType === 'gaussian') {
    const sigma = windowSize / 6 // 3-sigma rule
    const halfWindow = Math.floor(windowSize / 2)
    
    for (let i = 0; i < length; i++) {
      let sum = 0
      const weights: number[] = []
      
      for (let j = Math.max(0, i - halfWindow); j <= Math.min(length - 1, i + halfWindow); j++) {
        const weight = Math.exp(-Math.pow(j - i, 2) / (2 * sigma * sigma))
        weights.push(weight)
        sum += weight
      }
      
      let weightIndex = 0
      for (let j = Math.max(0, i - halfWindow); j <= Math.min(length - 1, i + halfWindow); j++) {
        matrix.set(i, j, weights[weightIndex] / sum)
        weightIndex++
      }
    }
  }
  
  return matrix
}

// Merkle DAG: linear_algebra.reaction_integration_matrix
// 反応統合行列: r_val = W_e · e + W_p · p
export function createReactionIntegrationMatrix(
  emotionWeight: number = 0.6,
  physiologicalWeight: number = 0.4
): Matrix {
  // 感情データと生理データの重み付き和
  const matrix = Matrix.zeros(1, 2)
  matrix.set(0, 0, emotionWeight) // 感情データの重み
  matrix.set(0, 1, physiologicalWeight) // 生理データの重み
  
  return matrix
}

// Merkle DAG: linear_algebra.scaling_matrix
// スケール変換行列: x = Sx(r), y = Sy(r_val)
export function createScalingMatrix(
  domain: [number, number],
  range: [number, number]
): Matrix {
  const matrix = Matrix.zeros(2, 2)
  const scale = (range[1] - range[0]) / (domain[1] - domain[0])
  const offset = range[0] - domain[0] * scale
  
  matrix.set(0, 0, scale) // x軸スケール
  matrix.set(1, 1, scale) // y軸スケール
  matrix.set(0, 1, offset) // x軸オフセット
  matrix.set(1, 0, offset) // y軸オフセット
  
  return matrix
}

// Merkle DAG: linear_algebra.transform_pipeline
// 線形変換パイプライン
export class LinearTransformationPipeline {
  private transformations: TransformationMatrix
  
  constructor(
    timestamps: number[],
    referenceTime: number,
    targetLength?: number,
    smoothingWindow?: number
  ) {
    this.transformations = {
      timeAlignment: createTimeAlignmentMatrix(timestamps, referenceTime),
      resampling: targetLength ? createResamplingMatrix(timestamps.length, targetLength) : Matrix.eye(timestamps.length),
      smoothing: smoothingWindow ? createSmoothingMatrix(timestamps.length, smoothingWindow) : Matrix.eye(timestamps.length),
      scaling: createScalingMatrix([0, 1], [0, 1]) // デフォルトは恒等変換
    }
  }
  
  // 時間整列: t_ms → 相対時刻 r
  alignTime(timestamps: number[], referenceTime: number): number[] {
    const aligned = this.transformations.timeAlignment.mul(new Matrix(timestamps.map(t => [t - referenceTime])))
    return aligned.to1DArray()
  }
  
  // 再標本化: y_resampled = A · y
  resample(data: number[]): number[] {
    const dataMatrix = new Matrix(data.map(d => [d]))
    const resampled = this.transformations.resampling.mul(dataMatrix)
    return resampled.to1DArray()
  }
  
  // 平滑化: y_smooth = K · y
  smooth(data: number[]): number[] {
    const dataMatrix = new Matrix(data.map(d => [d]))
    const smoothed = this.transformations.smoothing.mul(dataMatrix)
    return smoothed.to1DArray()
  }
  
  // 反応値統合: r_val = W_e · e + W_p · p
  integrateReactions(emotionValues: number[], physiologicalValues: number[]): number[] {
    const integrationMatrix = createReactionIntegrationMatrix()
    const integrated: number[] = []
    
    for (let i = 0; i < emotionValues.length; i++) {
      const emotionVal = emotionValues[i] || 0
      const physioVal = physiologicalValues[i] || 0
      const reactionMatrix = new Matrix([[emotionVal], [physioVal]])
      const result = integrationMatrix.mul(reactionMatrix)
      integrated.push(result.get(0, 0))
    }
    
    return integrated
  }
  
  // スケール変換: x = Sx(r), y = Sy(r_val)
  scale(data: number[], domain: [number, number], range: [number, number]): number[] {
    const scale = (range[1] - range[0]) / (domain[1] - domain[0])
    const offset = range[0] - domain[0] * scale
    
    return data.map(d => d * scale + offset)
  }
  
  // パイプライン実行: 全変換を順次適用
  processPipeline(
    timestamps: number[],
    emotionValues: number[],
    physiologicalValues: number[],
    referenceTime: number,
    domain: [number, number] = [0, 1],
    range: [number, number] = [0, 1]
  ): { alignedTime: number[], reactionValues: number[], scaledTime: number[], scaledReactions: number[] } {
    // 1. 時間整列
    const alignedTime = this.alignTime(timestamps, referenceTime)
    
    // 2. 反応値統合
    const reactionValues = this.integrateReactions(emotionValues, physiologicalValues)
    
    // 3. 平滑化
    const smoothedReactions = this.smooth(reactionValues)
    
    // 4. スケール変換
    const scaledTime = this.scale(alignedTime, domain, range)
    const scaledReactions = this.scale(smoothedReactions, domain, range)
    
    return {
      alignedTime,
      reactionValues: smoothedReactions,
      scaledTime,
      scaledReactions
    }
  }
}

// Merkle DAG: linear_algebra.utility_functions
// ユーティリティ関数
export function calculateStatistics(data: number[]): {
  mean: number
  std: number
  min: number
  max: number
  median: number
} {
  const sorted = [...data].sort((a, b) => a - b)
  const n = data.length
  
  const mean = data.reduce((sum, val) => sum + val, 0) / n
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n
  const std = Math.sqrt(variance)
  
  return {
    mean,
    std,
    min: sorted[0],
    max: sorted[n - 1],
    median: n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)]
  }
}

export function createDomainRange(
  data: number[],
  padding: number = 0.1
): { domain: [number, number], range: [number, number] } {
  const stats = calculateStatistics(data)
  const paddingValue = (stats.max - stats.min) * padding
  
  return {
    domain: [stats.min - paddingValue, stats.max + paddingValue],
    range: [0, 1]
  }
}
