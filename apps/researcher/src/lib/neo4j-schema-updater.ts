// Merkle DAG: Neo4jスキーマ更新ツール
// ガイドライン: 主キーはアプリ側の安定ID＋DB制約で固める

import { createNeo4jClient } from './neo4j';
import { SCHEMA_CONSTRAINTS, SCHEMA_INDEXES } from './neo4j-schema';

export class Neo4jSchemaUpdater {
  private client: unknown;

  constructor() {
    this.client = createNeo4jClient();
  }

  // スキーマ制約の作成
  async createConstraints(): Promise<void> {
    console.log('Creating Neo4j schema constraints...');
    
    const constraints = Object.values(SCHEMA_CONSTRAINTS);
    
    for (const constraint of constraints) {
      try {
        await (this.client as any).query(constraint);
        console.log(`✓ Created constraint: ${constraint.split(' ')[2]}`);
      } catch (error) {
        console.warn(`⚠ Constraint may already exist: ${constraint.split(' ')[2]}`, error);
      }
    }
    
    console.log('Schema constraints creation completed.');
  }

  // スキーマインデックスの作成
  async createIndexes(): Promise<void> {
    console.log('Creating Neo4j schema indexes...');
    
    const indexes = Object.values(SCHEMA_INDEXES);
    
    for (const index of indexes) {
      try {
        await (this.client as any).query(index);
        console.log(`✓ Created index: ${index.split(' ')[2]}`);
      } catch (error) {
        console.warn(`⚠ Index may already exist: ${index.split(' ')[2]}`, error);
      }
    }
    
    console.log('Schema indexes creation completed.');
  }

  // 全スキーマの更新
  async updateSchema(): Promise<void> {
    console.log('Starting Neo4j schema update...');
    
    try {
      await this.createConstraints();
      await this.createIndexes();
      console.log('✓ Neo4j schema update completed successfully.');
    } catch (error) {
      console.error('✗ Neo4j schema update failed:', error);
      throw error;
    }
  }

  // スキーマの検証
  async validateSchema(): Promise<boolean> {
    console.log('Validating Neo4j schema...');
    
    try {
      // 制約の存在確認
      const constraintsQuery = `
        SHOW CONSTRAINTS
        RETURN count(*) as constraint_count
      `;
      const constraintsResult = await (this.client as any).query(constraintsQuery);
      const constraintCount = constraintsResult[0]?.constraint_count || 0;
      
      // インデックスの存在確認
      const indexesQuery = `
        SHOW INDEXES
        RETURN count(*) as index_count
      `;
      const indexesResult = await (this.client as any).query(indexesQuery);
      const indexCount = indexesResult[0]?.index_count || 0;
      
      console.log(`✓ Schema validation completed. Constraints: ${constraintCount}, Indexes: ${indexCount}`);
      
      return constraintCount > 0 && indexCount > 0;
    } catch (error) {
      console.error('✗ Schema validation failed:', error);
      return false;
    }
  }

  // パフォーマンス統計の取得
  async getPerformanceStats(): Promise<{
    constraintCount: number;
    indexCount: number;
    nodeCounts: Record<string, number>;
    relationshipCounts: Record<string, number>;
  }> {
    console.log('Getting Neo4j performance statistics...');
    
    try {
      // 制約数
      const constraintsQuery = `SHOW CONSTRAINTS RETURN count(*) as constraint_count`;
      const constraintsResult = await (this.client as any).query(constraintsQuery);
      const constraintCount = constraintsResult[0]?.constraint_count || 0;
      
      // インデックス数
      const indexesQuery = `SHOW INDEXES RETURN count(*) as index_count`;
      const indexesResult = await (this.client as any).query(indexesQuery);
      const indexCount = indexesResult[0]?.index_count || 0;
      
      // ノード数
      const nodeCountsQuery = `
        CALL db.labels() YIELD label
        CALL apoc.cypher.run('MATCH (n:' + label + ') RETURN count(n) as count', {}) YIELD value
        RETURN label, value.count as count
        ORDER BY count DESC
      `;
      const nodeCountsResult = await (this.client as any).query(nodeCountsQuery);
      const nodeCounts: Record<string, number> = {};
      nodeCountsResult.forEach((row: any) => {
        nodeCounts[row.label] = row.count;
      });
      
      // 関係数
      const relationshipCountsQuery = `
        CALL db.relationshipTypes() YIELD relationshipType
        CALL apoc.cypher.run('MATCH ()-[r:' + relationshipType + ']->() RETURN count(r) as count', {}) YIELD value
        RETURN relationshipType, value.count as count
        ORDER BY count DESC
      `;
      const relationshipCountsResult = await (this.client as any).query(relationshipCountsQuery);
      const relationshipCounts: Record<string, number> = {};
      relationshipCountsResult.forEach((row: any) => {
        relationshipCounts[row.relationshipType] = row.count;
      });
      
      const stats = {
        constraintCount,
        indexCount,
        nodeCounts,
        relationshipCounts
      };
      
      console.log('✓ Performance statistics retrieved:', stats);
      return stats;
    } catch (error) {
      console.error('✗ Failed to get performance statistics:', error);
      throw error;
    }
  }

  // スキーマの最適化
  async optimizeSchema(): Promise<void> {
    console.log('Optimizing Neo4j schema...');
    
    try {
      // 既存のスキーマを更新
      await this.updateSchema();
      
      // スキーマを検証
      const isValid = await this.validateSchema();
      if (!isValid) {
        throw new Error('Schema validation failed after optimization');
      }
      
      // パフォーマンス統計を取得
      const stats = await this.getPerformanceStats();
      console.log('✓ Schema optimization completed with stats:', stats);
    } catch (error) {
      console.error('✗ Schema optimization failed:', error);
      throw error;
    }
  }

  // クリーンアップ（開発環境用）
  async cleanupSchema(): Promise<void> {
    console.log('Cleaning up Neo4j schema (development only)...');
    
    try {
      // インデックスの削除
      const dropIndexesQuery = `
        SHOW INDEXES
        WHERE name IS NOT NULL
        RETURN 'DROP INDEX ' + name as drop_command
      `;
      const dropIndexesResult = await (this.client as any).query(dropIndexesQuery);
      
      for (const row of dropIndexesResult) {
        try {
          await (this.client as any).query(row.drop_command);
          console.log(`✓ Dropped index: ${row.drop_command}`);
        } catch (error) {
          console.warn(`⚠ Failed to drop index: ${row.drop_command}`, error);
        }
      }
      
      // 制約の削除
      const dropConstraintsQuery = `
        SHOW CONSTRAINTS
        WHERE name IS NOT NULL
        RETURN 'DROP CONSTRAINT ' + name as drop_command
      `;
      const dropConstraintsResult = await (this.client as any).query(dropConstraintsQuery);
      
      for (const row of dropConstraintsResult) {
        try {
          await (this.client as any).query(row.drop_command);
          console.log(`✓ Dropped constraint: ${row.drop_command}`);
        } catch (error) {
          console.warn(`⚠ Failed to drop constraint: ${row.drop_command}`, error);
        }
      }
      
      console.log('✓ Schema cleanup completed.');
    } catch (error) {
      console.error('✗ Schema cleanup failed:', error);
      throw error;
    }
  }
}

// シングルトンインスタンス
let schemaUpdaterInstance: Neo4jSchemaUpdater | null = null;

export function getSchemaUpdater(): Neo4jSchemaUpdater {
  if (!schemaUpdaterInstance) {
    schemaUpdaterInstance = new Neo4jSchemaUpdater();
  }
  return schemaUpdaterInstance;
}

// 便利な関数
export async function updateNeo4jSchema(): Promise<void> {
  const updater = getSchemaUpdater();
  return updater.updateSchema();
}

export async function validateNeo4jSchema(): Promise<boolean> {
  const updater = getSchemaUpdater();
  return updater.validateSchema();
}

export async function getNeo4jPerformanceStats() {
  const updater = getSchemaUpdater();
  return updater.getPerformanceStats();
}

export async function optimizeNeo4jSchema(): Promise<void> {
  const updater = getSchemaUpdater();
  return updater.optimizeSchema();
}

// Merkle DAG: neo4j_schema_updater -> implementation_complete
// スキーマ制約とインデックスの更新ツールの実装完了
