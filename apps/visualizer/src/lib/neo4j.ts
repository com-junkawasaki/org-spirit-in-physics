// Merkle DAG: NeogmaベースのNeo4jクライアント
// Neogmaを使用した型安全なNeo4j Object-Graph Mapping

import { Neogma } from 'neogma'
import { createNeogmaModels } from './neogma-models'

interface Neo4jConfig {
  uri: string
  user: string
  password: string
  database: string
}

class Neo4jClient {
  private config: Neo4jConfig
  private neogma: Neogma
  private Participant: any
  private ExperimentSession: any
  private Response: any
  private EmotionAnalysis: any
  private ImportJob: any

  constructor(config: Neo4jConfig) {
    this.config = config
    this.neogma = new Neogma(
      {
        url: this.config.uri,
        username: this.config.user,
        password: this.config.password,
        database: this.config.database,
      },
      {
        logger: console.log,
      }
    )

    // Neogmaモデルを作成
    const models = createNeogmaModels(this.neogma)

    // モデルをクラスプロパティとして設定
    this.Participant = models.Participant
    this.ExperimentSession = models.ExperimentSession
    this.Response = models.Response
    this.EmotionAnalysis = models.EmotionAnalysis
    this.ImportJob = models.ImportJob
  }

  async query(cypherQuery: string, params?: Record<string, any>): Promise<any[]> {
    try {
      console.log('Neogma query:', cypherQuery, 'params:', params)

      const result = await this.neogma.queryRunner.run(cypherQuery, params || {})
      console.log('Neogma response records:', result.records?.length || 0)

      const records = result.records?.map(record => {
        const obj: any = {}
        record.keys.forEach(key => {
          obj[key] = record.get(key)
        })
        return obj
      }) || []

      console.log('Neogma response data:', records)
      return records
    } catch (error) {
      console.error('Neogma query error:', error)
      throw error
    }
  }

  async close(): Promise<void> {
    await this.neogma.driver.close()
  }

  async getParticipants(): Promise<any[]> {
    try {
      // Neogmaを使って参加者データを取得
      const participants = await this.Participant.findMany()

      // 各参加者の統計情報を取得
      const processed = await Promise.all(participants.map(async (participant: any) => {
        // Neogmaでは直接countが使えないので、findManyの長さをカウント
        const [sessions, responses] = await Promise.all([
          this.ExperimentSession.findMany({ where: { participant_id: participant.id } }),
          this.Response.findMany({ where: { participant_id: participant.id } }),
        ])

        const sessionCount = sessions.length
        const totalResponses = responses.length
        const averageSpiritProbability = responses.length > 0
          ? responses.reduce((sum: number, response: any) =>
              sum + (response.spirit_probability || 0), 0) / responses.length
          : 0.5

        return {
          participant_id: participant.id,
          session_count: sessionCount,
          total_responses: totalResponses,
          average_spirit_probability: averageSpiritProbability,
          last_activity: participant.created_at
        }
      }))

      // 作成日時で降順ソート
      processed.sort((a: any, b: any) =>
        new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
      )

      return processed
    } catch (error) {
      console.error('Error in getParticipants:', error)
      return []
    }
  }

  async getParticipantDetails(participantId: string): Promise<any> {
    try {
      // Neogmaを使って参加者詳細を取得
      const participant = await this.Participant.findOne({
        where: { id: participantId },
      })

      if (!participant) {
        throw new Error(`Participant ${participantId} not found`)
      }

      return {
        id: participant.id,
        age: participant.age,
        gender: participant.gender,
        handedness: participant.handedness
      }
    } catch (error) {
      console.error('Error in getParticipantDetails:', error)
      throw error
    }
  }

  async getParticipantResponses(participantId: string): Promise<any[]> {
    try {
      // Neogmaを使って参加者のレスポンスを取得
      const responses = await this.Response.findMany({
        where: { participant_id: participantId },
      })

      // データを整形
      const processed = responses.map((response: any) => ({
        id: response.id,
        stimulus_word: response.stimulus_word,
        response_word: response.response_word,
        reaction_time_ms: response.reaction_time_ms || 0,
        emotion: response.emotion,
        emotion_confidence: response.emotion_confidence || 0,
        session_id: response.session_id,
        spirit_probability: response.spirit_probability,
        event_ts: response.event_ts,
      }))

      // 作成日時で降順ソート
      processed.sort((a: any, b: any) =>
        new Date(b.event_ts || 0).getTime() - new Date(a.event_ts || 0).getTime()
      )

      return processed
    } catch (error) {
      console.error('Error in getParticipantResponses:', error)
      return []
    }
  }
}

// Neo4j configuration
const neo4jConfig: Neo4jConfig = {
  uri: process.env.NEO4J_URI || process.env.NEXT_PUBLIC_NEO4J_URI || 'bolt://localhost:7687',
  user: process.env.NEO4J_USER || 'neo4j',
  password: process.env.NEO4J_PASSWORD || 'password',
  database: process.env.NEO4J_DATABASE || 'myDb'
}

// Create singleton client instance
let clientInstance: Neo4jClient | null = null

export function createNeo4jClient(): Neo4jClient {
  if (!clientInstance) {
    clientInstance = new Neo4jClient(neo4jConfig)
  }
  return clientInstance
}

// Legacy compatibility functions - maintain for now
export function createArangoDBClient(): Neo4jClient {
  return createNeo4jClient()
}

// Merkle DAG: neo4j_manager -> unified_data_access_layer
// Neo4jManager class for unified data access
export class Neo4jManager {
  private client: Neo4jClient
  private Participant: any
  private ExperimentSession: any
  private Response: any
  private EmotionAnalysis: any
  private ImportJob: any

  constructor() {
    this.client = createNeo4jClient()
    // クライアントのモデルを参照
    const neo4jClient = this.client as any
    this.Participant = neo4jClient.Participant
    this.ExperimentSession = neo4jClient.ExperimentSession
    this.Response = neo4jClient.Response
    this.EmotionAnalysis = neo4jClient.EmotionAnalysis
    this.ImportJob = neo4jClient.ImportJob
  }

  async testConnection(): Promise<boolean> {
    try {
      // Neogmaを使って接続テスト
      const result = await this.client.query('RETURN 1 as test')
      // Neo4j IntegerオブジェクトをJavaScript numberに変換
      const testValue = result && result.length > 0 ? result[0].test : null
      const numValue = typeof testValue === 'object' && testValue !== null && 'low' in testValue
        ? testValue.low
        : Number(testValue) || 0
      return numValue === 1
    } catch (error) {
      console.error('Neogma connection test failed:', error)
      return false
    }
  }

  async query(cypherQuery: string, params?: Record<string, unknown>): Promise<unknown[]> {
    return this.client.query(cypherQuery, params)
  }

  async getParticipants(): Promise<unknown[]> {
    return this.client.getParticipants()
  }

  async getParticipantDetails(participantId: string): Promise<unknown> {
    return this.client.getParticipantDetails(participantId)
  }

  async getParticipantResponses(participantId: string): Promise<unknown[]> {
    return this.client.getParticipantResponses(participantId)
  }

  async getImportJobs(): Promise<unknown[]> {
    try {
      // Neogmaを使ってImportJobを取得
      const jobs = await this.ImportJob.findMany({
        order: [['created_at', 'DESC']],
        limit: 50,
      })

      return jobs.map((job: any) => ({
        id: job.id,
        sessionId: job.session_id,
        participantId: job.participant_id,
        status: job.status,
        createdAt: job.created_at,
        completedAt: job.completed_at,
        error: job.error_message,
        progress: job.progress_percentage,
      }))
    } catch (error) {
      console.error('Error in getImportJobs:', error)
      return []
    }
  }

  async getJobStatistics(): Promise<{ activeJobs: number; completedJobs: number; failedJobs: number }> {
    try {
      // Cypherクエリを使って各ステータスのジョブ数をカウント
      const query = `
        MATCH (j:ImportJob)
        RETURN j.status as status, count(j) as count
      `
      const results = await this.query(query)

      let activeJobs = 0
      let completedJobs = 0
      let failedJobs = 0

      results.forEach((result: any) => {
        const status = result.status
        const count = result.count

        switch (status) {
          case 'PENDING':
          case 'RUNNING':
            activeJobs += count
            break
          case 'COMPLETED':
            completedJobs += count
            break
          case 'FAILED':
            failedJobs += count
            break
        }
      })

      return { activeJobs, completedJobs, failedJobs }
    } catch (error) {
      console.error('Error in getJobStatistics:', error)
      return { activeJobs: 0, completedJobs: 0, failedJobs: 0 }
    }
  }

  async createImportJob(sessionId: string): Promise<unknown> {
    try {
      // まずセッションから参加者IDを取得
      const session = await this.ExperimentSession.findOne({
        where: { id: sessionId },
      })

      if (!session) {
        throw new Error('Session not found')
      }

      const participantId = session.participant_id
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Neogmaを使ってImportJobを作成
      const job = await this.ImportJob.createOne({
        id: jobId,
        session_id: sessionId,
        participant_id: participantId,
        status: 'PENDING',
        created_at: new Date().toISOString(),
        progress_percentage: 0,
      })

      return job
    } catch (error) {
      console.error('Error in createImportJob:', error)
      throw error
    }
  }

  async getSessionById(sessionId: string): Promise<unknown> {
    try {
      // Neogmaを使ってセッションを取得
      const session = await this.ExperimentSession.findOne({
        where: { id: sessionId },
      })

      return session
    } catch (error) {
      console.error('Error in getSessionById:', error)
      return null
    }
  }

  // Merkle DAG: import.methods.session_events
  // セッションイベント作成メソッド
  async createSessionEvents(events: any[]): Promise<void> {
    try {
      for (const event of events) {
        await this.neogma.queryRunner.run(
          `CREATE (e:SessionEvent {
            participant_id: $participant_id,
            type: $type,
            timestamp: datetime($timestamp),
            payload: $payload,
            imported_at: datetime($imported_at)
          })-[:BELONGS_TO]->(p:Participant {participant_id: $participant_id})`,
          event
        );
      }
    } catch (error) {
      console.error('Error in createSessionEvents:', error);
      throw error;
    }
  }

  // Merkle DAG: import.methods.word_responses
  // 単語応答データ作成メソッド
  async createWordResponses(participantId: string, responses: any[]): Promise<void> {
    try {
      for (const response of responses) {
        await this.neogma.queryRunner.run(
          `MATCH (p:Participant {participant_id: $participant_id})
           CREATE (r:WordResponse {
             stimulus_word: $stimulus_word,
             response_word: $response_word,
             reaction_time_ms: $reaction_time_ms,
             is_delayed: $is_delayed,
             timestamp: datetime($timestamp),
             imported_at: datetime($imported_at)
           })-[:GIVEN_BY]->(p)`,
          {
            participant_id: participantId,
            ...response,
            imported_at: new Date().toISOString()
          }
        );
      }
    } catch (error) {
      console.error('Error in createWordResponses:', error);
      throw error;
    }
  }

  // Merkle DAG: import.methods.emotion_entries
  // 感情データ作成メソッド
  async createEmotionEntries(entries: any[]): Promise<void> {
    try {
      for (const entry of entries) {
        await this.neogma.queryRunner.run(
          `MATCH (p:Participant {participant_id: $participant_id})
           CREATE (e:EmotionEntry {
             text: $text,
             begin_time: $begin_time,
             end_time: $end_time,
             confidence: $confidence,
             emotions: $emotions,
             position: $position,
             imported_at: datetime($imported_at)
           })-[:HAS_EMOTION]->(p)`,
          entry
        );
      }
    } catch (error) {
      console.error('Error in createEmotionEntries:', error);
      throw error;
    }
  }

  // Merkle DAG: import.methods.csv_elements
  // CSVデータ作成メソッド
  async createCSVElements(elements: any[]): Promise<void> {
    try {
      for (const element of elements) {
        await this.neogma.queryRunner.run(
          `MATCH (p:Participant {participant_id: $participant_id})
           CREATE (c:CSVElement {
             file_type: $file_type,
             data: $data,
             imported_at: datetime($imported_at)
           })-[:HAS_CSV_DATA]->(p)`,
          element
        );
      }
    } catch (error) {
      console.error('Error in createCSVElements:', error);
      throw error;
    }
  }

  // Merkle DAG: import.methods.get_sessions_by_participant
  // 参加者別セッション取得メソッド
  async getSessionsByParticipantId(participantId: string): Promise<any[]> {
    try {
      const result = await this.neogma.queryRunner.run(
        `MATCH (p:Participant {participant_id: $participant_id})-[:BELONGS_TO]-(e:SessionEvent)
         RETURN e ORDER BY e.timestamp`,
        { participant_id: participantId }
      );
      return result.records.map((record: any) => record.get('e').properties);
    } catch (error) {
      console.error('Error in getSessionsByParticipantId:', error);
      return [];
    }
  }

  // Merkle DAG: import.methods.get_emotions_by_participant
  // 参加者別感情データ取得メソッド
  async getEmotionDataByParticipantId(participantId: string): Promise<any[]> {
    try {
      const result = await this.neogma.queryRunner.run(
        `MATCH (p:Participant {participant_id: $participant_id})-[:HAS_EMOTION]-(e:EmotionEntry)
         RETURN e ORDER BY e.begin_time`,
        { participant_id: participantId }
      );
      return result.records.map((record: any) => record.get('e').properties);
    } catch (error) {
      console.error('Error in getEmotionDataByParticipantId:', error);
      return [];
    }
  }

  // Merkle DAG: import.methods.session_events
  // セッションイベント作成メソッド
  async createSessionEvents(events: any[]): Promise<void> {
    try {
      for (const event of events) {
        await this.neogma.queryRunner.run(
          `CREATE (e:SessionEvent {
            participant_id: $participant_id,
            type: $type,
            timestamp: datetime($timestamp),
            payload: $payload,
            imported_at: datetime($imported_at)
          })-[:BELONGS_TO]->(p:Participant {participant_id: $participant_id})`,
          event
        );
      }
    } catch (error) {
      console.error('Error in createSessionEvents:', error);
      throw error;
    }
  }

  // Merkle DAG: import.methods.word_responses
  // 単語応答データ作成メソッド
  async createWordResponses(participantId: string, responses: any[]): Promise<void> {
    try {
      for (const response of responses) {
        await this.neogma.queryRunner.run(
          `MATCH (p:Participant {participant_id: $participant_id})
           CREATE (r:WordResponse {
             stimulus_word: $stimulus_word,
             response_word: $response_word,
             reaction_time_ms: $reaction_time_ms,
             is_delayed: $is_delayed,
             timestamp: datetime($timestamp),
             imported_at: datetime($imported_at)
           })-[:GIVEN_BY]->(p)`,
          {
            participant_id: participantId,
            ...response,
            imported_at: new Date().toISOString()
          }
        );
      }
    } catch (error) {
      console.error('Error in createWordResponses:', error);
      throw error;
    }
  }

  // Merkle DAG: import.methods.emotion_entries
  // 感情データ作成メソッド
  async createEmotionEntries(entries: any[]): Promise<void> {
    try {
      for (const entry of entries) {
        await this.neogma.queryRunner.run(
          `MATCH (p:Participant {participant_id: $participant_id})
           CREATE (e:EmotionEntry {
             text: $text,
             begin_time: $begin_time,
             end_time: $end_time,
             confidence: $confidence,
             emotions: $emotions,
             position: $position,
             imported_at: datetime($imported_at)
           })-[:HAS_EMOTION]->(p)`,
          entry
        );
      }
    } catch (error) {
      console.error('Error in createEmotionEntries:', error);
      throw error;
    }
  }

  // Merkle DAG: import.methods.csv_elements
  // CSVデータ作成メソッド
  async createCSVElements(elements: any[]): Promise<void> {
    try {
      for (const element of elements) {
        await this.neogma.queryRunner.run(
          `MATCH (p:Participant {participant_id: $participant_id})
           CREATE (c:CSVElement {
             file_type: $file_type,
             data: $data,
             imported_at: datetime($imported_at)
           })-[:HAS_CSV_DATA]->(p)`,
          element
        );
      }
    } catch (error) {
      console.error('Error in createCSVElements:', error);
      throw error;
    }
  }

  // Merkle DAG: import.methods.get_sessions_by_participant
  // 参加者別セッション取得メソッド
  async getSessionsByParticipantId(participantId: string): Promise<any[]> {
    try {
      const result = await this.neogma.queryRunner.run(
        `MATCH (p:Participant {participant_id: $participant_id})-[:BELONGS_TO]-(e:SessionEvent)
         RETURN e ORDER BY e.timestamp`,
        { participant_id: participantId }
      );
      return result.records.map((record: any) => record.get('e').properties);
    } catch (error) {
      console.error('Error in getSessionsByParticipantId:', error);
      return [];
    }
  }

  // Merkle DAG: import.methods.get_emotions_by_participant
  // 参加者別感情データ取得メソッド
  async getEmotionDataByParticipantId(participantId: string): Promise<any[]> {
    try {
      const result = await this.neogma.queryRunner.run(
        `MATCH (p:Participant {participant_id: $participant_id})-[:HAS_EMOTION]-(e:EmotionEntry)
         RETURN e ORDER BY e.begin_time`,
        { participant_id: participantId }
      );
      return result.records.map((record: any) => record.get('e').properties);
    } catch (error) {
      console.error('Error in getEmotionDataByParticipantId:', error);
      return [];
    }
  }

  async close(): Promise<void> {
    return this.client.close()
  }
}

// Legacy compatibility - maintain ArangoDBManager for now
export class ArangoDBManager extends Neo4jManager {}
