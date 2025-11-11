// Merkle DAG: import.emotions.endpoint
// 感情分析データインポートAPIエンドポイント

import { NextRequest, NextResponse } from 'next/server';
import { createNeo4jClient } from '@/lib/neo4j';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { participantId, deleteExisting = false } = body;

    if (!participantId) {
      return NextResponse.json({
        error: 'participantId is required'
      }, { status: 400 });
    }

    const client = createNeo4jClient();
    const dataRootPath = process.env.DATASET_PATH || join(process.cwd(), 'public', 'dataset');
    const basePath = join(dataRootPath, 'participants', participantId);

    if (!existsSync(basePath)) {
      return NextResponse.json({
        error: `Participant directory not found: ${basePath}`
      }, { status: 404 });
    }

    // Hume AIアーティファクトディレクトリを検索
    const files = readdirSync(basePath);
    const humeArtifactsPattern = /HumeAI_artifacts_[a-f0-9-]+/;
    const humeArtifactsDir = files.find((file: string) => humeArtifactsPattern.test(file));
    
    if (!humeArtifactsDir) {
      return NextResponse.json({
        error: 'HumeAI artifacts directory not found'
      }, { status: 404 });
    }

    // 既存の感情データを削除
    let deletedCount = 0;
    if (deleteExisting) {
      deletedCount = await deleteExistingEmotionData(client, participantId);
      console.log(`Deleted ${deletedCount} existing emotion data records`);
    }

    const artifactsPath = join(basePath, humeArtifactsDir);
    const result = await importEmotionData(client, artifactsPath, participantId);

    return NextResponse.json({
      success: true,
      message: '感情データをインポートしました',
      data: {
        ...result,
        deletedCount
      }
    });

  } catch (error) {
    console.error('Emotion data import error:', error);
    return NextResponse.json({
      error: 'Import failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// 既存の感情データを削除
async function deleteExistingEmotionData(client: any, participantId: string): Promise<number> {
  const emotionTypes = [
    { nodeType: 'BurstEmotionData', relationship: 'HAS_BURST_EMOTION_DATA' },
    { nodeType: 'FaceEmotionData', relationship: 'HAS_FACE_EMOTION_DATA' },
    { nodeType: 'LanguageEmotionData', relationship: 'HAS_LANGUAGE_EMOTION_DATA' },
    { nodeType: 'ProsodyEmotionData', relationship: 'HAS_PROSODY_EMOTION_DATA' }
  ];

  let totalDeleted = 0;

  for (const { nodeType, relationship } of emotionTypes) {
    const deleteQuery = `
      MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session)
      MATCH (s)-[r:${relationship}]->(e:${nodeType})
      DELETE r, e
      RETURN count(e) as deletedCount
    `;
    
    try {
      const result = await client.query(deleteQuery, { participantId });
      const deletedCount = result[0]?.deletedCount?.low || result[0]?.deletedCount || 0;
      totalDeleted += deletedCount;
      console.log(`Deleted ${deletedCount} ${nodeType} records`);
    } catch (error) {
      console.error(`Error deleting ${nodeType}:`, error);
    }
  }

  return totalDeleted;
}

// 全てのregistry_file-* ディレクトリ内のCSVディレクトリを検索
function findAllRegistryCSVDirectories(artifactsDir: string): string[] {
  const csvDirectories: string[] = [];
  
  try {
    const entries = readdirSync(artifactsDir, { withFileTypes: true });
    
    // registry_file-* パターンに一致する全てのディレクトリを検索
    const registryDirs = entries.filter(entry => 
      entry.isDirectory() && entry.name.startsWith('registry_file-')
    );

    for (const registryDir of registryDirs) {
      const registryPath = join(artifactsDir, registryDir.name);
      const csvPath = join(registryPath, 'csv');

      // csvディレクトリが存在するか確認
      try {
        const csvStat = statSync(csvPath);
        if (csvStat.isDirectory()) {
          // csvディレクトリ内の全てのサブディレクトリを取得
          const csvEntries = readdirSync(csvPath, { withFileTypes: true });
          const csvSubDirs = csvEntries.filter(entry => entry.isDirectory());
          
          for (const csvSubDir of csvSubDirs) {
            csvDirectories.push(join(csvPath, csvSubDir.name));
          }
        }
      } catch (error) {
        console.warn(`Error accessing CSV directory in ${registryPath}:`, error);
      }
    }
  } catch (error) {
    console.error(`Error finding all registry CSV directories in ${artifactsDir}:`, error);
  }

  return csvDirectories;
}

// CSVファイルをパース
function parseCSVFile(content: string): Record<string, string>[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map(col => col.trim());
  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const record: Record<string, string> = {};
    header.forEach((col, index) => {
      record[col] = values[index] || '';
    });
    records.push(record);
  }

  return records;
}

async function importEmotionData(client: any, artifactsDir: string, participantId: string) {
  // 全てのregistry_file-* ディレクトリ内のCSVディレクトリを動的に検索
  const csvDirs = findAllRegistryCSVDirectories(artifactsDir);
  
  console.log(`Found ${csvDirs.length} CSV directories for participant ${participantId}`);
  
  if (csvDirs.length === 0) {
    return {
      imported: 0,
      skipped: 0,
      total: 0,
      message: 'CSVディレクトリが見つかりませんでした'
    };
  }

  // セッションIDを取得（最新のセッション）
  const sessionQuery = `
    MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session)
    RETURN s.id as sessionId
    ORDER BY s.created_at DESC
    LIMIT 1
  `;
  const sessionResults = await client.query(sessionQuery, { participantId });
  
  if (sessionResults.length === 0) {
    throw new Error(`No session found for participant: ${participantId}`);
  }

  const sessionId = sessionResults[0].sessionId;
  console.log(`Using session: ${sessionId}`);

  // CSVファイルの処理
  const csvFiles = ['burst.csv', 'face.csv', 'language.csv', 'prosody.csv'];
  let totalImported = 0;
  let totalSkipped = 0;
  const counts = { burst: 0, face: 0, language: 0, prosody: 0 };

  // 各CSVディレクトリに対して処理
  for (const csvDir of csvDirs) {
    console.log(`Processing CSV directory: ${csvDir} for participant ${participantId}`);
    for (const csvFile of csvFiles) {
      const csvPath = join(csvDir, csvFile);
      try {
        if (!existsSync(csvPath)) {
          continue;
        }

        // CSVデータを読み取り処理
        const csvContent = readFileSync(csvPath, 'utf-8');
        const records = parseCSVFile(csvContent);
        console.log(`Processing ${records.length} records from ${csvFile} (path: ${csvPath}) for participant ${participantId}`);
        
        const fileType = csvFile.replace('.csv', '');
        let imported = 0;
        let skipped = 0;

        // 各レコードを処理
        for (const record of records) {
          try {
            const result = await storeEmotionRecord(client, sessionId, participantId, fileType, record);
            if (result === 'imported') {
              imported++;
              totalImported++;
              counts[fileType as keyof typeof counts]++;
            } else {
              skipped++;
              totalSkipped++;
            }
          } catch (error) {
            console.warn(`Error storing record from ${csvFile}:`, error);
            skipped++;
            totalSkipped++;
          }
        }
        
        console.log(`Successfully processed ${csvFile} for participant ${participantId}: ${imported} imported, ${skipped} skipped`);
      } catch (error) {
        console.warn(`CSV file ${csvFile} not found or error reading in ${csvDir}:`, error);
      }
    }
  }
  
  console.log(`Participant ${participantId} emotion CSV import summary: burst=${counts.burst}, face=${counts.face}, language=${counts.language}, prosody=${counts.prosody}, total imported=${totalImported}, total skipped=${totalSkipped}`);

  return {
    imported: totalImported,
    skipped: totalSkipped,
    total: totalImported + totalSkipped,
    sessionId,
    counts,
    message: `${totalImported}件の感情データをインポートしました（burst: ${counts.burst}, face: ${counts.face}, language: ${counts.language}, prosody: ${counts.prosody}）`
  };
}

async function storeEmotionRecord(
  client: any,
  sessionId: string,
  participantId: string,
  fileType: string,
  record: Record<string, string>
): Promise<'imported' | 'skipped'> {
  // ファイルタイプに応じたノードタイプとリレーションシップを決定
  const nodeTypeMap: Record<string, { nodeType: string; relationship: string }> = {
    burst: { nodeType: 'BurstEmotionData', relationship: 'HAS_BURST_EMOTION_DATA' },
    face: { nodeType: 'FaceEmotionData', relationship: 'HAS_FACE_EMOTION_DATA' },
    language: { nodeType: 'LanguageEmotionData', relationship: 'HAS_LANGUAGE_EMOTION_DATA' },
    prosody: { nodeType: 'ProsodyEmotionData', relationship: 'HAS_PROSODY_EMOTION_DATA' }
  };

  const { nodeType, relationship } = nodeTypeMap[fileType] || { nodeType: 'EmotionData', relationship: 'HAS_EMOTION_DATA' };

  // 時間情報を取得（ファイルタイプに応じて異なるフィールド名を使用）
  let beginTime: number;
  let endTime: number;
  let time: number;

  if (fileType === 'face') {
    // face.csvはTimeフィールドを使用
    time = parseFloat(record.Time || record.time || '0');
    beginTime = time;
    endTime = time + 1; // faceデータは時間ポイントなので、1秒の範囲として扱う
  } else {
    // burst, language, prosodyはBeginTime/EndTimeを使用
    beginTime = parseFloat(record.BeginTime || record.begin_time || record.time || '0');
    endTime = parseFloat(record.EndTime || record.end_time || (beginTime > 0 ? beginTime + 1 : 1).toString());
    time = parseFloat(record.Time || record.time || beginTime.toString());
  }

  // 感情スコアを抽出
  const emotionScores: Record<string, number> = {};
  const emotionKeys = ['Admiration', 'Adoration', 'Aesthetic Appreciation', 'Amusement', 'Anger', 'Anxiety', 'Awe', 'Awkwardness', 'Boredom', 'Calmness', 'Concentration', 'Contemplation', 'Confusion', 'Contempt', 'Contentment', 'Craving', 'Determination', 'Disappointment', 'Disgust', 'Distress', 'Doubt', 'Ecstasy', 'Embarrassment', 'Empathic Pain', 'Entrancement', 'Envy', 'Excitement', 'Fear', 'Guilt', 'Horror', 'Interest', 'Joy', 'Love', 'Nostalgia', 'Pain', 'Pride', 'Realization', 'Relief', 'Romance', 'Sadness', 'Satisfaction', 'Desire', 'Shame', 'Surprise (negative)', 'Surprise (positive)', 'Sympathy', 'Tiredness', 'Triumph'];

  for (const key of emotionKeys) {
    if (record[key] !== undefined && record[key] !== '') {
      const value = parseFloat(record[key]);
      if (!isNaN(value)) {
        emotionScores[key] = value;
      }
    }
  }

  // レコードIDを生成（重複チェック用）
  // CSVファイルの構造に応じて、Idフィールドまたはbegin_time/end_timeの組み合わせを使用
  const recordId = record.Id || record.id || `${fileType}_${beginTime}_${endTime}`;
  const nodeId = `${sessionId}_${fileType}_${recordId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

  // 重複チェック（ファイルタイプに応じて異なる方法でチェック）
  let checkQuery: string;
  let checkParams: any;

  if (fileType === 'face') {
    // faceデータはtimeフィールドでチェック
    checkQuery = `
      MATCH (s:Session {id: $sessionId})-[:${relationship}]->(e:${nodeType})
      WHERE e.time = $time
      RETURN e.id as existingId
      LIMIT 1
    `;
    checkParams = { sessionId, time };
  } else {
    // burst, language, prosodyはbegin_timeとend_timeの組み合わせでチェック
    checkQuery = `
      MATCH (s:Session {id: $sessionId})-[:${relationship}]->(e:${nodeType})
      WHERE e.begin_time = $beginTime AND e.end_time = $endTime
      RETURN e.id as existingId
      LIMIT 1
    `;
    checkParams = { sessionId, beginTime, endTime };
  }

  const checkResults = await client.query(checkQuery, checkParams);
  
  if (checkResults.length > 0) {
    return 'skipped';
  }

  // ノードを作成
  const createQuery = `
    MATCH (s:Session {id: $sessionId})
    CREATE (e:${nodeType} {
      id: $nodeId,
      participant_id: $participantId,
      session_id: $sessionId,
      record_id: $recordId,
      begin_time: $beginTime,
      end_time: $endTime,
      time: $time,
      emotion_scores: $emotionScores,
      created_at: datetime()
    })
    CREATE (s)-[:${relationship}]->(e)
  `;

  await client.query(createQuery, {
    sessionId,
    participantId,
    nodeId,
    recordId,
    beginTime,
    endTime,
    time,
    emotionScores: JSON.stringify(emotionScores)
  });

  return 'imported';
}

