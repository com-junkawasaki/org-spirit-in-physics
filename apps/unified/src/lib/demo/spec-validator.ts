// Merkle DAG: lib.spec_validator
// JSON-LD specification validator based on SHACL constraints

import type { AnalysisStep } from '../types/step'
import type { WordEmotionData, EmotionData, ComplexSpaceData } from '../types/demo'

export interface ValidationError {
  path: string
  message: string
  value?: any
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

/**
 * Validate AnalysisStep against JSON-LD specification
 */
export function validateAnalysisStep(step: AnalysisStep): ValidationResult {
  const errors: ValidationError[] = []

  // Validate id format
  if (!step.id || !/^step-\d+-\d+$/.test(step.id)) {
    errors.push({
      path: 'id',
      message: "id must be in format 'step-{timestamp}-{order}'",
      value: step.id,
    })
  }

  // Validate stepType
  const validStepTypes = [
    'demo_start',
    'demo_word_display',
    'demo_data_collection',
    'demo_visualization',
    'demo_complete',
    'capture_video',
    'capture_audio',
    'hume_api_face',
    'hume_api_prosody',
    'hume_api_burst',
    'process_predictions',
    'normalize_emotions',
    'update_data',
    'calculate_complex',
  ]
  if (!step.stepType || !validStepTypes.includes(step.stepType)) {
    errors.push({
      path: 'stepType',
      message: 'stepType must be one of the defined step types',
      value: step.stepType,
    })
  }

  // Validate stepOrder
  if (typeof step.stepOrder !== 'number' || step.stepOrder < 0) {
    errors.push({
      path: 'stepOrder',
      message: 'stepOrder must be a non-negative integer',
      value: step.stepOrder,
    })
  }

  // Validate status
  const validStatuses = ['pending', 'running', 'completed', 'error']
  if (!step.status || !validStatuses.includes(step.status)) {
    errors.push({
      path: 'status',
      message: 'status must be one of: pending, running, completed, error',
      value: step.status,
    })
  }

  // Validate name
  if (!step.name || typeof step.name !== 'string') {
    errors.push({
      path: 'name',
      message: 'name is required',
      value: step.name,
    })
  }

  // Validate createdAt
  if (typeof step.createdAt !== 'number' || step.createdAt < 0) {
    errors.push({
      path: 'createdAt',
      message: 'createdAt is required and must be a non-negative integer',
      value: step.createdAt,
    })
  }

  // Validate duration (optional)
  if (step.duration !== undefined) {
    if (typeof step.duration !== 'number' || step.duration < 0) {
      errors.push({
        path: 'duration',
        message: 'duration must be a non-negative integer (milliseconds)',
        value: step.duration,
      })
    }
  }

  // Validate logs (optional)
  if (step.logs !== undefined) {
    if (!Array.isArray(step.logs) || !step.logs.every(log => typeof log === 'string')) {
      errors.push({
        path: 'logs',
        message: 'logs must be an array of strings',
        value: step.logs,
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate WordEmotionData against JSON-LD specification
 */
export function validateWordEmotionData(data: WordEmotionData): ValidationResult {
  const errors: ValidationError[] = []

  // Validate word
  if (!data.word || typeof data.word !== 'string') {
    errors.push({
      path: 'word',
      message: 'word is required',
      value: data.word,
    })
  }

  // Validate timestamp
  if (typeof data.timestamp !== 'number' || data.timestamp < 0) {
    errors.push({
      path: 'timestamp',
      message: 'timestamp must be a non-negative integer (milliseconds)',
      value: data.timestamp,
    })
  }

  // Validate emotions array
  if (!Array.isArray(data.emotions) || data.emotions.length === 0) {
    errors.push({
      path: 'emotions',
      message: 'emotions array is required and must not be empty',
      value: data.emotions,
    })
  } else {
    // Validate each emotion
    data.emotions.forEach((emotion, index) => {
      const emotionResult = validateEmotionData(emotion)
      if (!emotionResult.valid) {
        emotionResult.errors.forEach(error => {
          errors.push({
            path: `emotions[${index}].${error.path}`,
            message: error.message,
            value: error.value,
          })
        })
      }
    })
  }

  // Validate reactionTime (optional)
  if (data.reactionTime !== undefined) {
    if (typeof data.reactionTime !== 'number' || data.reactionTime < 0) {
      errors.push({
        path: 'reactionTime',
        message: 'reactionTime must be a non-negative number',
        value: data.reactionTime,
      })
    }
  }

  // Validate reactionValue (optional)
  if (data.reactionValue !== undefined) {
    if (typeof data.reactionValue !== 'number' || data.reactionValue < 0 || data.reactionValue > 1) {
      errors.push({
        path: 'reactionValue',
        message: 'reactionValue must be between 0 and 1',
        value: data.reactionValue,
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate EmotionData against JSON-LD specification
 */
export function validateEmotionData(data: EmotionData): ValidationResult {
  const errors: ValidationError[] = []

  // Validate name
  if (!data.name || typeof data.name !== 'string') {
    errors.push({
      path: 'name',
      message: 'emotion name is required',
      value: data.name,
    })
  }

  // Validate score
  if (typeof data.score !== 'number' || data.score < 0 || data.score > 1) {
    errors.push({
      path: 'score',
      message: 'emotion score must be between 0 and 1',
      value: data.score,
    })
  }

  // Validate fileType (optional)
  if (data.fileType !== undefined) {
    const validFileTypes = ['face', 'prosody', 'burst', 'language']
    if (!validFileTypes.includes(data.fileType)) {
      errors.push({
        path: 'fileType',
        message: 'fileType must be one of: face, prosody, burst, language',
        value: data.fileType,
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate ComplexSpaceData against JSON-LD specification
 */
export function validateComplexSpaceData(data: ComplexSpaceData): ValidationResult {
  const errors: ValidationError[] = []

  // Validate informationSpace
  if (!Array.isArray(data.informationSpace)) {
    errors.push({
      path: 'informationSpace',
      message: 'informationSpace array is required',
      value: data.informationSpace,
    })
  }

  // Validate biologicalSpace
  if (!Array.isArray(data.biologicalSpace)) {
    errors.push({
      path: 'biologicalSpace',
      message: 'biologicalSpace array is required',
      value: data.biologicalSpace,
    })
  }

  // Validate projected3D
  if (!Array.isArray(data.projected3D) || data.projected3D.length !== 3) {
    errors.push({
      path: 'projected3D',
      message: 'projected3D array is required and must have exactly 3 elements',
      value: data.projected3D,
    })
  }

  // Validate regions (optional)
  if (data.regions !== undefined && !Array.isArray(data.regions)) {
    errors.push({
      path: 'regions',
      message: 'regions array is optional but must be an array if provided',
      value: data.regions,
    })
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

