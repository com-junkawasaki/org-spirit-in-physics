// LLM-BOUNDARY: 80_app - scripts/src/lib/...（Serverロジック）
// Merkle DAG: import.transaction_manager
// インポート処理のトランザクション管理（ACIDプロパティ保証）
// 依存関係: Neo4j, import-error-handler

import neo4j, { Driver, Session, Transaction } from 'neo4j-driver';

// Merkle DAG: import.transaction_manager.types
// トランザクション管理用の型定義
export interface TransactionContext {
  session: Session;
  transaction: Transaction;
  importId: string;
  participantId: string;
}

export interface TransactionResult {
  success: boolean;
  committed: boolean;
  rolledBack: boolean;
  error?: string;
  operations: TransactionOperation[];
}

export interface TransactionOperation {
  id: string;
  type: 'create_node' | 'create_relationship' | 'update_property' | 'delete_node' | 'cypher_query';
  description: string;
  cypher?: string;
  parameters?: any;
  executed: boolean;
  success: boolean;
  error?: string;
  timestamp: string;
}

// Merkle DAG: import.transaction_manager.class
// トランザクション管理クラス
export class ImportTransactionManager {
  private driver: Driver;
  private activeTransactions: Map<string, TransactionContext> = new Map();

  constructor(uri: string, user: string, password: string) {
    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }

  // Merkle DAG: import.transaction_manager.initialize
  // トランザクション管理初期化
  async initialize() {
    try {
      await this.driver.verifyConnectivity();
      console.log('Neo4j connection established for import transactions');
    } catch (error) {
      throw new Error(`Failed to connect to Neo4j: ${error}`);
    }
  }

  // Merkle DAG: import.transaction_manager.start_transaction
  // トランザクション開始（Atomicity）
  async startTransaction(importId: string, participantId: string): Promise<TransactionContext> {
    const session = this.driver.session();
    const transaction = session.beginTransaction();

    const context: TransactionContext = {
      session,
      transaction,
      importId,
      participantId
    };

    const transactionKey = `${importId}-${participantId}`;
    this.activeTransactions.set(transactionKey, context);

    console.log(`[${importId}] Started transaction for participant ${participantId}`);
    return context;
  }

  // Merkle DAG: import.transaction_manager.execute_operation
  // 操作実行（Isolation）
  async executeOperation(
    context: TransactionContext,
    operation: Omit<TransactionOperation, 'executed' | 'success' | 'error' | 'timestamp'>
  ): Promise<TransactionOperation> {
    const fullOperation: TransactionOperation = {
      ...operation,
      executed: false,
      success: false,
      timestamp: new Date().toISOString()
    };

    try {
      if (operation.cypher) {
        // Cypherクエリ実行
        await context.transaction.run(operation.cypher, operation.parameters || {});
      }

      fullOperation.executed = true;
      fullOperation.success = true;

      console.log(`[${context.importId}] Executed: ${operation.description}`);
    } catch (error) {
      fullOperation.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[${context.importId}] Failed to execute ${operation.description}:`, error);
      throw error; // 呼び出し元でロールバック処理
    }

    return fullOperation;
  }

  // Merkle DAG: import.transaction_manager.create_participant_node
  // 参加者ノード作成操作
  async createParticipantNode(context: TransactionContext, participantData: any): Promise<TransactionOperation> {
    return this.executeOperation(context, {
      id: `create-participant-${participantData.id}`,
      type: 'create_node',
      description: `Create participant node for ${participantData.id}`,
      cypher: `
        CREATE (p:Participant {
          id: $id,
          signature: $signature,
          agreedAt: datetime($agreedAt),
          agreements: $agreements,
          importedAt: datetime($importedAt)
        })
        RETURN p
      `,
      parameters: {
        id: participantData.id,
        signature: participantData.signature,
        agreedAt: participantData.agreedAt,
        agreements: participantData.agreements,
        importedAt: new Date().toISOString()
      }
    });
  }

  // Merkle DAG: import.transaction_manager.create_session_data
  // セッションデータ作成操作
  async createSessionData(context: TransactionContext, sessionData: any): Promise<TransactionOperation[]> {
    const operations: TransactionOperation[] = [];

    // セッションイベントをバッチ処理
    for (const event of sessionData.events) {
      const operation = await this.executeOperation(context, {
        id: `create-session-event-${event.timestamp}`,
        type: 'create_node',
        description: `Create session event: ${event.type}`,
        cypher: `
          MATCH (p:Participant {id: $participantId})
          CREATE (p)-[:HAS_SESSION]->(s:SessionEvent {
            type: $type,
            timestamp: datetime($timestamp),
            payload: $payload,
            importedAt: datetime($importedAt)
          })
          RETURN s
        `,
        parameters: {
          participantId: sessionData.participantId,
          type: event.type,
          timestamp: new Date(event.timestamp).toISOString(),
          payload: event.payload || {},
          importedAt: new Date().toISOString()
        }
      });
      operations.push(operation);
    }

    return operations;
  }

  // Merkle DAG: import.transaction_manager.create_emotion_data
  // 感情データ作成操作
  async createEmotionData(context: TransactionContext, emotionData: any): Promise<TransactionOperation[]> {
    const operations: TransactionOperation[] = [];

    // 感情分析結果をバッチ処理
    for (const entry of emotionData.entries) {
      const operation = await this.executeOperation(context, {
        id: `create-emotion-entry-${entry.begin}-${entry.end}`,
        type: 'create_node',
        description: `Create emotion analysis entry`,
        cypher: `
          MATCH (p:Participant {id: $participantId})
          CREATE (p)-[:HAS_EMOTION_ANALYSIS]->(e:EmotionAnalysis {
            text: $text,
            beginTime: $beginTime,
            endTime: $endTime,
            confidence: $confidence,
            emotions: $emotions,
            position: $position,
            importedAt: datetime($importedAt)
          })
          RETURN e
        `,
        parameters: {
          participantId: emotionData.participantId,
          text: entry.text,
          beginTime: entry.time?.begin,
          endTime: entry.time?.end,
          confidence: entry.confidence,
          emotions: entry.emotions,
          position: entry.position,
          importedAt: new Date().toISOString()
        }
      });
      operations.push(operation);
    }

    return operations;
  }

  // Merkle DAG: import.transaction_manager.commit_transaction
  // トランザクションコミット（Durability）
  async commitTransaction(context: TransactionContext, operations: TransactionOperation[]): Promise<TransactionResult> {
    try {
      await context.transaction.commit();
      await context.session.close();

      const transactionKey = `${context.importId}-${context.participantId}`;
      this.activeTransactions.delete(transactionKey);

      console.log(`[${context.importId}] Transaction committed for participant ${context.participantId}`);

      return {
        success: true,
        committed: true,
        rolledBack: false,
        operations
      };
    } catch (error) {
      console.error(`[${context.importId}] Failed to commit transaction:`, error);
      throw error;
    }
  }

  // Merkle DAG: import.transaction_manager.rollback_transaction
  // トランザクションロールバック（Atomicity）
  async rollbackTransaction(context: TransactionContext, error: any): Promise<TransactionResult> {
    try {
      await context.transaction.rollback();
      await context.session.close();

      const transactionKey = `${context.importId}-${context.participantId}`;
      this.activeTransactions.delete(transactionKey);

      console.log(`[${context.importId}] Transaction rolled back for participant ${context.participantId}:`, error);

      return {
        success: false,
        committed: false,
        rolledBack: true,
        error: error instanceof Error ? error.message : 'Unknown error',
        operations: []
      };
    } catch (rollbackError) {
      console.error(`[${context.importId}] Failed to rollback transaction:`, rollbackError);
      throw rollbackError;
    }
  }

  // Merkle DAG: import.transaction_manager.execute_with_transaction
  // トランザクション内での操作実行（Consistency + Isolation）
  async executeWithTransaction<T>(
    importId: string,
    participantId: string,
    operation: (context: TransactionContext) => Promise<T>
  ): Promise<{ result: T; transactionResult: TransactionResult }> {
    let context: TransactionContext | null = null;

    try {
      // トランザクション開始
      context = await this.startTransaction(importId, participantId);

      // 操作実行
      const result = await operation(context);

      // コミット（この段階で実際のコミット操作は呼び出し元で行う）
      const transactionResult: TransactionResult = {
        success: true,
        committed: false, // まだコミットされていない
        rolledBack: false,
        operations: []
      };

      return { result, transactionResult };

    } catch (error) {
      // エラー発生時はロールバック
      if (context) {
        await this.rollbackTransaction(context, error);
      }
      throw error;
    }
  }

  // Merkle DAG: import.transaction_manager.validate_constraints
  // データ整合性検証（Consistency）
  async validateConstraints(participantId: string): Promise<boolean> {
    const session = this.driver.session();

    try {
      // 参加者ノードが存在することを確認
      const participantResult = await session.run(
        'MATCH (p:Participant {id: $id}) RETURN count(p) as count',
        { id: participantId }
      );

      const participantCount = participantResult.records[0].get('count').toNumber();
      if (participantCount === 0) {
        throw new Error(`Participant ${participantId} does not exist`);
      }

      // 他の整合性チェックをここに追加
      // 例: セッションデータの一貫性、感情データの参照整合性など

      return true;
    } finally {
      await session.close();
    }
  }

  // Merkle DAG: import.transaction_manager.get_transaction_status
  // トランザクション状態取得
  getTransactionStatus(importId: string, participantId: string): TransactionContext | undefined {
    const transactionKey = `${importId}-${participantId}`;
    return this.activeTransactions.get(transactionKey);
  }

  // Merkle DAG: import.transaction_manager.cleanup
  // リソースクリーンアップ
  async cleanup() {
    // アクティブなトランザクションをすべてロールバック
    for (const [key, context] of this.activeTransactions) {
      try {
        await context.transaction.rollback();
        await context.session.close();
        console.log(`Cleaned up transaction: ${key}`);
      } catch (error) {
        console.error(`Failed to cleanup transaction ${key}:`, error);
      }
    }

    this.activeTransactions.clear();
    await this.driver.close();
  }
}

// Merkle DAG: import.transaction_manager.factory
// トランザクションマネージャーファクトリ
export function createImportTransactionManager(): ImportTransactionManager {
  const uri = process.env.NEO4J_URI || 'neo4j://localhost:7687';
  const user = process.env.NEO4J_USER || 'neo4j';
  const password = process.env.NEO4J_PASSWORD || 'password';

  const manager = new ImportTransactionManager(uri, user, password);
  return manager;
}
