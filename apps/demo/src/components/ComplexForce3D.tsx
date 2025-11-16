// Merkle DAG: components.complex_force_3d
// 3D Force Graph wrapper for Complex visualization

import React, { useMemo, lazy, Suspense, useState, useEffect } from 'react'
import type { WordNode, WordLink } from '@spirit-in-physics/visualization-components'
import type { WordEmotionData } from '../types/demo'
import { JUNG_STIMULUS_WORDS } from '../lib/jung-words'
import { EMOTION_KEYS } from '@spirit-in-physics/visualization-components'

const Force3DWordGraphTypeGPU = lazy(() => 
  import('@spirit-in-physics/visualization-components').then(module => ({ default: module.Force3DWordGraphTypeGPU }))
)

interface ComplexForce3DProps {
  wordEmotionData: WordEmotionData[]
  width?: number
  height?: number
  springK?: number
  repulsionK?: number
  restLength?: number
  damping?: number
  shellRadius?: number
  shellK?: number
  radialOutK?: number
  minSep?: number
  sepK?: number
}

export default function ComplexForce3D({
  wordEmotionData,
  width = 800,
  height = 600,
  springK = 2.0,
  repulsionK = 2000,
  restLength = 80,
  damping = 0.92,
  shellRadius = 300,
  shellK = 1.5,
  radialOutK = 120,
  minSep = 80,
  sepK = 8000,
}: ComplexForce3DProps) {
  const [webGpuAvailable, setWebGpuAvailable] = useState<boolean | null>(null)
  const [loadError, setLoadError] = useState<Error | null>(null)

  // Check WebGPU availability
  useEffect(() => {
    if (typeof window !== 'undefined' && 'gpu' in navigator) {
      // @ts-ignore - WebGPU API
      navigator.gpu.requestAdapter()
        .then(() => setWebGpuAvailable(true))
        .catch(() => setWebGpuAvailable(false))
    } else {
      setWebGpuAvailable(false)
    }
  }, [])
  const graphData = useMemo(() => {
    if (wordEmotionData.length === 0) {
      return { nodes: [] as WordNode[], links: [] as WordLink[] }
    }

    try {
      // Aggregate emotion vectors per word
      const wordEmotionSum: Record<string, number[]> = {}
      JUNG_STIMULUS_WORDS.forEach(({ japanese }) => {
        wordEmotionSum[japanese] = new Array(EMOTION_KEYS.length).fill(0)
      })

      for (const data of wordEmotionData) {
        if (!wordEmotionSum[data.word]) continue
        for (const emotion of data.emotions) {
          const idx = EMOTION_KEYS.indexOf(emotion.name as any)
          if (idx >= 0) {
            wordEmotionSum[data.word][idx] += emotion.score
          }
        }
      }

      // Normalize emotion vectors
      const normalize = (vec: number[]): number[] => {
        const norm = Math.hypot(...vec)
        if (!Number.isFinite(norm) || norm === 0) return vec.map(() => 0)
        return vec.map((x) => x / norm)
      }

      const normalizedEmotionVec: Record<string, number[]> = {}
      JUNG_STIMULUS_WORDS.forEach(({ japanese }) => {
        normalizedEmotionVec[japanese] = normalize(wordEmotionSum[japanese] || new Array(EMOTION_KEYS.length).fill(0))
      })

      // Create emotion anchor nodes (define before using)
      const anchor2d: Array<{ name: string; x: number; y: number; color: string }> = [
        { name: 'Joy', x: 0.15, y: 0.85, color: '#f59e0b' },
        { name: 'Sadness', x: 0.70, y: 0.45, color: '#1f2937' },
        { name: 'Anger', x: 0.82, y: 0.25, color: '#ef4444' },
        { name: 'Fear', x: 0.92, y: 0.10, color: '#a78bfa' },
        { name: 'Disgust', x: 0.78, y: 0.52, color: '#10b981' },
        { name: 'Calmness', x: 0.28, y: 0.70, color: '#93c5fd' },
        { name: 'Interest', x: 0.35, y: 0.55, color: '#60a5fa' },
        { name: 'Surprise', x: 0.40, y: 0.20, color: '#22c55e' },
        { name: 'Confusion', x: 0.48, y: 0.35, color: '#64748b' },
        { name: 'Determination', x: 0.22, y: 0.85, color: '#f97316' },
      ]

      const anchorToKey: Record<string, typeof EMOTION_KEYS[number]> = {
        Joy: 'joy',
        Sadness: 'sadness',
        Anger: 'anger',
        Fear: 'fear',
        Disgust: 'disgust',
        Calmness: 'calm',
        Interest: 'focus',
        Surprise: 'surprise',
        Confusion: 'confusion',
        Determination: 'excitement',
      }

      const toSphere = (x01: number, y01: number): [number, number, number] => {
        const u = (x01 - 0.5) * Math.PI * 1.6
        const v = (y01 - 0.5) * Math.PI
        const cx = Math.cos(v) * Math.cos(u)
        const cy = Math.cos(v) * Math.sin(u)
        const cz = Math.sin(v)
        return [shellRadius * cx, shellRadius * cy, shellRadius * cz]
      }

      // Create nodes (after anchor2d and toSphere are defined)
      const nodes: WordNode[] = JUNG_STIMULUS_WORDS.map((word, idx) => {
        const emotionVec = normalizedEmotionVec[word.japanese] || new Array(EMOTION_KEYS.length).fill(0)
        const magnitude = Math.hypot(...emotionVec)
        const count = wordEmotionData.filter(d => d.word === word.japanese).length

        // Calculate initial position based on emotion vectors (weighted centroid of connected anchors)
        let initial: [number, number, number] | undefined
        if (magnitude > 0) {
          // Find top emotions
          const topEmotions = emotionVec
            .map((val, i) => ({ idx: i, val }))
            .sort((a, b) => b.val - a.val)
            .slice(0, 3)
            .filter(e => e.val > 0)

          if (topEmotions.length > 0) {
            // Calculate weighted position from emotion anchors
            const anchorPositions = anchor2d.map(a => toSphere(a.x, a.y))
            let sumX = 0, sumY = 0, sumZ = 0, sumW = 0

            // Map EMOTION_KEYS indices to anchor2d indices
            // EMOTION_KEYS: ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'calm', 'focus', 'excitement', 'confusion']
            // anchor2d: ['Joy', 'Sadness', 'Anger', 'Fear', 'Disgust', 'Calmness', 'Interest', 'Surprise', 'Confusion', 'Determination']
            const emotionToAnchorMap: Record<number, number> = {
              0: 0, // joy -> Joy
              1: 1, // sadness -> Sadness
              2: 2, // anger -> Anger
              3: 3, // fear -> Fear
              4: 7, // surprise -> Surprise
              5: 4, // disgust -> Disgust
              6: 5, // calm -> Calmness
              7: 6, // focus -> Interest
              8: 9, // excitement -> Determination
              9: 8, // confusion -> Confusion
            }

            for (const { idx: emotionIdx, val } of topEmotions) {
              const anchorIdx = emotionToAnchorMap[emotionIdx] ?? 0
              if (anchorIdx < anchorPositions.length) {
                const pos = anchorPositions[anchorIdx]
                sumX += pos[0] * val
                sumY += pos[1] * val
                sumZ += pos[2] * val
                sumW += val
              }
            }

            if (sumW > 0) {
              initial = [
                (sumX / sumW) * 0.65, // Inside shell
                (sumY / sumW) * 0.65,
                (sumZ / sumW) * 0.65,
              ]
            }
          }
        }

        return {
          id: String(idx),
          label: word.japanese,
          scale: Math.max(0.5, Math.min(6, 0.5 + magnitude * 5 + count * 0.1)),
          nodeType: 'word',
          initial,
        }
      })

      const anchorNodes: WordNode[] = anchor2d.map((a, idx) => {
        const [x, y, z] = toSphere(a.x, a.y)
        return {
          id: `A${idx}`,
          label: a.name,
          scale: 6,
          fixed: true,
          nodeType: 'anchor',
          initial: [x, y, z],
          color: a.color,
        }
      })

      // Create links
      const links: WordLink[] = []
      const baseOffset = nodes.length
      const allNodes = [...anchorNodes, ...nodes]

      for (let wi = 0; wi < nodes.length; wi++) {
        const wordIndex = baseOffset + wi
        const label = nodes[wi].label
        const ei = normalizedEmotionVec[label] || new Array(10).fill(0)

        // Calculate weights for each anchor
        const weights: Array<{ ai: number; w: number }> = anchorNodes.map((a, ai) => {
          const key = anchorToKey[a.label] as typeof EMOTION_KEYS[number] | undefined
          const kIdx = key ? EMOTION_KEYS.indexOf(key) : -1
          const sim = kIdx >= 0 ? (ei[kIdx] || 0) : 0
          return { ai, w: sim }
        })

        // Top-K selection
        weights.sort((a, b) => b.w - a.w)
        const topK = 3
        const chosen = weights.filter(x => x.w > 0).slice(0, topK)

        // Create links
        for (const c of chosen) {
          const w = Math.max(0, Math.min(1, c.w))
          const L0 = Math.max(20, restLength * (1 - 0.6 * w))
          const k = springK * (0.3 + 0.7 * w)
          const alpha = Math.max(0.12, Math.min(0.95, 0.12 + 0.88 * w))
          const anchor = anchorNodes[c.ai]
          const color = anchor.color ? `rgba(${parseInt(anchor.color.slice(1,3),16)}, ${parseInt(anchor.color.slice(3,5),16)}, ${parseInt(anchor.color.slice(5,7),16)}, ${alpha.toFixed(3)})` : undefined

          links.push({
            source: c.ai,
            target: wordIndex,
            weight: w,
            mode: 'tension',
            L0,
            k,
            color,
          })
        }
      }

      return { nodes: allNodes, links }
    } catch (error) {
      console.error('3Dグラフ生成エラー:', error)
      return { nodes: [] as WordNode[], links: [] as WordLink[] }
    }
  }, [wordEmotionData, shellRadius, restLength, springK])

  // Error boundary component for WebGPU errors
  const ErrorFallback = ({ error }: { error: Error | null }) => (
    <div className="flex flex-col items-center justify-center border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 p-8" style={{ width, height }}>
      <div className="text-red-600 dark:text-red-400 mb-2">
        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
        {webGpuAvailable === false ? 'WebGPUが利用できません' : '3D可視化の読み込みに失敗しました'}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-md">
        {webGpuAvailable === false
          ? 'お使いのブラウザはWebGPUに対応していません。Chrome 113以降、Edge 113以降、またはSafari 18以降をご使用ください。'
          : error?.message || '3D Force Graphの初期化中にエラーが発生しました。'}
      </p>
    </div>
  )

  if (graphData.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900" style={{ width, height }}>
        <p className="text-gray-500 dark:text-gray-400">データがありません</p>
      </div>
    )
  }

  // Show error if WebGPU is not available
  if (webGpuAvailable === false) {
    return <ErrorFallback error={null} />
  }

  // Show error if load error occurred
  if (loadError) {
    return <ErrorFallback error={loadError} />
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden flex items-center justify-center" style={{ width, height }}>
      <Suspense 
        fallback={
          <div className="flex items-center justify-center border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 p-8" style={{ width, height }}>
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400">3D可視化を読み込み中...</p>
            </div>
          </div>
        }
      >
        <Force3DWordGraphTypeGPU
          nodes={graphData.nodes}
          links={graphData.links}
          width={width}
          height={height}
          physics={{
            springK,
            repulsionK,
            damping,
            restLength,
            maxSpeed: 200,
            shellRadius,
            shellK,
            radialOutK,
            constraintIters: 2,
            constraintStiffness: 0.5,
            minSep,
            sepK,
          }}
        />
      </Suspense>
    </div>
  )
}

