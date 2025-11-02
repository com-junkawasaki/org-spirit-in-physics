import { NextRequest, NextResponse } from 'next/server';

// Merkle DAG: neo4j_save_api -> deprecated
// このエンドポイントはSupabase移行により非推奨になりました
// 新しいエンドポイント: /api/pipeline/save-to-supabase

export async function POST(request: NextRequest) {
  return NextResponse.json({
    error: 'This endpoint has been deprecated. Please use /api/pipeline/save-to-supabase instead.',
    deprecated: true,
    newEndpoint: '/api/pipeline/save-to-supabase'
  }, { status: 410 }); // 410 Gone
}
