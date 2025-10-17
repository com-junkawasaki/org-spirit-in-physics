// Merkle DAG: neuron.sample
// サンプルの ConnectomeScene を public/brain のJSONと 100 語イベントで構成
import type { ConnectomeScene, EventNode, WordConceptNode } from './types'
import { JUNG_STIMULUS_WORDS } from '@/constants/jung'

function randomIn(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

const EMOTIONS = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'contempt'] as const
type EmotionName = typeof EMOTIONS[number]

export async function loadSampleConnectomeScene(basePath = '/brain'):
  Promise<ConnectomeScene> {
  const [regionsRes, edgesRes] = await Promise.all([
    fetch(`${basePath}/regions.json`, { cache: 'force-cache' }),
    fetch(`${basePath}/structural_edges.json`, { cache: 'force-cache' })
  ])
  const [regions, structuralEdges] = await Promise.all([
    regionsRes.json(),
    edgesRes.json()
  ])

  // 100語の概念ノード
  const concepts: WordConceptNode[] = JUNG_STIMULUS_WORDS.slice(0, 100).map((w) => ({
    id: `word_${w.id}`,
    label: w.japanese,
  }))

  // 100件のイベント（反応時間と感情値を付与）
  const start = Date.now()
  const events: EventNode[] = concepts.map((c, idx) => {
    const rtMs = Math.round(randomIn(350, 2400)) // 反応時間 0.35s - 2.4s
    const emoCount = Math.floor(randomIn(1, 4)) // 1-3 程度の感情を付与
    const chosen: EmotionName[] = Array.from({ length: emoCount }, () => EMOTIONS[Math.floor(Math.random() * EMOTIONS.length)])
    const emotions = chosen.map((name) => ({ name, score: Math.round(randomIn(0.15, 0.85) * 100) / 100 }))
    return {
      id: `e_${idx + 1}`,
      timestamp: start + idx * Math.round(randomIn(700, 1600)), // 0.7s - 1.6s 間隔
      word: c.label,
      reactionTime: rtMs,
      emotions,
      physiological: { average: Math.round(randomIn(-0.12, 0.18) * 1000) / 1000 },
    }
  })

  return { regions, structuralEdges, concepts, events }
}


