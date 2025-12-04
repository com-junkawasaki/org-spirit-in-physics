// Merkle DAG: lib.complex_calculator
// Complex space calculations: C = InformationSpace × BiologicalSpace

import type { ComplexSpaceData, ComplexRegion, WordEmotionData } from '../types/demo'
import { EMOTION_KEYS } from './emotion-normalization'

/**
 * Calculate Complex space from emotion vectors and word associations
 * Complex = InformationSpace × BiologicalSpace (1024d)
 */
export function calculateComplexSpace(
  wordEmotionData: WordEmotionData[],
  wordVectors?: Record<string, number[]> // Word2Vec vectors (optional, simulated if not provided)
): ComplexSpaceData {
  // InformationSpace: Word2Vec vectors + emotion vectors
  const informationSpace = calculateInformationSpace(wordEmotionData, wordVectors)

  // BiologicalSpace: Physiological responses (simulated from emotion intensity)
  const biologicalSpace = calculateBiologicalSpace(wordEmotionData)

  // Combine to 1024d Complex space
  const complexVector = combineSpaces(informationSpace, biologicalSpace)

  // Project to 3D for visualization (simplified PCA-like projection)
  const projected3D = projectTo3D(complexVector)

  // Detect Complex regions
  const regions = detectComplexRegions(wordEmotionData, projected3D)

  return {
    informationSpace,
    biologicalSpace,
    projected3D,
    regions,
  }
}

/**
 * Calculate InformationSpace from word-emotion associations
 * Combines Word2Vec vectors (simulated) with emotion vectors
 */
function calculateInformationSpace(
  wordEmotionData: WordEmotionData[],
  wordVectors?: Record<string, number[]>
): number[] {
  const dimension = 512 // Half of 1024d for InformationSpace

  // Aggregate emotion vectors per word
  const wordEmotionAggregate: Record<string, number[]> = {}
  for (const data of wordEmotionData) {
    if (!wordEmotionAggregate[data.word]) {
      wordEmotionAggregate[data.word] = new Array(EMOTION_KEYS.length).fill(0)
    }

    for (const emotion of data.emotions) {
      const idx = EMOTION_KEYS.indexOf(emotion.name as any)
      if (idx >= 0) {
        wordEmotionAggregate[data.word][idx] += emotion.score
      }
    }
  }

  // Normalize emotion vectors
  for (const word in wordEmotionAggregate) {
    const vec = wordEmotionAggregate[word]
    const norm = Math.hypot(...vec)
    if (norm > 0) {
      for (let i = 0; i < vec.length; i++) {
        vec[i] /= norm
      }
    }
  }

  // Simulate Word2Vec vectors if not provided (random but consistent)
  const simulatedWordVectors: Record<string, number[]> = {}
  if (!wordVectors) {
    for (const word of Object.keys(wordEmotionAggregate)) {
      // Simple hash-based pseudo-random vector
      let hash = 0
      for (let i = 0; i < word.length; i++) {
        hash = ((hash << 5) - hash) + word.charCodeAt(i)
        hash = hash & hash
      }
      const seed = Math.abs(hash)
      const vec = new Array(dimension - EMOTION_KEYS.length).fill(0).map((_, i) => {
        return Math.sin(seed + i) * 0.5 + 0.5
      })
      simulatedWordVectors[word] = vec
    }
  } else {
    Object.assign(simulatedWordVectors, wordVectors)
  }

  // Combine all word vectors into single InformationSpace vector
  const infoSpace = new Array(dimension).fill(0)
  const words = Object.keys(wordEmotionAggregate)
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    const emotionVec = wordEmotionAggregate[word]
    const wordVec = simulatedWordVectors[word] || new Array(dimension - EMOTION_KEYS.length).fill(0)

    // Combine: first part is emotion vector, rest is word vector
    for (let j = 0; j < EMOTION_KEYS.length; j++) {
      infoSpace[j] += emotionVec[j] / words.length
    }
    for (let j = 0; j < wordVec.length; j++) {
      infoSpace[EMOTION_KEYS.length + j] += wordVec[j] / words.length
    }
  }

  return infoSpace
}

/**
 * Calculate BiologicalSpace from physiological responses
 * Simulated from emotion intensity and reaction data
 */
function calculateBiologicalSpace(wordEmotionData: WordEmotionData[]): number[] {
  const dimension = 512 // Half of 1024d for BiologicalSpace

  const bioSpace = new Array(dimension).fill(0)

  // Aggregate physiological responses
  let totalIntensity = 0
  for (const data of wordEmotionData) {
    // Calculate emotion intensity
    const intensity = data.emotions.reduce((sum, e) => sum + e.score, 0)
    totalIntensity += intensity

    // Simulate physiological response based on emotion intensity
    const physioResponse = intensity * (data.reactionValue || 0.5) * (data.reactionTime ? 1 / (data.reactionTime / 1000) : 1)

    // Distribute across biological space dimensions
    for (let i = 0; i < dimension; i++) {
      bioSpace[i] += Math.sin(physioResponse + i) * intensity / wordEmotionData.length
    }
  }

  // Normalize
  const norm = Math.hypot(...bioSpace)
  if (norm > 0) {
    for (let i = 0; i < bioSpace.length; i++) {
      bioSpace[i] /= norm
    }
  }

  return bioSpace
}

/**
 * Combine InformationSpace and BiologicalSpace into 1024d Complex space
 */
function combineSpaces(informationSpace: number[], biologicalSpace: number[]): number[] {
  return [...informationSpace, ...biologicalSpace]
}

/**
 * Project 1024d Complex space to 3D for visualization
 * Simplified PCA-like projection
 */
function projectTo3D(complexVector: number[]): [number, number, number] {
  // Simple projection: use first 3 principal components
  // In production, use actual PCA or UMAP
  const x = complexVector.slice(0, 341).reduce((sum, v) => sum + v, 0) / 341
  const y = complexVector.slice(341, 682).reduce((sum, v) => sum + v, 0) / 341
  const z = complexVector.slice(682, 1024).reduce((sum, v) => sum + v, 0) / 342

  // Scale to reasonable range
  const scale = 200
  return [x * scale, y * scale, z * scale]
}

/**
 * Detect Complex regions in 3D space
 * Regions with high emotion intensity and word clustering
 */
function detectComplexRegions(
  wordEmotionData: WordEmotionData[],
  projected3D: [number, number, number]
): ComplexRegion[] {
  const regions: ComplexRegion[] = []

  // Group words by emotion intensity
  const emotionGroups: Record<string, WordEmotionData[]> = {}
  for (const data of wordEmotionData) {
    const dominantEmotion = data.emotions.length > 0
      ? data.emotions.reduce((max, e) => e.score > max.score ? e : max, data.emotions[0])
      : null

    if (dominantEmotion && dominantEmotion.score > 0.3) {
      const key = dominantEmotion.name
      if (!emotionGroups[key]) {
        emotionGroups[key] = []
      }
      emotionGroups[key].push(data)
    }
  }

  // Create regions for each emotion group
  for (const [emotionName, group] of Object.entries(emotionGroups)) {
    if (group.length < 2) continue // Need at least 2 words for a region

    // Calculate center and radius
    const center: [number, number, number] = [
      projected3D[0] + (Math.random() - 0.5) * 50,
      projected3D[1] + (Math.random() - 0.5) * 50,
      projected3D[2] + (Math.random() - 0.5) * 50,
    ]

    const avgIntensity = group.reduce((sum, d) => {
      return sum + d.emotions.reduce((s, e) => s + e.score, 0) / d.emotions.length
    }, 0) / group.length

    const radius = Math.max(30, Math.min(100, avgIntensity * 100))

    // Calculate emotion profile
    const emotionProfile: Record<string, number> = {}
    for (const data of group) {
      for (const emotion of data.emotions) {
        emotionProfile[emotion.name] = (emotionProfile[emotion.name] || 0) + emotion.score
      }
    }
    // Normalize
    const total = Object.values(emotionProfile).reduce((sum, v) => sum + v, 0)
    if (total > 0) {
      for (const key in emotionProfile) {
        emotionProfile[key] /= total
      }
    }

    regions.push({
      id: `complex-${emotionName}-${regions.length}`,
      center,
      radius,
      intensity: avgIntensity,
      emotionProfile,
      words: group.map(d => d.word),
      label: `Complex: ${emotionName}`,
    })
  }

  return regions
}

