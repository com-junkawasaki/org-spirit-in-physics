// Merkle DAG: Neo4jクライアント設定
// サーバー/クライアント両方で使用可能なNeo4jクライアント
// neo4j-driverを直接使用

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
      const result = await session.run(cypherQuery, params || {})

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

  // Patient app specific methods
  async insertParticipant(participantId: string, data: any): Promise<any> {
    const properties = {
      id: participantId,
      ...data,
      created_at: new Date().toISOString()
    }
    const query = `
      CREATE (p:Participant)
      SET p = $props
      RETURN p
    `
    const result = await this.query(query, { props: properties })
    return result[0]?.p || null
  }

  async insertSession(participantId: string, sessionIndex: number, data: any): Promise<any> {
    const sessionId = `${participantId}-${sessionIndex}`
    const properties = {
      id: sessionId,
      participant_id: participantId,
      session_index: sessionIndex,
      ...data
    }
    const query = `
      MATCH (p:Participant {id: $participantId})
      MERGE (s:Session {id: $sessionId})
      SET s = $props
      MERGE (p)-[:HAS_SESSION]->(s)
      RETURN s
    `
    const result = await this.query(query, { participantId, sessionId, props: properties })
    return result[0]?.s || null
  }

  async insertResponse(participantId: string, sessionIndex: number, data: any): Promise<any> {
    const sessionId = `${participantId}-${sessionIndex}`
    const properties = {
      participant_id: participantId,
      session_id: sessionId,
      ...data
    }
    const query = `
      MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session {id: $sessionId})
      CREATE (s)-[:HAS_RESPONSE]->(r:Response)
      SET r = $props
      RETURN r
    `
    const result = await this.query(query, { participantId, sessionId, props: properties })
    return result[0]?.r || null
  }
}

// Neo4j configuration
const neo4jConfig: Neo4jConfig = {
  uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
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


// Export singleton instance for convenience
export const neo4jClient = createNeo4jClient()

// Database types based on Neo4j schema
export type Database = any; // Temporarily simplified for build
