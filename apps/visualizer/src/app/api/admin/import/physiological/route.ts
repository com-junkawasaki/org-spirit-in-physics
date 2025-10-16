import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from 'fs';
import path from 'path';
import { createNeo4jClient } from '@/lib/neo4j';

// Merkle DAG: import.physiological.endpoint
// 生理データインポートAPIエンドポイント
// 依存関係: @participants/ (dataset), neo4j
// BPMN: PhysiologicalImportProcess

export async function POST(request: NextRequest) {
  try {
    console.log('API: Starting physiological data import from dataset...');

    const body = await request.json();
    const targetParticipantIds = body.participantIds || null;

    const results = [];

    // Merkle DAG: import.physiological.scan
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
        // BPMN: Task_ValidateParticipant - 参加者存在確認
        const participantExists = await client.getParticipantDetails(participantId);
        if (!participantExists) {
          results.push({
            participantId,
            status: 'skipped',
            message: 'Participant not found, import participants first'
          });
          continue;
        }

        // BPMN: Task_ScanPhysiologicalFiles - 生理データファイルスキャン
        const physiologicalFiles = await scanPhysiologicalFiles(participantPath);
        
        if (physiologicalFiles.length === 0) {
          results.push({
            participantId,
            status: 'skipped',
            message: 'No physiological data files found'
          });
          continue;
        }

        // BPMN: Task_ParseCSVData - CSVデータ解析
        let totalRecords = 0;
        let processedFiles = 0;
        const allPhysiologicalData = [];

        for (const fileInfo of physiologicalFiles) {
          try {
            const csvContent = await fs.readFile(fileInfo.path, 'utf-8');
            const parsedData = parsePhysiologicalCSV(csvContent, participantId, fileInfo.sessionId);
            
            if (parsedData.length > 0) {
              allPhysiologicalData.push(...parsedData);
              totalRecords += parsedData.length;
              processedFiles++;
            }
          } catch (error) {
            console.warn(`Error processing file ${fileInfo.path}:`, error);
          }
        }

        if (allPhysiologicalData.length === 0) {
          results.push({
            participantId,
            status: 'skipped',
            message: 'No valid physiological data found in files'
          });
          continue;
        }

        // BPMN: Task_ValidateData - データ検証
        const validationResult = validatePhysiologicalData(allPhysiologicalData);
        if (!validationResult.isValid) {
          results.push({
            participantId,
            status: 'error',
            message: `Data validation failed: ${validationResult.errors.join(', ')}`
          });
          continue;
        }

        // BPMN: Task_BulkInsert - Neo4jバルク挿入
        const insertedCount = await client.bulkInsertNodes('PhysiologicalData', allPhysiologicalData, 1000);

        // BPMN: Task_CreateRelationships - 関係作成
        await createPhysiologicalRelationships(client, participantId, allPhysiologicalData);

        // BPMN: Task_UpdateStatistics - 統計更新
        await updateParticipantStatistics(client, participantId, allPhysiologicalData.length);

        results.push({
          participantId,
          status: 'success',
          message: 'Physiological data imported successfully',
          statistics: {
            totalRecords,
            processedFiles,
            insertedRecords: insertedCount
          }
        });

      } catch (error) {
        console.error(`Import error for participant ${participantId}:`, error);
        results.push({
          participantId,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error during physiological import'
        });
      }
    }

    console.log(`API: Physiological import completed. Success: ${results.filter(r => r.status === 'success').length}, Failed: ${results.filter(r => r.status === 'error').length}, Skipped: ${results.filter(r => r.status === 'skipped').length}`);

    return NextResponse.json({
      success: true,
      total: participantDirs.length,
      processed: results.length,
      results
    });

  } catch (error) {
    console.error('API: Failed to import physiological data:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Merkle DAG: import.physiological.scan_files
// 生理データファイルスキャン関数
async function scanPhysiologicalFiles(participantPath: string): Promise<Array<{
  path: string;
  filename: string;
  sessionId: string;
  fileType: 'csv' | 'json';
}>> {
  const physiologicalFiles: Array<{
    path: string;
    filename: string;
    sessionId: string;
    fileType: 'csv' | 'json';
  }> = [];

  try {
    const entries = await fs.readdir(participantPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isFile()) {
        const filename = entry.name.toLowerCase();
        
        // 2025-*で始まるCSVファイルを検索
        if (filename.startsWith('2025-') && filename.endsWith('.csv')) {
          const sessionId = `session_${path.basename(participantPath)}_${Date.now()}`;
          physiologicalFiles.push({
            path: path.join(participantPath, entry.name),
            filename: entry.name,
            sessionId,
            fileType: 'csv'
          });
        }
        
        // 生理データJSONファイルを検索
        if (filename.includes('physiological') && filename.endsWith('.json')) {
          const sessionId = `session_${path.basename(participantPath)}_${Date.now()}`;
          physiologicalFiles.push({
            path: path.join(participantPath, entry.name),
            filename: entry.name,
            sessionId,
            fileType: 'json'
          });
        }
      }
    }
  } catch (error) {
    console.warn(`Error scanning physiological files in ${participantPath}:`, error);
  }

  return physiologicalFiles;
}

// Merkle DAG: import.physiological.parse_csv
// 生理データCSV解析関数
function parsePhysiologicalCSV(csvContent: string, participantId: string, sessionId: string): Array<{
  id: string;
  participant_id: string;
  session_id: string;
  time_sec: number;
  ch1: number;
  ch2: number;
  ch3: number;
  ch4: number;
  ch5: number;
  ch6: number;
  ch7: number;
  ch8: number;
  timestamp: number;
  created_at: string;
  updated_at: string;
}> {
  const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line);
  const physiologicalData: Array<{
    id: string;
    participant_id: string;
    session_id: string;
    time_sec: number;
    ch1: number;
    ch2: number;
    ch3: number;
    ch4: number;
    ch5: number;
    ch6: number;
    ch7: number;
    ch8: number;
    timestamp: number;
    created_at: string;
    updated_at: string;
  }> = [];

  let dataStartIndex = -1;
  let baseTimestamp = Date.now();

  // メタデータを解析
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(',')) {
      const [key, ...valueParts] = line.split(',');
      const value = valueParts.join(',').trim();

      if (key === 'Date' && value) {
        try {
          baseTimestamp = new Date(value).getTime();
        } catch {
          // 日付解析に失敗した場合は現在時刻を使用
        }
      }

      // データ開始行を検出
      if (key === 'Time_Sec') {
        dataStartIndex = i;
        break;
      }
    }
  }

  // データ行を解析
  if (dataStartIndex >= 0) {
    for (let i = dataStartIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      const values = line.split(',').map(v => v.trim());

      if (values.length >= 9) { // Time_Sec + Ch1-Ch8
        const timeSec = parseFloat(values[0]) || 0;
        const timestamp = baseTimestamp + (timeSec * 1000);

        physiologicalData.push({
          id: `physio_${participantId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          participant_id: participantId,
          session_id: sessionId,
          time_sec: timeSec,
          ch1: parseFloat(values[1]) || 0,
          ch2: parseFloat(values[2]) || 0,
          ch3: parseFloat(values[3]) || 0,
          ch4: parseFloat(values[4]) || 0,
          ch5: parseFloat(values[5]) || 0,
          ch6: parseFloat(values[6]) || 0,
          ch7: parseFloat(values[7]) || 0,
          ch8: parseFloat(values[8]) || 0,
          timestamp,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    }
  }

  return physiologicalData;
}

// Merkle DAG: import.physiological.validate_data
// 生理データ検証関数
function validatePhysiologicalData(data: any[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!Array.isArray(data)) {
    errors.push('Data must be an array');
    return { isValid: false, errors };
  }

  if (data.length === 0) {
    errors.push('Data array is empty');
    return { isValid: false, errors };
  }

  // 最初のレコードでスキーマを検証
  const firstRecord = data[0];
  const requiredFields = ['id', 'participant_id', 'session_id', 'time_sec', 'timestamp'];
  
  for (const field of requiredFields) {
    if (!(field in firstRecord)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // 数値フィールドの検証
  const numericFields = ['time_sec', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8', 'timestamp'];
  for (const record of data.slice(0, 10)) { // 最初の10レコードを検証
    for (const field of numericFields) {
      if (field in record && (isNaN(record[field]) || !isFinite(record[field]))) {
        errors.push(`Invalid numeric value for field ${field}: ${record[field]}`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Merkle DAG: import.physiological.create_relationships
// 生理データ関係作成関数
async function createPhysiologicalRelationships(
  client: any,
  participantId: string,
  physiologicalData: any[]
): Promise<void> {
  try {
    // 参加者と生理データの関係を作成
    const relationshipQuery = `
      MATCH (p:Participant {id: $participantId})
      MATCH (pd:PhysiologicalData {participant_id: $participantId})
      MERGE (p)-[:HAS_PHYSIOLOGICAL_DATA]->(pd)
      RETURN count(pd) as relationship_count
    `;
    
    await client.query(relationshipQuery, { participantId });

    // セッションと生理データの関係を作成
    const sessionRelationshipQuery = `
      MATCH (s:ExperimentSession {participant_id: $participantId})
      MATCH (pd:PhysiologicalData {participant_id: $participantId})
      MERGE (s)-[:HAS_PHYSIOLOGICAL_DATA]->(pd)
      RETURN count(pd) as relationship_count
    `;
    
    await client.query(sessionRelationshipQuery, { participantId });

  } catch (error) {
    console.error('Error creating physiological relationships:', error);
    throw error;
  }
}

// Merkle DAG: import.physiological.update_statistics
// 参加者統計更新関数
async function updateParticipantStatistics(
  client: any,
  participantId: string,
  recordCount: number
): Promise<void> {
  try {
    const updateQuery = `
      MATCH (p:Participant {id: $participantId})
      SET p.physiological_data_count = $recordCount,
          p.updated_at = $updatedAt
      RETURN p
    `;
    
    await client.query(updateQuery, {
      participantId,
      recordCount,
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating participant statistics:', error);
    throw error;
  }
}

// Merkle DAG: import.physiological.resolve_dataset_path
// データセットパス解決関数
async function resolveDatasetParticipantsPath(): Promise<string> {
  const candidates = [
    path.join(process.cwd(), 'dataset', 'participants'),
    path.join(process.cwd(), '..', 'dataset', 'participants'),
    path.join(process.cwd(), '..', '..', 'dataset', 'participants')
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // パスが存在しない場合は次を試す
    }
  }

  throw new Error('Dataset participants directory not found');
}

// Merkle DAG: import.physiological -> implementation_complete
// 生理データインポートプロセスの実装完了
