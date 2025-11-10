// LLM-BOUNDARY: 80_app - app/(segments)/...（RSC & Client）
// Merkle DAG: import.emotions.endpoint
// 感情分析データインポートAPIエンドポイント
// 依存関係: @participants/ (dataset), neo4j, hume-ai-integration

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from 'fs';
import path from 'path';
import { initializeNeo4jDatabase } from "scripts/src/lib/data-loader";
import { neo4jManager } from "scripts/src/lib/database/neo4j-manager";
import { neo4jClient } from "scripts/src/lib/neo4j";
import { findHumePredictionsFile, findRegistryCSVDirectory, parseCSVFile } from "scripts/src/lib/import-utils";

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
    // Neo4jデータベース初期化（致命的エラーのチェック）
    try {
      await initializeNeo4jDatabase();
    } catch (error) {
      console.error('Fatal error: Failed to initialize Neo4j database:', error);
      return {
        success: false,
        error: 'Database connection failed. Please check Neo4j configuration.',
        results: []
      };
    }

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
        // HumeAI_predictions JSONファイルを動的に検索して読み取り
        const predictionsFilePath = await findHumePredictionsFile(humeArtifactsDir);
        if (!predictionsFilePath) {
          results.push({
            participantId,
            status: 'skipped',
            message: 'HumeAI_predictions JSON file not found'
          });
          continue;
        }
        
        const predictionsData = JSON.parse(await fs.readFile(predictionsFilePath, 'utf-8'));

        // Merkle DAG: import.emotions.process_emotion_data
        // 感情データを処理してNeo4jに格納
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
        const errorMessage = error instanceof Error ? error.message : 'Unknown error during emotion import';
        console.error(`Error importing emotions for participant ${participantId}:`, error);
        results.push({
          participantId,
          status: 'error',
          message: errorMessage
        });
        // エラーが発生しても続行（スキップ方式）
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
async function checkParticipantExists(participantId: string): Promise<boolean> {
  try {
    const participant = await neo4jManager.getParticipant(participantId);
    return participant !== null;
  } catch (error) {
    console.error(`Error checking participant existence ${participantId}:`, error);
    return false;
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

// Merkle DAG: import.emotions.check_existing_data
// 既存感情データチェック関数
async function checkExistingEmotionData(participantId: string): Promise<boolean> {
  try {
    const query = `
      MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(:Session)-[:HAS_RESPONSE]->(:Response)<-[:ANALYZES]-(e:EmotionAnalysis)
      RETURN count(e) as emotionCount
    `;
    const result = await neo4jClient.query(query, { participantId });
    const emotionCount = result[0]?.emotionCount || 0;
    return emotionCount > 0;
  } catch (error) {
    console.error(`Error checking existing emotion data ${participantId}:`, error);
    return false;
  }
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

        // Neo4jに感情データを格納
        await storeEmotionEntry(emotionRecord);
      }
    }
  }

  return { entriesProcessed, totalEmotions };
}

// Merkle DAG: import.emotions.store_entry
// 感情エントリ格納関数
async function storeEmotionEntry(emotionRecord: any) {
  try {
    // セッションとResponseを取得（最初のセッションと最初のResponseを使用）
    const sessionQuery = `
      MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session)
      RETURN s.id as sessionId
      ORDER BY s.created_at ASC
      LIMIT 1
    `;
    const sessionResult = await neo4jClient.query(sessionQuery, { participantId: emotionRecord.participantId });
    
    if (!sessionResult || sessionResult.length === 0) {
      console.warn(`No session found for participant ${emotionRecord.participantId}`);
      return;
    }

    const sessionId = sessionResult[0].sessionId;

    // Responseを取得または作成（感情データに関連付けるため）
    const responseQuery = `
      MATCH (s:Session {id: $sessionId})-[:HAS_RESPONSE]->(r:Response)
      WHERE r.event_ts >= $beginTime AND r.event_ts <= $endTime
      RETURN r.id as responseId
      ORDER BY abs(r.event_ts - $beginTime) ASC
      LIMIT 1
    `;
    
    const beginTime = emotionRecord.beginTime ? parseFloat(emotionRecord.beginTime) * 1000 : Date.now();
    const endTime = emotionRecord.endTime ? parseFloat(emotionRecord.endTime) * 1000 : beginTime + 1000;
    
    let responseResult = await neo4jClient.query(responseQuery, { 
      sessionId, 
      beginTime, 
      endTime 
    });

    let responseId: string;
    if (!responseResult || responseResult.length === 0) {
      // Responseが存在しない場合は作成
      const createResponseQuery = `
        MATCH (s:Session {id: $sessionId})
        CREATE (s)-[:HAS_RESPONSE]->(r:Response {
          id: $responseId,
          participant_id: $participantId,
          session_id: $sessionId,
          stimulus_word: '',
          response_word: $text,
          event_ts: $beginTime
        })
        RETURN r.id as responseId
      `;
      responseId = `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await neo4jClient.query(createResponseQuery, {
        sessionId,
        responseId,
        participantId: emotionRecord.participantId,
        text: emotionRecord.text || '',
        beginTime
      });
    } else {
      responseId = responseResult[0].responseId;
    }

    // EmotionAnalysisノードを作成
    const emotionAnalysisId = `ea_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const createEmotionQuery = `
      MATCH (r:Response {id: $responseId})
      CREATE (e:EmotionAnalysis {
        id: $emotionAnalysisId,
        response_id: $responseId,
        emotion_data: $emotionData,
        confidence_score: $confidence,
        analysis_timestamp: $timestamp,
        source: 'HumeAI',
        created_at: $timestamp,
        updated_at: $timestamp
      })
      CREATE (e)-[:ANALYZES]->(r)
      RETURN e
    `;
    
    await neo4jClient.query(createEmotionQuery, {
      emotionAnalysisId,
      responseId,
      emotionData: {
        text: emotionRecord.text,
        beginTime: emotionRecord.beginTime,
        endTime: emotionRecord.endTime,
        emotions: emotionRecord.emotions,
        position: emotionRecord.position
      },
      confidence: emotionRecord.confidence || 0.5,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error storing emotion entry for ${emotionRecord.participantId}:`, error);
    throw error;
  }
}

// Merkle DAG: import.emotions.process_csv
// CSVデータ処理関数
async function processEmotionCSVData(participantId: string, artifactsDir: string) {
  let filesProcessed = 0;

  try {
    // registry_file-* ディレクトリ内のCSVディレクトリを動的に検索
    const csvDir = await findRegistryCSVDirectory(artifactsDir);
    
    if (!csvDir) {
      console.warn(`CSV directory not found in ${artifactsDir}`);
      return { filesProcessed };
    }

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
      } catch (error) {
        // CSVファイルが存在しない場合はスキップ
        console.warn(`CSV file ${csvFile} not found or error reading:`, error);
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
  try {
    // CSVファイルをパース
    const records = parseCSVFile(content);
    
    for (const record of records) {
      const csvRecord = {
        participantId,
        fileType: fileName.replace('.csv', ''),
        data: record,
        importedAt: new Date().toISOString()
      };
      await storeCSVRecord(csvRecord);
    }
  } catch (error) {
    console.error(`Error processing CSV file ${fileName} for ${participantId}:`, error);
    throw error;
  }
}

// Merkle DAG: import.emotions.store_csv
// CSVレコード格納関数
async function storeCSVRecord(csvRecord: any) {
  try {
    // CSVデータをNeo4jに格納（簡易実装：メタデータとして保存）
    // より詳細な処理が必要な場合は、CSVファイルの種類に応じて適切なノードを作成
    const query = `
      MATCH (p:Participant {id: $participantId})
      MERGE (p)-[:HAS_CSV_DATA]->(c:CSVData {
        id: $csvId,
        file_type: $fileType,
        participant_id: $participantId
      })
      SET c.data = $data,
          c.imported_at = $importedAt,
          c.updated_at = $importedAt
      RETURN c
    `;
    
    const csvId = `csv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await neo4jClient.query(query, {
      participantId: csvRecord.participantId,
      csvId,
      fileType: csvRecord.fileType,
      data: csvRecord.data,
      importedAt: csvRecord.importedAt
    });
  } catch (error) {
    console.error(`Error storing CSV record for ${csvRecord.participantId}:`, error);
    // CSVデータの保存エラーは致命的ではないため、ログのみ出力
  }
}

export async function POST(request: NextRequest) {
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
