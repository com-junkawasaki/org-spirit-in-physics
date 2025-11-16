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

  // Handle word display event
  const handleWordDisplayed = useCallback(async () => {
    if (!stream || isAnalyzing) return

    setIsAnalyzing(true)
    const currentWord = JUNG_STIMULUS_WORDS[currentWordIndex]
    const timestamp = Date.now()

    try {
      // Capture video/audio frames
      const videoBlob = await captureVideoFrame(stream, 2000)
      const audioBlob = await captureAudioFrame(stream, 2000)

      // Analyze emotions with Hume AI
      const analysisResult = await analyzeEmotionRealtime(videoBlob, audioBlob || undefined)

      // Update word emotion data
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
        const updated = [...prev, newData]
        
        // Calculate Complex space
        const complex = calculateComplexSpace(updated)
        setComplexData(complex)

        // Run structure analysis (debounced - every 5 words)
        if (updated.length % 5 === 0 && updated.length > 0) {
          // Note: Structure analysis requires 3D graph data
          // For now, we'll calculate it from Complex data
          // In production, get actual graph data from ComplexForce3D
          try {
            // Simplified structure analysis based on Complex regions
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

        return updated
      })
    } catch (err) {
      console.error('Error analyzing word:', err)
    } finally {
      setIsAnalyzing(false)
    }
  }, [stream, currentWordIndex, isAnalyzing])

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
    setIsRunning(true)
  }

  const handleStop = () => {
    setIsRunning(false)
  }

  const currentWord = JUNG_STIMULUS_WORDS[currentWordIndex]

  return (
    <div className="bg-gray-50 dark:bg-gray-900 overflow-hidden flex flex-col" style={{ height: '100vh', minHeight: '100vh' }}>
      <div className="flex-1 overflow-y-auto p-2 md:p-3" style={{ minHeight: 0 }}>
        <div className="max-w-full mx-auto space-y-2 md:space-y-3">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 md:p-3">
          <h1 className="text-lg md:text-xl font-bold mb-1 text-gray-900 dark:text-white">
            リアルタイムComplex可視化デモ
          </h1>
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
            Jung単語連合テスト × Hume AI感情分析 × 3D Force Graph
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 md:p-3">
          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            <button
              onClick={handleStart}
              disabled={isRunning || !stream || isRequestingMedia}
              className="px-4 py-2 md:px-6 md:py-3 bg-blue-600 text-white rounded-lg text-sm md:text-base font-medium disabled:bg-gray-400 disabled:cursor-not-allowed touch-target"
            >
              {isRunning ? '実行中...' : '開始'}
            </button>
            <button
              onClick={handleStop}
              disabled={!isRunning}
              className="px-4 py-2 md:px-6 md:py-3 bg-red-600 text-white rounded-lg text-sm md:text-base font-medium disabled:bg-gray-400 disabled:cursor-not-allowed touch-target"
            >
              停止
            </button>
            {isRequestingMedia && (
              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span>カメラ・マイクへのアクセスを取得中...</span>
              </div>
            )}
            {!isRequestingMedia && stream && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>カメラ・マイクが利用可能です</span>
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}
            {isAnalyzing && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span>感情分析中...</span>
              </div>
            )}
          </div>
        </div>

        {/* Word Display */}
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

        {/* Visualizations Grid */}
        {wordEmotionData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
            {/* 3D Force Graph */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 md:p-3">
              <h2 className="text-sm md:text-base font-semibold mb-2 text-gray-900 dark:text-white">
                3D Force Graph
              </h2>
              <div className="w-full overflow-auto">
                <ComplexForce3D
                  wordEmotionData={wordEmotionData}
                  width={typeof window !== 'undefined' ? Math.min(400, window.innerWidth / 2 - 32) : 400}
                  height={typeof window !== 'undefined' ? Math.min(300, (window.innerHeight - 400) / 2) : 300}
                />
              </div>
            </div>

            {/* Complex Visualization */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 md:p-3">
              <ComplexVisualization
                complexData={complexData}
                width={typeof window !== 'undefined' ? Math.min(400, window.innerWidth / 2 - 32) : 400}
                height={typeof window !== 'undefined' ? Math.min(300, (window.innerHeight - 400) / 2) : 300}
              />
            </div>
          </div>
        )}

        {/* Structure Analysis */}
        {wordEmotionData.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 md:p-3">
            <h3 className="text-sm md:text-base font-semibold mb-2 text-gray-900 dark:text-white">
              構造分析
            </h3>
            <StructureAnalysis
              gapAreas={structureAnalysis.gapAreas}
              densityRegions={structureAnalysis.densityRegions}
              duplicates={structureAnalysis.duplicates}
              overallDensity={structureAnalysis.overallDensity}
            />
          </div>
        )}

        {/* Data Summary */}
        {wordEmotionData.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 md:p-3">
            <h2 className="text-sm md:text-base font-semibold mb-2 text-gray-900 dark:text-white">
              データサマリー
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
              <div>
                <div className="text-xs md:text-sm text-gray-600 dark:text-gray-400">処理済み単語</div>
                <div className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                  {wordEmotionData.length}
                </div>
              </div>
              <div>
                <div className="text-xs md:text-sm text-gray-600 dark:text-gray-400">検出感情数</div>
                <div className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                  {wordEmotionData.reduce((sum, d) => sum + d.emotions.length, 0)}
                </div>
              </div>
              <div>
                <div className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Complex領域</div>
                <div className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                  {complexData?.regions.length || 0}
                </div>
              </div>
              <div>
                <div className="text-xs md:text-sm text-gray-600 dark:text-gray-400">平均反応時間</div>
                <div className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
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

    </div>
  )
}

