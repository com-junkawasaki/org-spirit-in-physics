// Merkle DAG: trpc_routers.types.context
// tRPCコンテキスト型定義
// 依存関係: @spiritinphysics/supabase

import type { SupabaseClient } from '@spiritinphysics/supabase';

/**
 * Merkle DAG: SupabaseContext
 * tRPCルーターで使用するSupabaseコンテキストの型定義
 * OWL: spirit:ParticipantApplication.hasContext
 */
export interface SupabaseContext {
  supabase: SupabaseClient;
}

