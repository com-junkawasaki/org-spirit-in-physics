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
import { detectGapAreas, analyzeDensity, detectDuplicates } from '@spirit-in-physics/visualization-components/src/lib/structure-analysis'
import type { WordEmotionData, ComplexSpaceData } from '../types/demo'
import type { WordNode, WordLink } from '@spirit-in-physics/visualization-components/src/timeline/types'

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

  // Request media access
  useEffect(() => {
    const requestMedia = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: true,
        })
        setStream(mediaStream)
      } catch (err) {
        setError('カメラ/マイクへのアクセスが必要です')
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
            リアルタイムComplex可視化デモ
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Jung単語連合テスト × Hume AI感情分析 × 3D Force Graph
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleStart}
              disabled={isRunning || !stream}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium disabled:bg-gray-400 disabled:cursor-not-allowed touch-target"
            >
              {isRunning ? '実行中...' : '開始'}
            </button>
            <button
              onClick={handleStop}
              disabled={!isRunning}
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium disabled:bg-gray-400 disabled:cursor-not-allowed touch-target"
            >
              停止
            </button>
            {error && (
              <div className="text-red-600 text-sm">{error}</div>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 3D Force Graph */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                3D Force Graph
              </h2>
              <div className="w-full overflow-auto">
                <ComplexForce3D
                  wordEmotionData={wordEmotionData}
                  width={Math.min(800, typeof window !== 'undefined' ? window.innerWidth - 64 : 800)}
                  height={600}
                />
              </div>
            </div>

            {/* Complex Visualization */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
              <ComplexVisualization
                complexData={complexData}
                width={Math.min(800, typeof window !== 'undefined' ? window.innerWidth - 64 : 800)}
                height={600}
              />
            </div>
          </div>
        )}

        {/* Structure Analysis */}
        {wordEmotionData.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              データサマリー
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">処理済み単語</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {wordEmotionData.length}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">検出感情数</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {wordEmotionData.reduce((sum, d) => sum + d.emotions.length, 0)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Complex領域</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {complexData?.regions.length || 0}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">平均反応時間</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
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

      <style>{`
        .touch-target {
          min-height: 44px;
          min-width: 44px;
        }
        @media (max-width: 768px) {
          /* iPad portrait optimization */
          .grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          /* iPad landscape optimization */
          .grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        /* Prevent text selection on touch devices */
        @media (hover: none) {
          * {
            -webkit-tap-highlight-color: transparent;
            -webkit-touch-callout: none;
          }
        }
      `}</style>
    </div>
  )
}

