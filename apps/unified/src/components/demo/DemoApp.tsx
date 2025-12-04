// Merkle DAG: components.demo_app
// Main demo app component

import { match, P } from 'ts-pattern'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import WordDisplay from './WordDisplay'
import ComplexForce3D from './ComplexForce3D'
import ComplexVisualization from './ComplexVisualization'
import StructureAnalysis from './StructureAnalysis'
import { JUNG_STIMULUS_WORDS } from '../../lib/demo/jung-words'
import { analyzeEmotionRealtime, captureVideoFrame, captureAudioFrame } from '../../lib/demo/hume-realtime'
import { calculateComplexSpace } from '../../lib/demo/complex-calculator'
import { EmotionProcessingPipeline } from '../../lib/demo/pipelines/emotion-pipeline'
import type { WordEmotionData, ComplexSpaceData } from '../../types/demo/demo'
import type { AnalysisStep, StepType, StepStatus, StepMetadata } from '../../types/demo/step'
import { useAtomValue, useSetAtom } from 'jotai'
import { useAtomCallback } from 'jotai/utils'
import {
  batchQueueAtom,
  batchQueueLengthAtom,
  wordEmotionDataAtom,
  addToBatchQueueAtom,
  processBatchQueueAtom,
  clearBatchQueueAtom,
  addWordEmotionDataAtom,
  clearWordEmotionDataAtom,
  type BatchQueueItem,
} from '../../lib/demo/store/demo-atoms'

// BPM 85 = 85 beats per minute = 60000ms / 85 = ~706ms per beat
const BPM_85_INTERVAL_MS = Math.round(60000 / 85) // ~706ms

export default function DemoApp() {
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [complexData, setComplexData] = useState<ComplexSpaceData | null>(null)
  const [structureAnalysis, setStructureAnalysis] = useState({
    gapAreas: [] as any[],
    densityRegions: [] as any[],
    duplicates: [] as any[],
    overallDensity: 0,
  })
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isRequestingMedia, setIsRequestingMedia] = useState(true)
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([])
  const [demoSteps, setDemoSteps] = useState<AnalysisStep[]>([])
  const [hasError, setHasError] = useState(false)
  const [stepOrderCounter, setStepOrderCounter] = useState(0)
  const [maxFps, setMaxFps] = useState(0)  // Default: 0 = auto (memory-aware, max 1GB)
  const [showAnalysis, setShowAnalysis] = useState(false)  // デバッグパネル表示フラグ
  
  // Initialize Emotion Processing Pipeline
  const pipelineRef = useRef<EmotionProcessingPipeline | null>(null)
  useEffect(() => {
    pipelineRef.current = new EmotionProcessingPipeline({
      enableValidation: true,
      enableMonitoring: true,
      enableRetry: true,
      maxRetries: 3,
      retryBackoffMs: 200
    })
    
    // Subscribe to pipeline events for logging
    pipelineRef.current.on('step:started', (event) => {
      console.log(`[Pipeline] ${event.step} started:`, event.data)
    })
    pipelineRef.current.on('step:completed', (event) => {
      console.log(`[Pipeline] ${event.step} completed:`, event.data)
    })
    pipelineRef.current.on('step:error', (event) => {
      console.error(`[Pipeline] ${event.step} error:`, event.metadata)
    })
    pipelineRef.current.on('pipeline:completed', (event) => {
      console.log(`[Pipeline] Pipeline completed:`, event.data)
    })
    
    return () => {
      pipelineRef.current?.clearListeners()
    }
  }, [])
  
  // Use Jotai atoms for batch queue and word emotion data
  const addToBatchQueue = useSetAtom(addToBatchQueueAtom)
  // Use useAtomCallback to get return value from processBatchQueueAtom
  const processBatchQueue = useAtomCallback(
    (get, set) => {
      const currentQueue = get(batchQueueAtom)
      if (currentQueue.length === 0) {
        console.log('[DemoStore] Batch queue is empty, nothing to process')
        return [] as BatchQueueItem[]
      }
      
      console.log(`[DemoStore] Processing batch queue: ${currentQueue.length} items`)
      // Clear queue
      set(batchQueueAtom, [])
      return currentQueue
    }
  ) as () => BatchQueueItem[]
  const clearBatchQueue = useSetAtom(clearBatchQueueAtom)
  const batchQueueLength = useAtomValue(batchQueueLengthAtom)
  const addWordEmotionData = useSetAtom(addWordEmotionDataAtom)
  const clearWordEmotionData = useSetAtom(clearWordEmotionDataAtom)
  const wordEmotionData = useAtomValue(wordEmotionDataAtom)
  
  // Keep ref to latest wordEmotionData for use in setTimeout callbacks
  const wordEmotionDataRef = useRef(wordEmotionData)
  useEffect(() => {
    wordEmotionDataRef.current = wordEmotionData
  }, [wordEmotionData])

  // Request media access
  useEffect(() => {
    const requestMedia = async () => {
      setIsRequestingMedia(true)
      setError(null)
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: true,
        })
        setStream(mediaStream)
        setIsRequestingMedia(false)
      } catch (err) {
        setError('カメラ/マイクへのアクセスが必要です')
        setIsRequestingMedia(false)
        console.error('Media access error:', err)
      }
    }
    requestMedia()

    return () => {
      // Cleanup will be handled by component unmount
    }
  }, [])

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop()
        })
      }
    }
  }, [stream])

  // Helper function to create and track analysis steps
  const createStep = useCallback((
    stepType: StepType,
    stepOrder: number,
    name: string,
    description?: string,
    metadata?: StepMetadata
  ): AnalysisStep => {
    return {
      '@context': 'https://example.dev/schemas/emotion-analysis-step.jsonld',
      '@type': 'ex:EmotionAnalysisStep',
      id: `step-${Date.now()}-${stepOrder}`,
      stepType,
      stepOrder,
      status: 'running',
      name,
      description,
      metadata,
      createdAt: Date.now(),
    }
  }, [])

  const updateStep = useCallback((stepId: string, updates: Partial<AnalysisStep>) => {
    setAnalysisSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { 
            ...step, 
            ...updates, 
            completedAt: updates.status === 'completed' || updates.status === 'error' ? Date.now() : step.completedAt,
            logs: updates.logs ? [...(step.logs || []), ...(Array.isArray(updates.logs) ? updates.logs : [updates.logs])] : step.logs,
          }
        : step
    ))
  }, [])

  const addStepLog = useCallback((stepId: string, logMessage: string) => {
    setAnalysisSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, logs: [...(step.logs || []), `${new Date().toISOString()}: ${logMessage}`] }
        : step
    ))
    setDemoSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, logs: [...(step.logs || []), `${new Date().toISOString()}: ${logMessage}`] }
        : step
    ))
  }, [])

  // Handle word display event - capture frames and add to batch queue
  const handleWordDisplayed = useCallback(async () => {
    if (!stream || !isRunning) return

    const currentWord = JUNG_STIMULUS_WORDS[currentWordIndex]
    const timestamp = Date.now()
    const stepOrder = stepOrderCounter

    try {
      // Step 1: Capture video
      const videoStep = createStep('capture_video', stepOrder, 'Capture Video', 'Capture video frame from MediaStream', {
        word: currentWord.japanese,
        wordIndex: currentWordIndex,
      })
      setAnalysisSteps(prev => [...prev, videoStep])
      addStepLog(videoStep.id, `Capturing video for word: ${currentWord.japanese} (BPM 85 batch mode)`)
      
      let videoBlob: Blob
      const videoStartTime = Date.now()
      try {
        videoBlob = await captureVideoFrame(stream, 2000)
        const videoDuration = Date.now() - videoStartTime
        addStepLog(videoStep.id, `Video captured: ${Math.round(videoBlob.size / 1024)}KB in ${videoDuration}ms`)
        updateStep(videoStep.id, {
          status: 'completed',
          output: { blobSize: videoBlob.size, blobType: videoBlob.type },
          duration: videoDuration,
        })
      } catch (err) {
        console.warn('Video capture failed, using empty blob:', err)
        const errorMsg = match(err)
          .with(P.instanceOf(Error), (e) => e.message)
          .otherwise(() => 'Video capture failed')
        addStepLog(videoStep.id, `Video capture error: ${errorMsg}`)
        videoBlob = new Blob([], { type: 'video/webm' })
        updateStep(videoStep.id, {
          status: 'error',
          error: errorMsg,
          duration: Date.now() - videoStartTime,
        })
      }
      
      // Step 2: Capture audio
      const audioStep = createStep('capture_audio', stepOrder + 1, 'Capture Audio', 'Capture audio frame from MediaStream', {
        word: currentWord.japanese,
        wordIndex: currentWordIndex,
      })
      setAnalysisSteps(prev => [...prev, audioStep])
      addStepLog(audioStep.id, `Capturing audio for word: ${currentWord.japanese}`)
      
      let audioBlob: Blob | undefined
      const audioStartTime = Date.now()
      try {
        audioBlob = await captureAudioFrame(stream, 2000) || undefined
        const audioDuration = Date.now() - audioStartTime
        if (audioBlob) {
          addStepLog(audioStep.id, `Audio captured: ${Math.round(audioBlob.size / 1024)}KB in ${audioDuration}ms`)
          updateStep(audioStep.id, {
            status: 'completed',
            output: { blobSize: audioBlob.size, blobType: audioBlob.type },
            duration: audioDuration,
          })
        } else {
          addStepLog(audioStep.id, `No audio track available`)
          updateStep(audioStep.id, {
            status: 'completed',
            output: { blobSize: 0, note: 'No audio track available' },
            duration: audioDuration,
          })
        }
      } catch (err) {
        console.warn('Audio capture failed, continuing without audio:', err)
        const errorMsg = match(err)
          .with(P.instanceOf(Error), (e) => e.message)
          .otherwise(() => 'Audio capture failed')
        addStepLog(audioStep.id, `Audio capture error: ${errorMsg}`)
        audioBlob = undefined
        updateStep(audioStep.id, {
          status: 'error',
          error: errorMsg,
          duration: Date.now() - audioStartTime,
        })
      }

      // Add to batch queue instead of processing immediately
      addToBatchQueue({
        word: currentWord.japanese,
        wordIndex: currentWordIndex,
        timestamp,
        videoBlob,
        audioBlob,
        stepOrder,
      })
      addStepLog(videoStep.id, `Added to batch queue (BPM 85: ${BPM_85_INTERVAL_MS}ms interval). Queue size: ${batchQueueLength + 1}`)
      setStepOrderCounter(prev => prev + 2) // Increment by 2 (video + audio steps)
    } catch (err) {
      console.error('Error capturing frames for batch:', err)
    }
  }, [stream, isRunning, currentWordIndex, stepOrderCounter, batchQueueLength, addToBatchQueue, createStep, updateStep, addStepLog])

  // BPM 85 batch processing timer with Pipeline
  useEffect(() => {
    if (!isRunning || !pipelineRef.current) return

    const processBatch = async () => {
      // Check if already analyzing
      if (isAnalyzing) {
        console.log('Already analyzing, skipping batch processing')
        return
      }
      
      // Use Jotai store to get and clear batch queue
      const itemsToProcess = processBatchQueue()
      
      // If no items to process, return early
      if (itemsToProcess.length === 0) return
      
      console.log(`[Pipeline] Processing batch: ${itemsToProcess.length} items`)
      
      setIsAnalyzing(true)
      
      try {
        // Process each item using the pipeline
        for (const item of itemsToProcess) {
          const analysisStep = createStep('process_predictions', item.stepOrder + 2, 'Analyze Emotions', 'Pipeline: Event-Driven + Validation + Monitoring', {
            word: item.word,
            wordIndex: item.wordIndex,
          })
          setAnalysisSteps(prev => [...prev, analysisStep])
          addStepLog(analysisStep.id, `[Pipeline] Processing batch item: ${item.word} (BPM 85 batch mode)`)

          const analysisStartTime = Date.now()
          
          try {
            // Execute pipeline with blobs from batch queue
            if (!pipelineRef.current) {
              console.error('[Pipeline] Pipeline not initialized')
              continue
            }
            
            const result = await pipelineRef.current.execute(
              { videoBlob: item.videoBlob, audioBlob: item.audioBlob },
              item.word,
              item.timestamp
            )
            
            const analysisDuration = Date.now() - analysisStartTime
            
            if (!result.wordEmotionData) {
              // Pipeline validation failed or no emotions detected
              addStepLog(analysisStep.id, `[Pipeline] No emotions detected or validation failed`)
              updateStep(analysisStep.id, {
                status: 'completed',
                output: { 
                  emotionCount: 0,
                  note: 'Pipeline: Validation failed or no emotions detected',
                  traceId: result.traceId,
                  executionTime: result.executionTime,
                },
                duration: analysisDuration,
              })
              continue
            }
            
            // Pipeline succeeded
            addStepLog(analysisStep.id, `[Pipeline] Completed in ${result.executionTime.toFixed(0)}ms (trace: ${result.traceId})`)
            addStepLog(analysisStep.id, `Detected ${result.wordEmotionData.emotions.length} emotions: ${result.wordEmotionData.emotions.slice(0, 3).map((e: any) => `${e.name}(${e.score.toFixed(2)})`).join(', ')}${result.wordEmotionData.emotions.length > 3 ? '...' : ''}`)
            
            updateStep(analysisStep.id, {
              status: 'completed',
              output: { 
                emotionCount: result.wordEmotionData.emotions.length,
                emotions: result.wordEmotionData.emotions.map((e: any) => ({ name: e.name, score: e.score })),
                processingTime: result.executionTime,
                traceId: result.traceId,
              },
              duration: analysisDuration,
            })

            // Add to Jotai store (with debouncing and duplicate prevention)
            addWordEmotionData({ data: result.wordEmotionData, options: { skipEmpty: true, debounceMs: 200 } })
            
            // Update complex data if available (pipeline already calculated it)
            if (result.complexData) {
              setComplexData(result.complexData)
            }
            
            // Update structure analysis if available
            if (result.structureAnalysis) {
              setStructureAnalysis({
                gapAreas: result.structureAnalysis.gapAreas,
                densityRegions: result.structureAnalysis.densityRegions,
                duplicates: result.structureAnalysis.duplicates,
                overallDensity: result.complexData?.regions?.length || 0,
              })
            }
            
            // Update demo steps after debounced update
            // Use setTimeout to wait for debounced update to complete
            setTimeout(() => {
              // Use ref to get latest wordEmotionData (avoids closure issues)
              const updated = wordEmotionDataRef.current
              
              // Update demo step for data collection
              setDemoSteps(prevSteps => {
                const dataCollectionStep = prevSteps.find(s => s.stepType === 'demo_data_collection')
                if (!dataCollectionStep) {
                  const newStep = createStep('demo_data_collection', 2, 'Data Collection', 'Collect emotion data from Hume AI', {
                    word: result.wordEmotionData?.word || item.word,
                    emotionCount: result.wordEmotionData?.emotions.length || 0,
                  })
                  addStepLog(newStep.id, `Collected data for word: ${result.wordEmotionData?.word || item.word}`)
                  addStepLog(newStep.id, `Emotions detected: ${result.wordEmotionData?.emotions.length || 0}`)
                  updateStep(newStep.id, {
                    status: 'completed',
                    output: { collectedWords: updated.length, totalEmotions: updated.reduce((sum, d) => sum + d.emotions.length, 0) },
                  })
                  return [...prevSteps, newStep]
                } else {
                  addStepLog(dataCollectionStep.id, `Updated: ${updated.length} words, ${updated.reduce((sum, d) => sum + d.emotions.length, 0)} total emotions`)
                  updateStep(dataCollectionStep.id, {
                    status: 'running',
                    output: { collectedWords: updated.length, totalEmotions: updated.reduce((sum, d) => sum + d.emotions.length, 0) },
                  })
                  return prevSteps
                }
              })
              
              // Complex space is already calculated by pipeline, but update visualization step
              if (result.complexData) {
                setDemoSteps(prev => {
                  const visualizationStep = prev.find(s => s.stepType === 'demo_visualization')
                  if (!visualizationStep && updated.length > 0) {
                  const newStep = createStep('demo_visualization', 3, 'Visualization', 'Update 3D Force Graph visualization', {
                    word: item.word,
                    wordCount: updated.length,
                  } as any)
                    addStepLog(newStep.id, `Starting visualization update for ${updated.length} words`)
                    updateStep(newStep.id, { status: 'running' })
                    return [...prev, newStep]
                  } else if (visualizationStep) {
                    addStepLog(visualizationStep.id, `Visualization updated: ${result.complexData?.regions.length || 0} regions, ${updated.length} nodes`)
                    updateStep(visualizationStep.id, {
                      status: 'completed',
                      output: {
                        regionCount: result.complexData?.regions.length || 0,
                        nodeCount: updated.length,
                      },
                    })
                  }
                  return prev
                })
              }
            }, 250) // Wait for debounce to complete
          } catch (err) {
            const errorMsg = match(err)
              .with(P.instanceOf(Error), (e) => e.message)
              .otherwise(() => 'Unknown error')
            addStepLog(analysisStep.id, `[Pipeline] Error: ${errorMsg}`)
            updateStep(analysisStep.id, {
              status: 'error',
              error: errorMsg,
              duration: Date.now() - analysisStartTime,
            })
            continue // Skip to next item on error
          }
        }
      } catch (err) {
        console.error('Error processing batch:', err)
      } finally {
        setIsAnalyzing(false)
      }
    }

    // Process immediately if queue has items, then set up interval
    processBatch()
    
    const timer = setInterval(processBatch, BPM_85_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [isRunning, batchQueueLength, isAnalyzing, processBatchQueue, createStep, updateStep, addStepLog])

  // Auto advance words
  useEffect(() => {
    if (!isRunning || currentWordIndex >= JUNG_STIMULUS_WORDS.length || hasError) {
      if (currentWordIndex >= JUNG_STIMULUS_WORDS.length) {
        setDemoSteps(prevSteps => {
          const demoCompleteStep = createStep('demo_complete', prevSteps.length, 'Demo Complete', 'All words processed', {})
          addStepLog(demoCompleteStep.id, `All ${JUNG_STIMULUS_WORDS.length} words processed`)
          addStepLog(demoCompleteStep.id, `Total emotion data collected: ${wordEmotionData.length} entries`)
          updateStep(demoCompleteStep.id, { status: 'completed' })
          return [...prevSteps, demoCompleteStep]
        })
      }
      setIsRunning(false)
      return
    }

    // Update demo step for word display
    setDemoSteps(prevSteps => {
      const wordDisplayStep = prevSteps.find(s => s.stepType === 'demo_word_display')
      if (wordDisplayStep) {
        const currentWord = JUNG_STIMULUS_WORDS[currentWordIndex]
        addStepLog(wordDisplayStep.id, `Displaying word ${currentWordIndex + 1}/${JUNG_STIMULUS_WORDS.length}: ${currentWord?.japanese}`)
        updateStep(wordDisplayStep.id, {
          status: 'running',
          metadata: { word: currentWord?.japanese, wordIndex: currentWordIndex },
        })
      }
      return prevSteps
    })

    const timer = setTimeout(() => {
      setCurrentWordIndex(prev => prev + 1)
    }, 3000)

    return () => clearTimeout(timer)
  }, [isRunning, currentWordIndex, hasError, createStep, updateStep, addStepLog, wordEmotionData, handleWordDisplayed])

  const handleStart = () => {
    setCurrentWordIndex(0)
    clearWordEmotionData()
    setComplexData(null)
    setAnalysisSteps([])
    setHasError(false)
    setError(null)
    clearBatchQueue()
    setStepOrderCounter(0)
    setIsRunning(true)

    // Create demo execution steps
    const demoStartStep = createStep('demo_start', 0, 'Demo Start', 'Initialize demo application (BPM 85 batch mode)', {})
    setDemoSteps([demoStartStep])
    addStepLog(demoStartStep.id, 'Demo application initialized')
    addStepLog(demoStartStep.id, `Total words: ${JUNG_STIMULUS_WORDS.length}`)
    addStepLog(demoStartStep.id, `Batch processing interval: ${BPM_85_INTERVAL_MS}ms (BPM 85)`)
    updateStep(demoStartStep.id, { status: 'completed' })

    const demoWordDisplayStep = createStep('demo_word_display', 1, 'Word Display', 'Display current word to user', {})
    setDemoSteps(prev => [...prev, demoWordDisplayStep])
    addStepLog(demoWordDisplayStep.id, 'Word display ready')
  }

  const handleStop = () => {
    setIsRunning(false)
  }

  const currentWord = JUNG_STIMULUS_WORDS[currentWordIndex]

  // Calculate dimensions for 3D Force Graph (main display) - use useEffect to avoid hydration mismatch
  const [dimensions, setDimensions] = React.useState({ width: 800, height: 600, rightPanelWidth: 400 })

  React.useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: Math.floor(window.innerWidth * 0.65), // 65% of screen width
        height: Math.floor(window.innerHeight * 0.9), // 90% of screen height
        rightPanelWidth: Math.floor(window.innerWidth * 0.35), // 35% of screen width
      })
    }
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  return (
    <div className="bg-gray-50 dark:bg-gray-900 overflow-hidden flex h-screen min-h-screen">
      {/* Left: 3D Force Graph (Main Display) */}
      <div className="flex-1 flex items-center justify-center min-w-0 p-4">
        {/* Always show 3D Force Graph - it will display initial nodes even without emotion data */}
        <div className="w-full h-full flex items-center justify-center">
          <ComplexForce3D
            width={dimensions.width}
            height={dimensions.height}
            maxFps={maxFps}
            showAnalysis={showAnalysis}
          />
        </div>
        {/* Remove the conditional rendering - ComplexForce3D handles empty data internally */}
        {false && (
          <div className="flex flex-col items-center justify-center text-center p-8">
            <div className="text-gray-400 dark:text-gray-600 mb-4">
              <svg className="w-24 h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="3D Force Graph">
                <title>3D Force Graph</title>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
              3D Force Graph
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              開始ボタンを押してデータを収集してください
            </p>
          </div>
        )}
      </div>

      {/* Right Panel */}
      <div className="flex flex-col bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-hidden" style={{ width: `${dimensions.rightPanelWidth}px`, minWidth: `${dimensions.rightPanelWidth}px` }}>
        {/* Top: Word Display (右上) */}
        <div className="flex-shrink-0 p-2 md:p-3 border-b border-gray-200 dark:border-gray-700">
          {currentWord && (
            <WordDisplay
              word={currentWord}
              currentIndex={currentWordIndex}
              totalWords={JUNG_STIMULUS_WORDS.length}
              onWordDisplayed={handleWordDisplayed}
              autoAdvance={isRunning}
              displayDuration={3000}
            />
          )}
        </div>

        {/* Middle: Debug Panel (中央) */}
        <div className="flex-shrink-0 p-2 md:p-3 border-b border-gray-200 dark:border-gray-700 overflow-y-auto overflow-x-hidden">
          <div className="mb-2">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Debug Panel
            </h3>
          </div>
          
          <div className="space-y-2">
            {/* Control Buttons */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleStart}
                disabled={isRunning || !stream || isRequestingMedia || hasError}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed touch-target hover:bg-blue-700 transition-colors"
              >
                {isRunning ? '実行中...' : hasError ? 'エラー - 再開始' : '開始'}
              </button>
              <button
                type="button"
                onClick={handleStop}
                disabled={!isRunning && !hasError}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed touch-target hover:bg-red-700 transition-colors"
              >
                停止
              </button>
            </div>

            {/* Debug Panel Toggle */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <label className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                <input
                  type="checkbox"
                  checked={showAnalysis}
                  onChange={(e) => setShowAnalysis(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <span>TypeGPU デバッグパネル表示</span>
              </label>
            </div>

            {/* FPS Control */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                最大FPS: {maxFps === 0 ? '無制限' : `${maxFps} FPS`}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="120"
                  step="5"
                  value={maxFps}
                  onChange={(e) => setMaxFps(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(maxFps / 120) * 100}%, #e5e7eb ${(maxFps / 120) * 100}%, #e5e7eb 100%)`
                  }}
                />
                <button
                  type="button"
                  onClick={() => setMaxFps(0)}
                  className={`px-2 py-1 text-xs rounded ${
                    maxFps === 0
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  無制限
                </button>
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>0</span>
                <span>30</span>
                <span>60</span>
                <span>90</span>
                <span>120</span>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              {isRequestingMedia && (
                <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                  <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span>カメラ・マイクへのアクセスを取得中...</span>
                </div>
              )}
              {!isRequestingMedia && stream && (
                <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Success">
                    <title>Success</title>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>カメラ・マイクが利用可能です</span>
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 text-xs text-red-600">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Error">
                    <title>Error</title>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}
              {isAnalyzing && !hasError && (
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span>感情分析中...</span>
                </div>
              )}
              {hasError && (
                <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 font-bold">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Error">
                    <title>Error</title>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>エラー: 実行停止</span>
                </div>
              )}
            </div>

            {/* Demo Execution Steps */}
            {demoSteps.length > 0 && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Demo Execution Steps
                </h4>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {demoSteps.map((step) => {
                    const statusColors = {
                      pending: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
                      running: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
                      completed: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
                      error: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
                    }
                    const statusIcons = {
                      pending: '○',
                      running: '⟳',
                      completed: '✓',
                      error: '✗',
                    }
                    return (
                      <div
                        key={step.id}
                        className={`text-xs p-1.5 rounded ${statusColors[step.status] || statusColors.pending}`}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-medium">
                            {statusIcons[step.status]} {step.stepOrder + 1}. {step.name}
                          </span>
                          {step.duration !== undefined && (
                            <span className="text-xs opacity-75">{step.duration}ms</span>
                          )}
                        </div>
                        {step.output && (
                          <div className="text-xs opacity-75 mt-0.5">
                            {step.output.collectedWords !== undefined && (
                              <span>Words: {step.output.collectedWords} </span>
                            )}
                            {step.output.totalEmotions !== undefined && (
                              <span>Emotions: {step.output.totalEmotions} </span>
                            )}
                            {step.output.regionCount !== undefined && (
                              <span>Regions: {step.output.regionCount} </span>
                            )}
                            {step.output.nodeCount !== undefined && (
                              <span>Nodes: {step.output.nodeCount} </span>
                            )}
                          </div>
                        )}
                        {step.error && (
                          <div className="text-xs opacity-75 mt-0.5 truncate text-red-600 font-bold" title={step.error}>
                            Error: {step.error}
                          </div>
                        )}
                        {step.logs && step.logs.length > 0 && (
                          <details className="mt-1">
                            <summary className="text-xs opacity-75 cursor-pointer hover:opacity-100">
                              Logs ({step.logs.length})
                            </summary>
                            <div className="mt-1 ml-2 space-y-0.5 max-h-24 overflow-y-auto bg-black/10 dark:bg-white/10 rounded p-1 text-xs font-mono">
                              {step.logs.slice(-10).map((log, idx) => (
                                <div key={idx} className="text-xs opacity-75 break-words">
                                  {log}
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Analysis Steps */}
            {analysisSteps.length > 0 && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Analysis Steps
                </h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {analysisSteps.map((step) => {
                    const statusColors = {
                      pending: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
                      running: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
                      completed: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
                      error: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
                    }
                    const statusIcons = {
                      pending: '○',
                      running: '⟳',
                      completed: '✓',
                      error: '✗',
                    }
                    return (
                      <div
                        key={step.id}
                        className={`text-xs p-1.5 rounded ${statusColors[step.status] || statusColors.pending}`}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-medium">
                            {statusIcons[step.status]} {step.stepOrder + 1}. {step.name}
                          </span>
                          {step.duration !== undefined && (
                            <span className="text-xs opacity-75">{step.duration}ms</span>
                          )}
                        </div>
                        {step.output && (
                          <div className="text-xs opacity-75 mt-0.5">
                            {step.output.emotionCount !== undefined && (
                              <span className={step.output.emotionCount === 0 ? 'text-red-600 font-bold' : ''}>
                                Emotions: {step.output.emotionCount}{' '}
                              </span>
                            )}
                            {step.output.blobSize !== undefined && (
                              <span>Size: {Math.round(step.output.blobSize / 1024)}KB </span>
                            )}
                            {step.output.regionCount !== undefined && (
                              <span>Regions: {step.output.regionCount} </span>
                            )}
                          </div>
                        )}
                        {step.error && (
                          <div className="text-xs opacity-75 mt-0.5 truncate text-red-600 font-bold" title={step.error}>
                            Error: {step.error}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Error Display */}
            {hasError && (
              <div className="pt-2 border-t border-red-300 dark:border-red-700">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2">
                  <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-400 font-bold mb-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Error">
                      <title>Error</title>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>エラー: 実行が停止されました</span>
                  </div>
                  {error && (
                    <div className="text-xs text-red-600 dark:text-red-400">
                      {error}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Data Summary */}
            {wordEmotionData.length > 0 && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  データサマリー
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-50 dark:bg-gray-900 rounded p-2">
                    <div className="text-gray-600 dark:text-gray-400">処理済み</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {wordEmotionData.length}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded p-2">
                    <div className="text-gray-600 dark:text-gray-400">感情数</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {wordEmotionData.reduce((sum, d) => sum + d.emotions.length, 0)}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded p-2">
                    <div className="text-gray-600 dark:text-gray-400">Complex領域</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {complexData?.regions.length || 0}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded p-2">
                    <div className="text-gray-600 dark:text-gray-400">平均時間</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {wordEmotionData.length > 0
                        ? Math.round(
                            wordEmotionData.reduce((sum, d) => sum + (d.reactionTime || 0), 0) /
                              wordEmotionData.length
                          )
                        : 0}
                      ms
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom: Structure Analysis (右下) */}
        <div className="flex-1 overflow-y-auto p-2 md:p-3">
          {wordEmotionData.length > 0 ? (
            <>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                構造分析
              </h3>
              <StructureAnalysis
                gapAreas={structureAnalysis.gapAreas}
                densityRegions={structureAnalysis.densityRegions}
                duplicates={structureAnalysis.duplicates}
                overallDensity={structureAnalysis.overallDensity}
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-center">
              <p className="text-xs text-gray-400 dark:text-gray-600">
                データ収集後に表示されます
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

