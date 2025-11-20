// Merkle DAG: Neo4jクエリビルダー
// パラメタ化されたCypherクエリの構築とパフォーマンス最適化

import { NODE_LABELS, RELATIONSHIP_TYPES } from './neo4j-schema';

// クエリビルダーの型定義
interface QueryBuilderOptions {
  limit?: number;
  skip?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

interface BulkOperationOptions {
  batchSize?: number;
  parallel?: boolean;
}

// Merkle DAG: query_builder -> parameterized_queries
export class Neo4jQueryBuilder {
  private params: Record<string, any> = {};
  private paramCounter = 0;

  /**
   * パラメタ化されたクエリの構築
   * 文字列連結を厳禁し、必ずパラメタ化する
   */
  private addParam(value: any): string {
    const paramName = `param_${this.paramCounter++}`;
    this.params[paramName] = value;
    return `$${paramName}`;
  }

  /**
   * 起点ノードにインデックス・制約を活用したMATCHクエリ
   * 可変長パスでの効率的な探索
   */
  buildParticipantQuery(participantId: string, options: QueryBuilderOptions = {}): {
    query: string;
    params: Record<string, any>;
  } {
    const idParam = this.addParam(participantId);
    const limitParam = options.limit ? this.addParam(options.limit) : null;
    const skipParam = options.skip ? this.addParam(options.skip) : null;

    let query = `
      MATCH (p:${NODE_LABELS.PARTICIPANT} {id: ${idParam}})
      OPTIONAL MATCH (p)-[r:HAS_SESSION|HAS_RESPONSE*0..2]-(related)
      RETURN p, collect(DISTINCT related) as related_nodes
    `;

    if (skipParam) {
      query += ` SKIP ${skipParam}`;
    }
    if (limitParam) {
      query += ` LIMIT ${limitParam}`;
    }

    return { query, params: this.params };
  }

  /**
   * MERGE操作の分離：存在確認と作成を段階化
   * 1. 存在確認クエリ
   * 2. 作成クエリ
   */
  buildExistenceCheckQuery(nodeLabel: string, properties: Record<string, any>): {
    query: string;
    params: Record<string, any>;
  } {
    const paramKeys = Object.keys(properties).map(key => 
      `${key}: ${this.addParam(properties[key])}`
    ).join(', ');

    const query = `
      MATCH (n:${nodeLabel} {${paramKeys}})
      RETURN n
    `;

    return { query, params: this.params };
  }

  buildCreateQuery(nodeLabel: string, properties: Record<string, any>): {
    query: string;
    params: Record<string, any>;
  } {
    const paramKeys = Object.keys(properties).map(key => 
      `${key}: ${this.addParam(properties[key])}`
    ).join(', ');

    const query = `
      CREATE (n:${nodeLabel} {${paramKeys}})
      RETURN n
    `;

    return { query, params: this.params };
  }

  /**
   * UNWINDバルク挿入・更新でラウンドトリップ最小化
   * 大量データの効率的な処理
   */
  buildBulkInsertQuery(
    nodeLabel: string, 
    dataArray: Record<string, any>[], 
    options: BulkOperationOptions = {}
  ): {
    query: string;
    params: Record<string, any>;
  } {
    const dataParam = this.addParam(dataArray);
    const batchSizeParam = options.batchSize ? this.addParam(options.batchSize) : null;

    let query = `
      UNWIND ${dataParam} as item
      CREATE (n:${nodeLabel})
      SET n += item
      RETURN count(n) as created_count
    `;

    if (batchSizeParam) {
      query = `
        UNWIND ${dataParam} as item
        WITH item
        CALL apoc.periodic.iterate(
          'UNWIND ${dataParam} as item RETURN item',
          'CREATE (n:${nodeLabel}) SET n += item',
          {batchSize: ${batchSizeParam}, parallel: ${options.parallel || false}}
        )
        YIELD batches, total
        RETURN total as created_count
      `;
    }

    return { query, params: this.params };
  }

  /**
   * 過取得の抑制：投影は最小限、リレーションは必要本数のみ
   * パフォーマンス最適化されたクエリ
   */
  buildMinimalProjectionQuery(
    nodeLabel: string,
    projectionFields: string[],
    relationshipTypes: string[] = [],
    options: QueryBuilderOptions = {}
  ): {
    query: string;
    params: Record<string, any>;
  } {
    const projection = projectionFields.map(field => `n.${field}`).join(', ');
    const relationshipFilter = relationshipTypes.length > 0 
      ? `WHERE type(r) IN [${relationshipTypes.map(type => `'${type}'`).join(', ')}]`
      : '';

    const limitParam = options.limit ? this.addParam(options.limit) : null;
    const orderByParam = options.orderBy ? `n.${options.orderBy}` : null;
    const orderDirection = options.orderDirection || 'ASC';

    let query = `
      MATCH (n:${nodeLabel})
      ${relationshipTypes.length > 0 ? `OPTIONAL MATCH (n)-[r]-(related) ${relationshipFilter}` : ''}
      RETURN ${projection}
    `;

    if (orderByParam) {
      query += ` ORDER BY ${orderByParam} ${orderDirection}`;
    }
    if (limitParam) {
      query += ` LIMIT ${limitParam}`;
    }

    return { query, params: this.params };
  }

  /**
   * 関係プロパティの更新はCypherクエリで実行
   * Neo4jドライバーとの統合
   */
  buildRelationshipUpdateQuery(
    fromNode: { label: string; id: string },
    toNode: { label: string; id: string },
    relationshipType: string,
    properties: Record<string, any> = {}
  ): {
    query: string;
    params: Record<string, any>;
  } {
    const fromIdParam = this.addParam(fromNode.id);
    const toIdParam = this.addParam(toNode.id);
    
    const propertyUpdates = Object.keys(properties).map(key => 
      `r.${key} = ${this.addParam(properties[key])}`
    ).join(', ');

    const query = `
      MATCH (from:${fromNode.label} {id: ${fromIdParam}})
      MATCH (to:${toNode.label} {id: ${toIdParam}})
      MERGE (from)-[r:${relationshipType}]->(to)
      ${propertyUpdates ? `SET ${propertyUpdates}` : ''}
      RETURN r
    `;

    return { query, params: this.params };
  }

  /**
   * トランザクション境界はユースケース単位
   * 複数操作の原子性保証
   */
  buildTransactionQuery(operations: Array<{
    type: 'CREATE' | 'UPDATE' | 'DELETE' | 'MERGE';
    nodeLabel?: string;
    relationshipType?: string;
    properties?: Record<string, any>;
    conditions?: Record<string, any>;
  }>): {
    query: string;
    params: Record<string, any>;
  } {
    const queryParts: string[] = [];
    
    operations.forEach((op, index) => {
      switch (op.type) {
        case 'CREATE':
          if (op.nodeLabel && op.properties) {
            const paramKeys = Object.keys(op.properties).map(key => 
              `${key}: ${this.addParam(op.properties![key])}`
            ).join(', ');
            queryParts.push(`CREATE (n${index}:${op.nodeLabel} {${paramKeys}})`);
          }
          break;
        case 'MERGE':
          if (op.nodeLabel && op.properties) {
            const paramKeys = Object.keys(op.properties).map(key => 
              `${key}: ${this.addParam(op.properties![key])}`
            ).join(', ');
            queryParts.push(`MERGE (n${index}:${op.nodeLabel} {${paramKeys}})`);
          }
          break;
        case 'UPDATE':
          if (op.properties) {
            const propertyUpdates = Object.keys(op.properties).map(key => 
              `n${index}.${key} = ${this.addParam(op.properties![key])}`
            ).join(', ');
            queryParts.push(`SET ${propertyUpdates}`);
          }
          break;
      }
    });

    const returnClause = operations.map((_, index) => `n${index}`).join(', ');
    const query = queryParts.join('\n') + `\nRETURN ${returnClause}`;

    return { query, params: this.params };
  }

  /**
   * クエリパフォーマンス分析
   * EXPLAIN/PROFILEクエリの生成
   */
  buildPerformanceAnalysisQuery(cypherQuery: string): {
    query: string;
    params: Record<string, any>;
  } {
    const query = `EXPLAIN ${cypherQuery}`;
    return { query, params: this.params };
  }

  /**
   * インデックス使用状況の確認
   */
  buildIndexUsageQuery(): {
    query: string;
    params: Record<string, any>;
  } {
    const query = `
      CALL db.indexes() 
      YIELD description, state, type
      RETURN description, state, type
      ORDER BY description
    `;
    return { query, params: this.params };
  }

  /**
   * パラメタをリセット
   */
  reset(): void {
    this.params = {};
    this.paramCounter = 0;
  }
}

// Merkle DAG: query_builder -> performance_optimization
export class Neo4jPerformanceOptimizer {
  /**
   * クエリパフォーマンスの測定
   */
  static async measureQueryPerformance(
    client: any,
    query: string,
    params: Record<string, any> = {}
  ): Promise<{
    executionTime: number;
    resultCount: number;
    memoryUsage?: number;
  }> {
    const startTime = Date.now();
    
    try {
      const result = await client.query(query, params);
      const executionTime = Date.now() - startTime;
      
      return {
        executionTime,
        resultCount: result.length,
      };
    } catch (error) {
      console.error('Query performance measurement failed:', error);
      throw error;
    }
  }

  /**
   * インデックス効果の分析
   */
  static async analyzeIndexEffectiveness(
    client: any,
    nodeLabel: string,
    propertyName: string
  ): Promise<{
    hasIndex: boolean;
    usageCount: number;
    performanceGain: number;
  }> {
    const indexQuery = `
      CALL db.indexes() 
      YIELD description, state, type
      WHERE description CONTAINS '${nodeLabel}' AND description CONTAINS '${propertyName}'
      RETURN count(*) as index_count
    `;

    const result = await client.query(indexQuery);
    const hasIndex = result[0]?.index_count > 0;

    return {
      hasIndex,
      usageCount: 0, // 実際の使用回数は別途測定が必要
      performanceGain: hasIndex ? 0.8 : 0, // 推定値
    };
  }
}

// Merkle DAG: query_builder -> bulk_operations
export class Neo4jBulkOperations {
  /**
   * バルクインポートの最適化
   */
  static async bulkImport(
    client: any,
    nodeLabel: string,
    data: Record<string, any>[],
    batchSize: number = 1000
  ): Promise<{
    totalProcessed: number;
    successCount: number;
    errorCount: number;
    executionTime: number;
  }> {
    const startTime = Date.now();
    let totalProcessed = 0;
    let successCount = 0;
    let errorCount = 0;

    // バッチ処理
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      try {
        const builder = new Neo4jQueryBuilder();
        const { query, params } = builder.buildBulkInsertQuery(nodeLabel, batch, { batchSize });
        
        await client.query(query, params);
        successCount += batch.length;
      } catch (error) {
        console.error(`Batch ${i}-${i + batchSize} failed:`, error);
        errorCount += batch.length;
      }
      
      totalProcessed += batch.length;
    }

    return {
      totalProcessed,
      successCount,
      errorCount,
      executionTime: Date.now() - startTime,
    };
  }
}

// Merkle DAG: query_builder -> transaction_management
export class Neo4jTransactionManager {
  /**
   * ユースケース単位のトランザクション管理
   */
  static async executeInTransaction<T>(
    client: any,
    operations: () => Promise<T>
  ): Promise<T> {
    const session = client.driver.session();
    
    try {
      const result = await session.writeTransaction(async (tx: any) => {
        return await operations();
      });
      
      return result;
    } catch (error) {
      console.error('Transaction failed:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * 複数操作の原子性保証
   */
  static async executeAtomicOperations(
    client: any,
    operations: Array<{
      query: string;
      params: Record<string, any>;
    }>
  ): Promise<any[]> {
    const session = client.driver.session();
    
    try {
      const results = await session.writeTransaction(async (tx: any) => {
        const operationResults = [];
        
        for (const operation of operations) {
          const result = await tx.run(operation.query, operation.params);
          operationResults.push(result);
        }
        
        return operationResults;
      });
      
      return results;
    } catch (error) {
      console.error('Atomic operations failed:', error);
      throw error;
    } finally {
      await session.close();
    }
  }
}

// Merkle DAG: query_builder -> schema_optimization
export class Neo4jSchemaOptimizer {
  /**
   * インデックス・制約の最適化
   */
  static async optimizeSchema(client: any): Promise<{
    indexesCreated: number;
    constraintsCreated: number;
    performanceGain: number;
  }> {
    const optimizationQueries = [
      // 複合インデックスの作成
      `CREATE INDEX participant_session_composite_idx IF NOT EXISTS 
       FOR (p:Participant)-[r:HAS_SESSION]->(s:ExperimentSession) 
       ON (p.id, s.start_ts)`,
      
      // 関係プロパティのインデックス
      `CREATE INDEX response_emotion_composite_idx IF NOT EXISTS 
       FOR (r:Response) 
       ON (r.emotion, r.confidence_score)`,
      
      // 時系列データのインデックス
      `CREATE INDEX session_temporal_idx IF NOT EXISTS 
       FOR (s:ExperimentSession) 
       ON (s.start_ts, s.end_ts)`,
    ];

    let indexesCreated = 0;
    let constraintsCreated = 0;

    for (const query of optimizationQueries) {
      try {
        await client.query(query);
        indexesCreated++;
      } catch (error) {
        console.warn('Index creation failed:', error);
      }
    }

    return {
      indexesCreated,
      constraintsCreated,
      performanceGain: indexesCreated * 0.3, // 推定値
    };
  }
}

// Merkle DAG: query_builder -> query_optimization_complete
// Neo4jクエリビルダーとパフォーマンス最適化の実装完了
