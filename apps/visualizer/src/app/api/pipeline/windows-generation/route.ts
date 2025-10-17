import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/lib/inngest';
import { z } from 'zod';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Merkle DAG: windows_generation_api_route -> workflow_orchestration
// ウィンドウ生成パイプラインAPIエンドポイント

// リクエストボディのスキーマ定義
const WindowsGenerationSchema = z.object({
  participantId: z.string().min(1),
  dataRootPath: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Merkle DAG: request_validation -> input_validation
    // リクエストボディの解析と検証
    const body = await request.json();
    const validatedData = WindowsGenerationSchema.parse(body);
    
    const {
      participantId,
      dataRootPath = '/app/public/dataset',
    } = validatedData;

    // Merkle DAG: file_validation -> data_integrity_check
    // ファイル存在確認
    const basePath = join(dataRootPath, 'participants', participantId);
    
    if (!existsSync(basePath)) {
      return NextResponse.json({
        success: false,
        message: `Participant directory not found: ${basePath}`,
      }, { status: 404 });
    }

    // セッションデータの確認
    const sessionPath = join(basePath, 'session_data.json');
    if (!existsSync(sessionPath)) {
      return NextResponse.json({
        success: false,
        message: `Session data not found: ${sessionPath}`,
      }, { status: 404 });
    }

    // 生理データの確認
    const fs = require('fs');
    const files = fs.readdirSync(basePath);
    const csvFile = files.find((file: string) => file.endsWith('.CSV'));
    if (!csvFile) {
      return NextResponse.json({
        success: false,
        message: `Physiological data CSV not found`,
      }, { status: 404 });
    }

    // Hume AIデータの確認
    const humeArtifactsPattern = /HumeAI_artifacts_[a-f0-9-]+/;
    const humeArtifactsDir = files.find((file: string) => humeArtifactsPattern.test(file));
    if (!humeArtifactsDir) {
      return NextResponse.json({
        success: false,
        message: `Hume AI artifacts directory not found`,
      }, { status: 404 });
    }

    // Merkle DAG: workflow_trigger -> pipeline_initiation
    // ウィンドウ生成ワークフローの開始
    try {
      const result = await inngest.send({
        name: 'pipeline.windows_generation.requested',
        data: {
          participantId,
          sessionUri: sessionPath,
          physioUri: join(basePath, csvFile),
          humeCsvUris: {
            burst: [],
            face: [],
            language: [],
            prosody: [],
          },
          stats: {
            sessionEvents: 0,
            physioSamples: 0,
            humeRecords: 0,
            burstRecords: 0,
            faceRecords: 0,
            languageRecords: 0,
            prosodyRecords: 0,
          },
          dimensions: 3,
          k: 5,
          normalization: 'trace',
          nonNegativeWeights: true,
          timeKernel: null,
        },
      });

      // Merkle DAG: response_generation -> api_response
      // レスポンスの生成
      const response = {
        success: true,
        message: 'ウィンドウ生成パイプラインを開始しました',
        data: {
          participantId,
          windowsGenerationEventId: result.ids[0],
          status: 'started',
          timestamp: new Date().toISOString(),
        },
      };

      return NextResponse.json(response, { status: 202 });

    } catch (error) {
      console.log('Inngest send failed, running workflow directly:', error);
      
      // ローカル開発では直接ワークフローを実行
      const { executeWindowsGenerationWorkflow } = await import('@/lib/workflows/windows-generation-workflow');
      
      // 統計情報を収集
      const sessionContent = readFileSync(sessionPath, 'utf-8');
      const sessionData = JSON.parse(sessionContent);
      const wordDisplayedEvents = sessionData.events?.filter((event: { type?: string; event_type?: string }) => 
        event.type === 'word_displayed' || event.event_type === 'word_displayed'
      ) || [];

      const csvPath = join(basePath, csvFile);
      const csvContent = readFileSync(csvPath, 'utf-8');
      const csvLines = csvContent.split('\n').filter(line => line.trim());
      const physioSamples = csvLines.length - 1; // ヘッダーを除く

      // Hume AIデータの統計
      const humeDataPath = join(basePath, humeArtifactsDir);
      const humeFiles = fs.readdirSync(humeDataPath, { recursive: true });
      const csvFiles = humeFiles.filter((file: string) => file.endsWith('.csv'));
      
      let burstRecords = 0;
      let faceRecords = 0;
      let languageRecords = 0;
      let prosodyRecords = 0;

      csvFiles.forEach((file: string) => {
        const filePath = join(humeDataPath, file);
        const content = readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        const recordCount = lines.length - 1; // ヘッダーを除く

        if (file.includes('burst')) {
          burstRecords += recordCount;
        } else if (file.includes('face')) {
          faceRecords += recordCount;
        } else if (file.includes('language')) {
          languageRecords += recordCount;
        } else if (file.includes('prosody')) {
          prosodyRecords += recordCount;
        }
      });

      const humeRecords = burstRecords + faceRecords + languageRecords + prosodyRecords;

      const result = await executeWindowsGenerationWorkflow({
        participantId,
        sessionUri: sessionPath,
        physioUri: csvPath,
        humeCsvUris: {
          burst: csvFiles.filter(f => f.includes('burst')),
          face: csvFiles.filter(f => f.includes('face')),
          language: csvFiles.filter(f => f.includes('language')),
          prosody: csvFiles.filter(f => f.includes('prosody')),
        },
        stats: {
          sessionEvents: sessionData.events?.length || 0,
          physioSamples,
          humeRecords,
          burstRecords,
          faceRecords,
          languageRecords,
          prosodyRecords,
        },
        dimensions: 3,
        k: 5,
        normalization: 'trace',
        nonNegativeWeights: true,
        timeKernel: null,
      });

      console.log('Windows generation workflow completed:', result);

      const response = {
        success: true,
        message: 'ウィンドウ生成パイプラインを完了しました',
        data: {
          participantId,
          result,
          status: 'completed',
          timestamp: new Date().toISOString(),
        },
      };

      return NextResponse.json(response, { status: 200 });
    }

  } catch (error) {
    console.error('Windows generation pipeline error:', error);

    // Merkle DAG: error_handling -> error_response
    // エラーレスポンスの生成
    const errorResponse = {
      success: false,
      message: 'ウィンドウ生成パイプラインの実行に失敗しました',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(errorResponse, { status: 400 });
  }
}
