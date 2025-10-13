// ArangoDB client for Spirit in Physics visualizer

import https from 'https'
import http from 'http'

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
    return new Promise((resolve, reject) => {
      try {
        const url = new URL(this.config.url)
        const auth = Buffer.from(`${this.config.user}:${this.config.password}`).toString('base64')
        console.log('ArangoDB query:', aqlQuery, 'bindVars:', bindVars, 'url:', this.config.url, 'db:', this.config.databaseName)

        const postData = JSON.stringify({
          query: aqlQuery,
          bindVars: bindVars || {},
        })

        const options = {
          hostname: url.hostname,
          port: url.port,
          path: `/_db/${this.config.databaseName}/_api/cursor`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${auth}`,
            'Content-Length': Buffer.byteLength(postData)
          }
        }

        const client = url.protocol === 'https:' ? https : http
        const req = client.request(options, (res) => {
          console.log('ArangoDB response status:', res.statusCode)

          let body = ''
          res.on('data', (chunk) => {
            body += chunk
          })

          res.on('end', () => {
            try {
              if (res.statusCode !== 200 && res.statusCode !== 201) {
                console.error('ArangoDB error response:', body)
                reject(new Error(`ArangoDB query failed: ${res.statusCode}`))
                return
              }

              const data = JSON.parse(body)
              console.log('ArangoDB response data:', data)
              resolve(data.result || [])
            } catch (error) {
              console.error('ArangoDB parse error:', error)
              reject(error)
            }
          })
        })

        req.on('error', (error) => {
          console.error('ArangoDB request error:', error)
          reject(error)
        })

        req.write(postData)
        req.end()
      } catch (error) {
        console.error('ArangoDB query error:', error)
        reject(error)
      }
    })
  }

  async getParticipants(): Promise<any[]> {
    // Simple query first to test
    const query = `FOR participant IN participants RETURN participant._key`

    const result = await this.query(query)
    console.log('Simple query result:', result)

    // If simple query works, try complex one
    if (result && result.length > 0) {
      const complexQuery = `
        FOR participant IN participants
          LET sessionCount = LENGTH(
            FOR session IN participant_sessions
              FILTER session.participant_id == participant._key
              RETURN session
          )
          LET responseCount = LENGTH(
            FOR response IN participant_session_responses
              FILTER response.participant_id == participant._key
              RETURN response
          )
          RETURN {
            participant_id: participant._key,
            session_count: sessionCount,
            total_responses: responseCount,
            average_spirit_probability: 0.5,
            last_activity: participant.created_at
          }
      `

      const complexResult = await this.query(complexQuery)
      return complexResult || []
    }

    return []
  }

  async getParticipantDetails(participantId: string): Promise<any> {
    // Get detailed participant information from ArangoDB
    const query = `
      FOR participant IN participants
        FILTER participant._key == @participantId
        RETURN participant
    `

    const result = await this.query(query, { participantId })

    if (!result || result.length === 0) {
      throw new Error(`Participant ${participantId} not found`)
    }

    const participant = result[0]
    return {
      id: participant._key,
      age: participant.age,
      gender: participant.gender,
      handedness: participant.handedness
    }
  }

  async getParticipantResponses(participantId: string): Promise<any[]> {
    // Get responses for a specific participant from ArangoDB
    const query = `
      FOR response IN participant_session_responses
        FILTER response.participant_id == @participantId
        RETURN response
    `

    const result = await this.query(query, { participantId })

    return result?.map((response: any) => ({
      id: response._key,
      stimulus_word: response.stimulus_word,
      response_word: response.response_word,
      reaction_time_ms: response.reaction_time_ms || 0,
      emotion: response.emotion,
      emotion_confidence: response.emotion_confidence || 0,
      session_id: response.session_id
    })) || []
  }
}

// ArangoDB configuration
const arangodbConfig: ArangoDBConfig = {
  url: process.env.ARANGODB_URL || process.env.NEXT_PUBLIC_ARANGODB_URL || '',
  user: process.env.ARANGODB_USER || 'root',
  password: process.env.ARANGODB_PASSWORD || '',
  databaseName: process.env.ARANGODB_DATABASE || 'spirit_in_physics'
}

// Create singleton client instance
let clientInstance: ArangoDBClient | null = null

export function createArangoDBClient(): ArangoDBClient {
  if (!clientInstance) {
    clientInstance = new ArangoDBClient(arangodbConfig)
  }
  return clientInstance
}

// Legacy compatibility functions are no longer needed
// export function createClient() { ... }
// export async function createServerSupabaseClient() { ... }

// Database types are now managed by ArangoDB's data models, 
// so the Supabase-generated types can be removed.
// export interface Database { ... }

// Merkle DAG: arangodb_manager -> unified_data_access_layer
// ArangoDBManager class for unified data access
export class ArangoDBManager {
  private client: ArangoDBClient

  constructor() {
    this.client = createArangoDBClient()
  }

  async testConnection(): Promise<boolean> {
    try {
      const result = await this.client.query('RETURN 1')
      return result && result.length > 0 && result[0] === 1
    } catch (error) {
      console.error('ArangoDB connection test failed:', error)
      return false
    }
  }

  async query(aqlQuery: string, bindVars?: Record<string, unknown>): Promise<unknown[]> {
    return this.client.query(aqlQuery, bindVars)
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
}
