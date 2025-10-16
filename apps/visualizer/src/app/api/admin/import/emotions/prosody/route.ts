import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from 'fs';
import path from 'path';
import { createNeo4jClient } from '@/lib/neo4j';

// Merkle DAG: import.emotions.prosody -> prosody_emotion_data_import
// Prosody感情データインポートAPIエンドポイント
// 依存関係: @participants/ (dataset), neo4j

export async function POST(request: NextRequest) {
  try {
    console.log('API: Starting prosody emotion import from dataset...');

    const body = await request.json();
    const { participantId, sessionId, registryUuid } = body;

    if (!participantId || !sessionId || !registryUuid) {
      return NextResponse.json({
        success: false,
        error: 'participantId, sessionId, and registryUuid are required'
      }, { status: 400 });
    }

    const client = createNeo4jClient();

    // Merkle DAG: import.emotions.prosody.check_participant
    // 参加者存在確認
    const participantExists = await client.getParticipantDetails(participantId);
    if (!participantExists) {
      return NextResponse.json({
        success: false,
        error: 'Participant not found'
      }, { status: 404 });
    }

    // Merkle DAG: import.emotions.prosody.resolve_dataset_path
    // データセットパス解決
    const datasetPath = await resolveDatasetParticipantsPath();
    const participantPath = path.join(datasetPath, participantId);
    
    try {
      await fs.access(participantPath);
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Participant directory not found'
      }, { status: 404 });
    }

    // Merkle DAG: import.emotions.prosody.find_hume_data
    // HumeAIデータディレクトリ検索
    const participantEntries = await fs.readdir(participantPath, { withFileTypes: true });
    const humeArtifactsEntry = participantEntries.find(entry =>
      entry.isDirectory() && (entry.name.startsWith('HumeAI_artifacts_') || entry.name === 'hume_data')
    );

    if (!humeArtifactsEntry) {
      return NextResponse.json({
        success: false,
        error: 'HumeAI artifacts directory not found'
      }, { status: 404 });
    }

    const humeDataDir = path.join(participantPath, humeArtifactsEntry.name);

    // Merkle DAG: import.emotions.prosody.find_registry_file
    // Registryファイル検索
    const registryFiles = await scanRegistryFiles(humeDataDir);
    const targetRegistry = registryFiles.find(rf => rf.uuid === registryUuid);

    if (!targetRegistry) {
      return NextResponse.json({
        success: false,
        error: `Registry file ${registryUuid} not found`
      }, { status: 404 });
    }

    // Merkle DAG: import.emotions.prosody.process_prosody_csv
    // Prosody CSVファイル処理
    const csvDir = path.join(targetRegistry.path, 'csv', registryUuid);
    const prosodyCsvPath = path.join(csvDir, 'prosody.csv');

    try {
      await fs.access(prosodyCsvPath);
    } catch {
      return NextResponse.json({
        success: false,
        error: 'prosody.csv file not found'
      }, { status: 404 });
    }

    const csvContent = await fs.readFile(prosodyCsvPath, 'utf-8');
    const prosodyData = await processProsodyCSV(csvContent, participantId, sessionId, registryUuid);

    if (prosodyData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No prosody data found in CSV file'
      }, { status: 400 });
    }

    // Merkle DAG: import.emotions.prosody.bulk_insert
    // バルク挿入でNeo4jに保存
    await client.bulkInsertNodes('EmotionAnalysis', prosodyData, 1000);

    // Merkle DAG: import.emotions.prosody.create_relationships
    // リレーションシップ作成
    const relationshipQuery = `
      MATCH (s:ExperimentSession {id: $sessionId})
      MATCH (ea:EmotionAnalysis {session_id: $sessionId, file_type: 'prosody'})
      MERGE (s)-[:HAS_EMOTION_ANALYSIS]->(ea)
      RETURN count(ea) as relationship_count
    `;
    await client.query(relationshipQuery, { sessionId });

    console.log(`API: Prosody emotion import completed for participant ${participantId}, session ${sessionId}`);

    return NextResponse.json({
      success: true,
      participantId,
      sessionId,
      registryUuid,
      statistics: {
        prosodyEntries: prosodyData.length,
        emotionsProcessed: prosodyData.reduce((sum, entry) => sum + (entry.emotions?.length || 0), 0)
      }
    });

  } catch (error) {
    console.error('API: Failed to import prosody emotions:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Merkle DAG: import.emotions.prosody.scan_registry_files
// Registryファイルスキャン関数
async function scanRegistryFiles(humeDataDir: string): Promise<Array<{uuid: string, path: string}>> {
  const registryFiles: Array<{uuid: string, path: string}> = [];

  try {
    const entries = await fs.readdir(humeDataDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('registry_file-')) {
        const parts = entry.name.split('-');
        if (parts.length >= 3) {
          const uuid = parts.slice(2).join('-');
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

// Merkle DAG: import.emotions.prosody.process_csv
// Prosody CSVファイル処理関数
async function processProsodyCSV(content: string, participantId: string, sessionId: string, registryUuid: string) {
  const lines = content.split('\n');
  const prosodyData = [];

  // ヘッダー行を取得
  const headers = lines[0]?.split(',') || [];
  
  // 感情カラムを特定
  const emotionColumns = headers.filter(header => 
    !['Id', 'BeginTime', 'EndTime'].includes(header.trim())
  );

  // データ行を処理
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line) {
      const values = line.split(',');
      const rowData: any = {
        id: `prosody_${participantId}_${sessionId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        participant_id: participantId,
        session_id: sessionId,
        registry_uuid: registryUuid,
        file_type: 'prosody',
        begin_time: parseFloat(values[1]) || 0,
        end_time: parseFloat(values[2]) || 0,
        emotions: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // 感情データを処理
      emotionColumns.forEach((emotion, index) => {
        const emotionIndex = headers.indexOf(emotion);
        if (emotionIndex !== -1 && values[emotionIndex]) {
          const score = parseFloat(values[emotionIndex]);
          if (!isNaN(score) && score > 0) {
            rowData.emotions.push({
              name: emotion.trim(),
              score: score
            });
          }
        }
      });

      // 感情データが存在する場合のみ追加
      if (rowData.emotions.length > 0) {
        prosodyData.push(rowData);
      }
    }
  }

  return prosodyData;
}

// Merkle DAG: import.emotions.prosody.resolve_dataset_path
// データセットパス解決関数
async function resolveDatasetParticipantsPath(): Promise<string> {
  const candidates = [
    path.join(process.cwd(), 'dataset', 'participants'),
    '/app/dataset/participants',
    '/app/apps/visualizer/src/dataset/participants',
    path.join(process.cwd(), 'apps', 'visualizer', 'src', 'dataset', 'participants'),
    path.join(process.cwd(), 'src', 'dataset', 'participants')
  ];
  
  for (const p of candidates) {
    try { 
      await fs.access(p); 
      return p; 
    } catch {}
  }
  
  return path.join(process.cwd(), 'dataset', 'participants');
}
