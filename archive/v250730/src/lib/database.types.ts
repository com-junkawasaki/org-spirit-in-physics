export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      participants: {
        Row: {
          id: string
          age: number | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          handedness: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          age?: number | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          handedness?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          age?: number | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          handedness?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      participant_consents: {
        Row: {
          id: string
          participant_id: string
          signature: string
          agreements: Json
          agreed_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          participant_id: string
          signature: string
          agreements?: Json
          agreed_at: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          participant_id?: string
          signature?: string
          agreements?: Json
          agreed_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "participant_consents_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: true
            referencedRelation: "participants"
            referencedColumns: ["id"]
          }
        ]
      }
      participant_experiment_sessions: {
        Row: {
          id: string
          participant_id: string
          session_id: string
          session_type: Database["public"]["Enums"]["session_type"]
          start_time: string
          end_time: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          participant_id: string
          session_id: string
          session_type: Database["public"]["Enums"]["session_type"]
          start_time: string
          end_time?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          participant_id?: string
          session_id?: string
          session_type?: Database["public"]["Enums"]["session_type"]
          start_time?: string
          end_time?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "participant_experiment_sessions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          }
        ]
      }
      word_stimuli: {
        Row: {
          id: number
          word: string
          created_at: string
        }
        Insert: {
          id: number
          word: string
          created_at?: string
        }
        Update: {
          id?: number
          word?: string
          created_at?: string
        }
        Relationships: []
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
          session: Database["public"]["Enums"]["session_type"]
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
          session: Database["public"]["Enums"]["session_type"]
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
          session?: Database["public"]["Enums"]["session_type"]
          timestamp?: string
          audio_file_path?: string | null
          video_file_path?: string | null
          skin_potential?: number | null
          emotion?: string | null
          emotion_confidence?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "participant_response_data_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_response_data_word_stimulus_id_fkey"
            columns: ["word_stimulus_id"]
            isOneToOne: false
            referencedRelation: "word_stimuli"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      gender_type: "male" | "female" | "other" | "prefer-not-to-say"
      session_type: "session-1" | "session-2"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
