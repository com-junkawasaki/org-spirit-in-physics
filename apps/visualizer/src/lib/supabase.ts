import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Supabase URL and keys for local development
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseServiceRoleKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch (error) {
          // The `set` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
      remove(name: string, options: any) {
        try {
          cookieStore.set({ name, value: '', ...options })
        } catch (error) {
          // The `delete` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
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
