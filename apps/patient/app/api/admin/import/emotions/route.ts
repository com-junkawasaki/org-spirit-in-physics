// LLM-BOUNDARY: 80_app - app/(segments)/...（RSC & Client）
// Merkle DAG: import.emotions.endpoint
// 感情分析データインポートAPIエンドポイント
// 依存関係: @participants/ (dataset), neo4j, hume-ai-integration

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from 'fs';
import path from 'path';
import { initializeSupabaseDatabase } from "scripts/src/lib/data-loader";
import { supabaseManager } from "scripts/src/lib/database/supabase-manager";
import { getSupabaseClient } from "scripts/src/lib/database/supabase-client";

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
    // Supabaseデータベース初期化
    await initializeSupabaseDatabase();

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
async function checkParticipantExists(participantId: string): Promise<boolean> {
  const participant = await supabaseManager.getParticipant(participantId);
  return participant !== null;
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
  // participant_hume_analysis_jobsから既存データを確認
  const sessions = await supabaseManager.getSessionsByParticipantId(participantId);
  if (sessions.length === 0) {
    return false;
  }
  
  const client = getSupabaseClient();
  const { data: jobs } = await client
    .from('participant_hume_analysis_jobs')
    .select('id')
    .in('participant_experiment_session_id', sessions.map((s: any) => s.id))
    .limit(1);
  
  return (jobs?.length || 0) > 0;
}

// Merkle DAG: import.emotions.process_data
// 感情データ処理関数
async function processEmotionData(participantId: string, predictionsData: any) {
  let entriesProcessed = 0;
  let totalEmotions = 0;

  // セッションを取得
  const sessions = await supabaseManager.getSessionsByParticipantId(participantId);
  if (sessions.length === 0) {
    throw new Error(`No sessions found for participant ${participantId}`);
  }
  
  const sessionId = sessions[0].id;
  const client = getSupabaseClient();

  // 感情分析ジョブを作成
  const { data: job, error: jobError } = await client
    .from('participant_hume_analysis_jobs')
    .insert({
      participant_experiment_session_id: sessionId,
      status: 'completed',
      source_media_path: 'imported',
    })
    .select()
    .single();

  if (jobError || !job) {
    throw new Error(`Failed to create analysis job: ${jobError?.message || 'Unknown error'}`);
  }

  const jobId = job.id;

  // Hume AIの感情データを処理
  if (predictionsData && Array.isArray(predictionsData)) {
    const predictionsToInsert: any[] = [];
    
    for (const entry of predictionsData) {
      if (entry.emotions && Array.isArray(entry.emotions)) {
        entriesProcessed++;
        totalEmotions += entry.emotions.length;

        // 感情データをparticipant_hume_language_predictionsに保存
        predictionsToInsert.push({
          job_id: jobId,
          begin_time: entry.time?.begin || 0,
          end_time: entry.time?.end || 0,
          emotions: entry.emotions.reduce((acc: Record<string, number>, emotion: any) => {
            acc[emotion.name] = emotion.score;
            return acc;
          }, {}),
        });
      }
    }

    // バッチで挿入
    if (predictionsToInsert.length > 0) {
      const { error: insertError } = await client
        .from('participant_hume_language_predictions')
        .insert(predictionsToInsert);

      if (insertError) {
        console.error('Error inserting language predictions:', insertError);
      }
    }
  }

  return { entriesProcessed, totalEmotions };
}

// Merkle DAG: import.emotions.store_entry
// 感情エントリ格納関数
async function storeEmotionEntry(emotionRecord: any) {
  // 感情データはparticipant_hume_*_predictionsテーブルに保存される
  // この関数はJSONファイルからの直接インポート用のため、簡易実装
  console.log('Storing emotion entry:', emotionRecord);
  // 実際の実装はprocessEmotionData関数内で行う
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
  // CSVデータを解析してSupabaseに格納
  const lines = content.split('\n');
  if (lines.length < 2) {
    return;
  }

  const header = lines[0].split(',');
  const fileType = fileName.replace('.csv', '');
  
  // セッションとジョブを取得
  const sessions = await supabaseManager.getSessionsByParticipantId(participantId);
  if (sessions.length === 0) {
    throw new Error(`No sessions found for participant ${participantId}`);
  }
  
  const sessionId = sessions[0].id;
  const client = getSupabaseClient();

  // ジョブを取得または作成
  const { data: existingJob } = await client
    .from('participant_hume_analysis_jobs')
    .select('id')
    .eq('participant_experiment_session_id', sessionId)
    .limit(1)
    .single();

  let jobId = existingJob?.id;
  
  if (!jobId) {
    const { data: newJob, error: jobError } = await client
      .from('participant_hume_analysis_jobs')
      .insert({
        participant_experiment_session_id: sessionId,
        status: 'completed',
        source_media_path: 'imported',
      })
      .select()
      .single();
    
    if (jobError || !newJob) {
      throw new Error(`Failed to create analysis job: ${jobError?.message || 'Unknown error'}`);
    }
    jobId = newJob.id;
  }

  // CSVデータをパースして挿入
  const predictionsToInsert: any[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',');
    const record: Record<string, string> = {};
    header.forEach((col, index) => {
      record[col.trim()] = values[index]?.trim() || '';
    });

    const beginTime = parseFloat(record.BeginTime || '0');
    const endTime = parseFloat(record.EndTime || '0');
    const emotions: Record<string, number> = {};

    // 感情スコアを抽出
    Object.entries(record).forEach(([key, value]) => {
      if (key !== 'Id' && key !== 'BeginTime' && key !== 'EndTime' && !isNaN(parseFloat(value))) {
        emotions[key] = parseFloat(value);
      }
    });

    if (Object.keys(emotions).length > 0) {
      // テーブル名を決定
      let tableName = 'participant_hume_language_predictions';
      if (fileType === 'burst') {
        tableName = 'participant_hume_burst_predictions';
      } else if (fileType === 'prosody') {
        tableName = 'participant_hume_prosody_predictions';
      }

      predictionsToInsert.push({
        job_id: jobId,
        begin_time: beginTime,
        end_time: endTime,
        emotions,
      });
    }
  }

  // バッチで挿入
  if (predictionsToInsert.length > 0) {
    let tableName = 'participant_hume_language_predictions';
    if (fileType === 'burst') {
      tableName = 'participant_hume_burst_predictions';
    } else if (fileType === 'prosody') {
      tableName = 'participant_hume_prosody_predictions';
    }

    const { error: insertError } = await client
      .from(tableName)
      .insert(predictionsToInsert);

    if (insertError) {
      console.error(`Error inserting ${fileType} predictions:`, insertError);
    }
  }
}

// Merkle DAG: import.emotions.store_csv
// CSVレコード格納関数
async function storeCSVRecord(csvRecord: any) {
  // CSVデータはprocessEmotionCSVData関数内で処理される
  console.log('Storing CSV record:', csvRecord);
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
