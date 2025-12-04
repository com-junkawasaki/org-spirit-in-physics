// NOTE: neogma dependency removed - using any types for build compatibility

// import { Neogma } from 'neogma'
// import { createNeogmaModels } from './neogma-models'

type Neogma = any
const createNeogmaModels = (_neogma: any) => ({
  Participant: null,
  ExperimentSession: null,
  Response: null,
  EmotionAnalysis: null,
  ImportJob: null
})

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
    // Neogma機能は削除されました
    // this.neogma = new Neogma(...) // Removed
    this.neogma = null as any

    // Neogmaモデルを作成
    const models = createNeogmaModels(null as any)

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

      const records = result.records?.map((record: any) => {
        const obj: any = {}
        record.keys.forEach((key: string) => {
          const value = record.get(key)
          // BigIntをNumber型に変換
          if (typeof value === 'bigint') {
            obj[key] = Number(value)
          } else if (value !== null && typeof value === 'object' && value.constructor === Object) {
            // ネストされたオブジェクトの場合も再帰的にBigIntを変換
            obj[key] = JSON.parse(JSON.stringify(value, (k, v) => typeof v === 'bigint' ? Number(v) : v))
          } else {
            obj[key] = value
          }
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
      `;
      
      const params = {
        id: properties.id,
        properties: { ...properties, ...updateProperties }
      };
      
      const result = await this.query(query, params);
      return result[0]?.n || result[0];
    } catch (error) {
      console.error('Error in mergeNode:', error);
      throw error;
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
      `;
      
      const params = {
        data: dataArray
      };
      
      const result = await this.query(query, params);
      return result[0]?.created_count || 0;
    } catch (error) {
      console.error('Error in bulkInsertNodes:', error);
      throw error;
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
      const fields = projectionFields.map(field => `n.${field} as ${field}`).join(', ');
      const whereClause = Object.keys(conditions).length > 0 
        ? `WHERE ${Object.keys(conditions).map(key => `n.${key} = $${key}`).join(' AND ')}`
        : '';
      
      const limitClause = options.limit ? `LIMIT ${options.limit}` : '';
      const skipClause = options.skip ? `SKIP ${options.skip}` : '';
      
      const query = `
        MATCH (n:${nodeLabel})
        ${whereClause}
        RETURN ${fields}
        ${skipClause}
        ${limitClause}
      `;
      
      const result = await this.query(query, conditions);
      return result;
    } catch (error) {
      console.error('Error in projectMinimalFields:', error);
      throw error;
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
        return null
      }

      return {
        id: participant.id,
        age: participant.age,
        gender: participant.gender,
        handedness: participant.handedness
      }
    } catch (error) {
      console.error('Error in getParticipantDetails:', error)
      return null
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

const neo4jConfig: Neo4jConfig = {
  uri: process.env.NEO4J_URI || process.env.NEXT_PUBLIC_NEO4J_URI || 'bolt://localhost:7687',
  user: process.env.NEO4J_USER || 'neo4j',
  password: process.env.NEO4J_PASSWORD || 'password',
  database: process.env.NEO4J_DATABASE || 'neo4j'
}

let clientInstance: Neo4jClient | null = null

export function createNeo4jClient(): Neo4jClient {
  throw new Error('Neo4j機能は削除されました。この関数は使用できません。')
}

export function createArangoDBClient(): Neo4jClient {
  return createNeo4jClient()
}

export class Neo4jManager {
  private client: Neo4jClient
  private neogma: any
  private Participant: any
  private ExperimentSession: any
  private Response: any
  private EmotionAnalysis: any
  private ImportJob: any

  constructor() {
    this.client = createNeo4jClient()
    // クライアントのモデルを参照
    const neo4jClient = this.client as any
    this.neogma = neo4jClient.neogma
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
      // IntegerオブジェクトをJavaScript numberに変換
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

  // Merkle DAG: methods.physiological_data
  // 生理データ作成メソッド
  async createPhysiologicalData(participantId: string, sessionId: string, physiologicalData: any[]): Promise<void> {
    try {
      console.log(`Creating physiological data for session ${sessionId}, ${physiologicalData.length} records`)

      // 各生理データレコードを処理
      for (const record of physiologicalData) {
        const physiologicalId = `physio_${sessionId}_${record.timestamp}`

        // PhysiologicalDataノードを作成
        await this.neogma.queryRunner.run(
          `CREATE (p:PhysiologicalData {
            id: $physiologicalId,
            participant_id: $participantId,
            session_id: $sessionId,
            timestamp: $timestamp,
            time_sec: $time_sec,
            ch1: $ch1,
            ch2: $ch2,
            ch3: $ch3,
            ch4: $ch4,
            ch5: $ch5,
            ch6: $ch6,
            ch7: $ch7,
            ch8: $ch8,
            imported_at: datetime($imported_at)
          })-[:BELONGS_TO]->(s:ExperimentSession {id: $sessionId})`,
          {
            physiologicalId,
            participantId,
            sessionId,
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
            imported_at: new Date().toISOString()
          }
        )
      }

      console.log(`Successfully created ${physiologicalData.length} physiological data records`)
    } catch (error) {
      console.error('Error in createPhysiologicalData:', error)
      throw error
    }
  }

  // Merkle DAG: methods.create_participant
  // 参加者ノード作成
  async createParticipant(participantData: { participant_id: string; signature?: string; agreed_at?: string; agreements_json?: string; imported_at?: string }): Promise<void> {
    await this.neogma.queryRunner.run(
      `CREATE (p:Participant {
        id: $participant_id,
        participant_id: $participant_id,
        signature: $signature,
        agreed_at: datetime($agreed_at),
        agreements_json: $agreements_json,
        created_at: datetime($imported_at)
      })`,
      {
        participant_id: participantData.participant_id,
        signature: participantData.signature ?? null,
        agreed_at: participantData.agreed_at ?? new Date().toISOString(),
        agreements_json: participantData.agreements_json ?? '{}',
        imported_at: participantData.imported_at ?? new Date().toISOString(),
      }
    )
  }

  // Merkle DAG: methods.create_session_events
  // セッションイベント作成（簡易: SessionEventノードとして保存）
  async createSessionEvents(events: Array<{ participant_id: string; type: string; timestamp: string; payload: any; imported_at: string }>): Promise<void> {
    for (const ev of events) {
      await this.neogma.queryRunner.run(
        `MERGE (p:Participant { id: $participant_id })
         MERGE (s:ExperimentSession { id: $session_id })
           ON CREATE SET s.participant_id = $participant_id, s.created_at = datetime($imported_at)
         CREATE (e:SessionEvent {
           id: $event_id,
           participant_id: $participant_id,
           type: $type,
           timestamp: datetime($timestamp),
           payload: $payload,
           imported_at: datetime($imported_at)
         })-[:IN_SESSION]->(s)`,
        {
          participant_id: ev.participant_id,
          session_id: `session_${ev.participant_id}`,
          event_id: `evt_${ev.participant_id}_${Date.parse(ev.timestamp)}`,
          type: ev.type,
          timestamp: ev.timestamp,
          payload: ev.payload ?? {},
          imported_at: ev.imported_at,
        }
      )
    }
  }

  // Merkle DAG: methods.create_word_responses
  async createWordResponses(participantId: string, responses: Array<{ stimulusWord: string; responseWord: string; reactionTimeMs: number; isDelayed: boolean; timestamp: string }>): Promise<void> {
    for (const r of responses) {
      await this.neogma.queryRunner.run(
        `CREATE (resp:Response {
          id: $id,
          participant_id: $participant_id,
          stimulus_word: $stimulus_word,
          response_word: $response_word,
          reaction_time_ms: $reaction_time_ms,
          is_delayed: $is_delayed,
          event_ts: datetime($event_ts)
        })`,
        {
          id: `resp_${participantId}_${Date.parse(r.timestamp)}`,
          participant_id: participantId,
          stimulus_word: r.stimulusWord,
          response_word: r.responseWord,
          reaction_time_ms: r.reactionTimeMs ?? 0,
          is_delayed: !!r.isDelayed,
          event_ts: r.timestamp,
        }
      )
    }
  }

  // Merkle DAG: methods.get_sessions_by_participant
  async getSessionsByParticipantId(participantId: string): Promise<any[]> {
    const res = await this.neogma.queryRunner.run(
      `MATCH (s:ExperimentSession) WHERE s.participant_id = $participant_id RETURN s AS session`,
      { participant_id: participantId }
    )
    return res.records?.map((r: any) => r.get('session')) ?? []
  }

  // Merkle DAG: methods.create_emotion_entries
  async createEmotionEntries(entries: Array<{ participant_id: string; registry_uuid?: string; text?: string; begin_time?: number; end_time?: number; confidence?: number; emotions?: any; position?: any; imported_at?: string }>): Promise<void> {
    for (const e of entries) {
      await this.neogma.queryRunner.run(
        `CREATE (em:EmotionEntry {
          id: $id,
          participant_id: $participant_id,
          registry_uuid: $registry_uuid,
          text: $text,
          begin_time: $begin_time,
          end_time: $end_time,
          confidence: $confidence,
          emotions: $emotions,
          position: $position,
          imported_at: datetime($imported_at)
        })`,
        {
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
        }
      )
    }
  }

  // Merkle DAG: methods.create_csv_elements
  async createCSVElements(elements: Array<Record<string, unknown>>): Promise<void> {
    for (const element of elements) {
      await this.neogma.queryRunner.run(
        `CREATE (c:CSVElement $props)`,
        { props: element }
      )
    }
  }

  // Merkle DAG: methods.get_emotions_by_participant
  async getEmotionDataByParticipantId(participantId: string): Promise<any[]> {
    const res = await this.neogma.queryRunner.run(
      `MATCH (e:EmotionEntry) WHERE e.participant_id = $participant_id RETURN e AS emotion`,
      { participant_id: participantId }
    )
    return res.records?.map((r: any) => r.get('emotion')) ?? []
  }

  async close(): Promise<void> {
    return this.client.close()
  }
}

// Legacy compatibility - maintain ArangoDBManager for now
export class ArangoDBManager extends Neo4jManager {}
