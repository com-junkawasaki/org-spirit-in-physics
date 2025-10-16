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

    const body = await request.json();
    const targetParticipantIds = body.participantIds || null;

    const results = [];

    // Merkle DAG: import.emotions.scan
    // データセットディレクトリをスキャン（複数候補から解決）
    const datasetPath = await resolveDatasetParticipantsPath();

    try {
      await fs.access(datasetPath);
    } catch {
      throw new Error('Participants dataset directory not found');
    }

    const entries = await fs.readdir(datasetPath, { withFileTypes: true });
    let participantDirs = entries.filter(entry => entry.isDirectory());

    // 指定された participant ID でフィルタリング
    if (targetParticipantIds) {
      participantDirs = participantDirs.filter(dir => targetParticipantIds.includes(dir.name));
    }

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
        // HumeAI_artifacts_* ディレクトリを検索
        const participantEntries = await fs.readdir(participantPath, { withFileTypes: true });
        const humeArtifactsEntry = participantEntries.find(entry =>
          entry.isDirectory() && (entry.name.startsWith('HumeAI_artifacts_') || entry.name === 'hume_data')
        );

        if (!humeArtifactsEntry) {
          results.push({
            participantId,
            status: 'skipped',
            message: 'HumeAI artifacts directory not found'
          });
          continue;
        }

        const humeDataDir = path.join(participantPath, humeArtifactsEntry.name);

        // Merkle DAG: import.emotions.check_existing
        // 既存感情データのチェック
        const existingEmotions = await client.getEmotionDataByParticipantId(participantId);
        if (existingEmotions && existingEmotions.length > 0) {
          results.push({
            participantId,
            status: 'skipped',
            message: 'Emotion data already exists for this participant'
          });
          continue;
        }

        // Merkle DAG: import.emotions.scan_registry_files
        // registry_file ディレクトリをスキャン
        const registryFiles = await scanRegistryFiles(humeDataDir);

        if (registryFiles.length === 0) {
          results.push({
            participantId,
            status: 'skipped',
            message: 'No registry files found in Hume AI data'
          });
          continue;
        }

        let totalEmotionEntries = 0;
        let totalCsvFilesProcessed = 0;

        // Merkle DAG: import.emotions.read_predictions
        // HumeAI_predictions JSONファイルの処理 (artifactsディレクトリ直下)
        const humeFiles = await fs.readdir(humeDataDir, { withFileTypes: true });
        const predictionsFileEntry = humeFiles.find(file =>
          file.isFile() && file.name.startsWith('HumeAI_predictions_') && file.name.endsWith('.json')
        );

        let emotionResult = { entriesProcessed: 0 };
        if (predictionsFileEntry) {
          const predictionsFile = path.join(humeDataDir, predictionsFileEntry.name);
          try {
            const predictionsData = JSON.parse(await fs.readFile(predictionsFile, 'utf-8'));
            emotionResult = await processEmotionData(client as any, participantId, predictionsData, humeArtifactsEntry.name);
            totalEmotionEntries += emotionResult.entriesProcessed;
          } catch (error) {
            console.warn(`Error processing predictions file:`, error);
          }
        }

        // Merkle DAG: import.emotions.process_registry_files
        // 各registry_fileを処理 (CSVデータのみ)
        for (const registryFile of registryFiles) {
          try {
            // CSVデータの処理
            const csvResult = await processCSVDataForRegistry(client as any, participantId, registryFile);
            totalCsvFilesProcessed += csvResult.filesProcessed;

          } catch (error) {
            console.warn(`Error processing registry file ${registryFile.uuid}:`, error);
          }
        }

        results.push({
          participantId,
          status: 'success',
          message: 'Emotion data imported successfully',
          statistics: {
            emotionEntries: totalEmotionEntries,
            csvFilesProcessed: totalCsvFilesProcessed,
            registryFilesProcessed: registryFiles.length
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

// Merkle DAG: import.emotions.scan_registry_files
// registry_fileディレクトリスキャン関数
async function scanRegistryFiles(humeDataDir: string): Promise<Array<{uuid: string, path: string}>> {
  const registryFiles: Array<{uuid: string, path: string}> = [];

  try {
    const entries = await fs.readdir(humeDataDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('registry_file-')) {
        // registry_file-0-uuid 形式から uuid を抽出
        const parts = entry.name.split('-');
        if (parts.length >= 3) {
          const uuid = parts.slice(2).join('-'); // uuid部分を再構築
          registryFiles.push({
            uuid,
            path: path.join(humeDataDir, entry.name)
          });
        }
      }
    }
  } catch (error) {
    console.warn('Error scanning registry files:', error);
  }

  return registryFiles;
}

// Merkle DAG: import.emotions.process_data
// 感情データ処理関数
async function processEmotionData(client: any, participantId: string, predictionsData: any, registryUuid: string) {
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
          registry_uuid: registryUuid,
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

// Merkle DAG: import.emotions.process_csv_registry
// registry_fileごとのCSVデータ処理関数
async function processCSVDataForRegistry(client: any, participantId: string, registryFile: {uuid: string, path: string}) {
  let filesProcessed = 0;

  try {
    const csvDir = path.join(registryFile.path, 'csv', registryFile.uuid);

    // CSVディレクトリが存在するか確認
    const csvDirExists = await fs.access(csvDir).then(() => true).catch(() => false);
    if (!csvDirExists) {
      return { filesProcessed };
    }

    // CSVファイルの処理
    const csvFiles = ['burst.csv', 'face.csv', 'language.csv', 'prosody.csv'];
    const csvEntries = [];

    for (const csvFile of csvFiles) {
      const csvPath = path.join(csvDir, csvFile);
      try {
        await fs.access(csvPath);
        const csvContent = await fs.readFile(csvPath, 'utf-8');
        const csvData = await processCSVFile(csvFile, csvContent, participantId, registryFile.uuid);

        if (csvData.length > 0) {
          csvEntries.push(...csvData);
        }

        filesProcessed++;
      } catch {
        // CSVファイルが存在しない場合
      }
    }

    // ガイドライン: UNWINDバルク挿入・更新でラウンドトリップ最小化
    if (csvEntries.length > 0) {
      await client.bulkInsertNodes('EmotionAnalysis', csvEntries, 1000);
    }

    // ネストされたHumeAI_artifactsも処理
    const nestedArtifacts = await scanNestedArtifacts(csvDir);
    for (const artifact of nestedArtifacts) {
      const nestedResult = await processCSVDataForRegistry(client, participantId, artifact);
      filesProcessed += nestedResult.filesProcessed;
    }

  } catch (error) {
    console.warn(`Error processing CSV data for registry ${registryFile.uuid}:`, error);
  }

  return { filesProcessed };
}

// Merkle DAG: import.emotions.scan_nested_artifacts
// ネストされたHumeAI_artifactsをスキャン
async function scanNestedArtifacts(csvDir: string): Promise<Array<{uuid: string, path: string}>> {
  const artifacts: Array<{uuid: string, path: string}> = [];

  try {
    const entries = await fs.readdir(csvDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('HumeAI_artifacts_')) {
        // HumeAI_artifacts_uuid 形式から uuid を抽出
        const parts = entry.name.split('_');
        if (parts.length >= 3) {
          const uuid = parts.slice(2).join('_'); // uuid部分を取得
          const artifactPath = path.join(csvDir, entry.name);

          // registry_file を探す
          const artifactEntries = await fs.readdir(artifactPath, { withFileTypes: true });
          for (const artifactEntry of artifactEntries) {
            if (artifactEntry.isDirectory() && artifactEntry.name.startsWith('registry_file-')) {
              const registryParts = artifactEntry.name.split('-');
              if (registryParts.length >= 3) {
                const registryUuid = registryParts.slice(2).join('-');
                artifacts.push({
                  uuid: registryUuid,
                  path: path.join(artifactPath, artifactEntry.name)
                });
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.warn('Error scanning nested artifacts:', error);
  }

  return artifacts;
}

// Merkle DAG: import.emotions.resolve_dataset_path
async function resolveDatasetParticipantsPath(): Promise<string> {
  const candidates = [
    path.join(process.cwd(), 'dataset', 'participants'),
    '/app/dataset/participants',
    '/app/apps/visualizer/src/dataset/participants',
    path.join(process.cwd(), 'apps', 'visualizer', 'src', 'dataset', 'participants'),
    path.join(process.cwd(), 'src', 'dataset', 'participants')
  ];
  for (const p of candidates) {
    try { await fs.access(p); return p; } catch {}
  }
  return path.join(process.cwd(), 'dataset', 'participants');
}

// Merkle DAG: import.emotions.process_csv_file
// 個別CSVファイル処理関数
async function processCSVFile(fileName: string, content: string, participantId: string, registryUuid: string) {
  const lines = content.split('\n');
  const csvData = [];

  // ヘッダー行を取得
  const headers = lines[0]?.split(',') || [];

  // ヘッダーをスキップしてデータを処理
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line) {
      const values = line.split(',');
      const rowData: any = {
        participant_id: participantId,
        registry_uuid: registryUuid,
        file_type: fileName.replace('.csv', ''),
        imported_at: new Date().toISOString()
      };

      // ヘッダーに基づいてデータを構造化
      headers.forEach((header, index) => {
        const value = values[index];
        if (value !== undefined && value !== '') {
          // 数値に変換可能なものは数値に変換
          const numValue = parseFloat(value);
          rowData[header.trim()] = isNaN(numValue) ? value.trim() : numValue;
        }
      });

      csvData.push(rowData);
    }
  }

  return csvData;
}
