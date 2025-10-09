// Merkle DAG: データベース初期化マネージャー
// 全てのデータベースの初期化を統括

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

      // Backend API接続テスト
      const backendUrl = process.env.BACKEND_API_URL || 'http://backend:8080';
      const response = await fetch(`${backendUrl}/actuator/health`);

      if (!response.ok) {
        throw new Error(`Backend API connection failed: ${response.status}`);
      }

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

      // Backend接続は明示的にクローズする必要はない
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
