// Merkle DAG: lib.emotion_normalization
// Local copy of emotion normalization utilities

export type EmotionKey = 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'disgust' | 'calm' | 'focus' | 'excitement' | 'confusion'

export const EMOTION_KEYS: readonly EmotionKey[] = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'calm', 'focus', 'excitement', 'confusion'] as const

/**
 * Normalize emotion name to EmotionKey
 * Simplified version for demo purposes
 */
export function normalizeEmotionName(name: string): EmotionKey | null {
  if (!name || typeof name !== 'string') {
    return null
  }

  const nameLower = name.toLowerCase().trim()

  // Simple mapping
  const mapping: Record<string, EmotionKey> = {
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
  }

  // Try exact match
  if (nameLower in mapping) {
    return mapping[nameLower]
  }

  // Try partial match
  for (const [key, value] of Object.entries(mapping)) {
    if (nameLower.includes(key) || key.includes(nameLower)) {
      return value
    }
  }

  // Check if it's already a valid EmotionKey
  if (EMOTION_KEYS.includes(nameLower as EmotionKey)) {
    return nameLower as EmotionKey
  }

  return null
}

