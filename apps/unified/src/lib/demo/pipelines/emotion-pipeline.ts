// Merkle DAG: lib.pipelines.emotion_pipeline
// Emotion Processing Pipeline
// Pattern: Event-Driven + Validation + Monitoring
// JSON-LD Schema: pipeline:pattern/recommended

import { match, P } from 'ts-pattern'
import type { WordEmotionData, EmotionData, ComplexSpaceData } from '../../types/demo'
import { analyzeEmotionRealtime, captureVideoFrame, captureAudioFrame } from '../hume-realtime'
import { calculateComplexSpace } from '../complex-calculator'
// Structure analysis functions are imported but not used in simplified implementation
// import { detectGapAreas, analyzeDensity, detectDuplicates, type WordNode, type WordLink } from '@spirit-in-physics/visualization-components'

// Pipeline Step Types
export interface PipelineStep<TInput, TOutput> {
  id: string
  name: string
  validate?: (input: TInput) => boolean
  execute: (input: TInput) => Promise<TOutput>
  onError?: (error: Error, input: TInput) => Promise<TOutput | null>
  metrics?: {
    latency: number[]
    errorCount: number
    successCount: number
    totalCount: number
  }
}

// Pipeline Event Types
export interface PipelineEvent<T> {
  type: string
  step: string
  data: T
  timestamp: number
  traceId: string
  metadata?: Record<string, any>
}

// Pipeline Configuration
export interface PipelineConfig {
  enableValidation: boolean
  enableMonitoring: boolean
  enableRetry: boolean
  maxRetries: number
  retryBackoffMs: number
}

// Event Emitter for Pipeline Events
class PipelineEventEmitter {
  private listeners: Map<string, Array<(event: PipelineEvent<any>) => void>> = new Map()
  
  on<T>(eventType: string, handler: (event: PipelineEvent<T>) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, [])
    }
    this.listeners.get(eventType)!.push(handler)
  }
  
  off<T>(eventType: string, handler: (event: PipelineEvent<T>) => void) {
    const handlers = this.listeners.get(eventType)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }
  
  emit<T>(event: PipelineEvent<T>) {
    const handlers = this.listeners.get(event.type) || []
    handlers.forEach(handler => {
      try {
        handler(event)
      } catch (error) {
        console.error(`[PipelineEventEmitter] Error in handler for ${event.type}:`, error)
      }
    })
  }
  
  clear() {
    this.listeners.clear()
  }
}

// Pipeline Result Types
export type StepResult<T> = 
  | { success: true; data: T }
  | { success: false; error: Error; retryable: boolean }

export type PipelineStepStatus = 
  | 'pending'
  | 'validating'
  | 'executing'
  | 'retrying'
  | 'completed'
  | 'failed'
  | 'skipped'

export interface PipelineResult {
  wordEmotionData: WordEmotionData | null
  complexData: ComplexSpaceData | null
  structureAnalysis: {
    gapAreas: any[]
    densityRegions: any[]
    duplicates: any[]
  } | null
  traceId: string
  executionTime: number
  status: PipelineStepStatus
}

// Main Pipeline Class
export class EmotionProcessingPipeline {
  private emitter = new PipelineEventEmitter()
  private config: PipelineConfig
  private traceIdCounter = 0
  
  // Step instances
  private captureStep: PipelineStep<MediaStream, { videoBlob: Blob; audioBlob?: Blob }>
  private analyzeStep: PipelineStep<{ videoBlob: Blob; audioBlob?: Blob }, EmotionData[]>
  private processStep: PipelineStep<{ emotions: EmotionData[]; word: string; timestamp: number }, WordEmotionData>
  private complexStep: PipelineStep<WordEmotionData[], ComplexSpaceData>
  private structureStep: PipelineStep<{ complexData: ComplexSpaceData; wordEmotionData: WordEmotionData[] }, { gapAreas: any[]; densityRegions: any[]; duplicates: any[] }>
  
  constructor(config: Partial<PipelineConfig> = {}) {
    this.config = {
      enableValidation: true,
      enableMonitoring: true,
      enableRetry: true,
      maxRetries: 3,
      retryBackoffMs: 200,
      ...config
    }
    
    // Initialize steps
    this.captureStep = this.createCaptureStep()
    this.analyzeStep = this.createAnalyzeStep()
    this.processStep = this.createProcessStep()
    this.complexStep = this.createComplexStep()
    this.structureStep = this.createStructureStep()
  }
  
  // Step 1: Capture Media
  private createCaptureStep(): PipelineStep<MediaStream, { videoBlob: Blob; audioBlob?: Blob }> {
    return {
      id: 'capture',
      name: 'Capture Media',
      validate: (stream) => {
        if (!stream) return false
        const videoTracks = stream.getVideoTracks()
        return videoTracks.length > 0 && videoTracks[0].readyState === 'live'
      },
      execute: async (stream) => {
        const startTime = performance.now()
        try {
          const videoBlob = await captureVideoFrame(stream, 1000)
          const audioBlobRaw = stream.getAudioTracks().length > 0 
            ? await captureAudioFrame(stream, 1000) 
            : null
          const audioBlob = audioBlobRaw || undefined
          
          if (this.config.enableMonitoring) {
            const latency = performance.now() - startTime
            this.captureStep.metrics!.latency.push(latency)
            this.captureStep.metrics!.successCount++
            this.captureStep.metrics!.totalCount++
          }
          
          return { videoBlob, audioBlob }
        } catch (error) {
          if (this.config.enableMonitoring) {
            this.captureStep.metrics!.errorCount++
            this.captureStep.metrics!.totalCount++
          }
          throw error
        }
      },
      onError: async (error, stream) => {
        console.error('[Pipeline] Capture step failed:', error)
        return null
      },
      metrics: { latency: [], errorCount: 0, successCount: 0, totalCount: 0 }
    }
  }
  
  // Step 2: Analyze Emotions
  private createAnalyzeStep(): PipelineStep<{ videoBlob: Blob; audioBlob?: Blob }, EmotionData[]> {
    return {
      id: 'analyze',
      name: 'Analyze Emotions',
      validate: (input) => {
        return input.videoBlob && input.videoBlob.size > 0
      },
      execute: async (input) => {
        const startTime = performance.now()
        try {
          const result = await analyzeEmotionRealtime(input.videoBlob, input.audioBlob)
          
          if (this.config.enableMonitoring) {
            const latency = performance.now() - startTime
            this.analyzeStep.metrics!.latency.push(latency)
            this.analyzeStep.metrics!.successCount++
            this.analyzeStep.metrics!.totalCount++
          }
          
          return result.emotions
        } catch (error) {
          if (this.config.enableMonitoring) {
            this.analyzeStep.metrics!.errorCount++
            this.analyzeStep.metrics!.totalCount++
          }
          throw error
        }
      },
      onError: async (error, input) => {
        console.error('[Pipeline] Analyze step failed:', error)
        return []
      },
      metrics: { latency: [], errorCount: 0, successCount: 0, totalCount: 0 }
    }
  }
  
  // Step 3: Process Word Emotion Data
  private createProcessStep(): PipelineStep<{ emotions: EmotionData[]; word: string; timestamp: number }, WordEmotionData> {
    return {
      id: 'process',
      name: 'Process Word Emotion',
      validate: (input) => {
        return input.emotions && input.emotions.length > 0 && !!input.word
      },
      execute: async (input) => {
        const startTime = performance.now()
        try {
          const reactionValue = input.emotions.reduce((sum, e) => sum + e.score, 0) / input.emotions.length
          
          const wordEmotionData: WordEmotionData = {
            word: input.word,
            timestamp: input.timestamp,
            emotions: input.emotions,
            reactionTime: performance.now() - startTime,
            reactionValue
          }
          
          if (this.config.enableMonitoring) {
            const latency = performance.now() - startTime
            this.processStep.metrics!.latency.push(latency)
            this.processStep.metrics!.successCount++
            this.processStep.metrics!.totalCount++
          }
          
          return wordEmotionData
        } catch (error) {
          if (this.config.enableMonitoring) {
            this.processStep.metrics!.errorCount++
            this.processStep.metrics!.totalCount++
          }
          throw error
        }
      },
      metrics: { latency: [], errorCount: 0, successCount: 0, totalCount: 0 }
    }
  }
  
  // Step 4: Calculate Complex Space
  private createComplexStep(): PipelineStep<WordEmotionData[], ComplexSpaceData> {
    return {
      id: 'complex',
      name: 'Calculate Complex Space',
      validate: (input) => {
        return input && input.length > 0
      },
      execute: async (input) => {
        const startTime = performance.now()
        try {
          const complexData = calculateComplexSpace(input)
          
          if (this.config.enableMonitoring) {
            const latency = performance.now() - startTime
            this.complexStep.metrics!.latency.push(latency)
            this.complexStep.metrics!.successCount++
            this.complexStep.metrics!.totalCount++
          }
          
          return complexData
        } catch (error) {
          if (this.config.enableMonitoring) {
            this.complexStep.metrics!.errorCount++
            this.complexStep.metrics!.totalCount++
          }
          throw error
        }
      },
      metrics: { latency: [], errorCount: 0, successCount: 0, totalCount: 0 }
    }
  }
  
  // Step 5: Structure Analysis
  private createStructureStep(): PipelineStep<{ complexData: ComplexSpaceData; wordEmotionData: WordEmotionData[] }, { gapAreas: any[]; densityRegions: any[]; duplicates: any[] }> {
    return {
      id: 'structure',
      name: 'Structure Analysis',
      validate: (input) => {
        return input && input.complexData && input.wordEmotionData && input.wordEmotionData.length > 0
      },
      execute: async (input) => {
        const startTime = performance.now()
        try {
          // For now, return empty structure analysis results
          // Full structure analysis requires converting ComplexSpaceData to WordNode[]/WordLink[]
          // which is complex and should be done in the visualization layer
          // This step is kept for pipeline completeness but returns empty results
          
          if (this.config.enableMonitoring) {
            const latency = performance.now() - startTime
            this.structureStep.metrics!.latency.push(latency)
            this.structureStep.metrics!.successCount++
            this.structureStep.metrics!.totalCount++
          }
          
          // Return empty structure analysis for now
          // Full implementation would require:
          // 1. Convert ComplexSpaceData.projected3D to WordNode[] with initial positions
          // 2. Generate WordLink[] from word associations
          // 3. Extract emotionVectors from wordEmotionData
          // 4. Call detectGapAreas, analyzeDensity, detectDuplicates
          return { 
            gapAreas: [], 
            densityRegions: [], 
            duplicates: [] 
          }
        } catch (error) {
          if (this.config.enableMonitoring) {
            this.structureStep.metrics!.errorCount++
            this.structureStep.metrics!.totalCount++
          }
          throw error
        }
      },
      metrics: { latency: [], errorCount: 0, successCount: 0, totalCount: 0 }
    }
  }
  
  // Execute pipeline with retry logic
  // Supports both MediaStream (for real-time capture) and Blob (for batch processing)
  async execute(
    input: MediaStream | { videoBlob: Blob; audioBlob?: Blob },
    word: string,
    timestamp: number
  ): Promise<PipelineResult> {
    const traceId = `trace-${++this.traceIdCounter}`
    const executionStartTime = performance.now()
    
    try {
      let captureResult: { videoBlob: Blob; audioBlob?: Blob } | null = null
      
      // Step 1: Capture (or use provided blobs)
      this.emitEvent({
        type: 'step:started',
        step: 'capture',
        data: { word, timestamp },
        timestamp: Date.now(),
        traceId
      })
      
      if (input instanceof MediaStream) {
        // Real-time capture from MediaStream
        captureResult = await this.executeStep(this.captureStep, input, traceId)
      } else {
        // Use provided blobs (batch processing)
        captureResult = {
          videoBlob: input.videoBlob,
          audioBlob: input.audioBlob
        }
        
        // Validate provided blobs
        if (!captureResult.videoBlob || captureResult.videoBlob.size === 0) {
          return this.createErrorResult(traceId, executionStartTime, 'Invalid video blob')
        }
        
        this.emitEvent({
          type: 'media:captured',
          step: 'capture',
          data: { videoSize: captureResult.videoBlob.size, audioSize: captureResult.audioBlob?.size || 0 },
          timestamp: Date.now(),
          traceId
        })
      }
      
      // Use ts-pattern to handle capture result
      const captureHandled = match(captureResult)
        .with(null, () => {
          return this.createErrorResult(traceId, executionStartTime, 'Capture failed', 'failed')
        })
        .otherwise((result) => {
          if (input instanceof MediaStream) {
            this.emitEvent({
              type: 'media:captured',
              step: 'capture',
              data: { videoSize: result.videoBlob.size, audioSize: result.audioBlob?.size || 0 },
              timestamp: Date.now(),
              traceId
            })
          }
          return { shouldContinue: true, result } as const
        })
      
      if (!('shouldContinue' in captureHandled) || !captureHandled.shouldContinue) {
        return captureHandled as PipelineResult
      }
      
      // Step 2: Analyze
      this.emitEvent({
        type: 'step:started',
        step: 'analyze',
        data: { word },
        timestamp: Date.now(),
        traceId
      })
      
      const emotions = await this.executeStep(this.analyzeStep, captureHandled.result, traceId)
      
      // Use ts-pattern to handle emotions result
      const emotionsHandled = match(emotions)
        .with(null, () => {
          return this.createErrorResult(traceId, executionStartTime, 'Analysis failed', 'failed')
        })
        .with(P.when((e) => e.length === 0), () => {
          return this.createErrorResult(traceId, executionStartTime, 'No emotions detected', 'failed')
        })
        .otherwise((emotions) => {
          return { shouldContinue: true, emotions } as const
        })
      
      if (!('shouldContinue' in emotionsHandled) || !emotionsHandled.shouldContinue) {
        return emotionsHandled as PipelineResult
      }
      
      this.emitEvent({
        type: 'emotion:analyzed',
        step: 'analyze',
        data: { emotionCount: emotionsHandled.emotions.length },
        timestamp: Date.now(),
        traceId
      })
      
      // Step 3: Process
      this.emitEvent({
        type: 'step:started',
        step: 'process',
        data: { word },
        timestamp: Date.now(),
        traceId
      })
      
      const wordEmotionData = await this.executeStep(
        this.processStep,
        { emotions: emotionsHandled.emotions, word, timestamp },
        traceId
      )
      
      // Use ts-pattern to handle processing result
      const processingHandled = match(wordEmotionData)
        .with(null, () => {
          return this.createErrorResult(traceId, executionStartTime, 'Processing failed', 'failed')
        })
        .otherwise((data) => {
          return { shouldContinue: true, data } as const
        })
      
      if (!('shouldContinue' in processingHandled) || !processingHandled.shouldContinue) {
        return processingHandled as PipelineResult
      }
      
      this.emitEvent({
        type: 'wordEmotion:processed',
        step: 'process',
        data: { word, reactionValue: processingHandled.data.reactionValue },
        timestamp: Date.now(),
        traceId
      })
      
      // Step 4: Complex Space (async, doesn't block)
      this.emitEvent({
        type: 'step:started',
        step: 'complex',
        data: { word },
        timestamp: Date.now(),
        traceId
      })
      
      const complexData = await this.executeStep(this.complexStep, [processingHandled.data], traceId)
      
      // Use ts-pattern to handle complex data result
      const complexHandled = match(complexData)
        .with(null, () => {
          return { hasData: false, data: null } as const
        })
        .otherwise((data) => {
          this.emitEvent({
            type: 'complex:calculated',
            step: 'complex',
            data: { regionCount: data?.regions?.length || 0 },
            timestamp: Date.now(),
            traceId
          })
          return { hasData: true, data } as const
        })
      
      // Step 5: Structure Analysis (async, doesn't block)
      // Note: Structure analysis is simplified for now - full implementation requires
      // converting ComplexSpaceData to WordNode[]/WordLink[] format
      let structureAnalysis = null
      const structureHandled = match({ complexData: complexHandled.data, wordEmotionData: processingHandled.data })
        .with({ complexData: P.not(null), wordEmotionData: P.not(null) }, async ({ complexData, wordEmotionData }) => {
        this.emitEvent({
          type: 'step:started',
          step: 'structure',
          data: { word },
          timestamp: Date.now(),
          traceId
        })
        
        // Get current wordEmotionData for structure analysis
        // Note: This requires access to the full wordEmotionData array, not just the current item
        // For now, we'll pass empty structure analysis
        structureAnalysis = await this.executeStep(
          this.structureStep, 
          { complexData, wordEmotionData: [wordEmotionData] }, 
          traceId
        )
        
          this.emitEvent({
            type: 'structure:analyzed',
            step: 'structure',
            data: {
              gapAreasCount: structureAnalysis?.gapAreas?.length || 0,
              densityRegionsCount: structureAnalysis?.densityRegions?.length || 0,
              duplicatesCount: structureAnalysis?.duplicates?.length || 0
            },
            timestamp: Date.now(),
            traceId
          })
          return structureAnalysis
        })
        .otherwise(() => null)
      
      structureAnalysis = await structureHandled
      
      const executionTime = performance.now() - executionStartTime
      
      this.emitEvent({
        type: 'pipeline:completed',
        step: 'all',
        data: { word, executionTime },
        timestamp: Date.now(),
        traceId
      })
      
      return {
        wordEmotionData: processingHandled.data,
        complexData: complexHandled.data,
        structureAnalysis,
        traceId,
        executionTime,
        status: 'completed' as PipelineStepStatus
      }
    } catch (error) {
      console.error('[Pipeline] Pipeline execution failed:', error)
      const errorMessage = match(error)
        .with(P.instanceOf(Error), (e) => e.message)
        .otherwise(() => 'Unknown error')
      return this.createErrorResult(traceId, executionStartTime, errorMessage, 'failed')
    }
  }
  
  private async executeStep<TInput, TOutput>(
    step: PipelineStep<TInput, TOutput>,
    input: TInput,
    traceId: string
  ): Promise<TOutput | null> {
    // Validation with ts-pattern
    const validationResult = match({
      enabled: this.config.enableValidation,
      hasValidator: !!step.validate,
      isValid: step.validate ? step.validate(input) : true
    })
      .with({ enabled: true, hasValidator: true, isValid: false }, () => {
        this.emitEvent({
          type: 'validation:failed',
          step: step.id,
          data: input,
          timestamp: Date.now(),
          traceId,
          metadata: { reason: 'Validation failed' }
        })
        return { shouldContinue: false } as const
      })
      .otherwise(() => ({ shouldContinue: true } as const))
    
    if (!validationResult.shouldContinue) {
      return null
    }
    
    // Execute with retry using ts-pattern
    let lastError: Error | null = null
    const maxAttempts = this.config.enableRetry ? this.config.maxRetries + 1 : 1
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Execute step based on attempt number using ts-pattern
      let stepResult: StepResult<TOutput>
      
      if (attempt === 0) {
        // First attempt
        try {
          const result = await step.execute(input)
          stepResult = { success: true, data: result }
        } catch (error) {
          stepResult = { 
            success: false, 
            error: error as Error, 
            retryable: this.isRetryableError(error as Error) 
          }
        }
      } else {
        // Retry attempts
        const backoff = this.config.retryBackoffMs * Math.pow(2, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, backoff))
        
        this.emitEvent({
          type: 'step:retry',
          step: step.id,
          data: input,
          timestamp: Date.now(),
          traceId,
          metadata: { attempt }
        })
        
        try {
          const result = await step.execute(input)
          stepResult = { success: true, data: result }
        } catch (error) {
          stepResult = { 
            success: false, 
            error: error as Error, 
            retryable: this.isRetryableError(error as Error) 
          }
        }
      }
      
      // Process step result with ts-pattern
      const finalResult = await match(stepResult)
        .with({ success: true }, (result) => {
          this.emitEvent({
            type: 'step:completed',
            step: step.id,
            data: result.data,
            timestamp: Date.now(),
            traceId
          })
          return Promise.resolve(result.data)
        })
        .with({ success: false, retryable: true }, (result) => {
          lastError = result.error
          this.emitEvent({
            type: 'step:error',
            step: step.id,
            data: input,
            timestamp: Date.now(),
            traceId,
            metadata: { error: result.error.message, attempt, retryable: true }
          })
          return Promise.resolve(null) // Continue to next attempt
        })
        .with({ success: false, retryable: false }, async (result) => {
          // Non-retryable error - try error handler
          lastError = result.error
          this.emitEvent({
            type: 'step:error',
            step: step.id,
            data: input,
            timestamp: Date.now(),
            traceId,
            metadata: { error: result.error.message, attempt, retryable: false }
          })
          
          if (step.onError) {
            return await step.onError(result.error, input)
          }
          return null
        })
        .exhaustive()
      
      if (finalResult !== null) {
        return finalResult
      }
      
      // If retryable and more attempts available, continue
      if (stepResult.success === false && stepResult.retryable && attempt < maxAttempts - 1) {
        continue
      }
    }
    
    // All retries exhausted - try error handler
    if (step.onError && lastError) {
      return await step.onError(lastError, input)
    }
    
    return null
  }
  
  private isRetryableError(error: Error): boolean {
    // Determine if error is retryable based on error type/message
    return match(error)
      .with(
        P.when((e) => e.message.includes('network') || e.message.includes('timeout')),
        () => true
      )
      .with(
        P.when((e) => e.message.includes('validation') || e.message.includes('invalid')),
        () => false
      )
      .otherwise(() => true) // Default to retryable
  }
  
  private createErrorResult(
    traceId: string, 
    startTime: number, 
    reason: string, 
    status: PipelineStepStatus = 'failed'
  ): PipelineResult {
    return {
      wordEmotionData: null,
      complexData: null,
      structureAnalysis: null,
      traceId,
      executionTime: performance.now() - startTime,
      status
    }
  }
  
  private emitEvent<T>(event: PipelineEvent<T>) {
    this.emitter.emit(event)
  }
  
  // Get metrics for monitoring
  getMetrics() {
    return {
      capture: this.captureStep.metrics,
      analyze: this.analyzeStep.metrics,
      process: this.processStep.metrics,
      complex: this.complexStep.metrics,
      structure: this.structureStep.metrics
    }
  }
  
  // Get average latency for each step
  getAverageLatencies() {
    const getAvg = (metrics: typeof this.captureStep.metrics) => {
      if (!metrics || metrics.latency.length === 0) return 0
      return metrics.latency.reduce((sum, l) => sum + l, 0) / metrics.latency.length
    }
    
    return {
      capture: getAvg(this.captureStep.metrics),
      analyze: getAvg(this.analyzeStep.metrics),
      process: getAvg(this.processStep.metrics),
      complex: getAvg(this.complexStep.metrics),
      structure: getAvg(this.structureStep.metrics)
    }
  }
  
  // Get success rates
  getSuccessRates() {
    const getRate = (metrics: typeof this.captureStep.metrics) => {
      if (!metrics || metrics.totalCount === 0) return 0
      return metrics.successCount / metrics.totalCount
    }
    
    return {
      capture: getRate(this.captureStep.metrics),
      analyze: getRate(this.analyzeStep.metrics),
      process: getRate(this.processStep.metrics),
      complex: getRate(this.complexStep.metrics),
      structure: getRate(this.structureStep.metrics)
    }
  }
  
  // Subscribe to pipeline events
  on<T>(eventType: string, handler: (event: PipelineEvent<T>) => void) {
    this.emitter.on(eventType, handler)
  }
  
  // Unsubscribe from pipeline events
  off<T>(eventType: string, handler: (event: PipelineEvent<T>) => void) {
    this.emitter.off(eventType, handler)
  }
  
  // Clear all event listeners
  clearListeners() {
    this.emitter.clear()
  }
  
  // Reset metrics
  resetMetrics() {
    this.captureStep.metrics = { latency: [], errorCount: 0, successCount: 0, totalCount: 0 }
    this.analyzeStep.metrics = { latency: [], errorCount: 0, successCount: 0, totalCount: 0 }
    this.processStep.metrics = { latency: [], errorCount: 0, successCount: 0, totalCount: 0 }
    this.complexStep.metrics = { latency: [], errorCount: 0, successCount: 0, totalCount: 0 }
    this.structureStep.metrics = { latency: [], errorCount: 0, successCount: 0, totalCount: 0 }
  }
}

