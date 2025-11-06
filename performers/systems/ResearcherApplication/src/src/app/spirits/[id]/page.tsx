'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { WordNode, WordLink } from '@spirit-in-physics/visualizer/types'
import { RefreshCw } from 'lucide-react'

// Merkle DAG: participants.detail -> participant_analysis_page
// 参加者詳細分析ページ
// 依存関係: @visualizer/Force3DWordGraphTypeGPU, api/participants/[id]/word2vec

// 3D可視化コンポーネントを動的インポート（SSR無効化）
const Force3DWordGraphTypeGPU = dynamic(
  () => import('@spirit-in-physics/visualizer').then(mod => ({ default: mod.Force3DWordGraphTypeGPU })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">3D可視化を読み込み中...</p>
        </div>
      </div>
    )
  }
)

interface WordData {
  word: string
  embedding: number[]
  spiritProbability: number
  reactionTime: number
  timestamp: string
  participantId: string
  responseId: string
}

// Merkle DAG: participants.detail.word2vec_to_graph
// WordData配列からWordNode[]とWordLink[]を生成する変換関数
// embeddingベクトルのコサイン類似度でリンクを生成
function generateGraphFromWordData(wordData: WordData[]): { nodes: WordNode[]; links: WordLink[] } {
  if (wordData.length === 0) {
    return { nodes: [], links: [] }
  }

  // 単語ごとに集約（同じ単語が複数回出現する場合、平均値を計算）
  const wordMap = new Map<string, { 
    word: string
    embeddings: number[][]
    spiritProbabilities: number[]
    reactionTimes: number[]
  }>()

  for (const data of wordData) {
    if (!wordMap.has(data.word)) {
      wordMap.set(data.word, {
        word: data.word,
        embeddings: [],
        spiritProbabilities: [],
        reactionTimes: []
      })
    }
    const entry = wordMap.get(data.word)!
    entry.embeddings.push(data.embedding)
    entry.spiritProbabilities.push(data.spiritProbability)
    entry.reactionTimes.push(data.reactionTime)
  }

  // ノード生成
  const nodes: WordNode[] = Array.from(wordMap.entries()).map(([word, entry], index) => {
    const avgSpiritProb = entry.spiritProbabilities.reduce((a, b) => a + b, 0) / entry.spiritProbabilities.length
    const avgReactionTime = entry.reactionTimes.reduce((a, b) => a + b, 0) / entry.reactionTimes.length
    
    // スケールはspiritProbabilityから算出（0.5-6.0の範囲で正規化）
    const scale = Math.max(0.5, 0.5 + 5.5 * avgSpiritProb)
    
    // 色はspiritProbabilityに基づいて設定（HSL色空間）
    const hue = (1 - avgSpiritProb) * 240
    const color = `hsl(${hue}, 70%, 50%)`

    return {
      id: String(index),
      label: word,
      scale,
      nodeType: 'word',
      color
    }
  })

  // リンク生成（embeddingベクトルのコサイン類似度を使用）
  const links: WordLink[] = []
  const nodeArray = Array.from(nodes)
  const wordToIndex = new Map<string, number>()
  nodeArray.forEach((node, idx) => wordToIndex.set(node.label, idx))

  // 各単語の平均embeddingを計算
  const wordEmbeddings = new Map<string, number[]>()
  for (const [word, entry] of wordMap.entries()) {
    if (entry.embeddings.length === 0) continue
    
    // 平均embeddingを計算
    const dim = entry.embeddings[0].length
    const avgEmbedding = new Array(dim).fill(0)
    for (const emb of entry.embeddings) {
      for (let i = 0; i < dim; i++) {
        avgEmbedding[i] += emb[i]
      }
    }
    for (let i = 0; i < dim; i++) {
      avgEmbedding[i] /= entry.embeddings.length
    }
    wordEmbeddings.set(word, avgEmbedding)
  }

  // コサイン類似度を計算してリンクを生成
  const similarityThreshold = 0.1
  const springK = 2.0
  const restLength = 90

  for (let i = 0; i < nodeArray.length; i++) {
    for (let j = i + 1; j < nodeArray.length; j++) {
      const wordI = nodeArray[i].label
      const wordJ = nodeArray[j].label
      
      const embI = wordEmbeddings.get(wordI)
      const embJ = wordEmbeddings.get(wordJ)
      
      if (!embI || !embJ) continue

      // コサイン類似度を計算
      const dot = embI.reduce((sum, v, idx) => sum + v * (embJ[idx] || 0), 0)
      const normI = Math.hypot(...embI)
      const normJ = Math.hypot(...embJ)
      const similarity = (normI * normJ > 0) ? dot / (normI * normJ) : 0

      // 類似度を0-1の範囲に正規化（-1〜1を0〜1に）
      const weight = Math.max(0, Math.min(1, (similarity + 1) / 2))

      if (weight >= similarityThreshold) {
        const L0 = Math.max(10, restLength * (1 + 0.8 * (1 - weight)))
        const k = springK * (0.2 + 0.6 * weight)
        
        links.push({
          source: i,
          target: j,
          weight,
          mode: 'tension',
          L0,
          k
        })
      }
    }
  }

  return { nodes, links }
}

export default function ParticipantDetailPage() {
  const params = useParams()
  const participantId = params.id as string
  
  const [wordData, setWordData] = useState<WordData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Merkle DAG: participants.detail.fetch_data
  // Word2Vecデータの取得
  const fetchWord2VecData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`/api/spirits/${participantId}/word2vec`)
      const data = await response.json()
      
      if (data.success) {
        setWordData(data.wordData)
      } else {
        setError(data.error || 'データの取得に失敗しました')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }, [participantId])

  useEffect(() => {
    fetchWord2VecData()
  }, [fetchWord2VecData])

  // Merkle DAG: participants.detail.hide_sidebar_header
  // サイドバーとヘッダーを非表示にして、visualize componentのみを表示
  useEffect(() => {
    const hideSidebarAndHeader = () => {
      // サイドバーとヘッダーを非表示
      const sidebar = document.querySelector('aside')
      const header = document.querySelector('header')
      const banner = document.querySelector('[role="banner"]')
      const main = document.querySelector('main')
      const parentDiv = document.querySelector('body > div > div')
      
      if (sidebar) sidebar.style.display = 'none'
      if (header) header.style.display = 'none'
      if (banner) banner.style.display = 'none'
      if (parentDiv) {
        parentDiv.style.display = 'flex'
        parentDiv.style.flexDirection = 'column'
      }
      if (main) {
        main.style.position = 'fixed'
        main.style.top = '0'
        main.style.left = '0'
        main.style.width = '100vw'
        main.style.height = '100vh'
        main.style.padding = '0'
        main.style.margin = '0'
        main.style.zIndex = '9999'
      }
    }

    // 即座に実行
    hideSidebarAndHeader()
    
    // 少し遅延させて再実行（DOMが完全に読み込まれるまで待つ）
    const timeoutId = setTimeout(hideSidebarAndHeader, 100)

    // クリーンアップ関数
    return () => {
      clearTimeout(timeoutId)
      const sidebar = document.querySelector('aside')
      const header = document.querySelector('header')
      const banner = document.querySelector('[role="banner"]')
      const main = document.querySelector('main')
      const parentDiv = document.querySelector('body > div > div')
      
      if (sidebar) sidebar.style.display = ''
      if (header) header.style.display = ''
      if (banner) banner.style.display = ''
      if (parentDiv) {
        parentDiv.style.display = ''
        parentDiv.style.flexDirection = ''
      }
      if (main) {
        main.style.position = ''
        main.style.top = ''
        main.style.left = ''
        main.style.width = ''
        main.style.height = ''
        main.style.padding = ''
        main.style.margin = ''
        main.style.zIndex = ''
      }
    }
  }, [])

  // Merkle DAG: participants.detail.generate_graph
  // WordDataからグラフ構造を生成（useMemoで最適化）
  const graphData = useMemo(() => {
    return generateGraphFromWordData(wordData)
  }, [wordData])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Word2Vecデータを読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-screen">
      {graphData.nodes.length > 0 ? (
        <Force3DWordGraphTypeGPU
          nodes={graphData.nodes}
          links={graphData.links}
          width={typeof window !== 'undefined' ? window.innerWidth : 1920}
          height={typeof window !== 'undefined' ? window.innerHeight : 1080}
          background="#ffffff"
        />
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">データがありません</p>
          </div>
        </div>
      )}
    </div>
  )
}