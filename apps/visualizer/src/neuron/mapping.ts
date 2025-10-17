// Merkle DAG: neuron.mapping
// 語→領域の係留重みとスプリングのユーティリティ（最小）
import type { BrainRegion, EventNode, WordConceptNode } from './types'

export interface AnchorSpring {
  regionId: string
  targetId: string // word or event id
  k: number
}

// 簡易なルール: 言語関連領域に語を少し強めに係留
export function computeWordAnchorSprings(
  regions: BrainRegion[],
  concepts: WordConceptNode[],
  baseK = 1.2
): AnchorSpring[] {
  const langRegionIds = new Set(
    regions.filter(r => /IFG|STG|MTG/.test(r.id)).map(r => r.id)
  )
  const springs: AnchorSpring[] = []
  for (const c of concepts) {
    for (const r of regions) {
      const k = langRegionIds.has(r.id) ? baseK : baseK * 0.5
      springs.push({ regionId: r.id, targetId: c.id, k })
    }
  }
  return springs
}

// イベントは語と同じ領域に弱めの係留
export function computeEventAnchorSprings(
  regions: BrainRegion[],
  events: EventNode[],
  baseK = 0.8
): AnchorSpring[] {
  const springs: AnchorSpring[] = []
  for (const e of events) {
    for (const r of regions) {
      const k = /IFG|STG|MTG/.test(r.id) ? baseK : baseK * 0.5
      springs.push({ regionId: r.id, targetId: e.id, k })
    }
  }
  return springs
}


