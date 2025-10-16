// Merkle DAG: analysis_reporter -> experiment_level_analysis_report_generation
// 実験レベルの分析レポート生成システム
// Storyの分析レポート生成機能の実装

import { createNeo4jClient } from './neo4j'
import { getSessionManager } from './session-manager'
import { getTimelineVisualizer } from './timeline-visualizer'

export interface AnalysisReportData {
  experimentId: string
  experimentName: string
  generatedAt: string
  summary: {
    totalParticipants: number
    totalSessions: number
    totalResponses: number
    averageSpiritProbability: number
    experimentDuration: number
  }
  participantAnalysis: Array<{
    participantId: string
    participantName: string
    sessionCount: number
    responseCount: number
    averageSpiritProbability: number
    averageReactionTime: number
    emotionProfile: Record<string, number>
    wordAssociationPatterns: Array<{
      stimulus: string
      response: string
      frequency: number
      averageReactionTime: number
    }>
  }>
  sessionAnalysis: Array<{
    sessionId: string
    participantId: string
    sessionType: string
    startTime: string
    endTime: string
    duration: number
    responseCount: number
    averageSpiritProbability: number
    averageReactionTime: number
    emotionDistribution: Record<string, number>
    physiologicalTrends: Array<{
      timestamp: number
      value: number
      type: string
    }>
  }>
  statisticalAnalysis: {
    spiritProbabilityDistribution: {
      high: number
      medium: number
      low: number
    }
    reactionTimeAnalysis: {
      mean: number
      median: number
      standardDeviation: number
      percentiles: {
        p25: number
        p50: number
        p75: number
        p90: number
        p95: number
      }
    }
    emotionCorrelation: Array<{
      emotion: string
      spiritCorrelation: number
      reactionTimeCorrelation: number
      frequency: number
    }>
    wordAssociationInsights: Array<{
      word: string
      averageResponseTime: number
      spiritCorrelation: number
      responseVariety: number
      emotionalValence: number
    }>
  }
  insights: Array<{
    type: 'pattern' | 'anomaly' | 'trend' | 'correlation'
    title: string
    description: string
    confidence: number
    data: Record<string, unknown>
  }>
  recommendations: Array<{
    category: 'experiment_design' | 'data_collection' | 'analysis_method' | 'participant_management'
    priority: 'high' | 'medium' | 'low'
    title: string
    description: string
    actionItems: string[]
  }>
}

export interface ReportGenerationOptions {
  includeParticipantDetails?: boolean
  includeSessionDetails?: boolean
  includeStatisticalAnalysis?: boolean
  includeInsights?: boolean
  includeRecommendations?: boolean
  format?: 'json' | 'markdown' | 'html' | 'pdf'
  language?: 'ja' | 'en'
}

export class AnalysisReporter {
  private client: ReturnType<typeof createNeo4jClient>
  private sessionManager: ReturnType<typeof getSessionManager>
  private timelineVisualizer: ReturnType<typeof getTimelineVisualizer>

  constructor() {
    this.client = createNeo4jClient()
    this.sessionManager = getSessionManager()
    this.timelineVisualizer = getTimelineVisualizer()
  }

  // Merkle DAG: analysis_reporter.generate_report -> experiment_analysis_report_generation
  async generateReport(experimentId: string, options: ReportGenerationOptions = {}): Promise<AnalysisReportData> {
    try {
      const {
        includeParticipantDetails = true,
        includeSessionDetails = true,
        includeStatisticalAnalysis = true,
        includeInsights = true,
        includeRecommendations = true,
        language = 'ja'
      } = options

      // 実験基本情報を取得
      const experimentInfo = await this.getExperimentInfo(experimentId)
      
      // 基本統計を計算
      const summary = await this.calculateExperimentSummary(experimentId)
      
      // 参加者分析
      const participantAnalysis = includeParticipantDetails 
        ? await this.analyzeParticipants(experimentId)
        : []
      
      // セッション分析
      const sessionAnalysis = includeSessionDetails
        ? await this.analyzeSessions(experimentId)
        : []
      
      // 統計分析
      const statisticalAnalysis = includeStatisticalAnalysis
        ? await this.performStatisticalAnalysis(experimentId)
        : {
            spiritProbabilityDistribution: { high: 0, medium: 0, low: 0 },
            reactionTimeAnalysis: { mean: 0, median: 0, standardDeviation: 0, percentiles: { p25: 0, p50: 0, p75: 0, p90: 0, p95: 0 } },
            emotionCorrelation: [],
            wordAssociationInsights: []
          }
      
      // インサイト生成
      const insights = includeInsights
        ? await this.generateInsights(experimentId, statisticalAnalysis, participantAnalysis, sessionAnalysis)
        : []
      
      // 推奨事項生成
      const recommendations = includeRecommendations
        ? await this.generateRecommendations(experimentId, insights, statisticalAnalysis)
        : []

      return {
        experimentId,
        experimentName: experimentInfo.name,
        generatedAt: new Date().toISOString(),
        summary,
        participantAnalysis,
        sessionAnalysis,
        statisticalAnalysis,
        insights,
        recommendations
      }
    } catch (error) {
      console.error('Failed to generate analysis report:', error)
      throw error
    }
  }

  // Merkle DAG: analysis_reporter.get_experiment_info -> experiment_basic_info
  private async getExperimentInfo(experimentId: string): Promise<{ name: string; description?: string }> {
    try {
      const query = `
        MATCH (e:Experiment {id: $experimentId})
        RETURN e.experiment_name as name, e.description as description
      `
      
      const result = await this.client.query(query, { experimentId })
      
      if (result.length === 0) {
        return { name: `Experiment ${experimentId.slice(0, 8)}` }
      }
      
      return {
        name: result[0].name || `Experiment ${experimentId.slice(0, 8)}`,
        description: result[0].description
      }
    } catch (error) {
      console.error('Failed to get experiment info:', error)
      return { name: `Experiment ${experimentId.slice(0, 8)}` }
    }
  }

  // Merkle DAG: analysis_reporter.calculate_summary -> experiment_summary_calculation
  private async calculateExperimentSummary(experimentId: string): Promise<AnalysisReportData['summary']> {
    try {
      const query = `
        MATCH (e:Experiment {id: $experimentId})
        OPTIONAL MATCH (e)-[:HAS_SESSION]->(s:ExperimentSession)
        OPTIONAL MATCH (s)<-[:PARTICIPATES_IN]-(p:Participant)
        OPTIONAL MATCH (s)-[:HAS_RESPONSE]->(r:Response)
        WITH e, 
             count(DISTINCT p) as totalParticipants,
             count(DISTINCT s) as totalSessions,
             count(r) as totalResponses,
             avg(r.spirit_probability) as avgSpirit,
             min(s.start_ts) as startTime,
             max(s.end_ts) as endTime
        RETURN totalParticipants,
               totalSessions,
               totalResponses,
               coalesce(avgSpirit, 0.5) as averageSpiritProbability,
               duration.between(datetime(startTime), datetime(endTime)).days as experimentDuration
      `
      
      const result = await this.client.query(query, { experimentId })
      
      if (result.length === 0) {
        return {
          totalParticipants: 0,
          totalSessions: 0,
          totalResponses: 0,
          averageSpiritProbability: 0.5,
          experimentDuration: 0
        }
      }
      
      const summary = result[0]
      return {
        totalParticipants: summary.totalParticipants || 0,
        totalSessions: summary.totalSessions || 0,
        totalResponses: summary.totalResponses || 0,
        averageSpiritProbability: summary.averageSpiritProbability || 0.5,
        experimentDuration: summary.experimentDuration || 0
      }
    } catch (error) {
      console.error('Failed to calculate experiment summary:', error)
      return {
        totalParticipants: 0,
        totalSessions: 0,
        totalResponses: 0,
        averageSpiritProbability: 0.5,
        experimentDuration: 0
      }
    }
  }

  // Merkle DAG: analysis_reporter.analyze_participants -> participant_analysis_method
  private async analyzeParticipants(experimentId: string): Promise<AnalysisReportData['participantAnalysis']> {
    try {
      const query = `
        MATCH (e:Experiment {id: $experimentId})-[:HAS_SESSION]->(s:ExperimentSession)
        MATCH (s)<-[:PARTICIPATES_IN]-(p:Participant)
        OPTIONAL MATCH (s)-[:HAS_RESPONSE]->(r:Response)
        WITH p, 
             count(DISTINCT s) as sessionCount,
             count(r) as responseCount,
             avg(r.spirit_probability) as avgSpirit,
             avg(r.reaction_time_ms) as avgReactionTime,
             collect(r.emotion) as emotions,
             collect({
               stimulus: r.stimulus_word,
               response: r.response_word,
               reactionTime: r.reaction_time_ms
             }) as responses
        RETURN p.id as participantId,
               p.participant_id as participantName,
               sessionCount,
               responseCount,
               coalesce(avgSpirit, 0.5) as averageSpiritProbability,
               coalesce(avgReactionTime, 0) as averageReactionTime,
               emotions,
               responses
        ORDER BY sessionCount DESC
      `
      
      const result = await this.client.query(query, { experimentId })
      
      return result.map((participant: any) => {
        // 感情プロファイルを計算
        const emotionProfile: Record<string, number> = {}
        participant.emotions.forEach((emotion: string) => {
          if (emotion) {
            emotionProfile[emotion] = (emotionProfile[emotion] || 0) + 1
          }
        })
        
        // 単語連合パターンを計算
        const wordPatterns: Record<string, { response: string; reactionTime: number; count: number }> = {}
        participant.responses.forEach((response: any) => {
          if (response.stimulus && response.response) {
            const key = `${response.stimulus}->${response.response}`
            if (!wordPatterns[key]) {
              wordPatterns[key] = {
                response: response.response,
                reactionTime: 0,
                count: 0
              }
            }
            wordPatterns[key].reactionTime += response.reactionTime || 0
            wordPatterns[key].count += 1
          }
        })
        
        const wordAssociationPatterns = Object.entries(wordPatterns).map(([key, data]) => {
          const [stimulus] = key.split('->')
          return {
            stimulus,
            response: data.response,
            frequency: data.count,
            averageReactionTime: data.reactionTime / data.count
          }
        })
        
        return {
          participantId: participant.participantId,
          participantName: participant.participantName || `Participant ${participant.participantId.slice(0, 8)}`,
          sessionCount: participant.sessionCount || 0,
          responseCount: participant.responseCount || 0,
          averageSpiritProbability: participant.averageSpiritProbability || 0.5,
          averageReactionTime: participant.averageReactionTime || 0,
          emotionProfile,
          wordAssociationPatterns
        }
      })
    } catch (error) {
      console.error('Failed to analyze participants:', error)
      return []
    }
  }

  // Merkle DAG: analysis_reporter.analyze_sessions -> session_analysis_method
  private async analyzeSessions(experimentId: string): Promise<AnalysisReportData['sessionAnalysis']> {
    try {
      const query = `
        MATCH (e:Experiment {id: $experimentId})-[:HAS_SESSION]->(s:ExperimentSession)
        OPTIONAL MATCH (s)-[:HAS_RESPONSE]->(r:Response)
        OPTIONAL MATCH (s)-[:HAS_PHYSIOLOGICAL_DATA]->(p:PhysiologicalData)
        WITH s, 
             count(r) as responseCount,
             avg(r.spirit_probability) as avgSpirit,
             avg(r.reaction_time_ms) as avgReactionTime,
             collect(r.emotion) as emotions,
             collect({
               timestamp: p.timestamp,
               value: p.ch1,
               type: 'skin_potential'
             }) as physiologicalData
        RETURN s.id as sessionId,
               s.participant_id as participantId,
               s.session_type as sessionType,
               s.start_ts as startTime,
               s.end_ts as endTime,
               duration.between(datetime(s.start_ts), datetime(s.end_ts)).seconds as duration,
               responseCount,
               coalesce(avgSpirit, 0.5) as averageSpiritProbability,
               coalesce(avgReactionTime, 0) as averageReactionTime,
               emotions,
               physiologicalData
        ORDER BY s.start_ts DESC
      `
      
      const result = await this.client.query(query, { experimentId })
      
      return result.map((session: any) => {
        // 感情分布を計算
        const emotionDistribution: Record<string, number> = {}
        session.emotions.forEach((emotion: string) => {
          if (emotion) {
            emotionDistribution[emotion] = (emotionDistribution[emotion] || 0) + 1
          }
        })
        
        // 生理データトレンドを計算
        const physiologicalTrends = session.physiologicalData
          .filter((data: any) => data.timestamp && data.value !== null)
          .map((data: any) => ({
            timestamp: new Date(data.timestamp).getTime(),
            value: data.value,
            type: data.type
          }))
          .sort((a: any, b: any) => a.timestamp - b.timestamp)
        
        return {
          sessionId: session.sessionId,
          participantId: session.participantId,
          sessionType: session.sessionType || 'Word Association Test',
          startTime: session.startTime,
          endTime: session.endTime,
          duration: session.duration || 0,
          responseCount: session.responseCount || 0,
          averageSpiritProbability: session.averageSpiritProbability || 0.5,
          averageReactionTime: session.averageReactionTime || 0,
          emotionDistribution,
          physiologicalTrends
        }
      })
    } catch (error) {
      console.error('Failed to analyze sessions:', error)
      return []
    }
  }

  // Merkle DAG: analysis_reporter.perform_statistical_analysis -> statistical_analysis_method
  private async performStatisticalAnalysis(experimentId: string): Promise<AnalysisReportData['statisticalAnalysis']> {
    try {
      // Spirit確率分布
      const spiritDistQuery = `
        MATCH (e:Experiment {id: $experimentId})-[:HAS_SESSION]->(s:ExperimentSession)-[:HAS_RESPONSE]->(r:Response)
        WHERE r.spirit_probability IS NOT NULL
        WITH r.spirit_probability as prob
        RETURN 
          sum(CASE WHEN prob >= 0.8 THEN 1 ELSE 0 END) as high,
          sum(CASE WHEN prob >= 0.6 AND prob < 0.8 THEN 1 ELSE 0 END) as medium,
          sum(CASE WHEN prob < 0.6 THEN 1 ELSE 0 END) as low
      `
      
      // 反応時間分析
      const reactionTimeQuery = `
        MATCH (e:Experiment {id: $experimentId})-[:HAS_SESSION]->(s:ExperimentSession)-[:HAS_RESPONSE]->(r:Response)
        WHERE r.reaction_time_ms IS NOT NULL
        WITH r.reaction_time_ms as reactionTime
        RETURN 
          avg(reactionTime) as mean,
          percentileDisc(reactionTime, 0.5) as median,
          stDev(reactionTime) as standardDeviation,
          percentileDisc(reactionTime, 0.25) as p25,
          percentileDisc(reactionTime, 0.5) as p50,
          percentileDisc(reactionTime, 0.75) as p75,
          percentileDisc(reactionTime, 0.9) as p90,
          percentileDisc(reactionTime, 0.95) as p95
      `
      
      // 感情相関分析
      const emotionCorrelationQuery = `
        MATCH (e:Experiment {id: $experimentId})-[:HAS_SESSION]->(s:ExperimentSession)-[:HAS_RESPONSE]->(r:Response)
        WHERE r.emotion IS NOT NULL AND r.spirit_probability IS NOT NULL AND r.reaction_time_ms IS NOT NULL
        WITH r.emotion as emotion, 
             avg(r.spirit_probability) as avgSpirit,
             avg(r.reaction_time_ms) as avgReactionTime,
             count(*) as frequency
        RETURN emotion, avgSpirit, avgReactionTime, frequency
        ORDER BY frequency DESC
        LIMIT 10
      `
      
      // 単語連合インサイト
      const wordInsightsQuery = `
        MATCH (e:Experiment {id: $experimentId})-[:HAS_SESSION]->(s:ExperimentSession)-[:HAS_RESPONSE]->(r:Response)
        WHERE r.stimulus_word IS NOT NULL AND r.reaction_time_ms IS NOT NULL AND r.spirit_probability IS NOT NULL
        WITH r.stimulus_word as word, 
             avg(r.reaction_time_ms) as avgTime,
             avg(r.spirit_probability) as avgSpirit,
             count(DISTINCT r.response_word) as responseVariety,
             count(*) as totalResponses
        RETURN word, avgTime, avgSpirit, responseVariety, totalResponses
        ORDER BY avgSpirit DESC
        LIMIT 20
      `
      
      const [spiritDistResult, reactionTimeResult, emotionCorrelationResult, wordInsightsResult] = await Promise.all([
        this.client.query(spiritDistQuery, { experimentId }),
        this.client.query(reactionTimeQuery, { experimentId }),
        this.client.query(emotionCorrelationQuery, { experimentId }),
        this.client.query(wordInsightsQuery, { experimentId })
      ])
      
      const spiritDist = spiritDistResult[0] || { high: 0, medium: 0, low: 0 }
      const reactionTime = reactionTimeResult[0] || { mean: 0, median: 0, standardDeviation: 0, p25: 0, p50: 0, p75: 0, p90: 0, p95: 0 }
      
      return {
        spiritProbabilityDistribution: {
          high: spiritDist.high || 0,
          medium: spiritDist.medium || 0,
          low: spiritDist.low || 0
        },
        reactionTimeAnalysis: {
          mean: reactionTime.mean || 0,
          median: reactionTime.median || 0,
          standardDeviation: reactionTime.standardDeviation || 0,
          percentiles: {
            p25: reactionTime.p25 || 0,
            p50: reactionTime.p50 || 0,
            p75: reactionTime.p75 || 0,
            p90: reactionTime.p90 || 0,
            p95: reactionTime.p95 || 0
          }
        },
        emotionCorrelation: emotionCorrelationResult.map((record: any) => ({
          emotion: record.emotion,
          spiritCorrelation: record.avgSpirit || 0,
          reactionTimeCorrelation: record.avgReactionTime || 0,
          frequency: record.frequency || 0
        })),
        wordAssociationInsights: wordInsightsResult.map((record: any) => ({
          word: record.word,
          averageResponseTime: record.avgTime || 0,
          spiritCorrelation: record.avgSpirit || 0,
          responseVariety: record.responseVariety || 0,
          emotionalValence: 0 // TODO: 感情価値を計算
        }))
      }
    } catch (error) {
      console.error('Failed to perform statistical analysis:', error)
      return {
        spiritProbabilityDistribution: { high: 0, medium: 0, low: 0 },
        reactionTimeAnalysis: { mean: 0, median: 0, standardDeviation: 0, percentiles: { p25: 0, p50: 0, p75: 0, p90: 0, p95: 0 } },
        emotionCorrelation: [],
        wordAssociationInsights: []
      }
    }
  }

  // Merkle DAG: analysis_reporter.generate_insights -> insight_generation_method
  private async generateInsights(
    experimentId: string,
    statisticalAnalysis: AnalysisReportData['statisticalAnalysis'],
    participantAnalysis: AnalysisReportData['participantAnalysis'],
    sessionAnalysis: AnalysisReportData['sessionAnalysis']
  ): Promise<AnalysisReportData['insights']> {
    const insights: AnalysisReportData['insights'] = []
    
    // Spirit確率の高い参加者を特定
    const highSpiritParticipants = participantAnalysis.filter(p => p.averageSpiritProbability >= 0.8)
    if (highSpiritParticipants.length > 0) {
      insights.push({
        type: 'pattern',
        title: '高Spirit確率参加者の特定',
        description: `${highSpiritParticipants.length}名の参加者が平均Spirit確率80%以上を示しました。`,
        confidence: 0.8,
        data: { participants: highSpiritParticipants.map(p => p.participantId) }
      })
    }
    
    // 反応時間の異常値を特定
    const reactionTimeMean = statisticalAnalysis.reactionTimeAnalysis.mean
    const reactionTimeStd = statisticalAnalysis.reactionTimeAnalysis.standardDeviation
    const threshold = reactionTimeMean + 2 * reactionTimeStd
    
    const slowParticipants = participantAnalysis.filter(p => p.averageReactionTime > threshold)
    if (slowParticipants.length > 0) {
      insights.push({
        type: 'anomaly',
        title: '反応時間の異常値',
        description: `${slowParticipants.length}名の参加者が平均反応時間の2標準偏差以上を示しました。`,
        confidence: 0.7,
        data: { participants: slowParticipants.map(p => p.participantId), threshold }
      })
    }
    
    // 感情とSpirit確率の相関
    const emotionCorrelations = statisticalAnalysis.emotionCorrelation
    const strongCorrelations = emotionCorrelations.filter(e => Math.abs(e.spiritCorrelation) > 0.7)
    if (strongCorrelations.length > 0) {
      insights.push({
        type: 'correlation',
        title: '感情とSpirit確率の強い相関',
        description: `${strongCorrelations.length}つの感情がSpirit確率と強い相関を示しました。`,
        confidence: 0.9,
        data: { correlations: strongCorrelations }
      })
    }
    
    return insights
  }

  // Merkle DAG: analysis_reporter.generate_recommendations -> recommendation_generation_method
  private async generateRecommendations(
    experimentId: string,
    insights: AnalysisReportData['insights'],
    statisticalAnalysis: AnalysisReportData['statisticalAnalysis']
  ): Promise<AnalysisReportData['recommendations']> {
    const recommendations: AnalysisReportData['recommendations'] = []
    
    // データ収集の推奨事項
    if (statisticalAnalysis.reactionTimeAnalysis.standardDeviation > 1000) {
      recommendations.push({
        category: 'data_collection',
        priority: 'medium',
        title: '反応時間データの品質向上',
        description: '反応時間の標準偏差が大きいため、データ収集プロセスの見直しを推奨します。',
        actionItems: [
          '反応時間測定の精度向上',
          '外れ値の検出と除去',
          '参加者への指示の明確化'
        ]
      })
    }
    
    // 実験設計の推奨事項
    if (insights.some(i => i.type === 'anomaly')) {
      recommendations.push({
        category: 'experiment_design',
        priority: 'high',
        title: '異常値の原因調査',
        description: '異常値が検出されたため、実験条件の見直しを推奨します。',
        actionItems: [
          '異常値の原因特定',
          '実験条件の標準化',
          '参加者スクリーニングの見直し'
        ]
      })
    }
    
    // 分析手法の推奨事項
    if (statisticalAnalysis.emotionCorrelation.length > 0) {
      recommendations.push({
        category: 'analysis_method',
        priority: 'low',
        title: '感情分析の深化',
        description: '感情とSpirit確率の相関が確認されたため、より詳細な感情分析を推奨します。',
        actionItems: [
          '感情の細分化',
          '時系列での感情変化分析',
          '感情と生理データの統合分析'
        ]
      })
    }
    
    return recommendations
  }

  // Merkle DAG: analysis_reporter.export_report -> report_export_method
  exportReport(report: AnalysisReportData, format: 'json' | 'markdown' | 'html'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2)
      
      case 'markdown':
        return this.generateMarkdownReport(report)
      
      case 'html':
        return this.generateHtmlReport(report)
      
      default:
        throw new Error(`Unsupported format: ${format}`)
    }
  }

  // Merkle DAG: analysis_reporter.generate_markdown -> markdown_report_generation
  private generateMarkdownReport(report: AnalysisReportData): string {
    return `
# 実験分析レポート: ${report.experimentName}

**生成日時:** ${new Date(report.generatedAt).toLocaleString('ja-JP')}  
**実験ID:** ${report.experimentId}

## 概要

- **参加者数:** ${report.summary.totalParticipants}名
- **セッション数:** ${report.summary.totalSessions}回
- **総応答数:** ${report.summary.totalResponses}回
- **平均Spirit確率:** ${(report.summary.averageSpiritProbability * 100).toFixed(1)}%
- **実験期間:** ${report.summary.experimentDuration}日

## 参加者分析

${report.participantAnalysis.map(participant => `
### ${participant.participantName}

- **セッション数:** ${participant.sessionCount}回
- **応答数:** ${participant.responseCount}回
- **平均Spirit確率:** ${(participant.averageSpiritProbability * 100).toFixed(1)}%
- **平均反応時間:** ${participant.averageReactionTime.toFixed(0)}ms

#### 感情プロファイル
${Object.entries(participant.emotionProfile).map(([emotion, count]) => `- ${emotion}: ${count}回`).join('\n')}

#### 単語連合パターン
${participant.wordAssociationPatterns.slice(0, 5).map(pattern => 
  `- "${pattern.stimulus}" → "${pattern.response}" (${pattern.frequency}回, 平均${pattern.averageReactionTime.toFixed(0)}ms)`
).join('\n')}
`).join('\n')}

## 統計分析

### Spirit確率分布
- **高 (≥80%):** ${report.statisticalAnalysis.spiritProbabilityDistribution.high}回
- **中 (60-80%):** ${report.statisticalAnalysis.spiritProbabilityDistribution.medium}回
- **低 (<60%):** ${report.statisticalAnalysis.spiritProbabilityDistribution.low}回

### 反応時間分析
- **平均:** ${report.statisticalAnalysis.reactionTimeAnalysis.mean.toFixed(0)}ms
- **中央値:** ${report.statisticalAnalysis.reactionTimeAnalysis.median.toFixed(0)}ms
- **標準偏差:** ${report.statisticalAnalysis.reactionTimeAnalysis.standardDeviation.toFixed(0)}ms

## インサイト

${report.insights.map(insight => `
### ${insight.title}

**信頼度:** ${(insight.confidence * 100).toFixed(0)}%

${insight.description}
`).join('\n')}

## 推奨事項

${report.recommendations.map(rec => `
### ${rec.title} (優先度: ${rec.priority})

${rec.description}

**アクションアイテム:**
${rec.actionItems.map(item => `- ${item}`).join('\n')}
`).join('\n')}
    `.trim()
  }

  // Merkle DAG: analysis_reporter.generate_html -> html_report_generation
  private generateHtmlReport(report: AnalysisReportData): string {
    return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>実験分析レポート: ${report.experimentName}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; line-height: 1.6; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .insight { background: #e8f4fd; padding: 15px; border-left: 4px solid #2196F3; margin-bottom: 15px; }
        .recommendation { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin-bottom: 15px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
        .stat-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    </style>
</head>
<body>
    <div class="header">
        <h1>実験分析レポート: ${report.experimentName}</h1>
        <p><strong>生成日時:</strong> ${new Date(report.generatedAt).toLocaleString('ja-JP')}</p>
        <p><strong>実験ID:</strong> ${report.experimentId}</p>
    </div>

    <div class="summary">
        <h2>概要</h2>
        <div class="stats-grid">
            <div class="stat-card">
                <h3>参加者数</h3>
                <p>${report.summary.totalParticipants}名</p>
            </div>
            <div class="stat-card">
                <h3>セッション数</h3>
                <p>${report.summary.totalSessions}回</p>
            </div>
            <div class="stat-card">
                <h3>総応答数</h3>
                <p>${report.summary.totalResponses}回</p>
            </div>
            <div class="stat-card">
                <h3>平均Spirit確率</h3>
                <p>${(report.summary.averageSpiritProbability * 100).toFixed(1)}%</p>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>インサイト</h2>
        ${report.insights.map(insight => `
            <div class="insight">
                <h3>${insight.title}</h3>
                <p><strong>信頼度:</strong> ${(insight.confidence * 100).toFixed(0)}%</p>
                <p>${insight.description}</p>
            </div>
        `).join('')}
    </div>

    <div class="section">
        <h2>推奨事項</h2>
        ${report.recommendations.map(rec => `
            <div class="recommendation">
                <h3>${rec.title} (優先度: ${rec.priority})</h3>
                <p>${rec.description}</p>
                <ul>
                    ${rec.actionItems.map(item => `<li>${item}</li>`).join('')}
                </ul>
            </div>
        `).join('')}
    </div>
</body>
</html>
    `.trim()
  }
}

// Merkle DAG: analysis_reporter_singleton -> unified_analysis_reporting
// シングルトンインスタンス
let analysisReporterInstance: AnalysisReporter | null = null

export function getAnalysisReporter(): AnalysisReporter {
  if (!analysisReporterInstance) {
    analysisReporterInstance = new AnalysisReporter()
  }
  return analysisReporterInstance
}
