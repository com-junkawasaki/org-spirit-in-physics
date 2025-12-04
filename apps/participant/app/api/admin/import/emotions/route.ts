// LLM-BOUNDARY: 80_app - app/(segments)/...（RSC & Client）
// Merkle DAG: import.emotions.endpoint
// 感情分析データインポートAPIエンドポイント
// 依存関係: @participants/ (dataset), GraphQLサービス, hume-ai-integration

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// Merkle DAG: import.emotions.process
// 感情分析データインポート処理関数
async function importEmotionsFromDataset() {
  const results = [];

  try {
    // Merkle DAG: import.emotions.scan
    // データセットディレクトリをスキャン
    const datasetPath = path.join(process.cwd(), 'dataset', 'participants');

    try {
      await fs.access(datasetPath);
    } catch {
      throw new Error('Participants dataset directory not found');
    }

    const entries = await fs.readdir(datasetPath, { withFileTypes: true });
    const participantDirs = entries.filter(entry => entry.isDirectory());

    // Merkle DAG: import.emotions.initialize_db
    // GraphQLサービス経由でPostgreSQLを使用（データベース初期化は不要）

    for (const dirEntry of participantDirs) {
      const participantId = dirEntry.name;
      const participantPath = path.join(datasetPath, participantId);

      try {
        // Merkle DAG: import.emotions.check_participant
        // 参加者が存在するか確認
        const participantExists = await checkParticipantExists(participantId);
        if (!participantExists) {
          results.push({
            participantId,
            status: 'skipped',
            message: 'Participant not found, import participants first'
          });
          continue;
        }

        // Merkle DAG: import.emotions.find_hume_data
        // HumeAI_artifactsディレクトリを検索
        const humeArtifactsDir = await findHumeArtifactsDirectory(participantPath);
        if (!humeArtifactsDir) {
          results.push({
            participantId,
            status: 'skipped',
            message: 'Hume AI artifacts directory not found'
          });
          continue;
        }

        // Merkle DAG: import.emotions.check_existing
        // 既存感情データのチェック
        const existingEmotions = await checkExistingEmotionData(participantId);
        if (existingEmotions) {
          results.push({
            participantId,
            status: 'skipped',
            message: 'Emotion data already exists for this participant'
          });
          continue;
        }

        // Merkle DAG: import.emotions.read_predictions
        // HumeAI_predictions JSONファイルを読み取り
        const predictionsFile = path.join(humeArtifactsDir, 'HumeAI_predictions_c5c16907-6638-4791-b93a-f07674a7891f.json');
        const predictionsData = JSON.parse(await fs.readFile(predictionsFile, 'utf-8'));

        // Merkle DAG: import.emotions.process_emotion_data
        // 感情データを処理してPostgreSQLに格納
        const emotionResult = await processEmotionData(participantId, predictionsData);

        // Merkle DAG: import.emotions.process_csv_data
        // CSVデータ（バースト、韻律、言語）を処理
        const csvDataResult = await processEmotionCSVData(participantId, humeArtifactsDir);

        results.push({
          participantId,
          status: 'success',
          message: 'Emotion data imported successfully',
          statistics: {
            emotionEntries: emotionResult.entriesProcessed,
            csvFilesProcessed: csvDataResult.filesProcessed,
            totalEmotions: emotionResult.totalEmotions
          }
        });

      } catch (error) {
        results.push({
          participantId,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error during emotion import'
        });
      }
    }

    return {
      success: true,
      total: participantDirs.length,
      processed: results.length,
      results
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      results
    };
  }
}

// Merkle DAG: import.emotions.check_participant
// 参加者存在チェック関数
async function checkParticipantExists(_participantId: string): Promise<boolean> {
  // GraphQLサービス経由で参加者存在を確認
  // TODO: GraphQLクエリを使用した実装
  return true; // 仮実装
}

// Merkle DAG: import.emotions.find_artifacts
// HumeAI_artifactsディレクトリ検索関数
async function findHumeArtifactsDirectory(participantPath: string): Promise<string | null> {
  try {
    const entries = await fs.readdir(participantPath);
    const artifactsDir = entries.find(entry => entry.includes('HumeAI_artifacts'));

    if (artifactsDir) {
      return path.join(participantPath, artifactsDir);
    }
  } catch {
    // ディレクトリが見つからない場合
  }
  return null;
}

// Merkle DAG: import.emotions.check_existing_data
// 既存感情データチェック関数
async function checkExistingEmotionData(_participantId: string): Promise<boolean> {
  // GraphQLサービス経由で既存感情データを確認
  // TODO: GraphQLクエリを使用した実装
  return false; // 仮実装
}

// Merkle DAG: import.emotions.process_data
// 感情データ処理関数
async function processEmotionData(participantId: string, predictionsData: any) {
  let entriesProcessed = 0;
  let totalEmotions = 0;

  // Hume AIの感情データを処理
  if (predictionsData && Array.isArray(predictionsData)) {
    for (const entry of predictionsData) {
      if (entry.emotions && Array.isArray(entry.emotions)) {
        entriesProcessed++;

        // 各感情エントリを処理
        const emotionRecord = {
          participantId,
          text: entry.text,
          beginTime: entry.time?.begin,
          endTime: entry.time?.end,
          confidence: entry.confidence,
          emotions: entry.emotions.map((emotion: any) => ({
            name: emotion.name,
            score: emotion.score
          })),
          position: entry.position
        };

        totalEmotions += entry.emotions.length;

        // PostgreSQLに感情データを格納
        await storeEmotionEntry(emotionRecord);
      }
    }
  }

  return { entriesProcessed, totalEmotions };
}

// Merkle DAG: import.emotions.store_entry
// 感情エントリ格納関数
async function storeEmotionEntry(_emotionRecord: any) {
  // GraphQLサービス経由で感情データを格納
  // TODO: GraphQLミューテーションを使用した実装
}

// Merkle DAG: import.emotions.process_csv
// CSVデータ処理関数
async function processEmotionCSVData(participantId: string, artifactsDir: string) {
  let filesProcessed = 0;

  try {
    const registryDir = path.join(artifactsDir, 'registry_file-0-db30bbc5-80f8-4509-b35d-2a3343411849');
    const csvDir = path.join(registryDir, 'csv', 'db30bbc5-80f8-4509-b35d-2a3343411849');

    // CSVファイルの処理
    const csvFiles = ['burst.csv', 'face.csv', 'language.csv', 'prosody.csv'];

    for (const csvFile of csvFiles) {
      const csvPath = path.join(csvDir, csvFile);
      try {
        await fs.access(csvPath);
        // CSVデータを読み取り処理
        const csvContent = await fs.readFile(csvPath, 'utf-8');
        await processCSVFile(participantId, csvFile, csvContent);
        filesProcessed++;
      } catch {
        // CSVファイルが存在しない場合
      }
    }
  } catch (error) {
    console.warn('Error processing CSV data:', error);
  }

  return { filesProcessed };
}

// Merkle DAG: import.emotions.process_csv_file
// 個別CSVファイル処理関数
async function processCSVFile(participantId: string, fileName: string, content: string) {
  // CSVデータを解析してPostgreSQLに格納
  // TODO: CSVパーサーを使用した実装
  const lines = content.split('\n');
  // ヘッダーをスキップしてデータを処理
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (line) {
      // CSV行を処理
      const csvRecord = {
        participantId,
        fileType: fileName.replace('.csv', ''),
        data: line,
        importedAt: new Date().toISOString()
      };
      await storeCSVRecord(csvRecord);
    }
  }
}

// Merkle DAG: import.emotions.store_csv
// CSVレコード格納関数
async function storeCSVRecord(_csvRecord: any) {
  // GraphQLサービス経由でCSVデータを格納
  // TODO: GraphQLミューテーションを使用した実装
}

export async function POST(_request: NextRequest) {

  try {
    // Merkle DAG: import.emotions.execute
    // インポート処理実行
    const result = await importEmotionsFromDataset();

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 500 });
    }

  } catch (error) {
    console.error('Import emotions error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
