// Merkle DAG: types.step
// Step tracking types for emotion analysis process

/**
 * Step type definitions based on JSON-LD schema
 * @see src/schemas/emotion-analysis-step.jsonld
 */
export type StepType =
  | 'capture_video'
  | 'capture_audio'
  | 'hume_api_face'
  | 'hume_api_prosody'
  | 'hume_api_burst'
  | 'process_predictions'
  | 'normalize_emotions'
  | 'update_data'
  | 'calculate_complex'

export type StepStatus = 'pending' | 'running' | 'completed' | 'error'

export interface AnalysisStep {
  '@context'?: string
  '@type'?: 'ex:EmotionAnalysisStep'
  id: string
  stepType: StepType
  stepOrder: number
  status: StepStatus
  name: string
  description?: string
  input?: any
  output?: any
  error?: string
  duration?: number // milliseconds
  metadata?: Record<string, any>
  createdAt: number
  completedAt?: number
}

export interface StepMetadata {
  word?: string
  wordIndex?: number
  blobSize?: number
  emotionCount?: number
  apiResponse?: any
}

