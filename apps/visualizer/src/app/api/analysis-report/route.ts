import { NextResponse } from 'next/server'
import { getAllParticipants, getAnalysisResults } from '@/lib/data'
import type { GetTimelineQueryResult } from '@/generated/graphql'
import { graphqlClient, GetTimelineDocument } from '@/lib/graphql/client'

export async function GET() {
  try {
    console.log('API: Generating analysis report from GraphQL...')

    // GraphQL経由で参加者データを取得
    const participants = await getAllParticipants()
    console.log('API: Raw participants data:', participants?.length || 0, 'participants')

    // Create participant name mapping
    const participantNames = new Map<string, string>()
    participants.forEach(p => participantNames.set(p.id, p.name || `Participant ${p.id.slice(0, 8)}`))

    // 感情データを集計
    const emotionStats = {
      totalFaceDataPoints: 0,
      totalProsodyDataPoints: 0,
      totalLanguageDataPoints: 0,
      emotionSources: new Set<string>()
    }

    // 参加者ごとの統計を計算
    const participantStats = new Map<string, any>()

    // Get all analysis results
    const allAnalysisResults = await getAnalysisResults()
    
    // 参加者ごとにグループ化
    for (const participant of participants) {
      const participantId = participant.id
      const participantResults = allAnalysisResults.filter(r => r.id.startsWith(participantId))

      if (!participantStats.has(participantId)) {
        participantStats.set(participantId, {
          participant_id: participantId,
          name: participantNames.get(participantId) || null,
          total_responses: 0,
          spirit_probabilities: [],
          results: []
        })
      }

      const stats = participantStats.get(participantId)

      // タイムラインデータから感情データを集計
      try {
        const timelineData = await graphqlClient.request<GetTimelineQueryResult>(GetTimelineDocument, { participantId })
        const timeline = timelineData.timeline || []
        
        timeline.forEach((point: any) => {
          if (Array.isArray(point.emotions)) {
            point.emotions.forEach((emotion: any) => {
              const fileType = emotion.fileType || emotion.file_type || ''
              if (fileType.includes('face')) emotionStats.totalFaceDataPoints++
              if (fileType.includes('prosody')) emotionStats.totalProsodyDataPoints++
              if (fileType.includes('language')) emotionStats.totalLanguageDataPoints++
              emotionStats.emotionSources.add('graphql')
            })
          }
        })
      } catch (error) {
        console.error(`Failed to fetch timeline for participant ${participantId}:`, error)
      }

      participantResults.forEach((result) => {
        stats.total_responses++
        stats.spirit_probabilities.push(result.p_value)
        stats.results.push({
          p_value: result.p_value,
          components: {
            word2vec: result.word2vec_component,
            reaction_time: result.reaction_time_component,
            skin_potential: result.skin_potential_component,
            emotion: result.emotion_component
          },
          stimulus_word: result.stimulus_word,
          response_word: result.response_word,
          reaction_time_ms: result.reaction_time_ms
        })
      })
    }

    // 川崎モデル結果の集計
    const allResults = Array.from(participantStats.values())
    const totalAnalyses = allResults.reduce((sum, participant) => sum + participant.total_responses, 0)
    const allSpiritProbabilities = allResults.flatMap(p => p.spirit_probabilities)
    const averageSpiritProbability = allSpiritProbabilities.length > 0
      ? allSpiritProbabilities.reduce((sum, p) => sum + p, 0) / allSpiritProbabilities.length
      : 0
    const maxSpiritProbability = allSpiritProbabilities.length > 0 ? Math.max(...allSpiritProbabilities) : 0
    const minSpiritProbability = allSpiritProbabilities.length > 0 ? Math.min(...allSpiritProbabilities) : 0
    const stdSpiritProbability = allSpiritProbabilities.length > 1
      ? Math.sqrt(allSpiritProbabilities.reduce((sum, p) => sum + Math.pow(p - averageSpiritProbability, 2), 0) / (allSpiritProbabilities.length - 1))
      : 0

    const highSpiritResponses = allSpiritProbabilities.filter(p => p > 0.8).length

    // トップパフォーマンスの単語ペアを取得（Spirit確率が高い順）
    const topWordPairs = allResults
      .flatMap(p => p.results.map((r: any) => ({
        stimulus: r.stimulus_word,
        response: r.response_word,
        probability: r.p_value,
        participant_name: p.name
      })))
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 10)

    // レポートデータの構築
    const reportData = {
      emotionAnalysisSummary: {
        faceDataPoints: emotionStats.totalFaceDataPoints,
        prosodyDataPoints: emotionStats.totalProsodyDataPoints,
        languageDataPoints: emotionStats.totalLanguageDataPoints,
        totalEmotionPoints: emotionStats.totalFaceDataPoints + emotionStats.totalProsodyDataPoints + emotionStats.totalLanguageDataPoints,
        emotionSources: Array.from(emotionStats.emotionSources)
      },
      kawasakiModelResults: {
        totalAnalyses,
        averageSpiritProbability,
        maxSpiritProbability,
        minSpiritProbability,
        stdSpiritProbability,
        highSpiritResponses
      },
      topPerformingWordPairs: topWordPairs,
      participantStats: allResults,
      conclusion: {
        message: "Successfully integrated Hume AI emotion analysis with Kawasaki Spirit model using TerminusDB, demonstrating the potential for quantitative measurement of spiritual responses through multimodal emotion analysis.",
        totalParticipants: allResults.length,
        totalResponses: totalAnalyses
      }
    }

    return NextResponse.json(reportData)

  } catch (error) {
    console.error('Error generating analysis report:', error)
    return NextResponse.json({ error: 'Failed to generate analysis report' }, { status: 500 })
  }
}
