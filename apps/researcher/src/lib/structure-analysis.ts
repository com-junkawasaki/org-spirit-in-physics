// Merkle DAG: structure_analysis
// 3D Force可視化の構造分析モジュール
// - 空白エリア（漏れた項目候補）の検出
// - 近接ノード群の共通特徴抽出
// - 密度分析（密集/分散領域の特定）
// - 重複項目の検出

import type { WordNode, WordLink, TimelineDataPoint } from '@/components/timeline/types'

// Merkle DAG: structure_analysis.gap_detection
// 空白エリア（漏れた項目候補）の検出

export interface GapArea {
  id: string
  center: [number, number, number]  // 3D座標
  radius: number                    // 空白領域の半径
  nearbyNodes: Array<{
    nodeId: string
    label: string
    distance: number
    commonFeatures: string[]        // 共通特徴
  }>
  suggestedItems: string[]          // 推奨される項目候補
  confidence: number                // 検出信頼度 (0-1)
  commonEmotionProfile?: Record<string, number>  // 近接ノードの平均感情プロファイル
}

/**
 * 3D空間内の空白エリアを検出
 * - 近接ノード群の中心から一定距離以上離れた領域を特定
 * - 近接ノードの共通特徴を分析
 */
export function detectGapAreas(
  nodes: WordNode[],
  links: WordLink[],
  emotionVectors: Record<string, number[]>,
  sessionData: TimelineDataPoint[],
  options: {
    minGapRadius?: number          // 最小空白半径（デフォルト: 50）
    maxGapRadius?: number          // 最大空白半径（デフォルト: 200）
    minNearbyNodes?: number        // 近接ノードの最小数（デフォルト: 3）
    gridResolution?: number        // グリッド解像度（デフォルト: 50）
    densityThreshold?: number      // 密度閾値（デフォルト: 0.1）
  } = {}
): GapArea[] {
  const {
    minGapRadius = 50,
    maxGapRadius = 200,
    minNearbyNodes = 3,
    gridResolution = 50,
    densityThreshold = 0.1
  } = options

  // ノード位置の範囲を計算
  const positions = nodes
    .filter(n => n.initial && !n.fixed)
    .map(n => n.initial!)
  
  if (positions.length === 0) return []

  const minX = Math.min(...positions.map(p => p[0]))
  const maxX = Math.max(...positions.map(p => p[0]))
  const minY = Math.min(...positions.map(p => p[1]))
  const maxY = Math.max(...positions.map(p => p[1]))
  const minZ = Math.min(...positions.map(p => p[2]))
  const maxZ = Math.max(...positions.map(p => p[2]))

  const rangeX = maxX - minX
  const rangeY = maxY - minY
  const rangeZ = maxZ - minZ

  // グリッドサイズを計算
  const gridSizeX = rangeX / gridResolution
  const gridSizeY = rangeY / gridResolution
  const gridSizeZ = rangeZ / gridResolution

  // グリッドセルの密度を計算
  const gridDensity: Map<string, number> = new Map()
  const gridNodes: Map<string, WordNode[]> = new Map()

  for (const node of nodes) {
    if (!node.initial || node.fixed) continue

    const [x, y, z] = node.initial
    const gx = Math.floor((x - minX) / gridSizeX)
    const gy = Math.floor((y - minY) / gridSizeY)
    const gz = Math.floor((z - minZ) / gridSizeZ)
    const key = `${gx},${gy},${gz}`

    gridDensity.set(key, (gridDensity.get(key) || 0) + 1)
    if (!gridNodes.has(key)) gridNodes.set(key, [])
    gridNodes.get(key)!.push(node)
  }

  // 空白エリア候補を特定
  const gapAreas: GapArea[] = []
  const cellVolume = gridSizeX * gridSizeY * gridSizeZ
  const avgDensity = positions.length / (rangeX * rangeY * rangeZ)

  for (let gx = 0; gx < gridResolution; gx++) {
    for (let gy = 0; gy < gridResolution; gy++) {
      for (let gz = 0; gz < gridResolution; gz++) {
        const key = `${gx},${gy},${gz}`
        const density = (gridDensity.get(key) || 0) / cellVolume
        const relativeDensity = density / (avgDensity + 1e-6)

        // 密度が閾値以下の場合、空白エリア候補
        if (relativeDensity < densityThreshold) {
          const centerX = minX + (gx + 0.5) * gridSizeX
          const centerY = minY + (gy + 0.5) * gridSizeY
          const centerZ = minZ + (gz + 0.5) * gridSizeZ
          const center: [number, number, number] = [centerX, centerY, centerZ]

          // 近接ノードを検索
          const nearbyNodes: GapArea['nearbyNodes'] = []
          for (const node of nodes) {
            if (!node.initial || node.fixed) continue

            const [nx, ny, nz] = node.initial
            const dx = nx - centerX
            const dy = ny - centerY
            const dz = nz - centerZ
            const distance = Math.hypot(dx, dy, dz)

            if (distance >= minGapRadius && distance <= maxGapRadius) {
              // 共通特徴を抽出
              const commonFeatures = extractNodeFeatures(node, emotionVectors, sessionData)
              nearbyNodes.push({
                nodeId: node.id,
                label: node.label,
                distance,
                commonFeatures
              })
            }
          }

          // 近接ノードが十分ある場合のみ空白エリアとして登録
          if (nearbyNodes.length >= minNearbyNodes) {
            // 共通特徴から推奨項目を生成
            const commonEmotionProfile = calculateCommonEmotionProfile(nearbyNodes, emotionVectors)
            const suggestedItems = generateSuggestedItems(nearbyNodes, commonEmotionProfile)

            // 信頼度を計算（近接ノード数と密度に基づく）
            const confidence = Math.min(1, 
              (nearbyNodes.length / (minNearbyNodes * 2)) * 
              (1 - relativeDensity)
            )

            gapAreas.push({
              id: `gap_${gx}_${gy}_${gz}`,
              center,
              radius: Math.max(minGapRadius, Math.min(maxGapRadius, 
                nearbyNodes.reduce((sum, n) => sum + n.distance, 0) / nearbyNodes.length * 0.5
              )),
              nearbyNodes: nearbyNodes.sort((a, b) => a.distance - b.distance).slice(0, 10),
              suggestedItems,
              confidence,
              commonEmotionProfile
            })
          }
        }
      }
    }
  }

  // 信頼度順にソート
  return gapAreas.sort((a, b) => b.confidence - a.confidence).slice(0, 10)
}

// Merkle DAG: structure_analysis.common_features
// 近接ノード群の共通特徴抽出

export interface CommonFeatures {
  emotionProfile: Record<string, number>  // 感情プロファイルの平均
  semanticTags: string[]                 // 意味タグ
  frequencyRange: [number, number]        // 出現頻度範囲
  reactionTimeRange: [number, number]     // 反応時間範囲
  reactionValueRange: [number, number]    // 反応値範囲
}

/**
 * ノードの特徴を抽出
 */
function extractNodeFeatures(
  node: WordNode,
  emotionVectors: Record<string, number[]>,
  sessionData: TimelineDataPoint[]
): string[] {
  const features: string[] = []
  const wordData = sessionData.filter(d => d.word === node.label)

  if (wordData.length === 0) return features

  // 感情プロファイルから主要感情を抽出
  const emotionVec = emotionVectors[node.label] || []
  const emotionNames = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'calm', 'focus', 'excitement', 'confusion']
  const topEmotions = emotionVec
    .map((val, idx) => ({ name: emotionNames[idx] || 'unknown', val }))
    .sort((a, b) => b.val - a.val)
    .slice(0, 3)
    .filter(e => e.val > 0.1)
  
  topEmotions.forEach(e => features.push(`emotion:${e.name}`))

  // 反応時間から特徴を抽出
  const reactionTimes = wordData.map(d => d.reactionTime).filter((rt): rt is number => rt != null)
  if (reactionTimes.length > 0) {
    const avgRT = reactionTimes.reduce((sum, rt) => sum + rt, 0) / reactionTimes.length
    if (avgRT < 500) features.push('fast_response')
    else if (avgRT > 1500) features.push('slow_response')
    else features.push('normal_response')
  }

  // 反応値から特徴を抽出
  const reactionValues = wordData.map(d => d.reactionValue).filter((rv): rv is number => rv != null)
  if (reactionValues.length > 0) {
    const avgRV = reactionValues.reduce((sum, rv) => sum + rv, 0) / reactionValues.length
    if (avgRV > 0.7) features.push('high_reaction')
    else if (avgRV < 0.3) features.push('low_reaction')
  }

  // 出現頻度から特徴を抽出
  if (wordData.length > 5) features.push('frequent')
  else if (wordData.length === 1) features.push('rare')

  return features
}

/**
 * 近接ノード群の共通特徴を抽出
 */
export function extractCommonFeatures(
  nodeIds: string[],
  nodes: WordNode[],
  emotionVectors: Record<string, number[]>,
  sessionData: TimelineDataPoint[]
): CommonFeatures {
  const targetNodes = nodes.filter(n => nodeIds.includes(n.id))
  const targetWords = targetNodes.map(n => n.label)

  // 感情プロファイルの平均
  const emotionProfile: Record<string, number> = {}
  const emotionNames = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'calm', 'focus', 'excitement', 'confusion']
  
  emotionNames.forEach((name, idx) => {
    const values = targetWords
      .map(word => emotionVectors[word]?.[idx] || 0)
      .filter(v => v > 0)
    if (values.length > 0) {
      emotionProfile[name] = values.reduce((sum, v) => sum + v, 0) / values.length
    }
  })

  // 出現頻度範囲
  const frequencies = targetWords.map(word => 
    sessionData.filter(d => d.word === word).length
  )
  const frequencyRange: [number, number] = [
    Math.min(...frequencies),
    Math.max(...frequencies)
  ]

  // 反応時間範囲
  const reactionTimes = targetWords
    .flatMap(word => sessionData
      .filter(d => d.word === word)
      .map(d => d.reactionTime)
      .filter((rt): rt is number => rt != null)
    )
  const reactionTimeRange: [number, number] = reactionTimes.length > 0
    ? [Math.min(...reactionTimes), Math.max(...reactionTimes)]
    : [0, 0]

  // 反応値範囲
  const reactionValues = targetWords
    .flatMap(word => sessionData
      .filter(d => d.word === word)
      .map(d => d.reactionValue)
      .filter((rv): rv is number => rv != null)
    )
  const reactionValueRange: [number, number] = reactionValues.length > 0
    ? [Math.min(...reactionValues), Math.max(...reactionValues)]
    : [0, 0]

  // 意味タグ（簡易版：感情プロファイルから生成）
  const semanticTags = Object.entries(emotionProfile)
    .filter(([_, val]) => val > 0.2)
    .map(([name, _]) => name)
    .slice(0, 5)

  return {
    emotionProfile,
    semanticTags,
    frequencyRange,
    reactionTimeRange,
    reactionValueRange
  }
}

/**
 * 共通感情プロファイルを計算
 */
function calculateCommonEmotionProfile(
  nearbyNodes: GapArea['nearbyNodes'],
  emotionVectors: Record<string, number[]>
): Record<string, number> {
  const emotionNames = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'calm', 'focus', 'excitement', 'confusion']
  const profile: Record<string, number> = {}

  emotionNames.forEach((name, idx) => {
    const values = nearbyNodes
      .map(n => emotionVectors[n.label]?.[idx] || 0)
      .filter(v => v > 0)
    if (values.length > 0) {
      profile[name] = values.reduce((sum, v) => sum + v, 0) / values.length
    }
  })

  return profile
}

/**
 * 推奨項目を生成
 */
function generateSuggestedItems(
  nearbyNodes: GapArea['nearbyNodes'],
  commonEmotionProfile: Record<string, number>
): string[] {
  const suggestions: string[] = []

  // 主要感情から推奨を生成
  const topEmotions = Object.entries(commonEmotionProfile)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .filter(([_, val]) => val > 0.2)

  topEmotions.forEach(([emotion, _]) => {
    suggestions.push(`感情:${emotion}に関連する項目`)
  })

  // 近接ノードの特徴から推奨を生成
  const commonFeatures = new Map<string, number>()
  nearbyNodes.forEach(n => {
    n.commonFeatures.forEach(f => {
      commonFeatures.set(f, (commonFeatures.get(f) || 0) + 1)
    })
  })

  const topFeatures = Array.from(commonFeatures.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([feature, _]) => feature)

  topFeatures.forEach(feature => {
    suggestions.push(`特徴:${feature}を持つ項目`)
  })

  return suggestions.slice(0, 5)
}

// Merkle DAG: structure_analysis.density_analysis
// 密度分析（密集/分散の検出）

export interface DensityRegion {
  id: string
  center: [number, number, number]
  radius: number
  nodeCount: number
  density: number                    // ノード数 / 体積
  isOvercrowded: boolean             // 密集しすぎているか
  suggestedSeparation?: number       // 推奨される分離距離
  nodes: WordNode[]                  // 該当ノード
}

/**
 * ノード密度の分析
 * - 密集領域と分散領域を特定
 * - 適切な分離距離を提案
 */
export function analyzeDensity(
  nodes: WordNode[],
  options: {
    overcrowdingThreshold?: number   // 密集閾値（デフォルト: 1.5倍）
    sparseThreshold?: number         // 分散閾値（デフォルト: 0.5倍）
    gridResolution?: number          // グリッド解像度（デフォルト: 30）
    minRegionNodes?: number          // 最小ノード数（デフォルト: 3）
  } = {}
): {
  overcrowdedRegions: DensityRegion[]
  sparseRegions: DensityRegion[]
  overallDensity: number
} {
  const {
    overcrowdingThreshold = 1.5,
    sparseThreshold = 0.5,
    gridResolution = 30,
    minRegionNodes = 3
  } = options

  const positions = nodes
    .filter(n => n.initial && !n.fixed)
    .map(n => ({ node: n, pos: n.initial! }))

  if (positions.length === 0) {
    return {
      overcrowdedRegions: [],
      sparseRegions: [],
      overallDensity: 0
    }
  }

  // 空間範囲を計算
  const minX = Math.min(...positions.map(p => p.pos[0]))
  const maxX = Math.max(...positions.map(p => p.pos[0]))
  const minY = Math.min(...positions.map(p => p.pos[1]))
  const maxY = Math.max(...positions.map(p => p.pos[1]))
  const minZ = Math.min(...positions.map(p => p.pos[2]))
  const maxZ = Math.max(...positions.map(p => p.pos[2]))

  const rangeX = maxX - minX
  const rangeY = maxY - minY
  const rangeZ = maxZ - minZ
  const totalVolume = rangeX * rangeY * rangeZ
  const overallDensity = positions.length / (totalVolume + 1e-6)

  // グリッドサイズ
  const gridSizeX = rangeX / gridResolution
  const gridSizeY = rangeY / gridResolution
  const gridSizeZ = rangeZ / gridResolution
  const cellVolume = gridSizeX * gridSizeY * gridSizeZ

  // グリッドセルの密度を計算
  const gridCells: Map<string, { density: number; nodes: WordNode[]; center: [number, number, number] }> = new Map()

  for (const { node, pos } of positions) {
    const gx = Math.floor((pos[0] - minX) / gridSizeX)
    const gy = Math.floor((pos[1] - minY) / gridSizeY)
    const gz = Math.floor((pos[2] - minZ) / gridSizeZ)
    const key = `${gx},${gy},${gz}`

    if (!gridCells.has(key)) {
      const centerX = minX + (gx + 0.5) * gridSizeX
      const centerY = minY + (gy + 0.5) * gridSizeY
      const centerZ = minZ + (gz + 0.5) * gridSizeZ
      gridCells.set(key, {
        density: 0,
        nodes: [],
        center: [centerX, centerY, centerZ]
      })
    }

    const cell = gridCells.get(key)!
    cell.nodes.push(node)
    cell.density = cell.nodes.length / cellVolume
  }

  // 密集領域と分散領域を分類
  const overcrowdedRegions: DensityRegion[] = []
  const sparseRegions: DensityRegion[] = []

  for (const [key, cell] of gridCells.entries()) {
    if (cell.nodes.length < minRegionNodes) continue

    const relativeDensity = cell.density / (overallDensity + 1e-6)

    if (relativeDensity >= overcrowdingThreshold) {
      // 密集領域
      const radius = Math.cbrt(cellVolume) * 0.5
      const suggestedSeparation = radius * 1.2 // 20%拡大を推奨

      overcrowdedRegions.push({
        id: `overcrowded_${key}`,
        center: cell.center,
        radius,
        nodeCount: cell.nodes.length,
        density: cell.density,
        isOvercrowded: true,
        suggestedSeparation,
        nodes: cell.nodes
      })
    } else if (relativeDensity <= sparseThreshold) {
      // 分散領域
      const radius = Math.cbrt(cellVolume) * 0.5

      sparseRegions.push({
        id: `sparse_${key}`,
        center: cell.center,
        radius,
        nodeCount: cell.nodes.length,
        density: cell.density,
        isOvercrowded: false,
        nodes: cell.nodes
      })
    }
  }

  return {
    overcrowdedRegions: overcrowdedRegions.sort((a, b) => b.density - a.density).slice(0, 10),
    sparseRegions: sparseRegions.sort((a, b) => a.density - b.density).slice(0, 10),
    overallDensity
  }
}

// Merkle DAG: structure_analysis.duplicate_detection
// 重複項目の検出

export interface DuplicateCandidate {
  id: string
  nodeIds: string[]
  labels: string[]
  similarity: number                 // 類似度 (0-1)
  commonFeatures: CommonFeatures
  suggestedMerge: boolean            // 統合推奨
  distance: number                    // 3D空間での距離
}

/**
 * 重複または過度に類似した項目を検出
 */
export function detectDuplicates(
  nodes: WordNode[],
  emotionVectors: Record<string, number[]>,
  sessionData: TimelineDataPoint[],
  options: {
    distanceThreshold?: number      // 距離閾値（デフォルト: 0.15）
    spatialDistanceThreshold?: number // 3D空間距離閾値（デフォルト: 30）
    minSimilarity?: number           // 最小類似度（デフォルト: 0.85）
  } = {}
): DuplicateCandidate[] {
  const {
    distanceThreshold = 0.15,
    spatialDistanceThreshold = 30,
    minSimilarity = 0.85
  } = options

  const candidates: DuplicateCandidate[] = []
  const wordNodes = nodes.filter(n => n.nodeType === 'word' && n.initial)

  // 全ノードペアを比較
  for (let i = 0; i < wordNodes.length; i++) {
    for (let j = i + 1; j < wordNodes.length; j++) {
      const node1 = wordNodes[i]
      const node2 = wordNodes[j]

      if (!node1.initial || !node2.initial) continue

      // 3D空間での距離
      const [x1, y1, z1] = node1.initial
      const [x2, y2, z2] = node2.initial
      const spatialDist = Math.hypot(x2 - x1, y2 - y1, z2 - z1)

      // 空間距離が近い場合のみ詳細比較
      if (spatialDist > spatialDistanceThreshold) continue

      // 感情ベクトル間の距離
      const vec1 = emotionVectors[node1.label] || []
      const vec2 = emotionVectors[node2.label] || []

      if (vec1.length === 0 || vec2.length === 0) continue

      // コサイン類似度
      const dot = vec1.reduce((sum, v, idx) => sum + v * (vec2[idx] || 0), 0)
      const norm1 = Math.sqrt(vec1.reduce((sum, v) => sum + v * v, 0))
      const norm2 = Math.sqrt(vec2.reduce((sum, v) => sum + v * v, 0))
      const cosineSim = (norm1 > 0 && norm2 > 0) ? dot / (norm1 * norm2) : 0
      const similarity = cosineSim

      // 類似度が閾値以上の場合、重複候補として登録
      if (similarity >= minSimilarity) {
        const emotionDist = 1 - cosineSim

        if (emotionDist <= distanceThreshold) {
          // 共通特徴を抽出
          const commonFeatures = extractCommonFeatures(
            [node1.id, node2.id],
            [node1, node2],
            emotionVectors,
            sessionData
          )

          // 統合推奨を判定（類似度と空間距離に基づく）
          const suggestedMerge = similarity >= 0.9 && spatialDist < spatialDistanceThreshold * 0.5

          candidates.push({
            id: `dup_${node1.id}_${node2.id}`,
            nodeIds: [node1.id, node2.id],
            labels: [node1.label, node2.label],
            similarity,
            commonFeatures,
            suggestedMerge,
            distance: spatialDist
          })
        }
      }
    }
  }

  // 類似度順にソート
  return candidates.sort((a, b) => b.similarity - a.similarity)
}

// Merkle DAG: structure_analysis -> implementation_complete
// 構造分析モジュールの実装完了

