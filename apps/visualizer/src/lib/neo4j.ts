// Merkle DAG: Cypher Code BuilderベースのNeo4jクライアント
// neo4j-driverを直接使用し、Cypher Code Builderでクエリを構築

import neo4j, { Driver, Session } from 'neo4j-driver'

interface Neo4jConfig {
  uri: string
  user: string
  password: string
  database: string
}

class Neo4jClient {
  private config: Neo4jConfig
  private driver: Driver

  constructor(config: Neo4jConfig) {
    this.config = config
    this.driver = neo4j.driver(
      this.config.uri,
      neo4j.auth.basic(this.config.user, this.config.password),
      {
        database: this.config.database,
      }
    )
  }

  async query(cypherQuery: string, params?: Record<string, any>): Promise<any[]> {
    const session = this.driver.session({ database: this.config.database })
    try {
      console.log('Neo4j query:', cypherQuery, 'params:', params)

      const result = await session.run(cypherQuery, params || {})
      console.log('Neo4j response records:', result.records?.length || 0)

      const records = result.records.map(record => {
        const obj: any = {}
        record.keys.forEach(key => {
          const value = record.get(key)
          // Neo4j Integer型をJavaScript numberに変換
          if (typeof value === 'object' && value !== null && 'low' in value) {
            obj[key] = value.low
          } else {
            obj[key] = value
          }
        })
        return obj
      })

      console.log('Neo4j response data:', records)
      return records
    } catch (error) {
      console.error('Neo4j query error:', error)
      throw error
    } finally {
      await session.close()
    }
  }

  // ガイドライン: MERGE操作の段階化
  async mergeNode(
    nodeLabel: string,
    properties: Record<string, unknown>,
    updateProperties: Record<string, unknown> = {}
  ): Promise<unknown> {
    try {
      const query = `
        MERGE (n:${nodeLabel} {id: $id})
        SET n += $properties
        RETURN n
      `
      
      const params = {
        id: properties.id,
        properties: { ...properties, ...updateProperties }
      }
      
      const result = await this.query(query, params)
      return result[0]?.n || result[0]
    } catch (error) {
      console.error('Error in mergeNode:', error)
      throw error
    }
  }

  // ガイドライン: UNWINDバルク挿入・更新でラウンドトリップ最小化
  async bulkInsertNodes(
    nodeLabel: string,
    dataArray: Record<string, unknown>[],
    batchSize: number = 1000
  ): Promise<unknown> {
    try {
      const query = `
        UNWIND $data as item
        CREATE (n:${nodeLabel})
        SET n += item
        RETURN count(n) as created_count
      `
      
      const params = {
        data: dataArray
      }
      
      const result = await this.query(query, params)
      return result[0]?.created_count || 0
    } catch (error) {
      console.error('Error in bulkInsertNodes:', error)
      throw error
    }
  }

  // ガイドライン: 過取得の抑制：投影は最小限
  async projectMinimalFields(
    nodeLabel: string,
    projectionFields: string[],
    conditions: Record<string, unknown> = {},
    options: { limit?: number; skip?: number } = {}
  ): Promise<unknown[]> {
    try {
      const fields = projectionFields.map(field => `n.${field} as ${field}`).join(', ')
      const whereClause = Object.keys(conditions).length > 0 
        ? `WHERE ${Object.keys(conditions).map(key => `n.${key} = $${key}`).join(' AND ')}`
        : ''
      
      const limitClause = options.limit ? `LIMIT ${options.limit}` : ''
      const skipClause = options.skip ? `SKIP ${options.skip}` : ''
      
      const query = `
        MATCH (n:${nodeLabel})
        ${whereClause}
        RETURN ${fields}
        ${skipClause}
        ${limitClause}
      `
      
      const result = await this.query(query, conditions)
      return result
    } catch (error) {
      console.error('Error in projectMinimalFields:', error)
      throw error
    }
  }

  async close(): Promise<void> {
    await this.driver.close()
  }

  async getParticipants(): Promise<any[]> {
    try {
      // Cypherクエリを使って参加者データを取得
      const query = `
        MATCH (p:Participant)
        RETURN p.id as participant_id, p.created_at as created_at
        ORDER BY p.created_at DESC
      `
      const participants = await this.query(query)

      // 各参加者の統計情報を取得
      const processed = await Promise.all(participants.map(async (participant: any) => {
        const participantId = participant.participant_id
        
        // セッション数とレスポンス数を取得
        const [sessionsResult, responsesResult] = await Promise.all([
          this.query(`
            MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session)
            RETURN count(s) as count
          `, { participantId }),
          this.query(`
            MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session)-[:HAS_RESPONSE]->(r:Response)
            RETURN count(r) as count, avg(r.spirit_probability) as avg_spirit
          `, { participantId })
        ])

        const sessionCount = sessionsResult[0]?.count || 0
        const totalResponses = responsesResult[0]?.count || 0
        const averageSpiritProbability = responsesResult[0]?.avg_spirit || 0.5

        return {
          participant_id: participantId,
          session_count: sessionCount,
          total_responses: totalResponses,
          average_spirit_probability: averageSpiritProbability,
          last_activity: participant.created_at
        }
      }))

      return processed
    } catch (error) {
      console.error('Error in getParticipants:', error)
      return []
    }
  }

  async getParticipantDetails(participantId: string): Promise<any> {
    try {
      // Cypherクエリを使って参加者詳細を取得
      const query = `
        MATCH (p:Participant {id: $participantId})
        RETURN p.id as id, p.age as age, p.gender as gender, p.handedness as handedness
      `
      const result = await this.query(query, { participantId })

      if (result.length === 0) {
        return null
      }

      return result[0]
    } catch (error) {
      console.error('Error in getParticipantDetails:', error)
      return null
    }
  }

  async getParticipantResponses(participantId: string): Promise<any[]> {
    try {
      // Cypherクエリを使って参加者のレスポンスを取得
      const query = `
        MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session)-[:HAS_RESPONSE]->(r:Response)
        RETURN r.id as id, r.stimulus_word as stimulus_word, r.response_word as response_word,
               r.reaction_time_ms as reaction_time_ms, r.emotion as emotion,
               r.emotion_confidence as emotion_confidence, s.id as session_id,
               r.spirit_probability as spirit_probability, r.event_ts as event_ts
        ORDER BY r.event_ts DESC
      `
      const responses = await this.query(query, { participantId })

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

      return processed
    } catch (error) {
      console.error('Error in getParticipantResponses:', error)
      return []
    }
  }
}

// Neo4j configuration
// neo4j://形式をbolt://形式に変換（Docker環境での接続問題を回避）
const getNeo4jUri = (): string => {
  const uri = process.env.NEO4J_URI || process.env.NEXT_PUBLIC_NEO4J_URI || 'bolt://localhost:7687'
  // neo4j://形式をbolt://形式に変換（Docker環境での接続問題を回避）
  if (uri.startsWith('neo4j://')) {
    return uri.replace('neo4j://', 'bolt://')
  }
  return uri
}

const neo4jConfig: Neo4jConfig = {
  uri: getNeo4jUri(),
  user: process.env.NEO4J_USER || 'neo4j',
  password: process.env.NEO4J_PASSWORD || 'password',
  database: process.env.NEO4J_DATABASE || 'neo4j'
}

// デバッグ用：実際に使用されるURIをログ出力
console.log('Neo4j configuration:', {
  uri: neo4jConfig.uri,
  user: neo4jConfig.user,
  database: neo4jConfig.database,
  envUri: process.env.NEO4J_URI || process.env.NEXT_PUBLIC_NEO4J_URI || 'not set'
})

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

  constructor() {
    this.client = createNeo4jClient()
  }

  async testConnection(): Promise<boolean> {
    try {
      // Cypherクエリを使って接続テスト
      const result = await this.client.query('RETURN 1 as test')
      // Neo4j IntegerオブジェクトをJavaScript numberに変換
      const testValue = result && result.length > 0 ? result[0].test : null
      const numValue = typeof testValue === 'object' && testValue !== null && 'low' in testValue
        ? testValue.low
        : Number(testValue) || 0
      return numValue === 1
    } catch (error) {
      console.error('Neo4j connection test failed:', error)
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
      // Cypherクエリを使ってImportJobを取得
      const query = `
        MATCH (j:ImportJob)
        RETURN j.id as id, j.session_id as sessionId, j.participant_id as participantId,
               j.status as status, j.created_at as createdAt, j.completed_at as completedAt,
               j.error_message as error, j.progress_percentage as progress
        ORDER BY j.created_at DESC
        LIMIT 50
      `
      const jobs = await this.query(query)

      return jobs.map((job: any) => ({
        id: job.id,
        sessionId: job.sessionId,
        participantId: job.participantId,
        status: job.status,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        error: job.error,
        progress: job.progress,
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
      const sessionQuery = `
        MATCH (s:Session {id: $sessionId})
        RETURN s.participant_id as participant_id
      `
      const sessionResult = await this.query(sessionQuery, { sessionId })

      if (sessionResult.length === 0) {
        throw new Error('Session not found')
      }

      const participantId = sessionResult[0].participant_id
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Cypherクエリを使ってImportJobを作成
      const createQuery = `
        CREATE (j:ImportJob {
          id: $jobId,
          session_id: $sessionId,
          participant_id: $participantId,
          status: 'PENDING',
          created_at: datetime(),
          progress_percentage: 0
        })
        RETURN j
      `
      const jobResult = await this.query(createQuery, {
        jobId,
        sessionId,
        participantId
      })

      return jobResult[0]?.j || jobResult[0]
    } catch (error) {
      console.error('Error in createImportJob:', error)
      throw error
    }
  }

  async getSessionById(sessionId: string): Promise<unknown> {
    try {
      // Cypherクエリを使ってセッションを取得
      const query = `
        MATCH (s:Session {id: $sessionId})
        RETURN s
      `
      const result = await this.query(query, { sessionId })

      return result[0]?.s || null
    } catch (error) {
      console.error('Error in getSessionById:', error)
      return null
    }
  }

  // Merkle DAG: neo4j.methods.physiological_data
  // 生理データ作成メソッド
  async createPhysiologicalData(participantId: string, sessionId: string, physiologicalData: any[]): Promise<void> {
    try {
      console.log(`Creating physiological data for session ${sessionId}, ${physiologicalData.length} records`)

      // バルク挿入用のクエリ
      const query = `
        UNWIND $data as record
        MATCH (s:Session {id: $sessionId})
        CREATE (p:PhysiologicalData {
          id: record.physiologicalId,
          participant_id: $participantId,
          session_id: $sessionId,
          timestamp: datetime(record.timestamp),
          time_sec: record.time_sec,
          ch1: record.ch1,
          ch2: record.ch2,
          ch3: record.ch3,
          ch4: record.ch4,
          ch5: record.ch5,
          ch6: record.ch6,
          ch7: record.ch7,
          ch8: record.ch8,
          imported_at: datetime()
        })-[:BELONGS_TO]->(s)
      `

      const data = physiologicalData.map(record => ({
        physiologicalId: `physio_${sessionId}_${record.timestamp}`,
        timestamp: new Date(record.timestamp).toISOString(),
        time_sec: record.time_sec,
        ch1: record.ch1,
        ch2: record.ch2,
        ch3: record.ch3,
        ch4: record.ch4,
        ch5: record.ch5,
        ch6: record.ch6,
        ch7: record.ch7,
        ch8: record.ch8,
      }))

      await this.query(query, {
        participantId,
        sessionId,
        data
      })

      console.log(`Successfully created ${physiologicalData.length} physiological data records`)
    } catch (error) {
      console.error('Error in createPhysiologicalData:', error)
      throw error
    }
  }

  // Merkle DAG: neo4j.methods.create_participant
  // 参加者ノード作成
  async createParticipant(participantData: { participant_id: string; signature?: string; agreed_at?: string; agreements_json?: string; imported_at?: string }): Promise<void> {
    const query = `
      CREATE (p:Participant {
        id: $participant_id,
        participant_id: $participant_id,
        signature: $signature,
        agreed_at: datetime($agreed_at),
        agreements_json: $agreements_json,
        created_at: datetime($imported_at)
      })
    `
    await this.query(query, {
      participant_id: participantData.participant_id,
      signature: participantData.signature ?? null,
      agreed_at: participantData.agreed_at ?? new Date().toISOString(),
      agreements_json: participantData.agreements_json ?? '{}',
      imported_at: participantData.imported_at ?? new Date().toISOString(),
    })
  }

  // Merkle DAG: neo4j.methods.create_session_events
  // セッションイベント作成（簡易: SessionEventノードとして保存）
  async createSessionEvents(events: Array<{ participant_id: string; type: string; timestamp: string; payload: any; imported_at: string }>): Promise<void> {
    const query = `
      UNWIND $events as ev
      MERGE (p:Participant { id: ev.participant_id })
      MERGE (s:Session { id: ev.session_id })
        ON CREATE SET s.participant_id = ev.participant_id, s.created_at = datetime(ev.imported_at)
      CREATE (e:SessionEvent {
        id: ev.event_id,
        participant_id: ev.participant_id,
        type: ev.type,
        timestamp: datetime(ev.timestamp),
        payload: ev.payload,
        imported_at: datetime(ev.imported_at)
      })-[:IN_SESSION]->(s)
    `

    const eventsData = events.map(ev => ({
      participant_id: ev.participant_id,
      session_id: `session_${ev.participant_id}`,
      event_id: `evt_${ev.participant_id}_${Date.parse(ev.timestamp)}`,
      type: ev.type,
      timestamp: ev.timestamp,
      payload: ev.payload ?? {},
      imported_at: ev.imported_at,
    }))

    await this.query(query, { events: eventsData })
  }

  // Merkle DAG: neo4j.methods.create_word_responses
  async createWordResponses(participantId: string, responses: Array<{ stimulusWord: string; responseWord: string; reactionTimeMs: number; isDelayed: boolean; timestamp: string }>): Promise<void> {
    const query = `
      UNWIND $responses as r
      CREATE (resp:Response {
        id: r.id,
        participant_id: $participant_id,
        stimulus_word: r.stimulus_word,
        response_word: r.response_word,
        reaction_time_ms: r.reaction_time_ms,
        is_delayed: r.is_delayed,
        event_ts: datetime(r.event_ts)
      })
    `

    const responsesData = responses.map(r => ({
      id: `resp_${participantId}_${Date.parse(r.timestamp)}`,
      participant_id: participantId,
      stimulus_word: r.stimulusWord,
      response_word: r.responseWord,
      reaction_time_ms: r.reactionTimeMs ?? 0,
      is_delayed: !!r.isDelayed,
      event_ts: r.timestamp,
    }))

    await this.query(query, {
      participant_id: participantId,
      responses: responsesData
    })
  }

  // Merkle DAG: neo4j.methods.get_sessions_by_participant
  async getSessionsByParticipantId(participantId: string): Promise<any[]> {
    const query = `
      MATCH (s:Session)
      WHERE s.participant_id = $participant_id
      RETURN s AS session
    `
    const result = await this.query(query, { participant_id: participantId })
    return result.map((r: any) => r.session) || []
  }

  // Merkle DAG: neo4j.methods.create_emotion_entries
  async createEmotionEntries(entries: Array<{ participant_id: string; registry_uuid?: string; text?: string; begin_time?: number; end_time?: number; confidence?: number; emotions?: any; position?: any; imported_at?: string }>): Promise<void> {
    const query = `
      UNWIND $entries as e
      CREATE (em:EmotionEntry {
        id: e.id,
        participant_id: e.participant_id,
        registry_uuid: e.registry_uuid,
        text: e.text,
        begin_time: e.begin_time,
        end_time: e.end_time,
        confidence: e.confidence,
        emotions: e.emotions,
        position: e.position,
        imported_at: datetime(e.imported_at)
      })
    `

    const entriesData = entries.map(e => ({
      id: `emo_${e.participant_id}_${Date.now()}`,
      participant_id: e.participant_id,
      registry_uuid: e.registry_uuid ?? null,
      text: e.text ?? null,
      begin_time: e.begin_time ?? null,
      end_time: e.end_time ?? null,
      confidence: e.confidence ?? null,
      emotions: e.emotions ?? [],
      position: e.position ?? null,
      imported_at: e.imported_at ?? new Date().toISOString(),
    }))

    await this.query(query, { entries: entriesData })
  }

  // Merkle DAG: neo4j.methods.create_csv_elements
  async createCSVElements(elements: Array<Record<string, unknown>>): Promise<void> {
    const query = `
      UNWIND $elements as element
      CREATE (c:CSVElement)
      SET c += element
    `
    await this.query(query, { elements })
  }

  // Merkle DAG: neo4j.methods.get_emotions_by_participant
  async getEmotionDataByParticipantId(participantId: string): Promise<any[]> {
    const query = `
      MATCH (e:EmotionEntry)
      WHERE e.participant_id = $participant_id
      RETURN e AS emotion
    `
    const result = await this.query(query, { participant_id: participantId })
    return result.map((r: any) => r.emotion) || []
  }

  async close(): Promise<void> {
    return this.client.close()
  }
}

// Legacy compatibility - maintain ArangoDBManager for now
export class ArangoDBManager extends Neo4jManager {}
