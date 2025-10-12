// ArangoDB client for Spirit in Physics visualizer

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

  async getParticipants(): Promise<any[]> {
    // AQL query to get participants with summary data
    const query = `
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

    const result = await this.query(query)
    return result || []
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
  url: process.env.ARANGODB_URL || process.env.NEXT_PUBLIC_ARANGODB_URL || 'http://localhost:8529',
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

// Legacy compatibility functions (return mock data for now)
export function createClient() {
  console.warn('Using legacy Supabase client - this should be replaced with TerminusDB')
  return {
    from: (table: string) => ({
      select: (columns: string) => ({
        eq: (column: string, value: any) => ({
          execute: async () => ({ data: [], error: null })
        }),
        order: (column: string, options: any) => ({
          execute: async () => ({ data: [], error: null })
        })
      })
    })
  }
}

export async function createServerSupabaseClient() {
  console.warn('Using legacy Supabase server client - this should be replaced with TerminusDB')
  return createClient()
}

// Database types (generated from Supabase schema)
export interface Database {
  public: {
    Tables: {
      participants: {
        Row: {
          id: string
          age: number | null
          gender: string | null
          handedness: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          age?: number | null
          gender?: string | null
          handedness?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          age?: number | null
          gender?: string | null
          handedness?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      participant_consents: {
        Row: {
          id: string
          participant_id: string
          consent_given: boolean
          consent_timestamp: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          participant_id: string
          consent_given: boolean
          consent_timestamp?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          participant_id?: string
          consent_given?: boolean
          consent_timestamp?: string
          ip_address?: string | null
          user_agent?: string | null
        }
      }
      participant_experiment_sessions: {
        Row: {
          id: string
          participant_id: string
          session_id: string
          session_type: string
          start_time: string | null
          end_time: string | null
        }
        Insert: {
          id?: string
          participant_id: string
          session_id: string
          session_type: string
          start_time?: string | null
          end_time?: string | null
        }
        Update: {
          id?: string
          participant_id?: string
          session_id?: string
          session_type?: string
          start_time?: string | null
          end_time?: string | null
        }
      }
      participant_response_data: {
        Row: {
          id: string
          participant_id: string
          experiment_id: string
          word_stimulus_id: number | null
          stimulus_word: string
          response_word: string
          reaction_time_ms: number
          session: string
          timestamp: string
          audio_file_path: string | null
          video_file_path: string | null
          skin_potential: number
          emotion: string
          emotion_confidence: number
          notes: string | null
        }
        Insert: {
          id?: string
          participant_id: string
          experiment_id: string
          word_stimulus_id?: number | null
          stimulus_word: string
          response_word: string
          reaction_time_ms: number
          session: string
          timestamp?: string
          audio_file_path?: string | null
          video_file_path?: string | null
          skin_potential?: number
          emotion?: string
          emotion_confidence?: number
          notes?: string | null
        }
        Update: {
          id?: string
          participant_id?: string
          experiment_id?: string
          word_stimulus_id?: number | null
          stimulus_word?: string
          response_word?: string
          reaction_time_ms?: number
          session?: string
          timestamp?: string
          audio_file_path?: string | null
          video_file_path?: string | null
          skin_potential?: number
          emotion?: string
          emotion_confidence?: number
          notes?: string | null
        }
      }
      analysis_runs: {
        Row: {
          id: string
          run_id: string
          participant_id: string
          status: string
          created_at: string
          completed_at: string | null
          error_message: string | null
        }
        Insert: {
          id?: string
          run_id: string
          participant_id: string
          status?: string
          created_at?: string
          completed_at?: string | null
          error_message?: string | null
        }
        Update: {
          id?: string
          run_id?: string
          participant_id?: string
          status?: string
          created_at?: string
          completed_at?: string | null
          error_message?: string | null
        }
      }
      analysis_results: {
        Row: {
          id: string
          analysis_run_id: string
          stimulus_word: string
          response_word: string
          kawasaki_p_value: number
          word2vec_component: number
          reaction_time_component: number
          skin_potential_component: number
          emotion_component: number
          emotion_data: any
          physiological_data: any
          created_at: string
        }
        Insert: {
          id?: string
          analysis_run_id: string
          stimulus_word: string
          response_word: string
          kawasaki_p_value: number
          word2vec_component?: number
          reaction_time_component?: number
          skin_potential_component?: number
          emotion_component?: number
          emotion_data?: any
          physiological_data?: any
          created_at?: string
        }
        Update: {
          id?: string
          analysis_run_id?: string
          stimulus_word?: string
          response_word?: string
          kawasaki_p_value?: number
          word2vec_component?: number
          reaction_time_component?: number
          skin_potential_component?: number
          emotion_component?: number
          emotion_data?: any
          physiological_data?: any
          created_at?: string
        }
      }
      response_skin_potential_timeseries: {
        Row: {
          id: string
          response_id: string
          timestamp_offset_ms: number
          value: number
        }
        Insert: {
          id?: string
          response_id: string
          timestamp_offset_ms: number
          value: number
        }
        Update: {
          id?: string
          response_id?: string
          timestamp_offset_ms?: number
          value?: number
        }
      }
      response_emotion_timeseries: {
        Row: {
          id: string
          response_id: string
          timestamp_offset_ms: number
          emotion_type: string
          intensity: number
          confidence: number
        }
        Insert: {
          id?: string
          response_id: string
          timestamp_offset_ms: number
          emotion_type: string
          intensity: number
          confidence?: number
        }
        Update: {
          id?: string
          response_id?: string
          timestamp_offset_ms?: number
          emotion_type?: string
          intensity?: number
          confidence?: number
        }
      }
    }
  }
}
