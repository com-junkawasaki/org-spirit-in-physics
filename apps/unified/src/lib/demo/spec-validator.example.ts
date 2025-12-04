// Merkle DAG: lib.spec_validator.example
// Example usage of JSON-LD specification validator

import {
  validateAnalysisStep,
  validateWordEmotionData,
  validateEmotionData,
  validateComplexSpaceData,
} from './spec-validator'
import type { AnalysisStep } from '../../types/demo/step'
import type { WordEmotionData, EmotionData, ComplexSpaceData } from '../../types/demo/demo'

/**
 * Example: Validate AnalysisStep before creating
 */
export function createValidatedStep(
  stepType: AnalysisStep['stepType'],
  stepOrder: number,
  name: string,
  description?: string
): AnalysisStep | null {
  const step: AnalysisStep = {
    '@context': 'https://example.dev/schemas/emotion-analysis-step.jsonld',
    '@type': 'ex:EmotionAnalysisStep',
    id: `step-${Date.now()}-${stepOrder}`,
    stepType,
    stepOrder,
    status: 'running',
    name,
    ...(description !== undefined && { description }),
    createdAt: Date.now(),
  }

  const result = validateAnalysisStep(step)
  if (!result.valid) {
    console.error('Invalid AnalysisStep:', result.errors)
    return null
  }

  return step
}

/**
 * Example: Validate WordEmotionData before updating state
 */
export function createValidatedWordEmotionData(
  word: string,
  timestamp: number,
  emotions: EmotionData[]
): WordEmotionData | null {
  // First validate emotions
  for (const emotion of emotions) {
    const emotionResult = validateEmotionData(emotion)
    if (!emotionResult.valid) {
      console.error('Invalid EmotionData:', emotionResult.errors)
      return null
    }
  }

  const data: WordEmotionData = {
    word,
    timestamp,
    emotions,
  }

  const result = validateWordEmotionData(data)
  if (!result.valid) {
    console.error('Invalid WordEmotionData:', result.errors)
    return null
  }

  return data
}

/**
 * Example: Validate ComplexSpaceData after calculation
 */
export function validateComplexSpaceDataAfterCalculation(
  data: ComplexSpaceData
): ComplexSpaceData | null {
  const result = validateComplexSpaceData(data)
  if (!result.valid) {
    console.error('Invalid ComplexSpaceData:', result.errors)
    return null
  }

  return data
}

