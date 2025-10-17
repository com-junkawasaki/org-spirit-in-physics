// Merkle DAG: neuron.sample
// サンプルの ConnectomeScene を public/brain のJSONと最小イベントで構成
import type { ConnectomeScene, EventNode, WordConceptNode } from './types'

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

  // 最小の語ノードとイベント（時刻は相対値）
  const concepts: WordConceptNode[] = [
    { id: 'word_冷たい', label: '冷たい' },
    { id: 'word_蛙', label: '蛙' },
  ]
  const now = Date.now()
  const events: EventNode[] = [
    { id: 'e1', timestamp: now, word: '冷たい', emotions: [{ name: 'surprise', score: 0.4 }] },
    { id: 'e2', timestamp: now + 1200, word: '蛙', emotions: [{ name: 'joy', score: 0.35 }] },
  ]

  return { regions, structuralEdges, concepts, events }
}


