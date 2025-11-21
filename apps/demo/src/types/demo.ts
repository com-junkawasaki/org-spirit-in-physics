// Merkle DAG: types.demo
// Type definitions for demo app

export interface EmotionData {
  name: string
  score: number
  fileType?: 'face' | 'prosody' | 'burst' | 'language'
}

export interface WordEmotionData {
  word: string
  timestamp: number
  emotions: EmotionData[]
  reactionTime?: number
  reactionValue?: number
}

export interface ComplexRegion {
  id: string
  center: [number, number, number]
  radius: number
  intensity: number
  emotionProfile: Record<string, number>
  words: string[]
  label: string
}

export interface ComplexSpaceData {
  informationSpace: number[]  // Word2Vec + emotion vectors (1024d)
  biologicalSpace: number[]    // Physiological responses (simulated)
  projected3D: [number, number, number]
  regions: ComplexRegion[]
}

