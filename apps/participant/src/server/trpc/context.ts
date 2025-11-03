import { getSupabaseClient } from '@spiritinphysics/supabase';

/**
 * tRPCコンテキスト
 * 各リクエストで利用可能なリソースを提供
 */
export async function createContext() {
  return {
    supabase: getSupabaseClient(),
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

