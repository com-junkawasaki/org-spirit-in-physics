// Merkle DAG: session_manager -> multi_session_experiment_management
// 複数セッション実験の管理機能
// StoryのExperiment階層（Participant → Experiment → Session）を実装

import { createNeo4jClient } from './neo4j'
import { nanoid } from 'nanoid'

export interface SessionManagementData {
  experimentId: string
  participantId: string
  sessionType: string
  startTime: string
  endTime?: string
  status: 'pending' | 'active' | 'completed' | 'failed'
  metadata?: Record<string, unknown>
}

export interface SessionComparisonData {
  sessionId: string
  participantId: string
  experimentId: string
  sessionType: string
  startTime: string
  endTime?: string
  responseCount: number
  averageSpiritProbability: number
  averageReactionTime: number
  emotionDistribution: Record<string, number>
  wordAssociationPatterns: Array<{
    stimulus: string
    response: string
    frequency: number
    averageReactionTime: number
  }>
}

export class SessionManager {
  private client: ReturnType<typeof createNeo4jClient>

  constructor() {
    this.client = createNeo4jClient()
  }

  // Merkle DAG: session_manager.create_session -> session_creation_method
  async createSession(data: SessionManagementData): Promise<string> {
    try {
      const sessionId = `session_${nanoid()}`
      
      // Neo4jクエリでセッションを作成
      const query = `
        MATCH (e:Experiment {id: $experimentId})
        MATCH (p:Participant {id: $participantId})
        CREATE (s:ExperimentSession {
          id: $sessionId,
          participant_id: $participantId,
          experiment_id: $experimentId,
          session_type: $sessionType,
          start_ts: datetime($startTime),
          end_ts: $endTime,
          status: $status,
          created_at: datetime(),
          metadata: $metadata
        })
        CREATE (p)-[:PARTICIPATES_IN]->(s)
        CREATE (e)-[:HAS_SESSION]->(s)
        RETURN s.id as sessionId
      `
      
      const result = await this.client.query(query, {
        sessionId,
        experimentId: data.experimentId,
        participantId: data.participantId,
        sessionType: data.sessionType,
        startTime: data.startTime,
        endTime: data.endTime || null,
        status: data.status,
        metadata: data.metadata || {}
      })
      
      return result[0]?.sessionId || sessionId
    } catch (error) {
      console.error('Failed to create session:', error)
      throw error
    }
  }

  // Merkle DAG: session_manager.update_session -> session_update_method
  async updateSession(sessionId: string, updates: Partial<SessionManagementData>): Promise<void> {
    try {
      const query = `
        MATCH (s:ExperimentSession {id: $sessionId})
        SET s += $updates
        RETURN s.id as sessionId
      `
      
      await this.client.query(query, {
        sessionId,
        updates: {
          ...updates,
          updated_at: new Date().toISOString()
        }
      })
    } catch (error) {
      console.error('Failed to update session:', error)
      throw error
    }
  }

  // Merkle DAG: session_manager.get_session -> session_retrieval_method
  async getSession(sessionId: string): Promise<SessionManagementData | null> {
    try {
      const query = `
        MATCH (s:ExperimentSession {id: $sessionId})
        RETURN s.id as id,
               s.experiment_id as experimentId,
               s.participant_id as participantId,
               s.session_type as sessionType,
               s.start_ts as startTime,
               s.end_ts as endTime,
               s.status as status,
               s.metadata as metadata
      `
      
      const result = await this.client.query(query, { sessionId })
      
      if (result.length === 0) {
        return null
      }
      
      const session = result[0]
      return {
        experimentId: session.experimentId,
        participantId: session.participantId,
        sessionType: session.sessionType,
        startTime: session.startTime,
        endTime: session.endTime,
        status: session.status,
        metadata: session.metadata
      }
    } catch (error) {
      console.error('Failed to get session:', error)
      return null
    }
  }

  // Merkle DAG: session_manager.get_experiment_sessions -> experiment_sessions_retrieval
  async getExperimentSessions(experimentId: string): Promise<SessionManagementData[]> {
    try {
      const query = `
        MATCH (e:Experiment {id: $experimentId})-[:HAS_SESSION]->(s:ExperimentSession)
        RETURN s.id as id,
               s.experiment_id as experimentId,
               s.participant_id as participantId,
               s.session_type as sessionType,
               s.start_ts as startTime,
               s.end_ts as endTime,
               s.status as status,
               s.metadata as metadata
        ORDER BY s.start_ts DESC
      `
      
      const results = await this.client.query(query, { experimentId })
      
      return results.map((session: any) => ({
        experimentId: session.experimentId,
        participantId: session.participantId,
        sessionType: session.sessionType,
        startTime: session.startTime,
        endTime: session.endTime,
        status: session.status,
        metadata: session.metadata
      }))
    } catch (error) {
      console.error('Failed to get experiment sessions:', error)
      return []
    }
  }

  // Merkle DAG: session_manager.get_participant_sessions -> participant_sessions_retrieval
  async getParticipantSessions(participantId: string, experimentId?: string): Promise<SessionManagementData[]> {
    try {
      const query = experimentId 
        ? `
          MATCH (p:Participant {id: $participantId})-[:PARTICIPATES_IN]->(s:ExperimentSession {experiment_id: $experimentId})
          RETURN s.id as id,
                 s.experiment_id as experimentId,
                 s.participant_id as participantId,
                 s.session_type as sessionType,
                 s.start_ts as startTime,
                 s.end_ts as endTime,
                 s.status as status,
                 s.metadata as metadata
          ORDER BY s.start_ts DESC
        `
        : `
          MATCH (p:Participant {id: $participantId})-[:PARTICIPATES_IN]->(s:ExperimentSession)
          RETURN s.id as id,
                 s.experiment_id as experimentId,
                 s.participant_id as participantId,
                 s.session_type as sessionType,
                 s.start_ts as startTime,
                 s.end_ts as endTime,
                 s.status as status,
                 s.metadata as metadata
          ORDER BY s.start_ts DESC
        `
      
      const params = experimentId 
        ? { participantId, experimentId }
        : { participantId }
      
      const results = await this.client.query(query, params)
      
      return results.map((session: any) => ({
        experimentId: session.experimentId,
        participantId: session.participantId,
        sessionType: session.sessionType,
        startTime: session.startTime,
        endTime: session.endTime,
        status: session.status,
        metadata: session.metadata
      }))
    } catch (error) {
      console.error('Failed to get participant sessions:', error)
      return []
    }
  }

  // Merkle DAG: session_manager.compare_sessions -> session_comparison_analysis
  async compareSessions(sessionIds: string[]): Promise<SessionComparisonData[]> {
    try {
      const query = `
        MATCH (s:ExperimentSession)
        WHERE s.id IN $sessionIds
        OPTIONAL MATCH (s)-[:HAS_RESPONSE]->(r:Response)
        WITH s, 
             count(r) as responseCount,
             avg(r.spirit_probability) as avgSpirit,
             avg(r.reaction_time_ms) as avgReactionTime,
             collect(r.emotion) as emotions,
             collect({
               stimulus: r.stimulus_word,
               response: r.response_word,
               reactionTime: r.reaction_time_ms
             }) as responses
        RETURN s.id as sessionId,
               s.participant_id as participantId,
               s.experiment_id as experimentId,
               s.session_type as sessionType,
               s.start_ts as startTime,
               s.end_ts as endTime,
               responseCount,
               coalesce(avgSpirit, 0.5) as averageSpiritProbability,
               coalesce(avgReactionTime, 0) as averageReactionTime,
               emotions,
               responses
        ORDER BY s.start_ts DESC
      `
      
      const results = await this.client.query(query, { sessionIds })
      
      return results.map((session: any) => {
        // 感情分布を計算
        const emotionDistribution: Record<string, number> = {}
        session.emotions.forEach((emotion: string) => {
          if (emotion) {
            emotionDistribution[emotion] = (emotionDistribution[emotion] || 0) + 1
          }
        })
        
        // 単語連合パターンを計算
        const wordPatterns: Record<string, { response: string; reactionTime: number; count: number }> = {}
        session.responses.forEach((response: any) => {
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
          sessionId: session.sessionId,
          participantId: session.participantId,
          experimentId: session.experimentId,
          sessionType: session.sessionType,
          startTime: session.startTime,
          endTime: session.endTime,
          responseCount: session.responseCount || 0,
          averageSpiritProbability: session.averageSpiritProbability || 0.5,
          averageReactionTime: session.averageReactionTime || 0,
          emotionDistribution,
          wordAssociationPatterns
        }
      })
    } catch (error) {
      console.error('Failed to compare sessions:', error)
      return []
    }
  }

  // Merkle DAG: session_manager.get_session_statistics -> session_statistics_analysis
  async getSessionStatistics(experimentId: string): Promise<{
    totalSessions: number
    activeSessions: number
    completedSessions: number
    failedSessions: number
    averageSessionDuration: number
    averageResponsesPerSession: number
    averageSpiritProbability: number
  }> {
    try {
      const query = `
        MATCH (e:Experiment {id: $experimentId})-[:HAS_SESSION]->(s:ExperimentSession)
        OPTIONAL MATCH (s)-[:HAS_RESPONSE]->(r:Response)
        WITH s, 
             count(r) as responseCount,
             avg(r.spirit_probability) as avgSpirit,
             duration.between(datetime(s.start_ts), datetime(s.end_ts)).seconds as duration
        RETURN count(s) as totalSessions,
               sum(CASE WHEN s.status = 'active' THEN 1 ELSE 0 END) as activeSessions,
               sum(CASE WHEN s.status = 'completed' THEN 1 ELSE 0 END) as completedSessions,
               sum(CASE WHEN s.status = 'failed' THEN 1 ELSE 0 END) as failedSessions,
               avg(duration) as averageSessionDuration,
               avg(responseCount) as averageResponsesPerSession,
               avg(avgSpirit) as averageSpiritProbability
      `
      
      const result = await this.client.query(query, { experimentId })
      
      if (result.length === 0) {
        return {
          totalSessions: 0,
          activeSessions: 0,
          completedSessions: 0,
          failedSessions: 0,
          averageSessionDuration: 0,
          averageResponsesPerSession: 0,
          averageSpiritProbability: 0.5
        }
      }
      
      const stats = result[0]
      return {
        totalSessions: stats.totalSessions || 0,
        activeSessions: stats.activeSessions || 0,
        completedSessions: stats.completedSessions || 0,
        failedSessions: stats.failedSessions || 0,
        averageSessionDuration: stats.averageSessionDuration || 0,
        averageResponsesPerSession: stats.averageResponsesPerSession || 0,
        averageSpiritProbability: stats.averageSpiritProbability || 0.5
      }
    } catch (error) {
      console.error('Failed to get session statistics:', error)
      return {
        totalSessions: 0,
        activeSessions: 0,
        completedSessions: 0,
        failedSessions: 0,
        averageSessionDuration: 0,
        averageResponsesPerSession: 0,
        averageSpiritProbability: 0.5
      }
    }
  }

  // Merkle DAG: session_manager.delete_session -> session_deletion_method
  async deleteSession(sessionId: string): Promise<void> {
    try {
      const query = `
        MATCH (s:ExperimentSession {id: $sessionId})
        DETACH DELETE s
      `
      
      await this.client.query(query, { sessionId })
    } catch (error) {
      console.error('Failed to delete session:', error)
      throw error
    }
  }
}

// Merkle DAG: session_manager_singleton -> unified_session_management
// シングルトンインスタンス
let sessionManagerInstance: SessionManager | null = null

export function getSessionManager(): SessionManager {
  if (!sessionManagerInstance) {
    sessionManagerInstance = new SessionManager()
  }
  return sessionManagerInstance
}
