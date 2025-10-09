import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabaseクライアントの初期化
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET() {
  try {
    // 参加者ごとの分析結果を取得
    const { data: analysisResults, error: analysisError } = await supabase
      .from('participant_response_data')
      .select(`
        participant_id,
        p_value,
        stimulus_word,
        response_word,
        reaction_time_ms,
        word2vec_component,
        reaction_time_component,
        skin_potential_component,
        emotion_component,
        emotion_data,
        created_at,
        participants (
          name
        )
      `)
      .order('created_at', { ascending: false })

    if (analysisError) {
      console.error('Error fetching analysis results:', analysisError)
      return NextResponse.json({ error: 'Failed to fetch analysis results' }, { status: 500 })
    }

    // 感情データを集計
    const emotionStats = {
      totalFaceDataPoints: 0,
      totalProsodyDataPoints: 0,
      totalLanguageDataPoints: 0,
      emotionSources: new Set<string>()
    }

    // 参加者ごとの統計を計算
    const participantStats = new Map()

    analysisResults?.forEach((result: any) => {
      const participantId = result.participant_id

      if (!participantStats.has(participantId)) {
        participantStats.set(participantId, {
          participant_id: participantId,
          name: result.participants?.name || null,
          total_responses: 0,
          spirit_probabilities: [],
          results: []
        })
      }

      const stats = participantStats.get(participantId)
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

      // 感情データの集計
      if (result.emotion_data) {
        if (result.emotion_data.face) emotionStats.totalFaceDataPoints++
        if (result.emotion_data.prosody) emotionStats.totalProsodyDataPoints++
        if (result.emotion_data.language) emotionStats.totalLanguageDataPoints++

        if (result.emotion_data.source) {
          emotionStats.emotionSources.add(result.emotion_data.source)
        }
      }
    })

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
        message: "Successfully integrated Hume AI emotion analysis with Kawasaki Spirit model, demonstrating the potential for quantitative measurement of spiritual responses through multimodal emotion analysis.",
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
