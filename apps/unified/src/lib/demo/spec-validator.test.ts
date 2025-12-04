// Merkle DAG: lib.spec_validator.test
// Tests for JSON-LD specification validator

import { describe, it, expect } from 'vitest'
import {
  validateAnalysisStep,
  validateWordEmotionData,
  validateEmotionData,
  validateComplexSpaceData,
} from './spec-validator'
import type { AnalysisStep } from '../../types/demo/step'
import type { WordEmotionData, EmotionData, ComplexSpaceData } from '../../types/demo/demo'

describe('validateAnalysisStep', () => {
  it('should validate a valid AnalysisStep', () => {
    const step: AnalysisStep = {
      '@context': 'https://example.dev/schemas/emotion-analysis-step.jsonld',
      '@type': 'ex:EmotionAnalysisStep',
      id: 'step-1234567890-1',
      stepType: 'capture_video',
      stepOrder: 1,
      status: 'running',
      name: 'Capture Video',
      description: 'Capture video frame from MediaStream',
      createdAt: 1234567890,
      logs: ['Starting video capture', 'Video captured successfully'],
    }

    const result = validateAnalysisStep(step)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject AnalysisStep with invalid stepType', () => {
    const step: AnalysisStep = {
      id: 'step-1234567890-1',
      stepType: 'invalid_step_type' as any,
      stepOrder: 1,
      status: 'running',
      name: 'Invalid Step',
      createdAt: 1234567890,
    }

    const result = validateAnalysisStep(step)
    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    const firstError = result.errors[0];
    expect(firstError?.path).toBe('stepType')
    expect(firstError?.message).toContain('stepType must be one of the defined step types')
  })

  it('should reject AnalysisStep with invalid id format', () => {
    const step: AnalysisStep = {
      id: 'invalid-id-format',
      stepType: 'capture_video',
      stepOrder: 1,
      status: 'running',
      name: 'Invalid ID',
      createdAt: 1234567890,
    }

    const result = validateAnalysisStep(step)
    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    const firstError = result.errors[0];
    expect(firstError?.path).toBe('id')
    expect(firstError?.message).toContain("id must be in format 'step-{timestamp}-{order}'")
  })

  it('should reject AnalysisStep with negative stepOrder', () => {
    const step: AnalysisStep = {
      id: 'step-1234567890-1',
      stepType: 'capture_video',
      stepOrder: -1,
      status: 'running',
      name: 'Invalid Order',
      createdAt: 1234567890,
    }

    const result = validateAnalysisStep(step)
    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]?.path).toBe('stepOrder')
  })

  it('should reject AnalysisStep with invalid status', () => {
    const step: AnalysisStep = {
      id: 'step-1234567890-1',
      stepType: 'capture_video',
      stepOrder: 1,
      status: 'invalid_status' as any,
      name: 'Invalid Status',
      createdAt: 1234567890,
    }

    const result = validateAnalysisStep(step)
    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]?.path).toBe('status')
  })

  it('should reject AnalysisStep with missing name', () => {
    const step: AnalysisStep = {
      id: 'step-1234567890-1',
      stepType: 'capture_video',
      stepOrder: 1,
      status: 'running',
      name: '',
      createdAt: 1234567890,
    }

    const result = validateAnalysisStep(step)
    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]?.path).toBe('name')
  })

  it('should reject AnalysisStep with invalid logs', () => {
    const step: AnalysisStep = {
      id: 'step-1234567890-1',
      stepType: 'capture_video',
      stepOrder: 1,
      status: 'running',
      name: 'Invalid Logs',
      createdAt: 1234567890,
      logs: ['valid', 123 as any], // Invalid: number in logs array
    }

    const result = validateAnalysisStep(step)
    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]?.path).toBe('logs')
  })
})

describe('validateEmotionData', () => {
  it('should validate a valid EmotionData', () => {
    const emotion: EmotionData = {
      name: 'joy',
      score: 0.75,
      fileType: 'face',
    }

    const result = validateEmotionData(emotion)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject EmotionData with score > 1', () => {
    const emotion: EmotionData = {
      name: 'joy',
      score: 1.5,
      fileType: 'face',
    }

    const result = validateEmotionData(emotion)
    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    const firstError = result.errors[0];
    expect(firstError?.path).toBe('score')
    expect(firstError?.message).toContain('emotion score must be between 0 and 1')
  })

  it('should reject EmotionData with score < 0', () => {
    const emotion: EmotionData = {
      name: 'joy',
      score: -0.1,
      fileType: 'face',
    }

    const result = validateEmotionData(emotion)
    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]?.path).toBe('score')
  })

  it('should reject EmotionData with invalid fileType', () => {
    const emotion: EmotionData = {
      name: 'joy',
      score: 0.75,
      fileType: 'invalid_type' as any,
    }

    const result = validateEmotionData(emotion)
    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]?.path).toBe('fileType')
  })

  it('should accept EmotionData without fileType', () => {
    const emotion: EmotionData = {
      name: 'joy',
      score: 0.75,
    }

    const result = validateEmotionData(emotion)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})

describe('validateWordEmotionData', () => {
  it('should validate a valid WordEmotionData', () => {
    const data: WordEmotionData = {
      word: '頭',
      timestamp: 1234567890,
      emotions: [
        {
          name: 'joy',
          score: 0.75,
          fileType: 'face',
        },
      ],
      reactionTime: 1500,
      reactionValue: 0.8,
    }

    const result = validateWordEmotionData(data)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject WordEmotionData with empty emotions array', () => {
    const data: WordEmotionData = {
      word: '頭',
      timestamp: 1234567890,
      emotions: [],
    }

    const result = validateWordEmotionData(data)
    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    const firstError = result.errors[0];
    expect(firstError?.path).toBe('emotions')
    expect(firstError?.message).toContain('emotions array is required and must not be empty')
  })

  it('should reject WordEmotionData with invalid reactionValue', () => {
    const data: WordEmotionData = {
      word: '頭',
      timestamp: 1234567890,
      emotions: [
        {
          name: 'joy',
          score: 0.75,
        },
      ],
      reactionValue: 1.5, // Invalid: > 1
    }

    const result = validateWordEmotionData(data)
    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]?.path).toBe('reactionValue')
  })

  it('should validate nested EmotionData errors', () => {
    const data: WordEmotionData = {
      word: '頭',
      timestamp: 1234567890,
      emotions: [
        {
          name: 'joy',
          score: 1.5, // Invalid: > 1
          fileType: 'face',
        },
      ],
    }

    const result = validateWordEmotionData(data)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0]?.path).toContain('emotions[0]')
  })
})

describe('validateComplexSpaceData', () => {
  it('should validate a valid ComplexSpaceData', () => {
    const data: ComplexSpaceData = {
      informationSpace: new Array(512).fill(0),
      biologicalSpace: new Array(512).fill(0),
      projected3D: [1.0, 2.0, 3.0],
      regions: [],
    }

    const result = validateComplexSpaceData(data)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject ComplexSpaceData with invalid projected3D', () => {
    const data: ComplexSpaceData = {
      informationSpace: new Array(512).fill(0),
      biologicalSpace: new Array(512).fill(0),
      projected3D: [1.0, 2.0] as any, // Invalid: only 2 elements
      regions: [],
    }

    const result = validateComplexSpaceData(data)
    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    const firstError = result.errors[0];
    expect(firstError?.path).toBe('projected3D')
    expect(firstError?.message).toContain('must have exactly 3 elements')
  })

  it('should accept ComplexSpaceData without regions', () => {
    const data: ComplexSpaceData = {
      informationSpace: new Array(512).fill(0),
      biologicalSpace: new Array(512).fill(0),
      projected3D: [1.0, 2.0, 3.0],
      regions: [],
    }

    const result = validateComplexSpaceData(data)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})

