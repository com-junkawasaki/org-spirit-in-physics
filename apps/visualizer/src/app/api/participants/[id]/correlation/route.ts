import { NextRequest, NextResponse } from 'next/server'
import { createNeo4jClient } from '@/lib/neo4j'
import { getEmotionData, getPhysiologicalData, getSessionData } from '@/lib/timeline-integration-functions'

// Merkle DAG: api.participants.correlation -> correlation_analysis
// 生理データと感情データの相関分析
// 依存関係: Neo4j, timeline-integration-functions

/**
 * ピアソン相関係数を計算
 */
function calculatePearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0
  
  const n = x.length
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0)
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0)
  
  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
  
  return denominator === 0 ? 0 : numerator / denominator
}

/**
 * スピアマン相関係数を計算
 */
function calculateSpearmanCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0
  
  // ランクを計算
  const rankX = getRanks(x)
  const rankY = getRanks(y)
  
  return calculatePearsonCorrelation(rankX, rankY)
}

/**
 * 値のランクを計算
 */
function getRanks(values: number[]): number[] {
  const sorted = [...values].map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v)
  const ranks = new Array(values.length)
  let currentRank = 1
  
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].v !== sorted[i - 1].v) {
      currentRank = i + 1
    }
    ranks[sorted[i].i] = currentRank
  }
  
  return ranks
}

/**
 * 相関の強度を判定
 */
function getCorrelationStrength(correlation: number): string {
  const abs = Math.abs(correlation)
  if (abs >= 0.7) return 'very_strong'
  if (abs >= 0.5) return 'strong'
  if (abs >= 0.3) return 'moderate'
  if (abs >= 0.1) return 'weak'
  return 'very_weak'
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: participantId } = await params
    const client = createNeo4jClient()

    // セッションデータを取得
    const sessionData = await getSessionData(client, participantId)
    if (!sessionData || !sessionData.events || sessionData.events.length === 0) {
      return NextResponse.json(
        { error: 'No session data found for participant' },
        { status: 404 }
      )
    }

    // 感情データを取得
    const emotionData = await getEmotionData(client, participantId)
    if (emotionData.length === 0) {
      return NextResponse.json(
        { error: 'No emotion data found for participant' },
        { status: 404 }
      )
    }

    // 生理データを取得
    const physiologicalData = await getPhysiologicalData(client, participantId)
    if (physiologicalData.length === 0) {
      return NextResponse.json(
        { error: 'No physiological data found for participant' },
        { status: 404 }
      )
    }

    // セッションIDを取得
    const sessionId = sessionData.sessionId || 'session_1'

    // 感情データを時間軸で整理
    const emotionByType: Record<string, Array<{ time: number; score: number }>> = {}
    emotionData.forEach(emotion => {
      if (emotion.emotions && Array.isArray(emotion.emotions)) {
        emotion.emotions.forEach((e: { name: string; score: number }) => {
          if (!emotionByType[e.name]) {
            emotionByType[e.name] = []
          }
          emotionByType[e.name].push({
            time: emotion.beginTime || 0,
            score: e.score || 0
          })
        })
      }
    })

    // 生理データをチャネルごとに整理
    const physiologicalByChannel: Record<string, Array<{ time: number; value: number }>> = {}
    physiologicalData.forEach(physio => {
      const channels = physio.channels || {}
      Object.entries(channels).forEach(([channel, value]) => {
        if (typeof value === 'number') {
          if (!physiologicalByChannel[channel]) {
            physiologicalByChannel[channel] = []
          }
          physiologicalByChannel[channel].push({
            time: physio.timeSec || 0,
            value
          })
        }
      })
    })

    // 相関分析を実行
    const correlationAnalysis: Record<string, any> = {}
    const physiologicalEmotionPairs: Array<{
      physiological_indicator: string
      emotion_type: string
      pearson_r: number
      spearman_rho: number
      strength: string
      data_points: number
    }> = []

    Object.entries(physiologicalByChannel).forEach(([channel, physioValues]) => {
      Object.entries(emotionByType).forEach(([emotionType, emotionValues]) => {
        // 時間軸でマッチング
        const matchedPairs: Array<{ physio: number; emotion: number }> = []
        physioValues.forEach(physio => {
          const matchingEmotion = emotionValues.find(
            e => Math.abs(e.time - physio.time) < 1.0 // 1秒以内
          )
          if (matchingEmotion) {
            matchedPairs.push({
              physio: physio.value,
              emotion: matchingEmotion.score
            })
          }
        })

        if (matchedPairs.length >= 10) { // 最低10データポイント必要
          const physioValues = matchedPairs.map(p => p.physio)
          const emotionValues = matchedPairs.map(p => p.emotion)
          
          const pearsonR = calculatePearsonCorrelation(physioValues, emotionValues)
          const spearmanRho = calculateSpearmanCorrelation(physioValues, emotionValues)
          const strength = getCorrelationStrength(pearsonR)

          physiologicalEmotionPairs.push({
            physiological_indicator: channel,
            emotion_type: emotionType,
            pearson_r: pearsonR,
            spearman_rho: spearmanRho,
            strength,
            data_points: matchedPairs.length
          })
        }
      })
    })

    // セッションごとの相関分析結果を構築
    const pearsonCorrelations: Record<string, number> = {}
    const spearmanCorrelations: Record<string, number> = {}
    const correlationStrength: Record<string, string> = {}

    physiologicalEmotionPairs.forEach(pair => {
      if (!pearsonCorrelations[pair.emotion_type] || 
          Math.abs(pair.pearson_r) > Math.abs(pearsonCorrelations[pair.emotion_type])) {
        pearsonCorrelations[pair.emotion_type] = pair.pearson_r
        spearmanCorrelations[pair.emotion_type] = pair.spearman_rho
        correlationStrength[pair.emotion_type] = pair.strength
      }
    })

    correlationAnalysis[sessionId] = {
      session_id: sessionId,
      pearson_correlations: pearsonCorrelations,
      spearman_correlations: spearmanCorrelations,
      correlation_strength: correlationStrength,
      physiological_emotion_pairs: physiologicalEmotionPairs
    }

    // 生理データの統計を計算
    const allPhysioValues: number[] = []
    Object.values(physiologicalByChannel).forEach(channelData => {
      channelData.forEach(d => {
        allPhysioValues.push(d.value)
      })
    })

    const physiologicalIndicators: Record<string, any> = {}
    Object.entries(physiologicalByChannel).forEach(([channel, values]) => {
      const channelValues = values.map(v => v.value)
      const sorted = [...channelValues].sort((a, b) => a - b)
      const chMean = channelValues.reduce((a, b) => a + b, 0) / channelValues.length
      const chStd = Math.sqrt(
        channelValues.reduce((sum, v) => sum + Math.pow(v - chMean, 2), 0) / channelValues.length
      )
      
      physiologicalIndicators[channel] = {
        mean: chMean,
        std: chStd,
        min: Math.min(...channelValues),
        max: Math.max(...channelValues),
        median: sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)],
        count: channelValues.length
      }
    })

    // トップ相関を取得
    const topCorrelations = [...physiologicalEmotionPairs]
      .sort((a, b) => Math.abs(b.pearson_r) - Math.abs(a.pearson_r))
      .slice(0, 10)

    // 有意な発見を生成
    const significantFindings: Array<{
      type: string
      rank?: number
      description: string
      significance: string
      data_points?: number
    }> = []

    topCorrelations.forEach((pair, index) => {
      if (Math.abs(pair.pearson_r) >= 0.5) {
        significantFindings.push({
          type: 'strong_correlation',
          rank: index + 1,
          description: `${pair.physiological_indicator} と ${pair.emotion_type} の相関 (r=${pair.pearson_r.toFixed(3)})`,
          significance: Math.abs(pair.pearson_r) >= 0.7 ? 'high' : 'moderate',
          data_points: pair.data_points
        })
      }
    })

    const result = {
      correlation_analysis: correlationAnalysis,
      physiological_indicators: {
        total_samples: allPhysioValues.length,
        indicators: physiologicalIndicators,
        variability: Object.entries(physiologicalIndicators).reduce((acc, [channel, stats]: [string, any]) => {
          acc[channel] = {
            coefficient_of_variation: stats.std / stats.mean,
            range: stats.max - stats.min,
            iqr: 0 // TODO: IQR計算を実装
          }
          return acc
        }, {} as Record<string, any>),
        time_series_stats: {
          duration_ms: sessionData.endTs && sessionData.startTs 
            ? (sessionData.endTs - sessionData.startTs)
            : 0,
          sampling_rate_hz: allPhysioValues.length > 0 && sessionData.endTs && sessionData.startTs
            ? allPhysioValues.length / ((sessionData.endTs - sessionData.startTs) / 1000)
            : 0
        }
      },
      emotion_categories: {
        total_sessions: 1,
        emotion_types_analyzed: Object.keys(emotionByType),
        correlation_distribution: {
          very_strong: physiologicalEmotionPairs.filter(p => p.strength === 'very_strong').length,
          strong: physiologicalEmotionPairs.filter(p => p.strength === 'strong').length,
          moderate: physiologicalEmotionPairs.filter(p => p.strength === 'moderate').length,
          weak: physiologicalEmotionPairs.filter(p => p.strength === 'weak').length,
          very_weak: physiologicalEmotionPairs.filter(p => p.strength === 'very_weak').length
        },
        top_correlations: topCorrelations.slice(0, 5),
        emotion_category_summary: Object.keys(emotionByType).reduce((acc, emotionType) => {
          const pairs = physiologicalEmotionPairs.filter(p => p.emotion_type === emotionType)
          if (pairs.length > 0) {
            acc[emotionType] = {
              pair_count: pairs.length,
              avg_pearson: pairs.reduce((sum, p) => sum + p.pearson_r, 0) / pairs.length,
              avg_spearman: pairs.reduce((sum, p) => sum + p.spearman_rho, 0) / pairs.length,
              strength_distribution: {
                very_strong: pairs.filter(p => p.strength === 'very_strong').length,
                strong: pairs.filter(p => p.strength === 'strong').length,
                moderate: pairs.filter(p => p.strength === 'moderate').length,
                weak: pairs.filter(p => p.strength === 'weak').length,
                very_weak: pairs.filter(p => p.strength === 'very_weak').length
              }
            }
          }
          return acc
        }, {} as Record<string, any>)
      },
      significant_findings: significantFindings,
      time_windowed_analysis: {} // TODO: 時間窓分析を実装
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching participant correlation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch participant correlation data' },
      { status: 500 }
    )
  }
}
