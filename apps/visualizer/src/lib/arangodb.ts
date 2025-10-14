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
      OPTIONAL MATCH (p)-[:HAS_SESSION]->(s:Session)
      OPTIONAL MATCH (p)-[:HAS_SESSION]->(:Session)-[:HAS_RESPONSE]->(r:Response)
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
      return result || []
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
    return {
      id: participant.id,
      age: participant.age,
      gender: participant.gender,
      handedness: participant.handedness
    }
  }

  async getParticipantResponses(participantId: string): Promise<any[]> {
    // Get responses for a specific participant from Neo4j
    const query = `
      MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(:Session)-[:HAS_RESPONSE]->(r:Response)
      RETURN r
      ORDER BY r.event_ts DESC
    `

    try {
      const result = await this.query(query, { participantId })
      return result?.map((record: any) => ({
        id: record.r.id || `${participantId}_${record.r.event_ts}`,
        stimulus_word: record.r.stimulus_word,
        response_word: record.r.response_word,
        reaction_time_ms: record.r.reaction_time_ms || 0,
        emotion: record.r.emotion,
        emotion_confidence: record.r.emotion_confidence || 0,
        session_id: record.r.session_id
      })) || []
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

  async close(): Promise<void> {
    return this.client.close()
  }
}

// Legacy compatibility - maintain ArangoDBManager for now
export class ArangoDBManager extends Neo4jManager {}
