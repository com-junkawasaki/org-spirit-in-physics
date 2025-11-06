// Merkle DAG: データベース初期化マネージャー
// 全てのデータベースの初期化を統括

import { supabaseManager } from './supabase-manager';
import { getSupabaseClient } from '@spiritinphysics/supabase';

export class DatabaseInitializer {
  private initialized = false;

  /**
   * Merkle DAG: 全データベースの初期化
   */
  async initializeAll(): Promise<void> {
    if (this.initialized) {
      console.log('Databases already initialized');
      return;
    }

    try {
      console.log('Initializing all databases...');

      // Supabase初期化（メインDB）
      await supabaseManager.initialize();

      this.initialized = true;
      console.log('All databases initialized successfully');

    } catch (error) {
      console.error('Failed to initialize databases:', error);
      throw error;
    }
  }

  /**
   * Merkle DAG: 全データベースのクローズ
   */
  async closeAll(): Promise<void> {
    try {
      console.log('Closing all databases...');

      await supabaseManager.close();

      this.initialized = false;
      console.log('All databases closed successfully');

    } catch (error) {
      console.error('Error closing databases:', error);
      throw error;
    }
  }

  /**
   * 初期化状態の確認
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// シングルトンインスタンス
export const databaseInitializer = new DatabaseInitializer();

// Supabaseマネージャーのエクスポート
export { supabaseManager };
// 後方互換性のため
export { supabaseManager as neo4jManager };
// Supabaseクライアントのエクスポート
export { getSupabaseClient } from '@spiritinphysics/supabase';
export type { SupabaseClient } from '@spiritinphysics/supabase';
