// Merkle DAG: api.timeline.init_schema -> schema_initialization_endpoint
// TimelineIntegrationPointスキーマ初期化APIエンドポイント
// 依存関係: neo4j client, neo4j-timeline-schema
// BPMN: SchemaInitializationProcess

import { NextRequest, NextResponse } from 'next/server';
import { createNeo4jClient } from '@/lib/neo4j';
import {
  TIMELINE_SCHEMA_CONSTRAINTS,
  TIMELINE_SCHEMA_INDEXES,
} from '@/lib/neo4j-timeline-schema';

export async function POST(request: NextRequest) {
  const client = createNeo4jClient();
  const results: Array<{ type: string; name: string; status: 'created' | 'exists' | 'error'; message?: string }> = [];

  try {
    console.log('[SCHEMA INIT] Initializing TimelineIntegrationPoint schema...');

    // 制約を作成
    console.log('[SCHEMA INIT] Creating constraints...');
    for (const [name, query] of Object.entries(TIMELINE_SCHEMA_CONSTRAINTS)) {
      try {
        await client.query(query);
        results.push({ type: 'constraint', name, status: 'created' });
        console.log(`[SCHEMA INIT] ✓ Created constraint: ${name}`);
      } catch (error: any) {
        // 既に存在する場合はスキップ
        if (error.message?.includes('already exists') || error.message?.includes('Equivalent constraint')) {
          results.push({ type: 'constraint', name, status: 'exists' });
          console.log(`[SCHEMA INIT] - Constraint already exists: ${name}`);
        } else {
          results.push({ type: 'constraint', name, status: 'error', message: error.message });
          console.error(`[SCHEMA INIT] ✗ Failed to create constraint ${name}:`, error.message);
          throw error;
        }
      }
    }

    // インデックスを作成
    console.log('[SCHEMA INIT] Creating indexes...');
    for (const [name, query] of Object.entries(TIMELINE_SCHEMA_INDEXES)) {
      try {
        await client.query(query);
        results.push({ type: 'index', name, status: 'created' });
        console.log(`[SCHEMA INIT] ✓ Created index: ${name}`);
      } catch (error: any) {
        // 既に存在する場合はスキップ
        if (error.message?.includes('already exists') || error.message?.includes('Equivalent index')) {
          results.push({ type: 'index', name, status: 'exists' });
          console.log(`[SCHEMA INIT] - Index already exists: ${name}`);
        } else {
          results.push({ type: 'index', name, status: 'error', message: error.message });
          console.error(`[SCHEMA INIT] ✗ Failed to create index ${name}:`, error.message);
          throw error;
        }
      }
    }

    console.log('[SCHEMA INIT] ✓ TimelineIntegrationPoint schema initialization completed');

    return NextResponse.json({
      success: true,
      message: 'Schema initialization completed',
      results,
    });
  } catch (error) {
    console.error('[SCHEMA INIT] ✗ Schema initialization failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        results,
      },
      { status: 500 }
    );
  }
}

// Merkle DAG: api.timeline.init_schema -> implementation_complete
// TimelineIntegrationPointスキーマ初期化APIエンドポイントの実装完了

