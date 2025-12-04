// Merkle DAG: lib.word_distance
// Word distance calculation utilities

import type { WordDistancePair } from '../timeline/types';

// Generic interface for word response data
export interface WordResponseData {
  stimulusWord: string;
  reactionTimeMs?: number;
  wordAssociationProbability: number;
  emotionData?: Record<string, number>;
  physiologicalData?: number[] | Record<string, unknown>;
  skinPotentialComponent?: number;
}

/**
 * Calculate cosine similarity between two emotion vectors
 */
function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) return 0
  
  let dot = 0
  let norm1 = 0
  let norm2 = 0
  
  for (let i = 0; i < vec1.length; i++) {
    dot += vec1[i] * vec2[i]
    norm1 += vec1[i] * vec1[i]
    norm2 += vec2[i] * vec2[i]
  }
  
  const denom = Math.sqrt(norm1) * Math.sqrt(norm2)
  if (denom === 0) return 0
  return dot / denom
}

/**
 * Normalize value to [0, 1] range
 */
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0
  return (value - min) / (max - min)
}

/**
 * Calculate word distances from word response data
 */
export function calculateWordDistances(results: WordResponseData[]): WordDistancePair[] {
  if (results.length < 2) return []

  // Group results by word
  const wordGroups = new Map<string, WordResponseData[]>()
  results.forEach(result => {
    const word = result.stimulusWord
    if (!wordGroups.has(word)) {
      wordGroups.set(word, [])
    }
    wordGroups.get(word)!.push(result)
  })

  const words = Array.from(wordGroups.keys())
  const pairs: WordDistancePair[] = []

  // Calculate statistics for normalization
  const reactionValues = results.map(r => r.wordAssociationProbability)
  const reactionTimes = results.map(r => r.reactionTimeMs).filter((rt): rt is number => rt != null && rt > 0)
  const physiologicalValues = results.map(r => {
    if (Array.isArray(r.physiologicalData)) {
      return r.physiologicalData.reduce((sum, val) => sum + Math.abs(val), 0) / r.physiologicalData.length
    }
    return r.skinPotentialComponent ?? 0
  }).filter((ph): ph is number => ph != null && !isNaN(ph))

  const rvMin = Math.min(...reactionValues)
  const rvMax = Math.max(...reactionValues)
  const rtMin = Math.min(...reactionTimes)
  const rtMax = Math.max(...reactionTimes)
  const phMin = Math.min(...physiologicalValues)
  const phMax = Math.max(...physiologicalValues)

  // Emotion keys
  const emotionKeys = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'calm', 'focus', 'excitement', 'confusion']

  // Calculate distances for all word pairs
  for (let i = 0; i < words.length; i++) {
    for (let j = i + 1; j < words.length; j++) {
      const word1 = words[i]
      const word2 = words[j]

      const results1 = wordGroups.get(word1) || []
      const results2 = wordGroups.get(word2) || []

      if (results1.length === 0 || results2.length === 0) continue

      // Average values for each word
      const avgEmotion1 = emotionKeys.map(key => {
        const values = results1.map(r => r.emotionData?.[key] || 0)
        return values.reduce((sum, v) => sum + v, 0) / values.length
      })
      const avgEmotion2 = emotionKeys.map(key => {
        const values = results2.map(r => r.emotionData?.[key] || 0)
        return values.reduce((sum, v) => sum + v, 0) / values.length
      })

      const avgRv1 = results1.reduce((sum, r) => sum + r.wordAssociationProbability, 0) / results1.length
      const avgRv2 = results2.reduce((sum, r) => sum + r.wordAssociationProbability, 0) / results2.length

      const avgRt1 = results1
        .map(r => r.reactionTimeMs)
        .filter((rt): rt is number => rt != null && rt > 0)
        .reduce((sum, rt, _, arr) => sum + rt / arr.length, 0)
      const avgRt2 = results2
        .map(r => r.reactionTimeMs)
        .filter((rt): rt is number => rt != null && rt > 0)
        .reduce((sum, rt, _, arr) => sum + rt / arr.length, 0)

      const avgPh1 = results1.reduce((sum, r) => {
        if (Array.isArray(r.physiologicalData)) {
          return sum + r.physiologicalData.reduce((s, v) => s + Math.abs(v), 0) / r.physiologicalData.length
        }
        return sum + (r.skinPotentialComponent || 0)
      }, 0) / results1.length
      const avgPh2 = results2.reduce((sum, r) => {
        if (Array.isArray(r.physiologicalData)) {
          return sum + r.physiologicalData.reduce((s, v) => s + Math.abs(v), 0) / r.physiologicalData.length
        }
        return sum + (r.skinPotentialComponent || 0)
      }, 0) / results2.length

      // Calculate distances
      const cosineSim = cosineSimilarity(avgEmotion1, avgEmotion2)
      const emotionDistance = 1 - cosineSim

      const reactionValueDistance = Math.abs(normalize(avgRv1, rvMin, rvMax) - normalize(avgRv2, rvMin, rvMax))
      const reactionTimeDistance = Math.abs(normalize(avgRt1, rtMin, rtMax) - normalize(avgRt2, rtMin, rtMax))
      const physiologicalDistance = Math.abs(normalize(avgPh1, phMin, phMax) - normalize(avgPh2, phMin, phMax))

      // Weighted total distance
      const wEmotion = 0.4
      const wReactionValue = 0.2
      const wReactionTime = 0.2
      const wPhysiological = 0.2

      const totalDistance =
        wEmotion * emotionDistance +
        wReactionValue * reactionValueDistance +
        wReactionTime * reactionTimeDistance +
        wPhysiological * physiologicalDistance

      pairs.push({
        word1,
        word2,
        totalDistance,
        emotionDistance,
        reactionValueDistance,
        reactionTimeDistance,
        physiologicalDistance,
      })
    }
  }

  return pairs
}

