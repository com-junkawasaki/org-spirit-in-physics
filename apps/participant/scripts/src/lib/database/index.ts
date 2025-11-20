// Merkle DAG: データベース初期化マネージャー
// PostgreSQL経由でGraphQLサービスを使用

export class DatabaseInitializer {
  private initialized = false;

  /**
   * Merkle DAG: 全データベースの初期化
   * GraphQLサービス経由でPostgreSQLを使用
   */
  async initializeAll(): Promise<void> {
    if (this.initialized) {
      console.log('Databases already initialized');
      return;
    }

    try {
      console.log('Initializing databases via GraphQL service...');
      // GraphQLサービス経由でPostgreSQLを使用
      // 初期化はGraphQLサービス側で管理される
      this.initialized = true;
      console.log('All databases initialized successfully (via GraphQL service)');

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
      // GraphQLサービス経由でPostgreSQLを使用
      // クローズはGraphQLサービス側で管理される
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
