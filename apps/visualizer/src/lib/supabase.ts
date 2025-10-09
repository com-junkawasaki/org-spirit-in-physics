// TerminusDB client for Spirit in Physics visualizer

interface TerminusDBConfig {
  url: string
  user: string
  password: string
  databaseId: string
}

class TerminusDBClient {
  private config: TerminusDBConfig

  constructor(config: TerminusDBConfig) {
    this.config = config
  }

  private async query(woqlQuery: string): Promise<any> {
    try {
      const response = await fetch(`${this.config.url}/api/query/${this.config.databaseId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${this.config.user}:${this.config.password}`)}`
        },
        body: JSON.stringify({ query: woqlQuery })
      })

      if (!response.ok) {
        throw new Error(`TerminusDB query failed: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('TerminusDB query error:', error)
      throw error
    }
  }

  async getParticipants(): Promise<any[]> {
    // WOQL query to get participants with summary data
    const query = `
      * triple("v:Participant", "rdf:type", "scm:Participant").
      * triple("v:Participant", "scm:id", "v:Id").
      * triple("v:Participant", "scm:created_at", "v:CreatedAt").opt().
      * triple("v:Participant", "has_response", "v:Response").opt().
      * group_by("v:Participant", ["v:Participant"], "v:ResponseCount", count("v:Response", "v:ResponseCount")).
    `

    const result = await this.query(query)

    return result.bindings?.map((binding: any) => ({
      participant_id: binding.Id?.['@value'],
      session_count: 0, // Simplified for now
      total_responses: parseInt(binding.ResponseCount?.['@value'] || '0'),
      average_spirit_probability: 0.5, // Placeholder
      last_activity: binding.CreatedAt?.['@value']
    })) || []
  }

  async getParticipantDetails(participantId: string): Promise<any> {
    // Get detailed participant information
    const query = `
      * triple("terminusdb:///data/Participant/${participantId}", "rdf:type", "scm:Participant").
      * triple("terminusdb:///data/Participant/${participantId}", "scm:id", "v:Id").
      * triple("terminusdb:///data/Participant/${participantId}", "scm:age", "v:Age").opt().
      * triple("terminusdb:///data/Participant/${participantId}", "scm:gender", "v:Gender").opt().
      * triple("terminusdb:///data/Participant/${participantId}", "scm:handedness", "v:Handedness").opt().
      * triple("terminusdb:///data/Participant/${participantId}", "has_session", "v:Session").opt().
      * triple("terminusdb:///data/Participant/${participantId}", "has_response", "v:Response").opt().
    `

    const result = await this.query(query)

    if (!result.bindings?.length) {
      throw new Error(`Participant ${participantId} not found`)
    }

    const binding = result.bindings[0]
    return {
      id: binding.Id?.['@value'],
      age: binding.Age?.['@value'],
      gender: binding.Gender?.['@value'],
      handedness: binding.Handedness?.['@value']
    }
  }

  async getParticipantResponses(participantId: string): Promise<any[]> {
    // Get responses for a specific participant
    const query = `
      * triple("v:Response", "belongs_to_participant", "terminusdb:///data/Participant/${participantId}").
      * triple("v:Response", "rdf:type", "scm:ResponseData").
      * triple("v:Response", "scm:id", "v:Id").
      * triple("v:Response", "scm:stimulus_word", "v:StimulusWord").
      * triple("v:Response", "scm:response_word", "v:ResponseWord").
      * triple("v:Response", "scm:reaction_time_ms", "v:ReactionTime").opt().
      * triple("v:Response", "scm:emotion", "v:Emotion").opt().
      * triple("v:Response", "scm:emotion_confidence", "v:EmotionConfidence").opt().
      * triple("v:Response", "belongs_to_session", "v:Session").opt().
    `

    const result = await this.query(query)

    return result.bindings?.map((binding: any) => ({
      id: binding.Id?.['@value'],
      stimulus_word: binding.StimulusWord?.['@value'],
      response_word: binding.ResponseWord?.['@value'],
      reaction_time_ms: parseInt(binding.ReactionTime?.['@value'] || '0'),
      emotion: binding.Emotion?.['@value'],
      emotion_confidence: parseFloat(binding.EmotionConfidence?.['@value'] || '0'),
      session_id: binding.Session?.['@value']?.split('/').pop()
    })) || []
  }
}

// TerminusDB configuration
const terminusdbConfig: TerminusDBConfig = {
  url: process.env.NEXT_PUBLIC_TERMINUSDB_URL || 'http://localhost:6363',
  user: process.env.TERMINUSDB_USER || 'admin',
  password: process.env.TERMINUSDB_PASSWORD || 'root',
  databaseId: process.env.TERMINUSDB_DATABASE_ID || 'spirit_in_physics'
}

// Create singleton client instance
let clientInstance: TerminusDBClient | null = null

export function createTerminusDBClient(): TerminusDBClient {
  if (!clientInstance) {
    clientInstance = new TerminusDBClient(terminusdbConfig)
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
