// Merkle DAG: lib.emotion_normalization
// Local copy of emotion normalization utilities

import { match, P } from 'ts-pattern'

export type EmotionKey = 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'disgust' | 'calm' | 'focus' | 'excitement' | 'confusion'

export const EMOTION_KEYS: readonly EmotionKey[] = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'calm', 'focus', 'excitement', 'confusion'] as const

// Emotion name mapping
const EMOTION_MAPPING: Record<string, EmotionKey> = {
  'joy': 'joy',
  'happiness': 'joy',
  'sadness': 'sadness',
  'sad': 'sadness',
  'anger': 'anger',
  'angry': 'anger',
  'fear': 'fear',
  'afraid': 'fear',
  'surprise': 'surprise',
  'disgust': 'disgust',
  'calm': 'calm',
  'calmness': 'calm',
  'focus': 'focus',
  'concentration': 'focus',
  'interest': 'focus',
  'excitement': 'excitement',
  'excited': 'excitement',
  'confusion': 'confusion',
  'confused': 'confusion',
} as const

/**
 * Normalize emotion name to EmotionKey using ts-pattern
 * Simplified version for demo purposes
 */
export function normalizeEmotionName(name: string): EmotionKey | null {
  // Validate input using ts-pattern
  const validatedInput = match(name)
    .with(P.nullish, () => null)
    .with(P.when((n) => typeof n !== 'string' || n.length === 0), () => null)
    .otherwise((n) => n.toLowerCase().trim())

  if (!validatedInput) {
    return null
  }

  const nameLower = validatedInput

  // Try exact match first
  return match(nameLower)
    .when((n) => n in EMOTION_MAPPING, (n) => EMOTION_MAPPING[n])
    .when((n) => EMOTION_KEYS.includes(n as EmotionKey), (n) => n as EmotionKey)
    .when(
      (n) => Object.entries(EMOTION_MAPPING).some(([key, value]) => n.includes(key) || key.includes(n)),
      (n) => {
        // Find partial match
        const entry = Object.entries(EMOTION_MAPPING).find(([key]) => n.includes(key) || key.includes(n))
        return entry ? entry[1] : null
      }
    )
    .otherwise(() => null)
}

