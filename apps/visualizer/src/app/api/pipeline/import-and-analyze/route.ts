import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/lib/inngest';
import { z } from 'zod';

// Merkle DAG: pipeline_api_route -> workflow_orchestration
// パイプライン分析APIエンドポイント

// リクエストボディのスキーマ定義
const ImportAndAnalyzeSchema = z.object({
  participantId: z.string().min(1),
  dataRootPath: z.string().optional(),
  dimensions: z.number().min(2).max(3).default(3),
  k: z.number().min(1).max(50).default(5),
  normalization: z.enum(['trace', 'fro']).default('trace'),
  nonNegativeWeights: z.boolean().default(true),
  timeKernel: z.object({
    timestamps: z.array(z.number()),
    tau: z.number().positive(),
    weight: z.number().min(0).max(1),
  }).optional(),
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
      dataRootPath = '/Users/junkawasaki/jun784/spirit-in-physics/apps/visualizer/public/dataset',
      dimensions,
      k,
      normalization,
      nonNegativeWeights,
      timeKernel,
      priority,
    } = validatedData;

    // Merkle DAG: workflow_trigger -> pipeline_initiation
    // ファイルインポートワークフローの開始
    const importResult = await inngest.send({
      name: 'pipeline.file_import.requested',
      data: {
        participantId,
        dataRootPath,
        tenantId: 'default', // デフォルトテナント
        userId: 'system', // システムユーザー
        priority,
      },
    });

    // Merkle DAG: response_generation -> api_response
    // レスポンスの生成
    const response = {
      success: true,
      message: 'パイプライン分析を開始しました',
      data: {
        participantId,
        importEventId: importResult.ids[0],
        pipeline: {
          steps: [
            'file_import',
            'windows_generation',
            'distance_calculation',
            'kernel_fusion',
            'embedding_generation',
            'neo4j_persistence',
            'export',
          ],
          parameters: {
            dimensions,
            k,
            normalization,
            nonNegativeWeights,
            timeKernel: timeKernel || null,
          },
        },
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
