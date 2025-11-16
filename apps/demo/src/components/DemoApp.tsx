// Merkle DAG: components.demo_app
// Main demo app component

import React, { useState, useEffect, useCallback } from 'react'
import WordDisplay from './WordDisplay'
import ComplexForce3D from './ComplexForce3D'
import ComplexVisualization from './ComplexVisualization'
import StructureAnalysis from './StructureAnalysis'
import { JUNG_STIMULUS_WORDS } from '../lib/jung-words'
import { analyzeEmotionRealtime, captureVideoFrame, captureAudioFrame } from '../lib/hume-realtime'
import { calculateComplexSpace } from '../lib/complex-calculator'
import type { WordEmotionData, ComplexSpaceData } from '../types/demo'
import type { AnalysisStep, StepType, StepStatus, StepMetadata } from '../types/step'

export default function DemoApp() {
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [wordEmotionData, setWordEmotionData] = useState<WordEmotionData[]>([])
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
        stream.getTracks().forEach(track => track.stop())
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
        ? { ...step, ...updates, completedAt: updates.status === 'completed' || updates.status === 'error' ? Date.now() : step.completedAt }
        : step
    ))
  }, [])

  // Handle word display event
  const handleWordDisplayed = useCallback(async () => {
    if (!stream) return
    
    // Prevent concurrent analysis
    setIsAnalyzing(prev => {
      if (prev) {
        console.log('Already analyzing, skipping...')
        return prev // Already analyzing, skip
      }
      return true
    })
    
    // Double-check after state update (async state update)
    if (isAnalyzing) {
      console.log('Already analyzing (state check), skipping...')
      return
    }

    const currentWord = JUNG_STIMULUS_WORDS[currentWordIndex]
    const timestamp = Date.now()
    let stepOrder = 0

    // Clear previous steps for this word
    setAnalysisSteps([])

    try {
      // Step 1: Capture video
      const videoStep = createStep('capture_video', stepOrder++, 'Capture Video', 'Capture video frame from MediaStream', {
        word: currentWord.japanese,
        wordIndex: currentWordIndex,
      })
      setAnalysisSteps(prev => [...prev, videoStep])
      
      let videoBlob: Blob
      const videoStartTime = Date.now()
      try {
        videoBlob = await captureVideoFrame(stream, 2000)
        const videoDuration = Date.now() - videoStartTime
        updateStep(videoStep.id, {
          status: 'completed',
          output: { blobSize: videoBlob.size, blobType: videoBlob.type },
          duration: videoDuration,
        })
      } catch (err) {
        console.warn('Video capture failed, using empty blob:', err)
        videoBlob = new Blob([], { type: 'video/webm' })
        updateStep(videoStep.id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Video capture failed',
          duration: Date.now() - videoStartTime,
        })
      }
      
      // Step 2: Capture audio
      const audioStep = createStep('capture_audio', stepOrder++, 'Capture Audio', 'Capture audio frame from MediaStream', {
        word: currentWord.japanese,
        wordIndex: currentWordIndex,
      })
      setAnalysisSteps(prev => [...prev, audioStep])
      
      let audioBlob: Blob | undefined
      const audioStartTime = Date.now()
      try {
        audioBlob = await captureAudioFrame(stream, 2000) || undefined
        const audioDuration = Date.now() - audioStartTime
        if (audioBlob) {
          updateStep(audioStep.id, {
            status: 'completed',
            output: { blobSize: audioBlob.size, blobType: audioBlob.type },
            duration: audioDuration,
          })
        } else {
          updateStep(audioStep.id, {
            status: 'completed',
            output: { blobSize: 0, note: 'No audio track available' },
            duration: audioDuration,
          })
        }
      } catch (err) {
        console.warn('Audio capture failed, continuing without audio:', err)
        audioBlob = undefined
        updateStep(audioStep.id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Audio capture failed',
          duration: Date.now() - audioStartTime,
        })
      }

      // Step 3: Analyze emotions with Hume AI
      const analysisStep = createStep('process_predictions', stepOrder++, 'Analyze Emotions', 'Call Hume AI API and process predictions', {
        word: currentWord.japanese,
        wordIndex: currentWordIndex,
      })
      setAnalysisSteps(prev => [...prev, analysisStep])
      
      const analysisStartTime = Date.now()
      const analysisResult = await analyzeEmotionRealtime(videoBlob, audioBlob)
      const analysisDuration = Date.now() - analysisStartTime
      
      updateStep(analysisStep.id, {
        status: 'completed',
        output: { 
          emotionCount: analysisResult.emotions.length,
          emotions: analysisResult.emotions.map(e => ({ name: e.name, score: e.score })),
          processingTime: analysisResult.processingTime,
        },
        duration: analysisDuration,
      })

      // Step 4: Update word emotion data
      const updateStep_ = createStep('update_data', stepOrder++, 'Update Word Emotion Data', 'Update word emotion data state', {
        word: currentWord.japanese,
        wordIndex: currentWordIndex,
        emotionCount: analysisResult.emotions.length,
      })
      setAnalysisSteps(prev => [...prev, updateStep_])
      
      const updateStartTime = Date.now()
      const newData: WordEmotionData = {
        word: currentWord.japanese,
        timestamp,
        emotions: analysisResult.emotions,
        reactionTime: analysisResult.processingTime,
        reactionValue: analysisResult.emotions.length > 0
          ? analysisResult.emotions.reduce((sum, e) => sum + e.score, 0) / analysisResult.emotions.length
          : 0,
      }

      setWordEmotionData(prev => {
        // Prevent duplicate entries for the same word at the same timestamp
        const isDuplicate = prev.some(d => d.word === newData.word && Math.abs(d.timestamp - newData.timestamp) < 1000)
        if (isDuplicate) {
          console.log('Duplicate word data detected, skipping:', newData.word)
          updateStep(updateStep_.id, {
            status: 'error',
            error: 'Duplicate word data detected',
            duration: Date.now() - updateStartTime,
          })
          return prev
        }
        
        const updated = [...prev, newData]
        
        // Step 5: Calculate Complex space
        const complexStep = createStep('calculate_complex', stepOrder++, 'Calculate Complex Space', 'Calculate Complex space from emotion data', {
          word: currentWord.japanese,
          wordIndex: currentWordIndex,
        })
        setAnalysisSteps(prev => [...prev, complexStep])
        
        const complexStartTime = Date.now()
        let complex: ComplexSpaceData | null = null
        try {
          complex = calculateComplexSpace(updated)
          setComplexData(complex)
          updateStep(complexStep.id, {
            status: 'completed',
            output: {
              regionCount: complex.regions.length,
              informationSpace: complex.informationSpace.length,
              biologicalSpace: complex.biologicalSpace.length,
            },
            duration: Date.now() - complexStartTime,
          })
        } catch (err) {
          updateStep(complexStep.id, {
            status: 'error',
            error: err instanceof Error ? err.message : 'Complex calculation failed',
            duration: Date.now() - complexStartTime,
          })
        }

        // Run structure analysis (debounced - every 5 words)
        if (updated.length % 5 === 0 && updated.length > 0 && complex) {
          try {
            const overallDensity = complex.regions.length > 0
              ? complex.regions.reduce((sum, r) => sum + r.intensity, 0) / complex.regions.length
              : 0

            setStructureAnalysis({
              gapAreas: [],
              densityRegions: complex.regions.map(r => ({
                id: r.id,
                center: r.center,
                radius: r.radius,
                isOvercrowded: r.intensity > 0.5,
                nodeCount: r.words.length,
              })),
              duplicates: [],
              overallDensity,
            })
          } catch (err) {
            console.error('Structure analysis error:', err)
          }
        }

        updateStep(updateStep_.id, {
          status: 'completed',
          output: { word: newData.word, emotionCount: newData.emotions.length },
          duration: Date.now() - updateStartTime,
        })

        return updated
      })
    } catch (err) {
      console.error('Error analyzing word:', err)
      // Even on error, add empty data to show progress
      const errorData: WordEmotionData = {
        word: currentWord.japanese,
        timestamp,
        emotions: [],
        reactionTime: 0,
        reactionValue: 0,
      }
      setWordEmotionData(prev => {
        const isDuplicate = prev.some(d => d.word === errorData.word && Math.abs(d.timestamp - errorData.timestamp) < 1000)
        if (isDuplicate) return prev
        return [...prev, errorData]
      })
    } finally {
      setIsAnalyzing(false)
    }
  }, [stream, currentWordIndex, createStep, updateStep, isAnalyzing])

  // Auto advance words
  useEffect(() => {
    if (!isRunning || currentWordIndex >= JUNG_STIMULUS_WORDS.length) {
      setIsRunning(false)
      return
    }

    const timer = setTimeout(() => {
      setCurrentWordIndex(prev => prev + 1)
    }, 3000)

    return () => clearTimeout(timer)
  }, [isRunning, currentWordIndex])

  const handleStart = () => {
    setCurrentWordIndex(0)
    setWordEmotionData([])
    setComplexData(null)
    setAnalysisSteps([])
    setIsRunning(true)
  }

  const handleStop = () => {
    setIsRunning(false)
  }

  const currentWord = JUNG_STIMULUS_WORDS[currentWordIndex]

  // Calculate dimensions for 3D Force Graph (main display)
  const forceGraphWidth = typeof window !== 'undefined' 
    ? Math.floor(window.innerWidth * 0.65) // 65% of screen width
    : 800
  const forceGraphHeight = typeof window !== 'undefined'
    ? Math.floor(window.innerHeight * 0.9) // 90% of screen height
    : 600

  // Right panel width (35% of screen width)
  const rightPanelWidth = typeof window !== 'undefined'
    ? Math.floor(window.innerWidth * 0.35)
    : 400

  return (
    <div className="bg-gray-50 dark:bg-gray-900 overflow-hidden flex" style={{ height: '100vh', minHeight: '100vh' }}>
      {/* Left: 3D Force Graph (Main Display) */}
      <div className="flex-1 flex items-center justify-center" style={{ minWidth: 0, padding: '1rem' }}>
        {wordEmotionData.length > 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <ComplexForce3D
              wordEmotionData={wordEmotionData}
              width={forceGraphWidth}
              height={forceGraphHeight}
            />
          </div>
        ) : (
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
      <div className="flex flex-col bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-hidden" style={{ width: rightPanelWidth, minWidth: rightPanelWidth }}>
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
                disabled={isRunning || !stream || isRequestingMedia}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed touch-target hover:bg-blue-700 transition-colors"
              >
                {isRunning ? '実行中...' : '開始'}
              </button>
              <button
                type="button"
                onClick={handleStop}
                disabled={!isRunning}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed touch-target hover:bg-red-700 transition-colors"
              >
                停止
              </button>
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
              {isAnalyzing && (
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span>感情分析中...</span>
                </div>
              )}
            </div>

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
                              <span>Emotions: {step.output.emotionCount} </span>
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
                          <div className="text-xs opacity-75 mt-0.5 truncate" title={step.error}>
                            Error: {step.error}
                          </div>
                        )}
                      </div>
                    )
                  })}
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

