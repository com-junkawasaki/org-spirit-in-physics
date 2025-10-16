import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from 'fs';
import path from 'path';
import { createNeo4jClient } from '@/lib/neo4j';

// Merkle DAG: import.emotions.integrated -> integrated_emotion_data_import
// 統合感情データインポートAPIエンドポイント（BPMNプロセス実装）
// 依存関係: @participants/ (dataset), neo4j, burst/face/language/prosody APIs

export async function POST(request: NextRequest) {
  try {
    console.log('API: Starting integrated emotion import process...');

    const body = await request.json();
    const { participantId, sessionId } = body;

    if (!participantId || !sessionId) {
      return NextResponse.json({
        success: false,
        error: 'participantId and sessionId are required'
      }, { status: 400 });
    }

    const client = createNeo4jClient();
    const results = {
      participantId,
      sessionId,
      phases: {
        participantCheck: { status: 'pending', message: '' },
        humeDataScan: { status: 'pending', message: '' },
        registryScan: { status: 'pending', message: '' },
        emotionProcessing: { status: 'pending', message: '' },
        dataIntegration: { status: 'pending', message: '' },
        statisticsUpdate: { status: 'pending', message: '' }
      },
      statistics: {
        burstEntries: 0,
        faceEntries: 0,
        languageEntries: 0,
        prosodyEntries: 0,
        totalEmotions: 0
      }
    };

    // Merkle DAG: import.emotions.integrated.phase1_participant_check
    // Phase 1: 参加者存在確認
    try {
      console.log(`Phase 1: Checking participant ${participantId}...`);
      const participantExists = await client.getParticipantDetails(participantId);
      if (!participantExists) {
        results.phases.participantCheck = {
          status: 'failed',
          message: 'Participant not found'
        };
        return NextResponse.json({
          success: false,
          results,
          error: 'Participant not found'
        }, { status: 404 });
      }
      results.phases.participantCheck = {
        status: 'completed',
        message: 'Participant exists'
      };
    } catch (error) {
      results.phases.participantCheck = {
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
      return NextResponse.json({
        success: false,
        results,
        error: 'Failed to check participant'
      }, { status: 500 });
    }

    // Merkle DAG: import.emotions.integrated.phase2_hume_data_scan
    // Phase 2: HumeAIデータスキャン
    try {
      console.log(`Phase 2: Scanning HumeAI data for participant ${participantId}...`);
      const datasetPath = await resolveDatasetParticipantsPath();
      const participantPath = path.join(datasetPath, participantId);
      
      await fs.access(participantPath);
      
      const participantEntries = await fs.readdir(participantPath, { withFileTypes: true });
      const humeArtifactsEntry = participantEntries.find(entry =>
        entry.isDirectory() && (entry.name.startsWith('HumeAI_artifacts_') || entry.name === 'hume_data')
      );

      if (!humeArtifactsEntry) {
        results.phases.humeDataScan = {
          status: 'failed',
          message: 'HumeAI artifacts directory not found'
        };
        return NextResponse.json({
          success: false,
          results,
          error: 'HumeAI artifacts directory not found'
        }, { status: 404 });
      }

      results.phases.humeDataScan = {
        status: 'completed',
        message: `Found HumeAI directory: ${humeArtifactsEntry.name}`
      };
    } catch (error) {
      results.phases.humeDataScan = {
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
      return NextResponse.json({
        success: false,
        results,
        error: 'Failed to scan HumeAI data'
      }, { status: 500 });
    }

    // Merkle DAG: import.emotions.integrated.phase3_registry_scan
    // Phase 3: Registryファイルスキャン
    try {
      console.log(`Phase 3: Scanning registry files...`);
      const datasetPath = await resolveDatasetParticipantsPath();
      const participantPath = path.join(datasetPath, participantId);
      const participantEntries = await fs.readdir(participantPath, { withFileTypes: true });
      const humeArtifactsEntry = participantEntries.find(entry =>
        entry.isDirectory() && (entry.name.startsWith('HumeAI_artifacts_') || entry.name === 'hume_data')
      );
      const humeDataDir = path.join(participantPath, humeArtifactsEntry!.name);
      
      const registryFiles = await scanRegistryFiles(humeDataDir);
      if (registryFiles.length === 0) {
        results.phases.registryScan = {
          status: 'failed',
          message: 'No registry files found'
        };
        return NextResponse.json({
          success: false,
          results,
          error: 'No registry files found'
        }, { status: 404 });
      }

      results.phases.registryScan = {
        status: 'completed',
        message: `Found ${registryFiles.length} registry files`
      };
    } catch (error) {
      results.phases.registryScan = {
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
      return NextResponse.json({
        success: false,
        results,
        error: 'Failed to scan registry files'
      }, { status: 500 });
    }

    // Merkle DAG: import.emotions.integrated.phase4_parallel_emotion_processing
    // Phase 4: 並列感情データ処理
    try {
      console.log(`Phase 4: Processing emotion data in parallel...`);
      const datasetPath = await resolveDatasetParticipantsPath();
      const participantPath = path.join(datasetPath, participantId);
      const participantEntries = await fs.readdir(participantPath, { withFileTypes: true });
      const humeArtifactsEntry = participantEntries.find(entry =>
        entry.isDirectory() && (entry.name.startsWith('HumeAI_artifacts_') || entry.name === 'hume_data')
      );
      const humeDataDir = path.join(participantPath, humeArtifactsEntry!.name);
      const registryFiles = await scanRegistryFiles(humeDataDir);
      
      // 最初のregistryファイルを使用
      const registryUuid = registryFiles[0].uuid;
      
      // 並列処理で各感情データタイプを処理
      const [burstResult, faceResult, languageResult, prosodyResult] = await Promise.allSettled([
        processEmotionType('burst', participantId, sessionId, registryUuid, humeDataDir),
        processEmotionType('face', participantId, sessionId, registryUuid, humeDataDir),
        processEmotionType('language', participantId, sessionId, registryUuid, humeDataDir),
        processEmotionType('prosody', participantId, sessionId, registryUuid, humeDataDir)
      ]);

      // 結果を集計
      if (burstResult.status === 'fulfilled') {
        results.statistics.burstEntries = burstResult.value.entries;
        results.statistics.totalEmotions += burstResult.value.emotions;
      }
      if (faceResult.status === 'fulfilled') {
        results.statistics.faceEntries = faceResult.value.entries;
        results.statistics.totalEmotions += faceResult.value.emotions;
      }
      if (languageResult.status === 'fulfilled') {
        results.statistics.languageEntries = languageResult.value.entries;
        results.statistics.totalEmotions += languageResult.value.emotions;
      }
      if (prosodyResult.status === 'fulfilled') {
        results.statistics.prosodyEntries = prosodyResult.value.entries;
        results.statistics.totalEmotions += prosodyResult.value.emotions;
      }

      results.phases.emotionProcessing = {
        status: 'completed',
        message: `Processed ${results.statistics.totalEmotions} emotions across 4 data types`
      };
    } catch (error) {
      results.phases.emotionProcessing = {
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
      return NextResponse.json({
        success: false,
        results,
        error: 'Failed to process emotion data'
      }, { status: 500 });
    }

    // Merkle DAG: import.emotions.integrated.phase5_data_integration
    // Phase 5: データ統合・Neo4j保存
    try {
      console.log(`Phase 5: Integrating emotion data...`);
      // データは既に各処理でNeo4jに保存済み
      results.phases.dataIntegration = {
        status: 'completed',
        message: 'Emotion data integrated into Neo4j'
      };
    } catch (error) {
      results.phases.dataIntegration = {
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Merkle DAG: import.emotions.integrated.phase6_statistics_update
    // Phase 6: 統計情報更新
    try {
      console.log(`Phase 6: Updating statistics...`);
      const statsQuery = `
        MATCH (p:Participant {id: $participantId})
        SET p.emotion_data_imported = true,
            p.last_emotion_import = datetime(),
            p.total_emotion_entries = $totalEntries
        RETURN p.id as participant_id
      `;
      await client.query(statsQuery, { 
        participantId, 
        totalEntries: results.statistics.burstEntries + results.statistics.faceEntries + 
                     results.statistics.languageEntries + results.statistics.prosodyEntries
      });

      results.phases.statisticsUpdate = {
        status: 'completed',
        message: 'Statistics updated successfully'
      };
    } catch (error) {
      results.phases.statisticsUpdate = {
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    console.log(`API: Integrated emotion import completed for participant ${participantId}, session ${sessionId}`);

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('API: Failed to import integrated emotions:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Merkle DAG: import.emotions.integrated.process_emotion_type
// 個別感情データタイプ処理関数
async function processEmotionType(
  type: 'burst' | 'face' | 'language' | 'prosody',
  participantId: string,
  sessionId: string,
  registryUuid: string,
  humeDataDir: string
): Promise<{ entries: number, emotions: number }> {
  const client = createNeo4jClient();
  
  // Registryファイル検索
  const registryFiles = await scanRegistryFiles(humeDataDir);
  const targetRegistry = registryFiles.find(rf => rf.uuid === registryUuid);
  
  if (!targetRegistry) {
    throw new Error(`Registry file ${registryUuid} not found`);
  }

  // CSVファイル処理
  const csvDir = path.join(targetRegistry.path, 'csv', registryUuid);
  const csvPath = path.join(csvDir, `${type}.csv`);

  console.log(`Processing ${type} CSV: ${csvPath}`);

  try {
    await fs.access(csvPath);
    console.log(`CSV file exists: ${csvPath}`);
  } catch (error) {
    console.log(`CSV file not found: ${csvPath}`, error);
    return { entries: 0, emotions: 0 };
  }

  const csvContent = await fs.readFile(csvPath, 'utf-8');
  const emotionData = await processEmotionCSV(csvContent, participantId, sessionId, registryUuid, type);

  if (emotionData.length > 0) {
    // バルク挿入でNeo4jに保存
    await client.bulkInsertNodes('EmotionAnalysis', emotionData, 1000);

    // リレーションシップ作成
    const relationshipQuery = `
      MATCH (s:ExperimentSession {id: $sessionId})
      MATCH (ea:EmotionAnalysis {session_id: $sessionId, file_type: $fileType})
      MERGE (s)-[:HAS_EMOTION_ANALYSIS]->(ea)
      RETURN count(ea) as relationship_count
    `;
    await client.query(relationshipQuery, { sessionId, fileType: type });
  }

  return {
    entries: emotionData.length,
    emotions: emotionData.reduce((sum, entry) => {
      try {
        const emotions = JSON.parse(entry.emotions || '[]');
        return sum + emotions.length;
      } catch {
        return sum;
      }
    }, 0)
  };
}

// Merkle DAG: import.emotions.integrated.process_csv
// CSVファイル処理関数
async function processEmotionCSV(
  content: string, 
  participantId: string, 
  sessionId: string, 
  registryUuid: string, 
  fileType: string
) {
  const lines = content.split('\n');
  const emotionData = [];

  // ヘッダー行を取得
  const headers = lines[0]?.split(',') || [];
  
  // ファイルタイプに応じて感情カラムを特定
  let emotionColumns: string[] = [];
  
  if (fileType === 'burst') {
    // burst.csv: Id, BeginTime, EndTime を除外
    emotionColumns = headers.filter(header => 
      !['Id', 'BeginTime', 'EndTime'].includes(header.trim())
    );
  } else if (fileType === 'face') {
    // face.csv: Id, Frame, Time, Probability, FaceX0, FaceY0, FaceWidth, FaceHeight, AU* を除外
    emotionColumns = headers.filter(header => {
      const headerTrimmed = header.trim();
      return !['Id', 'Frame', 'Time', 'Probability', 'FaceX0', 'FaceY0', 'FaceWidth', 'FaceHeight'].includes(headerTrimmed) &&
             !headerTrimmed.startsWith('AU') &&
             !headerTrimmed.includes('Hand over') &&
             !headerTrimmed.includes('Hand touching') &&
             !['Beaming', 'Biting lip', 'Cheering', 'Cringe', 'Cry', 'Eyes closed', 'Face in hands', 'Frown', 'Gasp', 'Glare', 'Glaring', 'Grimace', 'Grin', 'Jaw drop', 'Laugh', 'Licking lip', 'Pout', 'Scowl', 'Smile', 'Smirk', 'Snarl', 'Squint', 'Sulking', 'Tongue out', 'Wide-eyed', 'Wince', 'Wrinkled nose'].includes(headerTrimmed);
    });
  } else if (fileType === 'language') {
    // language.csv: Id, BeginTime, EndTime を除外
    emotionColumns = headers.filter(header => 
      !['Id', 'BeginTime', 'EndTime'].includes(header.trim())
    );
  } else if (fileType === 'prosody') {
    // prosody.csv: Id, BeginTime, EndTime を除外
    emotionColumns = headers.filter(header => 
      !['Id', 'BeginTime', 'EndTime'].includes(header.trim())
    );
  }

  // データ行を処理
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line) {
      const values = line.split(',');
      const rowData: any = {
        id: `${fileType}_${participantId}_${sessionId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        participant_id: participantId,
        session_id: sessionId,
        registry_uuid: registryUuid,
        file_type: fileType,
        begin_time: fileType === 'face' ? parseFloat(values[2]) || 0 : parseFloat(values[1]) || 0, // face: Time列, その他: BeginTime列
        end_time: fileType === 'face' ? parseFloat(values[2]) || 0 : parseFloat(values[2]) || 0,   // face: Time列, その他: EndTime列
        emotions: JSON.stringify([]),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // 感情データを処理
      const emotions = [];
      emotionColumns.forEach((emotion, index) => {
        const emotionIndex = headers.indexOf(emotion);
        if (emotionIndex !== -1 && values[emotionIndex]) {
          const score = parseFloat(values[emotionIndex]);
          if (!isNaN(score) && score > 0) {
            emotions.push({
              name: emotion.trim(),
              score: score
            });
          }
        }
      });

      // 感情データをJSON文字列として保存
      rowData.emotions = JSON.stringify(emotions);

      // デバッグログ（最初の数行のみ）
      if (i <= 3) {
        console.log(`Debug ${fileType} row ${i}:`, {
          headers: headers.slice(0, 10),
          emotionColumns: emotionColumns.slice(0, 10),
          values: values.slice(0, 10),
          emotions: emotions.length
        });
      }

      // 感情データが存在する場合のみ追加
      if (emotions.length > 0) {
        emotionData.push(rowData);
      }
    }
  }

  return emotionData;
}

// Merkle DAG: import.emotions.integrated.scan_registry_files
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

// Merkle DAG: import.emotions.integrated.resolve_dataset_path
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
