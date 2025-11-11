// LLM-BOUNDARY: 80_app - app/(segments)/...（RSC & Client）
// Merkle DAG: import.participants.endpoint
// 参加者データインポートAPIエンドポイント
// 依存関係: import-service (PostgreSQL経由)

import { NextRequest, NextResponse } from "next/server";

// Import service URL (from environment or default)
const IMPORT_SERVICE_URL = process.env.IMPORT_SERVICE_URL || 'http://import-service:8082';

// Merkle DAG: import.participants.process
// 参加者データインポート処理関数（import-service経由）
async function importParticipantsFromDataset() {
  try {
    // Merkle DAG: import.participants.call_service
    // Import service経由で参加者データをインポート
    const response = await fetch(`${IMPORT_SERVICE_URL}/import/participants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Import service error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return {
      success: true,
      results: result.results || [],
      message: result.message || 'Import completed via import-service'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      results: []
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Merkle DAG: import.participants.execute
    // インポート処理実行
    const result = await importParticipantsFromDataset();

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 500 });
    }

  } catch (error) {
    console.error('Import participants error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
