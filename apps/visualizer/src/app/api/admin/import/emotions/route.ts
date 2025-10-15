import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from 'fs';
import path from 'path';
import { createNeo4jClient } from '@/lib/neo4j';

// Merkle DAG: import.emotions.endpoint
// 感情分析データインポートAPIエンドポイント
// 依存関係: @participants/ (dataset), neo4j

export async function POST(request: NextRequest) {
  try {
    console.log('API: Starting emotion import from dataset...');

    const results = [];

    // Merkle DAG: import.emotions.scan
    // データセットディレクトリをスキャン (プロジェクトルートからの相対パス)
    const datasetPath = path.join(process.cwd(), '..', '..', '..', '..', 'dataset', 'participants');

    try {
      await fs.access(datasetPath);
    } catch {
      throw new Error('Participants dataset directory not found');
    }

    const entries = await fs.readdir(datasetPath, { withFileTypes: true });
    const participantDirs = entries.filter(entry => entry.isDirectory());

    const client = createNeo4jClient();

    for (const dirEntry of participantDirs) {
      const participantId = dirEntry.name;
      const participantPath = path.join(datasetPath, participantId);

      try {
        // Merkle DAG: import.emotions.check_participant
        // 参加者が存在するか確認
        const participantExists = await client.getParticipantDetails(participantId);
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
        const existingEmotions = await (client as any).getEmotionDataByParticipantId(participantId);
        if (existingEmotions && existingEmotions.length > 0) {
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
        // 感情データを処理してNeo4jに格納
        const emotionResult = await processEmotionData(client as any, participantId, predictionsData);

        // Merkle DAG: import.emotions.process_csv_data
        // CSVデータ（バースト、韻律、言語）を処理
        const csvDataResult = await processEmotionCSVData(client as any, participantId, humeArtifactsDir);

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
        console.error(`Import error for participant ${participantId}:`, error);
        results.push({
          participantId,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error during emotion import'
        });
      }
    }

    console.log(`API: Emotion import completed. Success: ${results.filter(r => r.status === 'success').length}, Failed: ${results.filter(r => r.status === 'error').length}, Skipped: ${results.filter(r => r.status === 'skipped').length}`);

    return NextResponse.json({
      success: true,
      total: participantDirs.length,
      processed: results.length,
      results
    });

  } catch (error) {
    console.error('API: Failed to import emotions:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
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

// Merkle DAG: import.emotions.process_data
// 感情データ処理関数
async function processEmotionData(client: any, participantId: string, predictionsData: any) {
  let entriesProcessed = 0;
  let totalEmotions = 0;

  // Hume AIの感情データを処理
  if (predictionsData && Array.isArray(predictionsData)) {
    const emotionEntries = [];

    for (const entry of predictionsData) {
      if (entry.emotions && Array.isArray(entry.emotions)) {
        entriesProcessed++;

        // 各感情エントリを処理
        const emotionEntry = {
          participant_id: participantId,
          text: entry.text,
          begin_time: entry.time?.begin,
          end_time: entry.time?.end,
          confidence: entry.confidence,
          emotions: entry.emotions.map((emotion: any) => ({
            name: emotion.name,
            score: emotion.score
          })),
          position: entry.position,
          imported_at: new Date().toISOString()
        };

        totalEmotions += entry.emotions.length;
        emotionEntries.push(emotionEntry);
      }
    }

    // バッチで感情データをNeo4jに格納
    if (emotionEntries.length > 0) {
      await client.createEmotionEntries(emotionEntries);
    }
  }

  return { entriesProcessed, totalEmotions };
}

// Merkle DAG: import.emotions.process_csv
// CSVデータ処理関数
async function processEmotionCSVData(client: any, participantId: string, artifactsDir: string) {
  let filesProcessed = 0;

  try {
    const registryDir = path.join(artifactsDir, 'registry_file-0-db30bbc5-80f8-4509-b35d-2a3343411849');
    const csvDir = path.join(registryDir, 'csv', 'db30bbc5-80f8-4509-b35d-2a3343411849');

    // CSVファイルの処理
    const csvFiles = ['burst.csv', 'face.csv', 'language.csv', 'prosody.csv'];
    const csvEntries = [];

    for (const csvFile of csvFiles) {
      const csvPath = path.join(csvDir, csvFile);
      try {
        await fs.access(csvPath);
        const csvContent = await fs.readFile(csvPath, 'utf-8');
        const csvData = processCSVFile(csvFile, csvContent);

        if (csvData.length > 0) {
          csvEntries.push(...csvData.map(data => ({
            participant_id: participantId,
            file_type: csvFile.replace('.csv', ''),
            data: data,
            imported_at: new Date().toISOString()
          })));
        }

        filesProcessed++;
      } catch {
        // CSVファイルが存在しない場合
      }
    }

    // バッチでCSVデータをNeo4jに格納
    if (csvEntries.length > 0) {
      await client.createCSVElements(csvEntries);
    }
  } catch (error) {
    console.warn('Error processing CSV data:', error);
  }

  return { filesProcessed };
}

// Merkle DAG: import.emotions.process_csv_file
// 個別CSVファイル処理関数
function processCSVFile(fileName: string, content: string) {
  const lines = content.split('\n');
  const csvData = [];

  // ヘッダーをスキップしてデータを処理
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line) {
      csvData.push(line);
    }
  }

  return csvData;
}
