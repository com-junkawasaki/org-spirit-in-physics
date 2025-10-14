// Neo4j client for Spirit in Physics visualizer

import * as neo4j from 'neo4j-driver'

interface Neo4jConfig {
  uri: string
  user: string
  password: string
  database: string
}

class Neo4jClient {
  private config: Neo4jConfig
  private driver: neo4j.Driver

  constructor(config: Neo4jConfig) {
    this.config = config
    this.driver = neo4j.driver(
      this.config.uri,
      neo4j.auth.basic(this.config.user, this.config.password)
    )
  }

  async query(cypherQuery: string, params?: Record<string, any>): Promise<any[]> {
    const session = this.driver.session({ database: this.config.database })
    try {
      console.log('Neo4j query:', cypherQuery, 'params:', params)

      const result = await session.run(cypherQuery, params || {})
      console.log('Neo4j response records:', result.records.length)

      const records = result.records.map(record => {
        const obj: any = {}
        record.keys.forEach(key => {
          obj[key] = record.get(key)
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

  async close(): Promise<void> {
    await this.driver.close()
  }

  async getParticipants(): Promise<any[]> {
    // Get participants with their session and response counts using Cypher
    const query = `
      MATCH (p:Participant)
      OPTIONAL MATCH (p)-[:HAS_SESSION]->(s:ExperimentSession)
      OPTIONAL MATCH (p)-[:HAS_SESSION]->(:ExperimentSession)-[:HAS_RESPONSE]->(r:Response)
      RETURN
        p.id as participant_id,
        count(distinct s) as session_count,
        count(distinct r) as total_responses,
        0.5 as average_spirit_probability,
        p.created_at as last_activity
      ORDER BY p.created_at DESC
    `

    try {
      const result = await this.query(query)

      // Convert Neo4j integers to JavaScript numbers
      const processed = result?.map((record: any) => ({
        participant_id: record.participant_id,
        session_count: typeof record.session_count === 'object' && record.session_count.low !== undefined
          ? record.session_count.low
          : record.session_count || 0,
        total_responses: typeof record.total_responses === 'object' && record.total_responses.low !== undefined
          ? record.total_responses.low
          : record.total_responses || 0,
        average_spirit_probability: record.average_spirit_probability || 0.5,
        last_activity: record.last_activity
      })) || []

      return processed
    } catch (error) {
      console.error('Error in getParticipants:', error)
      return []
    }
  }

  async getParticipantDetails(participantId: string): Promise<any> {
    // Get detailed participant information from Neo4j
    const query = `
      MATCH (p:Participant {id: $participantId})
      RETURN p
    `

    const result = await this.query(query, { participantId })

    if (!result || result.length === 0) {
      throw new Error(`Participant ${participantId} not found`)
    }

    const participant = result[0].p
    // Extract properties from Neo4j Node object
    const properties = participant && typeof participant === 'object' && 'properties' in participant
      ? participant.properties
      : participant

    return {
      id: properties.id,
      age: properties.age,
      gender: properties.gender,
      handedness: properties.handedness
    }
  }

  async getParticipantResponses(participantId: string): Promise<any[]> {
    // Get responses for a specific participant from Neo4j
    const query = `
      MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(:ExperimentSession)-[:HAS_RESPONSE]->(r:Response)
      RETURN r
      ORDER BY r.created_at DESC
    `

    try {
      const result = await this.query(query, { participantId })
      return result?.map((record: any) => {
        // Extract properties from Neo4j Node object
        const response = record.r
        const properties = response && typeof response === 'object' && 'properties' in response
          ? response.properties
          : response

        return {
          id: properties.id || `${participantId}_${properties.event_ts || properties.created_at}`,
          stimulus_word: properties.stimulus_word,
          response_word: properties.response_word,
          reaction_time_ms: properties.reaction_time_ms || 0,
          emotion: properties.emotion,
          emotion_confidence: properties.emotion_confidence || 0,
          session_id: properties.session_id || properties.experiment_id
        }
      }) || []
    } catch (error) {
      console.error('Error in getParticipantResponses:', error)
      return []
    }
  }
}

// Neo4j configuration
const neo4jConfig: Neo4jConfig = {
  uri: process.env.NEO4J_URI || process.env.NEXT_PUBLIC_NEO4J_URI || 'neo4j://localhost:7687',
  user: process.env.NEO4J_USER || 'neo4j',
  password: process.env.NEO4J_PASSWORD || '',
  database: process.env.NEO4J_DATABASE || 'neo4j'
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

  constructor() {
    this.client = createNeo4jClient()
  }

  async testConnection(): Promise<boolean> {
    try {
      const result = await this.client.query('RETURN 1 as test')
      return result && result.length > 0 && result[0].test === 1
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
    const query = `
      MATCH (j:ImportJob)
      RETURN {
        id: j.id,
        sessionId: j.session_id,
        participantId: j.participant_id,
        status: j.status,
        createdAt: j.created_at,
        completedAt: j.completed_at,
        error: j.error_message,
        progress: j.progress_percentage
      }
      ORDER BY j.created_at DESC
      LIMIT 50
    `
    return this.client.query(query)
  }

  async getJobStatistics(): Promise<{ activeJobs: number; completedJobs: number; failedJobs: number }> {
    const query = `
      MATCH (j:ImportJob)
      RETURN j.status as status, count(j) as count
    `
    const results = await this.client.query(query)

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
  }

  async createImportJob(sessionId: string): Promise<unknown> {
    // First get participant ID from session
    const sessionQuery = `
      MATCH (s:ExperimentSession {id: $sessionId})
      RETURN s.participant_id as participantId
    `
    const sessionResult = await this.client.query(sessionQuery, { sessionId })

    if (!sessionResult || sessionResult.length === 0) {
      throw new Error('Session not found')
    }

    const participantId = sessionResult[0].participantId
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const createQuery = `
      CREATE (j:ImportJob {
        id: $jobId,
        session_id: $sessionId,
        participant_id: $participantId,
        status: 'PENDING',
        created_at: $createdAt,
        progress_percentage: 0
      })
      RETURN j
    `

    const result = await this.client.query(createQuery, {
      jobId,
      sessionId,
      participantId,
      createdAt: new Date().toISOString()
    })

    return result[0]?.j
  }

  async getSessionById(sessionId: string): Promise<unknown> {
    const query = `
      MATCH (s:ExperimentSession {id: $sessionId})
      RETURN s
    `
    const result = await this.client.query(query, { sessionId })
    return result[0]?.s
  }

  async close(): Promise<void> {
    return this.client.close()
  }
}

// Legacy compatibility - maintain ArangoDBManager for now
export class ArangoDBManager extends Neo4jManager {}
