import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/client';
import { gql } from '@apollo/client';
import { z } from 'zod';

// Merkle DAG: pipeline_api_route -> workflow_orchestration
// パイプライン分析APIエンドポイント

// リクエストボディのスキーマ定義
const START_FILE_IMPORT_MUTATION = gql`
  mutation StartFileImportWorkflow($participantId: String!, $dataRootPath: String, $priority: String) {
    startFileImportWorkflow(participantId: $participantId, dataRootPath: $dataRootPath, priority: $priority)
  }
`;

const ImportAndAnalyzeSchema = z.object({
  participantId: z.string().min(1),
  dataRootPath: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
});

export async function POST(request: NextRequest) {
  try {
    // Merkle DAG: request_validation -> input_validation
    // リクエストボディの解析と検証
    const body = await request.json();
    const validatedData = ImportAndAnalyzeSchema.parse(body);
    
    const {
      participantId,
      dataRootPath = '/app/public/dataset',
      priority,
    } = validatedData;

    // Merkle DAG: workflow_trigger -> pipeline_initiation
    // ファイルインポートワークフローの開始（ローカル開発では直接実行）
    const client = getClient();
    const { data } = await client.mutate({
      mutation: START_FILE_IMPORT_MUTATION,
      variables: {
        participantId,
        dataRootPath,
        priority,
      }
    });

    // Merkle DAG: response_generation -> api_response
    // レスポンスの生成
    const response = {
      success: true,
      message: 'パイプライン分析を開始しました',
      data: {
        participantId,
        importEventId: data.startFileImportWorkflow,
        status: 'started',
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(response, { status: 202 });

  } catch (error) {
    console.error('Pipeline import and analyze error:', error);

    // Merkle DAG: error_handling -> error_response
    // エラーレスポンスの生成
    const errorResponse = {
      success: false,
      message: 'パイプライン分析の開始に失敗しました',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(errorResponse, { status: 400 });
  }
}

// Merkle DAG: pipeline_status_api -> status_monitoring
// パイプライン状態確認API
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const participantId = searchParams.get('participantId');

    if (!participantId) {
      return NextResponse.json(
        { success: false, message: 'participantId is required' },
        { status: 400 }
      );
    }

    // パイプラインの状態を確認
    // 実際の実装では、Inngestの状態管理APIを使用
    const status = {
      participantId,
      status: 'running', // デフォルト状態
      steps: {
        file_import: 'completed',
        windows_generation: 'running',
        distance_calculation: 'pending',
        kernel_fusion: 'pending',
        embedding_generation: 'pending',
        neo4j_persistence: 'pending',
        export: 'pending',
      },
      progress: 25, // 25%完了
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: status,
    });

  } catch (error) {
    console.error('Pipeline status error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'パイプライン状態の取得に失敗しました',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
