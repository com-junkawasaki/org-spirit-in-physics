// Merkle DAG: ArangoDBクライアント設定
// サーバー/クライアント両方で使用可能なArangoDBクライアント

interface ArangoDBConfig {
  url: string
  user: string
  password: string
  databaseName: string
}

class ArangoDBClient {
  private config: ArangoDBConfig

  constructor(config: ArangoDBConfig) {
    this.config = config
  }

  async query(aqlQuery: string, bindVars?: any): Promise<any> {
    try {
      const auth = btoa(`${this.config.user}:${this.config.password}`)
      const response = await fetch(`${this.config.url}/_api/cursor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`,
        },
        body: JSON.stringify({
          query: aqlQuery,
          bindVars: bindVars || {},
          database: this.config.databaseName,
        }),
      })

      if (!response.ok) {
        throw new Error(`ArangoDB query failed: ${response.statusText}`)
      }

      const data = await response.json()
      return data.result || []
    } catch (error) {
      console.error('ArangoDB query error:', error)
      throw error
    }
  }

  // Patient app specific methods
  async insertParticipant(participantId: string, data: any): Promise<any> {
    const doc = {
      _key: participantId,
      ...data,
      created_at: new Date().toISOString()
    }
    const query = `INSERT @doc INTO participants RETURN NEW`
    return await this.query(query, { doc })
  }

  async insertSession(participantId: string, sessionIndex: number, data: any): Promise<any> {
    const doc = {
      _key: `${participantId}-${sessionIndex}`,
      participant_id: participantId,
      session_index: sessionIndex,
      ...data
    }
    const query = `INSERT @doc INTO participant_sessions RETURN NEW`
    return await this.query(query, { doc })
  }

  async insertResponse(participantId: string, sessionIndex: number, data: any): Promise<any> {
    const doc = {
      participant_id: participantId,
      session_id: `${participantId}-${sessionIndex}`,
      ...data
    }
    const query = `INSERT @doc INTO participant_session_responses RETURN NEW`
    return await this.query(query, { doc })
  }
}

// ArangoDB configuration
const arangodbConfig: ArangoDBConfig = {
  url: process.env.ARANGODB_URL || 'http://localhost:8529',
  user: process.env.ARANGODB_USER || 'root',
  password: process.env.ARANGODB_PASSWORD || '',
  databaseName: process.env.ARANGODB_DATABASE_NAME || 'spirit_in_physics'
}

// Create singleton client instance
let clientInstance: ArangoDBClient | null = null

export function createArangoDBClient(): ArangoDBClient {
  if (!clientInstance) {
    clientInstance = new ArangoDBClient(arangodbConfig)
  }
  return clientInstance
}

// Export singleton instance for convenience
export const arangodb = createArangoDBClient()

// Database types based on new schema
export type Database = any; // Temporarily simplified for build
