// Merkle DAG: timeline_visualizer -> integrated_timeseries_visualization
// 統合時系列可視化システム
// Storyの時系列統合可視化システムの実現

import { createNeo4jClient } from './neo4j'

export interface TimelineDataPoint {
  timestamp: number
  eventType: 'word_displayed' | 'response_given' | 'emotion_detected' | 'physiological_change'
  data: {
    word?: string
    response?: string
    reactionTime?: number
    emotion?: string
    emotionIntensity?: number
    physiologicalValue?: number
    physiologicalType?: string
  }
  sessionId: string
  participantId: string
}

export interface TimelineVisualizationData {
  sessionId: string
  participantId: string
  experimentId: string
  startTime: number
  endTime: number
  dataPoints: TimelineDataPoint[]
  summary: {
    totalWords: number
    totalResponses: number
    averageReactionTime: number
    emotionDistribution: Record<string, number>
    physiologicalRange: {
      min: number
      max: number
      average: number
    }
  }
}

export interface TimelineFilter {
  eventTypes?: string[]
  timeRange?: {
    start: number
    end: number
  }
  participants?: string[]
  sessions?: string[]
  emotions?: string[]
  physiologicalTypes?: string[]
}

export class TimelineVisualizer {
  private client: ReturnType<typeof createNeo4jClient>

  constructor() {
    this.client = createNeo4jClient()
  }

  // Merkle DAG: timeline_visualizer.get_session_timeline -> session_timeline_data
  async getSessionTimeline(sessionId: string): Promise<TimelineVisualizationData | null> {
    try {
      // セッション基本情報を取得
      const sessionQuery = `
        MATCH (s:ExperimentSession {id: $sessionId})
        RETURN s.id as sessionId,
               s.participant_id as participantId,
               s.experiment_id as experimentId,
               s.start_ts as startTime,
               s.end_ts as endTime
      `
      
      const sessionResult = await this.client.query(sessionQuery, { sessionId })
      
      if (sessionResult.length === 0) {
        return null
      }
      
      const session = sessionResult[0]
      
      // 時系列データを取得
      const timelineQuery = `
        MATCH (s:ExperimentSession {id: $sessionId})
        OPTIONAL MATCH (s)-[:HAS_RESPONSE]->(r:Response)
        OPTIONAL MATCH (s)-[:HAS_PHYSIOLOGICAL_DATA]->(p:PhysiologicalData)
        OPTIONAL MATCH (s)-[:HAS_EMOTION_DATA]->(e:EmotionAnalysis)
        WITH s, r, p, e
        WHERE r IS NOT NULL OR p IS NOT NULL OR e IS NOT NULL
        RETURN 
          coalesce(r.event_ts, p.timestamp, e.analysis_timestamp) as timestamp,
          CASE 
            WHEN r IS NOT NULL THEN 'response_given'
            WHEN p IS NOT NULL THEN 'physiological_change'
            WHEN e IS NOT NULL THEN 'emotion_detected'
            ELSE 'unknown'
          END as eventType,
          r.stimulus_word as word,
          r.response_word as response,
          r.reaction_time_ms as reactionTime,
          e.emotion_data as emotionData,
          p.ch1 as physiologicalValue,
          'skin_potential' as physiologicalType
        ORDER BY timestamp ASC
      `
      
      const timelineResult = await this.client.query(timelineQuery, { sessionId })
      
      const dataPoints: TimelineDataPoint[] = timelineResult.map((point: any) => ({
        timestamp: new Date(point.timestamp).getTime(),
        eventType: point.eventType,
        data: {
          word: point.word,
          response: point.response,
          reactionTime: point.reactionTime,
          emotion: point.emotionData?.emotion,
          emotionIntensity: point.emotionData?.intensity,
          physiologicalValue: point.physiologicalValue,
          physiologicalType: point.physiologicalType
        },
        sessionId: session.sessionId,
        participantId: session.participantId
      }))
      
      // サマリー統計を計算
      const summary = this.calculateTimelineSummary(dataPoints)
      
      return {
        sessionId: session.sessionId,
        participantId: session.participantId,
        experimentId: session.experimentId,
        startTime: new Date(session.startTime).getTime(),
        endTime: new Date(session.endTime || new Date()).getTime(),
        dataPoints,
        summary
      }
    } catch (error) {
      console.error('Failed to get session timeline:', error)
      return null
    }
  }

  // Merkle DAG: timeline_visualizer.get_experiment_timeline -> experiment_timeline_data
  async getExperimentTimeline(experimentId: string, filter?: TimelineFilter): Promise<TimelineVisualizationData[]> {
    try {
      const query = `
        MATCH (e:Experiment {id: $experimentId})-[:HAS_SESSION]->(s:ExperimentSession)
        OPTIONAL MATCH (s)-[:HAS_RESPONSE]->(r:Response)
        OPTIONAL MATCH (s)-[:HAS_PHYSIOLOGICAL_DATA]->(p:PhysiologicalData)
        OPTIONAL MATCH (s)-[:HAS_EMOTION_DATA]->(e:EmotionAnalysis)
        WITH s, r, p, e
        WHERE r IS NOT NULL OR p IS NOT NULL OR e IS NOT NULL
        RETURN 
          s.id as sessionId,
          s.participant_id as participantId,
          s.experiment_id as experimentId,
          s.start_ts as startTime,
          s.end_ts as endTime,
          coalesce(r.event_ts, p.timestamp, e.analysis_timestamp) as timestamp,
          CASE 
            WHEN r IS NOT NULL THEN 'response_given'
            WHEN p IS NOT NULL THEN 'physiological_change'
            WHEN e IS NOT NULL THEN 'emotion_detected'
            ELSE 'unknown'
          END as eventType,
          r.stimulus_word as word,
          r.response_word as response,
          r.reaction_time_ms as reactionTime,
          e.emotion_data as emotionData,
          p.ch1 as physiologicalValue,
          'skin_potential' as physiologicalType
        ORDER BY s.start_ts ASC, timestamp ASC
      `
      
      const result = await this.client.query(query, { experimentId })
      
      // セッションごとにグループ化
      const sessionGroups: Record<string, any[]> = {}
      result.forEach((point: any) => {
        if (!sessionGroups[point.sessionId]) {
          sessionGroups[point.sessionId] = []
        }
        sessionGroups[point.sessionId].push(point)
      })
      
      // 各セッションのタイムラインデータを構築
      const timelines: TimelineVisualizationData[] = []
      
      Object.entries(sessionGroups).forEach(([sessionId, points]) => {
        const firstPoint = points[0]
        const lastPoint = points[points.length - 1]
        
        const dataPoints: TimelineDataPoint[] = points.map((point: any) => ({
          timestamp: new Date(point.timestamp).getTime(),
          eventType: point.eventType,
          data: {
            word: point.word,
            response: point.response,
            reactionTime: point.reactionTime,
            emotion: point.emotionData?.emotion,
            emotionIntensity: point.emotionData?.intensity,
            physiologicalValue: point.physiologicalValue,
            physiologicalType: point.physiologicalType
          },
          sessionId: point.sessionId,
          participantId: point.participantId
        }))
        
        const summary = this.calculateTimelineSummary(dataPoints)
        
        timelines.push({
          sessionId: point.sessionId,
          participantId: point.participantId,
          experimentId: point.experimentId,
          startTime: new Date(firstPoint.startTime).getTime(),
          endTime: new Date(lastPoint.endTime || new Date()).getTime(),
          dataPoints,
          summary
        })
      })
      
      return timelines
    } catch (error) {
      console.error('Failed to get experiment timeline:', error)
      return []
    }
  }

  // Merkle DAG: timeline_visualizer.filter_timeline -> timeline_filtering_method
  filterTimeline(data: TimelineVisualizationData[], filter: TimelineFilter): TimelineVisualizationData[] {
    return data.filter(timeline => {
      // 参加者フィルタ
      if (filter.participants && !filter.participants.includes(timeline.participantId)) {
        return false
      }
      
      // セッションフィルタ
      if (filter.sessions && !filter.sessions.includes(timeline.sessionId)) {
        return false
      }
      
      // 時間範囲フィルタ
      if (filter.timeRange) {
        if (timeline.endTime < filter.timeRange.start || timeline.startTime > filter.timeRange.end) {
          return false
        }
      }
      
      // イベントタイプフィルタ
      if (filter.eventTypes) {
        const hasMatchingEvent = timeline.dataPoints.some(point => 
          filter.eventTypes!.includes(point.eventType)
        )
        if (!hasMatchingEvent) {
          return false
        }
      }
      
      return true
    }).map(timeline => ({
      ...timeline,
      dataPoints: timeline.dataPoints.filter(point => {
        // イベントタイプフィルタ
        if (filter.eventTypes && !filter.eventTypes.includes(point.eventType)) {
          return false
        }
        
        // 感情フィルタ
        if (filter.emotions && point.data.emotion && !filter.emotions.includes(point.data.emotion)) {
          return false
        }
        
        // 生理データタイプフィルタ
        if (filter.physiologicalTypes && point.data.physiologicalType && 
            !filter.physiologicalTypes.includes(point.data.physiologicalType)) {
          return false
        }
        
        // 時間範囲フィルタ
        if (filter.timeRange) {
          if (point.timestamp < filter.timeRange.start || point.timestamp > filter.timeRange.end) {
            return false
          }
        }
        
        return true
      })
    }))
  }

  // Merkle DAG: timeline_visualizer.calculate_summary -> timeline_summary_calculation
  private calculateTimelineSummary(dataPoints: TimelineDataPoint[]): TimelineVisualizationData['summary'] {
    const words = dataPoints.filter(p => p.eventType === 'word_displayed').length
    const responses = dataPoints.filter(p => p.eventType === 'response_given').length
    const reactionTimes = dataPoints
      .filter(p => p.data.reactionTime)
      .map(p => p.data.reactionTime!)
    
    const averageReactionTime = reactionTimes.length > 0
      ? reactionTimes.reduce((sum, time) => sum + time, 0) / reactionTimes.length
      : 0
    
    // 感情分布を計算
    const emotionDistribution: Record<string, number> = {}
    dataPoints.forEach(point => {
      if (point.data.emotion) {
        emotionDistribution[point.data.emotion] = (emotionDistribution[point.data.emotion] || 0) + 1
      }
    })
    
    // 生理データ範囲を計算
    const physiologicalValues = dataPoints
      .filter(p => p.data.physiologicalValue !== undefined)
      .map(p => p.data.physiologicalValue!)
    
    const physiologicalRange = physiologicalValues.length > 0
      ? {
          min: Math.min(...physiologicalValues),
          max: Math.max(...physiologicalValues),
          average: physiologicalValues.reduce((sum, val) => sum + val, 0) / physiologicalValues.length
        }
      : { min: 0, max: 0, average: 0 }
    
    return {
      totalWords: words,
      totalResponses: responses,
      averageReactionTime,
      emotionDistribution,
      physiologicalRange
    }
  }

  // Merkle DAG: timeline_visualizer.export_timeline -> timeline_export_method
  exportTimeline(data: TimelineVisualizationData[], format: 'json' | 'csv' | 'markdown'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2)
      
      case 'csv':
        const csvHeaders = 'timestamp,eventType,word,response,reactionTime,emotion,emotionIntensity,physiologicalValue,physiologicalType,sessionId,participantId'
        const csvRows = data.flatMap(timeline => 
          timeline.dataPoints.map(point => 
            `${point.timestamp},${point.eventType},${point.data.word || ''},${point.data.response || ''},${point.data.reactionTime || ''},${point.data.emotion || ''},${point.data.emotionIntensity || ''},${point.data.physiologicalValue || ''},${point.data.physiologicalType || ''},${point.sessionId},${point.participantId}`
          )
        )
        return [csvHeaders, ...csvRows].join('\n')
      
      case 'markdown':
        const markdown = data.map(timeline => `
## Session ${timeline.sessionId}

**Participant:** ${timeline.participantId}  
**Duration:** ${new Date(timeline.startTime).toLocaleString()} - ${new Date(timeline.endTime).toLocaleString()}  
**Total Events:** ${timeline.dataPoints.length}

### Summary
- **Words:** ${timeline.summary.totalWords}
- **Responses:** ${timeline.summary.totalResponses}
- **Average Reaction Time:** ${timeline.summary.averageReactionTime.toFixed(2)}ms
- **Emotions:** ${Object.entries(timeline.summary.emotionDistribution).map(([emotion, count]) => `${emotion} (${count})`).join(', ')}
- **Physiological Range:** ${timeline.summary.physiologicalRange.min.toFixed(2)} - ${timeline.summary.physiologicalRange.max.toFixed(2)} (avg: ${timeline.summary.physiologicalRange.average.toFixed(2)})

### Timeline Events
${timeline.dataPoints.map(point => 
  `- **${new Date(point.timestamp).toLocaleTimeString()}** [${point.eventType}] ${point.data.word ? `"${point.data.word}"` : ''} ${point.data.response ? `→ "${point.data.response}"` : ''} ${point.data.reactionTime ? `(${point.data.reactionTime}ms)` : ''} ${point.data.emotion ? `[${point.data.emotion}]` : ''}`
).join('\n')}
        `).join('\n')
        return markdown
      
      default:
        throw new Error(`Unsupported format: ${format}`)
    }
  }
}

// Merkle DAG: timeline_visualizer_singleton -> unified_timeline_management
// シングルトンインスタンス
let timelineVisualizerInstance: TimelineVisualizer | null = null

export function getTimelineVisualizer(): TimelineVisualizer {
  if (!timelineVisualizerInstance) {
    timelineVisualizerInstance = new TimelineVisualizer()
  }
  return timelineVisualizerInstance
}
