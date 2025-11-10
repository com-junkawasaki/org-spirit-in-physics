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
import { findHumePredictionsFile, findAllRegistryCSVDirectories, parseCSVFile } from "scripts/src/lib/import-utils";

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
// CSVデータ処理関数（複数のregistry_file-*ディレクトリを処理）
async function processEmotionCSVData(participantId: string, artifactsDir: string) {
  let filesProcessed = 0;

  try {
    // 全てのregistry_file-* ディレクトリ内のCSVディレクトリを動的に検索
    const csvDirs = await findAllRegistryCSVDirectories(artifactsDir);
    
    if (csvDirs.length === 0) {
      console.warn(`No CSV directories found in ${artifactsDir}`);
      return { filesProcessed };
    }

    // CSVファイルの処理
    const csvFiles = ['burst.csv', 'face.csv', 'language.csv', 'prosody.csv'];

    // 各CSVディレクトリに対して処理
    for (const csvDir of csvDirs) {
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
          console.warn(`CSV file ${csvFile} not found or error reading in ${csvDir}:`, error);
        }
      }
    }
  } catch (error) {
    console.warn('Error processing CSV data:', error);
  }

  return { filesProcessed };
}

// Merkle DAG: import.emotions.process_csv_file
// 個別CSVファイル処理関数（CSVタイプに応じた専用の保存関数を呼び出す）
async function processCSVFile(participantId: string, fileName: string, content: string) {
  try {
    // CSVファイルをパース
    const records = parseCSVFile(content);
    
    const fileType = fileName.replace('.csv', '');
    
    // CSVファイルタイプに応じた専用の保存関数を呼び出す
    for (const record of records) {
      switch (fileType) {
        case 'burst':
          await storeBurstEmotionData(participantId, record);
          break;
        case 'face':
          await storeFaceEmotionData(participantId, record);
          break;
        case 'language':
          await storeLanguageEmotionData(participantId, record);
          break;
        case 'prosody':
          await storeProsodyEmotionData(participantId, record);
          break;
        default:
          console.warn(`Unknown CSV file type: ${fileType}`);
      }
    }
  } catch (error) {
    console.error(`Error processing CSV file ${fileName} for ${participantId}:`, error);
    throw error;
  }
}

// Merkle DAG: import.emotions.store_burst_emotion_data
// BurstEmotionDataノードを作成
async function storeBurstEmotionData(participantId: string, record: Record<string, string>) {
  try {
    // セッションを取得
    const sessionQuery = `
      MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session)
      RETURN s.id as sessionId
      ORDER BY s.created_at ASC
      LIMIT 1
    `;
    const sessionResult = await neo4jClient.query(sessionQuery, { participantId });
    
    if (!sessionResult || sessionResult.length === 0) {
      console.warn(`No session found for participant ${participantId}`);
      return;
    }

    const sessionId = sessionResult[0].sessionId;
    const nodeId = `burst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 感情スコアと発声タイプを抽出
    const emotionScores: Record<string, number> = {};
    const vocalTypes: Record<string, number> = {};
    
    const emotionKeys = ['Admiration', 'Adoration', 'Aesthetic Appreciation', 'Amusement', 'Anger', 'Anxiety', 'Awe', 'Awkwardness', 'Boredom', 'Calmness', 'Concentration', 'Contemplation', 'Confusion', 'Contempt', 'Contentment', 'Craving', 'Determination', 'Disappointment', 'Disgust', 'Distress', 'Doubt', 'Ecstasy', 'Embarrassment', 'Empathic Pain', 'Entrancement', 'Envy', 'Excitement', 'Fear', 'Guilt', 'Horror', 'Interest', 'Joy', 'Love', 'Nostalgia', 'Pain', 'Pride', 'Realization', 'Relief', 'Romance', 'Sadness', 'Satisfaction', 'Desire', 'Shame', 'Surprise (negative)', 'Surprise (positive)', 'Sympathy', 'Tiredness', 'Triumph'];
    const vocalKeys = ['Cackle', 'Cheer', 'Chuckle', 'Cry', 'Gasp', 'Giggle', 'Groan', 'Growl', 'Grunt', 'Hiss', 'Hoot', 'Howl', 'Laugh', 'Moan', 'Pant', 'Roar', 'Scream', 'Screech', 'Shout', 'Shriek', 'Sigh', 'Snicker', 'Snort', 'Sob', 'Squeal', 'Wail', 'Wheep', 'Whimper', 'Yawn', 'Yelp', 'Ah', 'Aha', 'Ahh', 'Argh', 'Aww', 'Eek', 'Eww', 'Grr', 'Ha', 'Hah', 'Haha', 'Hehe', 'Hmm', 'Huh', 'Hurray', 'Mhm', 'Mmm', 'Oh', 'Ohh', 'Ooh', 'Ooph', 'Ouch', 'Oww', 'Pff', 'Phew', 'Tsk', 'Ugh', 'Uh', 'Uh-huh', 'Umm', 'Whee', 'Whew', 'Woah', 'Wow', 'Yay', 'Yippee', 'Yuck'];

    for (const key of emotionKeys) {
      if (record[key] !== undefined && record[key] !== '') {
        const value = parseFloat(record[key]);
        if (!isNaN(value)) {
          emotionScores[key] = value;
        }
      }
    }

    for (const key of vocalKeys) {
      if (record[key] !== undefined && record[key] !== '') {
        const value = parseFloat(record[key]);
        if (!isNaN(value)) {
          vocalTypes[key] = value;
        }
      }
    }

    // 重複チェック: record_id, begin_time, end_timeで既存データを確認
    const checkQuery = `
      MATCH (s:Session {id: $sessionId})-[:HAS_BURST_EMOTION_DATA]->(b:BurstEmotionData)
      WHERE b.record_id = $recordId 
        AND b.begin_time = $beginTime 
        AND b.end_time = $endTime
      RETURN b.id as existingId
      LIMIT 1
    `;
    const existing = await neo4jClient.query(checkQuery, {
      sessionId,
      recordId: record.Id || 'unknown',
      beginTime: record.BeginTime ? parseFloat(record.BeginTime) : null,
      endTime: record.EndTime ? parseFloat(record.EndTime) : null
    });

    if (existing && existing.length > 0) {
      // 既に存在する場合はスキップ
      return;
    }

    const query = `
      MATCH (s:Session {id: $sessionId})
      CREATE (b:BurstEmotionData {
        id: $nodeId,
        participant_id: $participantId,
        session_id: $sessionId,
        record_id: $recordId,
        begin_time: $beginTime,
        end_time: $endTime,
        emotion_scores: $emotionScores,
        vocal_types: $vocalTypes,
        created_at: $createdAt
      })
      CREATE (s)-[:HAS_BURST_EMOTION_DATA]->(b)
      RETURN b
    `;

    await neo4jClient.query(query, {
      sessionId,
      nodeId,
      participantId,
      recordId: record.Id || 'unknown',
      beginTime: record.BeginTime ? parseFloat(record.BeginTime) : null,
      endTime: record.EndTime ? parseFloat(record.EndTime) : null,
      emotionScores,
      vocalTypes,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error storing burst emotion data for ${participantId}:`, error);
    // エラーは致命的ではないため、ログのみ出力
  }
}

// Merkle DAG: import.emotions.store_face_emotion_data
// FaceEmotionDataノードを作成
async function storeFaceEmotionData(participantId: string, record: Record<string, string>) {
  try {
    const sessionQuery = `
      MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session)
      RETURN s.id as sessionId
      ORDER BY s.created_at ASC
      LIMIT 1
    `;
    const sessionResult = await neo4jClient.query(sessionQuery, { participantId });
    
    if (!sessionResult || sessionResult.length === 0) {
      console.warn(`No session found for participant ${participantId}`);
      return;
    }

    const sessionId = sessionResult[0].sessionId;
    const nodeId = `face_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 感情スコアとAUスコアを抽出
    const emotionScores: Record<string, number> = {};
    const auScores: Record<string, number> = {};
    
    const emotionKeys = ['Admiration', 'Adoration', 'Aesthetic Appreciation', 'Amusement', 'Anger', 'Anxiety', 'Awe', 'Awkwardness', 'Boredom', 'Calmness', 'Concentration', 'Contemplation', 'Confusion', 'Contempt', 'Contentment', 'Craving', 'Determination', 'Disappointment', 'Disgust', 'Distress', 'Doubt', 'Ecstasy', 'Embarrassment', 'Empathic Pain', 'Entrancement', 'Envy', 'Excitement', 'Fear', 'Guilt', 'Horror', 'Interest', 'Joy', 'Love', 'Nostalgia', 'Pain', 'Pride', 'Realization', 'Relief', 'Romance', 'Sadness', 'Satisfaction', 'Desire', 'Shame', 'Surprise (negative)', 'Surprise (positive)', 'Sympathy', 'Tiredness', 'Triumph'];
    const auKeys = ['AU1 Inner Brow Raise', 'AU2 Outer Brow Raise', 'AU4 Brow Lowerer', 'AU5 Upper Lid Raise', 'AU6 Cheek Raise', 'AU7 Lids Tight', 'AU9 Nose Wrinkle', 'AU10 Upper Lip Raiser', 'AU11 Nasolabial Furrow Deepener', 'AU12 Lip Corner Puller', 'AU14 Dimpler', 'AU15 Lip Corner Depressor', 'AU16 Lower Lip Depress', 'AU17 Chin Raiser', 'AU18 Lip Pucker', 'AU19 Tongue Show', 'AU20 Lip Stretch', 'AU22 Lip Funneler', 'AU23 Lip Tightener', 'AU24 Lip Presser', 'AU25 Lips Part', 'AU26 Jaw Drop', 'AU27 Mouth Stretch', 'AU28 Lips Suck', 'AU32 Bite', 'AU34 Puff', 'AU37 Lip Wipe', 'AU38 Nostril Dilate', 'AU43 Eye Closure', 'AU53 Head Up', 'AU54 Head Down'];

    for (const key of emotionKeys) {
      if (record[key] !== undefined && record[key] !== '') {
        const value = parseFloat(record[key]);
        if (!isNaN(value)) {
          emotionScores[key] = value;
        }
      }
    }

    for (const key of auKeys) {
      if (record[key] !== undefined && record[key] !== '') {
        const value = parseFloat(record[key]);
        if (!isNaN(value)) {
          auScores[key] = value;
        }
      }
    }

    // 重複チェック: record_id, frame, timeで既存データを確認
    const checkQuery = `
      MATCH (s:Session {id: $sessionId})-[:HAS_FACE_EMOTION_DATA]->(f:FaceEmotionData)
      WHERE f.record_id = $recordId 
        AND f.frame = $frame 
        AND f.time = $time
      RETURN f.id as existingId
      LIMIT 1
    `;
    const existing = await neo4jClient.query(checkQuery, {
      sessionId,
      recordId: record.Id || 'unknown',
      frame: record.Frame ? parseInt(record.Frame) : null,
      time: record.Time ? parseFloat(record.Time) : null
    });

    if (existing && existing.length > 0) {
      // 既に存在する場合はスキップ
      return;
    }

    const query = `
      MATCH (s:Session {id: $sessionId})
      CREATE (f:FaceEmotionData {
        id: $nodeId,
        participant_id: $participantId,
        session_id: $sessionId,
        record_id: $recordId,
        frame: $frame,
        time: $time,
        probability: $probability,
        face_x0: $faceX0,
        face_y0: $faceY0,
        face_width: $faceWidth,
        face_height: $faceHeight,
        emotion_scores: $emotionScores,
        au_scores: $auScores,
        created_at: $createdAt
      })
      CREATE (s)-[:HAS_FACE_EMOTION_DATA]->(f)
      RETURN f
    `;

    await neo4jClient.query(query, {
      sessionId,
      nodeId,
      participantId,
      recordId: record.Id || 'unknown',
      frame: record.Frame ? parseInt(record.Frame) : null,
      time: record.Time ? parseFloat(record.Time) : null,
      probability: record.Probability ? parseFloat(record.Probability) : null,
      faceX0: record.FaceX0 ? parseFloat(record.FaceX0) : null,
      faceY0: record.FaceY0 ? parseFloat(record.FaceY0) : null,
      faceWidth: record.FaceWidth ? parseFloat(record.FaceWidth) : null,
      faceHeight: record.FaceHeight ? parseFloat(record.FaceHeight) : null,
      emotionScores,
      auScores,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error storing face emotion data for ${participantId}:`, error);
  }
}

// Merkle DAG: import.emotions.store_language_emotion_data
// LanguageEmotionDataノードを作成
async function storeLanguageEmotionData(participantId: string, record: Record<string, string>) {
  try {
    const sessionQuery = `
      MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session)
      RETURN s.id as sessionId
      ORDER BY s.created_at ASC
      LIMIT 1
    `;
    const sessionResult = await neo4jClient.query(sessionQuery, { participantId });
    
    if (!sessionResult || sessionResult.length === 0) {
      console.warn(`No session found for participant ${participantId}`);
      return;
    }

    const sessionId = sessionResult[0].sessionId;
    const nodeId = `lang_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 感情スコアとtoxicityスコアを抽出
    const emotionScores: Record<string, number> = {};
    const toxicityScores: Record<string, number> = {};
    
    const emotionKeys = ['Admiration', 'Adoration', 'Aesthetic Appreciation', 'Amusement', 'Anger', 'Annoyance', 'Anxiety', 'Awe', 'Awkwardness', 'Boredom', 'Calmness', 'Concentration', 'Confusion', 'Contemplation', 'Contempt', 'Contentment', 'Craving', 'Determination', 'Disappointment', 'Disapproval', 'Disgust', 'Distress', 'Doubt', 'Ecstasy', 'Embarrassment', 'Empathic Pain', 'Enthusiasm', 'Entrancement', 'Envy', 'Excitement', 'Fear', 'Gratitude', 'Guilt', 'Horror', 'Interest', 'Joy', 'Love', 'Nostalgia', 'Pain', 'Pride', 'Realization', 'Relief', 'Romance', 'Sadness', 'Sarcasm', 'Satisfaction', 'Desire', 'Shame', 'Surprise (negative)', 'Surprise (positive)', 'Sympathy', 'Tiredness', 'Triumph'];
    const toxicityKeys = ['toxic', 'severe_toxic', 'obscene', 'threat', 'insult', 'identity_hate'];

    for (const key of emotionKeys) {
      if (record[key] !== undefined && record[key] !== '') {
        const value = parseFloat(record[key]);
        if (!isNaN(value)) {
          emotionScores[key] = value;
        }
      }
    }

    for (const key of toxicityKeys) {
      if (record[key] !== undefined && record[key] !== '') {
        const value = parseFloat(record[key]);
        if (!isNaN(value)) {
          toxicityScores[key] = value;
        }
      }
    }

    // 重複チェック: record_id, begin_time, end_time, textで既存データを確認
    const checkQuery = `
      MATCH (s:Session {id: $sessionId})-[:HAS_LANGUAGE_EMOTION_DATA]->(l:LanguageEmotionData)
      WHERE l.record_id = $recordId 
        AND l.begin_time = $beginTime 
        AND l.end_time = $endTime
        AND l.text = $text
      RETURN l.id as existingId
      LIMIT 1
    `;
    const existing = await neo4jClient.query(checkQuery, {
      sessionId,
      recordId: record.Id || 'unknown',
      beginTime: record.BeginTime ? parseFloat(record.BeginTime) : null,
      endTime: record.EndTime ? parseFloat(record.EndTime) : null,
      text: record.Text || ''
    });

    if (existing && existing.length > 0) {
      // 既に存在する場合はスキップ
      return;
    }

    const query = `
      MATCH (s:Session {id: $sessionId})
      CREATE (l:LanguageEmotionData {
        id: $nodeId,
        participant_id: $participantId,
        session_id: $sessionId,
        record_id: $recordId,
        text: $text,
        begin_position: $beginPosition,
        end_position: $endPosition,
        begin_time: $beginTime,
        end_time: $endTime,
        confidence: $confidence,
        speaker_confidence: $speakerConfidence,
        emotion_scores: $emotionScores,
        toxicity_scores: $toxicityScores,
        created_at: $createdAt
      })
      CREATE (s)-[:HAS_LANGUAGE_EMOTION_DATA]->(l)
      RETURN l
    `;

    await neo4jClient.query(query, {
      sessionId,
      nodeId,
      participantId,
      recordId: record.Id || 'unknown',
      text: record.Text || '',
      beginPosition: record.BeginPosition ? parseInt(record.BeginPosition) : null,
      endPosition: record.EndPosition ? parseInt(record.EndPosition) : null,
      beginTime: record.BeginTime ? parseFloat(record.BeginTime) : null,
      endTime: record.EndTime ? parseFloat(record.EndTime) : null,
      confidence: record.Confidence ? parseFloat(record.Confidence) : null,
      speakerConfidence: record.SpeakerConfidence ? parseFloat(record.SpeakerConfidence) : null,
      emotionScores,
      toxicityScores,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error storing language emotion data for ${participantId}:`, error);
  }
}

// Merkle DAG: import.emotions.store_prosody_emotion_data
// ProsodyEmotionDataノードを作成
async function storeProsodyEmotionData(participantId: string, record: Record<string, string>) {
  try {
    const sessionQuery = `
      MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session)
      RETURN s.id as sessionId
      ORDER BY s.created_at ASC
      LIMIT 1
    `;
    const sessionResult = await neo4jClient.query(sessionQuery, { participantId });
    
    if (!sessionResult || sessionResult.length === 0) {
      console.warn(`No session found for participant ${participantId}`);
      return;
    }

    const sessionId = sessionResult[0].sessionId;
    const nodeId = `prosody_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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

    // 重複チェック: record_id, begin_time, end_time, textで既存データを確認
    const checkQuery = `
      MATCH (s:Session {id: $sessionId})-[:HAS_PROSODY_EMOTION_DATA]->(p:ProsodyEmotionData)
      WHERE p.record_id = $recordId 
        AND p.begin_time = $beginTime 
        AND p.end_time = $endTime
        AND p.text = $text
      RETURN p.id as existingId
      LIMIT 1
    `;
    const existing = await neo4jClient.query(checkQuery, {
      sessionId,
      recordId: record.Id || 'unknown',
      beginTime: record.BeginTime ? parseFloat(record.BeginTime) : null,
      endTime: record.EndTime ? parseFloat(record.EndTime) : null,
      text: record.Text || ''
    });

    if (existing && existing.length > 0) {
      // 既に存在する場合はスキップ
      return;
    }

    const query = `
      MATCH (s:Session {id: $sessionId})
      CREATE (p:ProsodyEmotionData {
        id: $nodeId,
        participant_id: $participantId,
        session_id: $sessionId,
        record_id: $recordId,
        text: $text,
        begin_time: $beginTime,
        end_time: $endTime,
        confidence: $confidence,
        speaker_confidence: $speakerConfidence,
        emotion_scores: $emotionScores,
        created_at: $createdAt
      })
      CREATE (s)-[:HAS_PROSODY_EMOTION_DATA]->(p)
      RETURN p
    `;

    await neo4jClient.query(query, {
      sessionId,
      nodeId,
      participantId,
      recordId: record.Id || 'unknown',
      text: record.Text || '',
      beginTime: record.BeginTime ? parseFloat(record.BeginTime) : null,
      endTime: record.EndTime ? parseFloat(record.EndTime) : null,
      confidence: record.Confidence ? parseFloat(record.Confidence) : null,
      speakerConfidence: record.SpeakerConfidence ? parseFloat(record.SpeakerConfidence) : null,
      emotionScores,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error storing prosody emotion data for ${participantId}:`, error);
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
