// Merkle DAG: Supabaseクライアント設定
// サーバー/クライアント両方で使用可能なSupabaseクライアント

import { createClient } from '@supabase/supabase-js'
import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// 環境変数の取得
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Server-side Supabase client (for server components and API routes)
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
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
            // The `remove` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// Browser-side Supabase client (for client components)
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  )
}

// Universal Supabase client (works in both server and client)
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)

// Database types based on new schema (20241004000001)
export type Database = {
  public: {
    Tables: {
      participants: {
        Row: {
          id: string
          age: number | null
          gender: 'male' | 'female' | 'other' | 'prefer-not-to-say' | null
          handedness: string | null
          name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          age?: number | null
          gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say' | null
          handedness?: string | null
          name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          age?: number | null
          gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say' | null
          handedness?: string | null
          name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      participant_consents: {
        Row: {
          id: string
          participant_id: string
          signature: string
          agreements: Record<string, any>
          agreed_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          participant_id: string
          signature: string
          agreements?: Record<string, any>
          agreed_at: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          participant_id?: string
          signature?: string
          agreements?: Record<string, any>
          agreed_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      participant_experiment_sessions: {
        Row: {
          id: string
          participant_id: string
          session_id: string
          session_type: 'session-1' | 'session-2'
          start_time: string
          end_time: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          participant_id: string
          session_id: string
          session_type: 'session-1' | 'session-2'
          start_time: string
          end_time?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          participant_id?: string
          session_id?: string
          session_type?: 'session-1' | 'session-2'
          start_time?: string
          end_time?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      participant_response_data: {
        Row: {
          id: string
          participant_id: string
          experiment_id: string
          word_stimulus_id: number
          stimulus_word: string
          response_word: string
          reaction_time_ms: number
          session: 'session-1' | 'session-2'
          timestamp: string
          audio_file_path: string | null
          video_file_path: string | null
          skin_potential: number | null
          emotion: string | null
          emotion_confidence: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          participant_id: string
          experiment_id: string
          word_stimulus_id: number
          stimulus_word: string
          response_word: string
          reaction_time_ms: number
          session: 'session-1' | 'session-2'
          timestamp: string
          audio_file_path?: string | null
          video_file_path?: string | null
          skin_potential?: number | null
          emotion?: string | null
          emotion_confidence?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          participant_id?: string
          experiment_id?: string
          word_stimulus_id?: number
          stimulus_word?: string
          response_word?: string
          reaction_time_ms?: number
          session?: 'session-1' | 'session-2'
          timestamp?: string
          audio_file_path?: string | null
          video_file_path?: string | null
          skin_potential?: number | null
          emotion?: string | null
          emotion_confidence?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          participant_id: string
          events: any[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          participant_id: string
          events?: any[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          participant_id?: string
          events?: any[]
          created_at?: string
          updated_at?: string
        }
      }
      video_files: {
        Row: {
          id: string
          participant_id: string
          session_id: string
          file_name: string
          file_path: string
          file_size: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          participant_id: string
          session_id: string
          file_name: string
          file_path: string
          file_size: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          participant_id?: string
          session_id?: string
          file_name?: string
          file_path?: string
          file_size?: number
          created_at?: string
          updated_at?: string
        }
      }
      emotion_analyses: {
        Row: {
          id: string
          participant_id: string
          video_file_id: string
          session_type: string
          timestamp: string
          processing_time_ms: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          participant_id: string
          video_file_id: string
          session_type: string
          timestamp: string
          processing_time_ms: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          participant_id?: string
          video_file_id?: string
          session_type?: string
          timestamp?: string
          processing_time_ms?: number
          created_at?: string
          updated_at?: string
        }
      }
      emotions: {
        Row: {
          id: string
          analysis_id: string
          name: string
          score: number
          confidence: number
          created_at: string
        }
        Insert: {
          id?: string
          analysis_id: string
          name: string
          score: number
          confidence: number
          created_at?: string
        }
        Update: {
          id?: string
          analysis_id?: string
          name?: string
          score?: number
          confidence?: number
          created_at?: string
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
