// Merkle DAG: Supabaseデータベースクライアント
// Supabaseクライアントの初期化とシングルトン管理

import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface SupabaseConfig {
  url: string;
  serviceRoleKey: string;
}

// 環境変数から設定を取得
function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY environment variable is required');
  }

  return { url, serviceRoleKey };
}

// シングルトンインスタンス
let supabaseClientInstance: SupabaseClient | null = null;

/**
 * Merkle DAG: Supabaseクライアントの取得
 * シングルトンパターンでクライアントインスタンスを管理
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClientInstance) {
    const config = getSupabaseConfig();
    supabaseClientInstance = createClient(config.url, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabaseClientInstance;
}

/**
 * Merkle DAG: 接続テスト
 */
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    const { error } = await client.from('participants').select('id').limit(1);
    return !error;
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return false;
  }
}

export type { SupabaseClient };

