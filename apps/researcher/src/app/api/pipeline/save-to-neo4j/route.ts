import { NextRequest, NextResponse } from 'next/server';
import { createNeo4jClient } from '@/lib/neo4j';
import { Neo4jBulkMerger } from '@/lib/neo4j-bulk-operations';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Merkle DAG: neo4j_save_api -> data_persistence
// Neo4j保存APIエンドポイント

// サンプリング設定（環境変数またはデフォルト値）
const SAMPLING_CONFIG = {
  emotion: {
    intervalSeconds: parseFloat(process.env.EMOTION_SAMPLING_INTERVAL_SEC || '5'), // 5秒ごとにサンプリング
    maxRecords: parseInt(process.env.EMOTION_MAX_RECORDS || '10000', 10), // 最大10,000レコード
  },
  physiological: {
    intervalSeconds: parseFloat(process.env.PHYSIOLOGICAL_SAMPLING_INTERVAL_SEC || '1'), // 1秒ごとにサンプリング
    maxRecords: parseInt(process.env.PHYSIOLOGICAL_MAX_RECORDS || '5000', 10), // 最大5,000サンプル
  }
};

// サンプリングユーティリティ関数
function sampleByTimeInterval<T extends { timestamp: number }>(
  records: T[],
  intervalSeconds: number,
  maxRecords: number
): T[] {
  if (records.length === 0) return [];
  
  // タイムスタンプでソート
  const sorted = [...records].sort((a, b) => a.timestamp - b.timestamp);
  const firstTimestamp = sorted[0].timestamp;
  const intervalMs = intervalSeconds * 1000;
  
  // 時間間隔でサンプリング
  const sampled: T[] = [];
  let lastSampledTime = firstTimestamp - intervalMs; // 最初のレコードは必ず含めるため
  
  for (const record of sorted) {
    if (record.timestamp - lastSampledTime >= intervalMs) {
      sampled.push(record);
      lastSampledTime = record.timestamp;
      
      // 最大レコード数に達したら終了
      if (sampled.length >= maxRecords) break;
    }
  }
  
  return sampled;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log(`[save-to-neo4j] ========================================`);
  console.log(`[save-to-neo4j] Import started at ${new Date().toISOString()}`);
  
  try {
    const body = await request.json();
    const { participantId } = body;

    if (!participantId) {
      console.error(`[save-to-neo4j] ERROR: participantId is required`);
      return NextResponse.json({
        error: 'participantId is required'
      }, { status: 400 });
    }

    console.log(`[save-to-neo4j] Processing participant: ${participantId}`);
    
    const client = createNeo4jClient();
    // ローカル開発環境とDocker環境の両方に対応
    const dataRootPath = process.env.DATASET_ROOT_PATH || 
      (process.cwd().includes('/apps/researcher') 
        ? join(process.cwd(), 'public', 'dataset')
        : '/app/public/dataset');
    const basePath = join(dataRootPath, 'participants', participantId);
    
    console.log(`[save-to-neo4j] Data root path: ${dataRootPath}`);
    console.log(`[save-to-neo4j] Base path: ${basePath}`);

    // セッションデータの読み込みと保存
    console.log(`[save-to-neo4j] --- Starting session data import ---`);
    const sessionStartTime = Date.now();
    const sessionData = await loadAndSaveSessionData(client, basePath, participantId);
    const sessionDuration = Date.now() - sessionStartTime;
    console.log(`[save-to-neo4j] Session data import completed: ${sessionData.length} events in ${sessionDuration}ms`);
    
    // 感情データの読み込みと保存
    console.log(`[save-to-neo4j] --- Starting emotion data import ---`);
    const emotionStartTime = Date.now();
    const emotionData = await loadAndSaveEmotionData(client, basePath, participantId);
    const emotionDuration = Date.now() - emotionStartTime;
    console.log(`[save-to-neo4j] Emotion data import completed: ${emotionData.length} records in ${emotionDuration}ms`);
    
    // 生理データの読み込みと保存
    console.log(`[save-to-neo4j] --- Starting physiological data import ---`);
    const physioStartTime = Date.now();
    const physiologicalData = await loadAndSavePhysiologicalData(client, basePath, participantId);
    const physioDuration = Date.now() - physioStartTime;
    console.log(`[save-to-neo4j] Physiological data import completed: ${physiologicalData.length} samples in ${physioDuration}ms`);

    const totalDuration = Date.now() - startTime;
    console.log(`[save-to-neo4j] ========================================`);
    console.log(`[save-to-neo4j] Import Summary:`);
    console.log(`[save-to-neo4j]   - Participant ID: ${participantId}`);
    console.log(`[save-to-neo4j]   - Session Events: ${sessionData.length}`);
    console.log(`[save-to-neo4j]   - Emotion Records: ${emotionData.length}`);
    console.log(`[save-to-neo4j]   - Physiological Samples: ${physiologicalData.length}`);
    console.log(`[save-to-neo4j]   - Total Duration: ${totalDuration}ms`);
    console.log(`[save-to-neo4j] ========================================`);

    return NextResponse.json({
      success: true,
      message: 'データをNeo4jに保存しました',
      data: {
        participantId,
        sessionEvents: sessionData.length,
        emotionRecords: emotionData.length,
        physiologicalSamples: physiologicalData.length,
      },
    });

  } catch (error) {
    console.error('Neo4j save error:', error);
    
    return NextResponse.json({
      error: 'Neo4j save failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

async function loadAndSaveSessionData(client: any, basePath: string, participantId: string) {
  const sessionPath = join(basePath, 'session_data.json');
  if (!existsSync(sessionPath)) {
    return [];
  }

  const sessionContent = readFileSync(sessionPath, 'utf-8');
  const session = JSON.parse(sessionContent);
  
  // セッション開始時刻を最初のイベントから取得
  const firstEvent = session.events && session.events.length > 0 ? session.events[0] : null;
  const startTs = firstEvent?.timestamp || 0;
  
  console.log(`[save-to-neo4j] Session start timestamp: ${startTs} for participant ${participantId}`);
  
  // 参加者ノードの作成
  await client.query(
    'MERGE (p:Participant {id: $participantId}) SET p.name = $name, p.createdAt = datetime()',
    { participantId, name: `Participant ${participantId}` }
  );

  // 実験ノードの作成
  await client.query(
    'MERGE (e:Experiment {id: $experimentId}) SET e.name = $name, e.createdAt = datetime()',
    { experimentId: 'default-experiment', name: 'Spirit in Physics Experiment' }
  );

  // 参加者と実験の関係
  await client.query(
    'MATCH (p:Participant {id: $participantId}), (e:Experiment {id: $experimentId}) MERGE (p)-[:HAS_EXPERIMENT]->(e)',
    { participantId, experimentId: 'default-experiment' }
  );

  // セッションノードの作成（start_tsを追加）
  await client.query(
    'MATCH (e:Experiment {id: $experimentId}) MERGE (s:ExperimentSession {id: $sessionId}) SET s.session_data = $sessionData, s.start_ts = $startTs, s.createdAt = datetime() MERGE (e)-[:HAS_SESSION]->(s)',
    { 
      experimentId: 'default-experiment',
      sessionId: `${participantId}-session-1`,
      sessionData: JSON.stringify(session),
      startTs
    }
  );

  // word_displayed イベントを抽出
  const wordDisplayedEvents = session.events?.filter((event: { type?: string; event_type?: string }) => 
    event.type === 'word_displayed' || event.event_type === 'word_displayed'
  ) || [];

  // レスポンスノードの作成
  for (const event of wordDisplayedEvents) {
    await client.query(
      'MATCH (s:ExperimentSession {id: $sessionId}) MERGE (r:Response {id: $responseId}) SET r.word = $word, r.timestamp = $timestamp, r.createdAt = datetime() MERGE (s)-[:HAS_RESPONSE]->(r)',
      {
        sessionId: `${participantId}-session-1`,
        responseId: `${participantId}-response-${event.timestamp}`,
        word: event.payload?.word || event.word || 'unknown',
        timestamp: event.timestamp
      }
    );
  }

  return wordDisplayedEvents;
}

async function loadAndSaveEmotionData(client: any, basePath: string, participantId: string) {
  const fs = require('fs');
  const files = fs.readdirSync(basePath);
  
  // Hume AIデータの確認
  const humeArtifactsPattern = /HumeAI_artifacts_[a-f0-9-]+/;
  const humeArtifactsDir = files.find((file: string) => humeArtifactsPattern.test(file));
  
  if (!humeArtifactsDir) {
    console.log(`[save-to-neo4j] No Hume artifacts directory found for participant ${participantId}`);
    return [];
  }

  // セッション開始時刻を取得（session_data.jsonから）
  const sessionPath = join(basePath, 'session_data.json');
  let sessionStartTs = 0;
  if (existsSync(sessionPath)) {
    try {
      const sessionContent = readFileSync(sessionPath, 'utf-8');
      const session = JSON.parse(sessionContent);
      const firstEvent = session.events && session.events.length > 0 ? session.events[0] : null;
      sessionStartTs = firstEvent?.timestamp || 0;
      console.log(`[save-to-neo4j] Session start timestamp: ${sessionStartTs} for participant ${participantId}`);
    } catch (error) {
      console.warn(`[save-to-neo4j] Failed to read session_data.json for start timestamp:`, error);
    }
  }

  const humeDataPath = join(basePath, humeArtifactsDir);
  const humeFiles = fs.readdirSync(humeDataPath, { recursive: true });
  const csvFiles = humeFiles.filter((file: string) => file.endsWith('.csv'));
  
  console.log(`[save-to-neo4j] Found ${csvFiles.length} CSV files in Hume artifacts directory`);
  
  const emotionRecords: any[] = [];
  
  csvFiles.forEach((file: string) => {
    const filePath = join(humeDataPath, file);
    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) return;

      const header = lines[0].split(',');
      const records = lines.slice(1).map(line => {
        const values = line.split(',');
        const record: Record<string, string> = {};
        header.forEach((col, index) => {
          record[col.trim()] = values[index]?.trim() || '';
        });
        return record;
      });

      // 感情スコアを抽出
      records.forEach((record: Record<string, string>) => {
        const beginTimeSec = parseFloat(record.BeginTime || '0');
        // BeginTimeは動画ファイル開始からの相対時間（秒）なので、
        // セッション開始時刻に加算してミリ秒に変換
        // ただし、BeginTimeが0の場合はセッション開始時刻をそのまま使用
        const timestampMs = sessionStartTs > 0 
          ? sessionStartTs + Math.round(beginTimeSec * 1000)
          : Math.round(beginTimeSec * 1000);
        
        Object.entries(record).forEach(([key, value]) => {
          // 感情名（大文字で始まる感情名）とスコアのみを抽出
          if (key !== 'Id' && key !== 'BeginTime' && key !== 'EndTime' && 
              key.length > 0 && key[0] === key[0].toUpperCase() && 
              !isNaN(parseFloat(value)) && parseFloat(value) > 0) {
            // 明示的にNumber型に変換（BigIntを防ぐ）
            const scoreNum = typeof value === 'bigint' ? Number(value) : parseFloat(String(value));
            const timestampNum = typeof timestampMs === 'bigint' ? Number(timestampMs) : Number(timestampMs);
            
            emotionRecords.push({
              name: key.trim(),
              score: scoreNum,
              timestamp: timestampNum, // ミリ秒単位（セッション開始時刻を基準）
              source: file.includes('burst') ? 'burst' : 
                     file.includes('face') ? 'face' : 
                     file.includes('language') ? 'language' : 
                     file.includes('prosody') ? 'prosody' : 'unknown',
            });
          }
        });
      });
    } catch (error) {
      console.warn(`[save-to-neo4j] Failed to read Hume CSV: ${filePath}`, error);
    }
  });

  const originalCount = emotionRecords.length;
  console.log(`[save-to-neo4j] Extracted ${originalCount} emotion records for participant ${participantId}`);

  if (emotionRecords.length === 0) {
    console.warn(`[save-to-neo4j] [Emotion] No emotion records to save`);
    return [];
  }

  // サンプリング: 時間間隔と最大レコード数で削減
  const sampledEmotionRecords = sampleByTimeInterval(
    emotionRecords,
    SAMPLING_CONFIG.emotion.intervalSeconds,
    SAMPLING_CONFIG.emotion.maxRecords
  );
  
  const sampledCount = sampledEmotionRecords.length;
  const reductionPercent = originalCount > 0 
    ? ((1 - sampledCount / originalCount) * 100).toFixed(1)
    : '0.0';
  
  console.log(`[save-to-neo4j] [Emotion] Original: ${originalCount} records, Sampled: ${sampledCount} records (${reductionPercent}% reduction)`);

  // サンプリング後のデータを使用
  const recordsToSave = sampledEmotionRecords;

  // 感情データをNeo4jにバルク保存
  console.log(`[save-to-neo4j] [Emotion] Starting bulk save operations...`);
  const saveStartTime = Date.now();
  const sessionId = `${participantId}-session-1`;
  
  // バッチサイズ1000でバルク処理
  const batchSize = 1000;
  let totalSaved = 0;
  
  for (let i = 0; i < recordsToSave.length; i += batchSize) {
    const batch = recordsToSave.slice(i, i + batchSize);
    const batchStartTime = Date.now();
    
    try {
      // UNWINDを使用したバッチMERGE処理
      // BigIntを確実にNumber型に変換
      const batchData = batch.map(emotion => {
        const scoreNum = typeof emotion.score === 'bigint' 
          ? Number(emotion.score) 
          : (typeof emotion.score === 'number' ? emotion.score : parseFloat(String(emotion.score)));
        const timestampNum = typeof emotion.timestamp === 'bigint'
          ? Number(emotion.timestamp)
          : (typeof emotion.timestamp === 'number' ? emotion.timestamp : parseInt(String(emotion.timestamp), 10));
          
        return {
          id: `${participantId}-emotion-${timestampNum}-${emotion.name}`,
          name: String(emotion.name),
          score: scoreNum,
          timestamp: timestampNum,
          source: String(emotion.source),
          sessionId: String(sessionId)
        };
      });
      
      // JSONシリアライズ/デシリアライズでBigIntを除去
      const serializedData = JSON.parse(JSON.stringify(batchData, (key, value) => {
        if (typeof value === 'bigint') {
          return Number(value);
        }
        return value;
      }));
      
      const query = `
        UNWIND $data as item
        MATCH (s:ExperimentSession {id: item.sessionId})
        MERGE (e:EmotionData {id: item.id})
        SET e.name = item.name, 
            e.score = toFloat(item.score), 
            e.timestamp = toInteger(item.timestamp), 
            e.source = item.source, 
            e.createdAt = datetime()
        MERGE (s)-[:HAS_EMOTION_DATA]->(e)
        RETURN count(e) as merged_count
      `;
      
      const result = await client.query(query, { data: serializedData });
      const mergedCount = result[0]?.merged_count || batch.length;
      totalSaved += mergedCount;
      
      const batchDuration = Date.now() - batchStartTime;
      const progress = ((i + batch.length) / recordsToSave.length * 100).toFixed(1);
      console.log(`[save-to-neo4j] [Emotion] Batch ${Math.floor(i / batchSize) + 1}: ${mergedCount} records saved in ${batchDuration}ms (${progress}%)`);
      
    } catch (error) {
      console.error(`[save-to-neo4j] [Emotion] ERROR saving batch ${Math.floor(i / batchSize) + 1}:`, error);
      // エラー時は個別に処理を試みる（フォールバック）
      for (const emotion of batch) {
        try {
          await client.query(
            'MATCH (s:ExperimentSession {id: $sessionId}) MERGE (e:EmotionData {id: $emotionId}) SET e.name = $name, e.score = $score, e.timestamp = $timestamp, e.source = $source, e.createdAt = datetime() MERGE (s)-[:HAS_EMOTION_DATA]->(e)',
            {
              sessionId: sessionId,
              emotionId: `${participantId}-emotion-${emotion.timestamp}-${emotion.name}`,
              name: emotion.name,
              score: emotion.score,
              timestamp: emotion.timestamp,
              source: emotion.source
            }
          );
          totalSaved++;
        } catch (individualError) {
          console.error(`[save-to-neo4j] [Emotion] ERROR saving individual record:`, individualError);
        }
      }
    }
  }
  
  const saveDuration = Date.now() - saveStartTime;
  console.log(`[save-to-neo4j] [Emotion] Completed saving ${totalSaved}/${recordsToSave.length} records to Neo4j in ${saveDuration}ms`);

  return recordsToSave;
}

async function loadAndSavePhysiologicalData(client: any, basePath: string, participantId: string) {
  console.log(`[save-to-neo4j] [Physiological] Starting import for ${participantId}`);
  console.log(`[save-to-neo4j] [Physiological] Base path: ${basePath}`);
  
  const fs = require('fs');
  const files = fs.readdirSync(basePath);
  console.log(`[save-to-neo4j] [Physiological] Found ${files.length} files in directory`);
  console.log(`[save-to-neo4j] [Physiological] Files: ${files.join(', ')}`);
  
  // CSVファイルを検索
  const csvFile = files.find((file: string) => file.endsWith('.CSV'));
  if (!csvFile) {
    console.warn(`[save-to-neo4j] [Physiological] No CSV file found for participant ${participantId}`);
    console.warn(`[save-to-neo4j] [Physiological] Available files: ${files.join(', ')}`);
    return [];
  }
  
  console.log(`[save-to-neo4j] [Physiological] Found CSV file: ${csvFile}`);

  const csvPath = join(basePath, csvFile);
  console.log(`[save-to-neo4j] [Physiological] Reading CSV file: ${csvPath}`);
  const content = readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  console.log(`[save-to-neo4j] [Physiological] CSV file has ${lines.length} lines`);
  
  if (lines.length < 2) {
    console.warn(`[save-to-neo4j] [Physiological] CSV file has less than 2 lines, skipping`);
    return [];
  }

  // "Measurement Record"行を探して、その後の行からデータを読み取る
  let dataStartIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes('measurement record')) {
      dataStartIndex = i + 1;
      console.log(`[save-to-neo4j] [Physiological] Found "Measurement Record" at line ${i}, data starts at ${dataStartIndex}`);
      break;
    }
  }
  
  if (dataStartIndex === -1 || dataStartIndex >= lines.length) {
    console.error(`[save-to-neo4j] [Physiological] ERROR: Could not find "Measurement Record" line in CSV for participant ${participantId}`);
    console.error(`[save-to-neo4j] [Physiological] First 10 lines: ${lines.slice(0, 10).join(' | ')}`);
    return [];
  }

  const headerLine = lines[dataStartIndex];
  const header = headerLine.split(',').map(col => col.trim());
  console.log(`[save-to-neo4j] [Physiological] CSV header: ${header.join(', ')}`);
  
  if (!header.includes('Time_Sec')) {
    console.error(`[save-to-neo4j] [Physiological] ERROR: CSV header does not contain Time_Sec for participant ${participantId}`);
    console.error(`[save-to-neo4j] [Physiological] Header columns: ${header.join(', ')}`);
    return [];
  }

  const dataLines = lines.slice(dataStartIndex + 1);
  console.log(`[save-to-neo4j] [Physiological] Found ${dataLines.length} data lines`);
  
  const samples = dataLines.map(line => {
    const values = line.split(',');
    const sample: Record<string, string> = {};
    header.forEach((col, index) => {
      sample[col] = values[index]?.trim() || '';
    });
    return sample;
  }).filter(sample => sample.Time_Sec !== undefined && sample.Time_Sec !== '');

  console.log(`[save-to-neo4j] [Physiological] Parsed ${samples.length} valid samples`);

  // チャンネル列を抽出（Ch1, Ch2, etc）
  const channels = header.filter(col => 
    /^Ch\d+$/i.test(col) || col.toLowerCase().includes('channel')
  );
  console.log(`[save-to-neo4j] [Physiological] Found ${channels.length} channels: ${channels.join(', ')}`);

  // セッション開始時刻を取得（session_data.jsonから）
  const sessionPath = join(basePath, 'session_data.json');
  let sessionStartTs = 0;
  if (existsSync(sessionPath)) {
    try {
      const sessionContent = readFileSync(sessionPath, 'utf-8');
      const session = JSON.parse(sessionContent);
      const firstEvent = session.events && session.events.length > 0 ? session.events[0] : null;
      sessionStartTs = firstEvent?.timestamp || 0;
    } catch (error) {
      console.warn(`[save-to-neo4j] Failed to read session_data.json for start timestamp:`, error);
    }
  }

  const physiologicalSamples = samples.map((sample: Record<string, string>) => {
    const timeSec = parseFloat(sample.Time_Sec || '0');
    // Time_Secはセッション開始からの相対時間（秒）なので、sessionStartTsに加算してミリ秒に変換
    const timestampMs = sessionStartTs > 0 ? sessionStartTs + Math.round(timeSec * 1000) : Math.round(timeSec * 1000);
    
    return {
      timestamp: timestampMs,
      channels: channels.reduce((acc: Record<string, number>, channel: string) => {
        const value = parseFloat(sample[channel] || '0');
        if (!isNaN(value)) {
          acc[channel] = value;
        }
        return acc;
      }, {}),
    };
  }).filter(sample => Object.keys(sample.channels).length > 0);

  const originalSampleCount = physiologicalSamples.length;
  console.log(`[save-to-neo4j] [Physiological] Extracted ${originalSampleCount} physiological samples for participant ${participantId}`);
  
  if (physiologicalSamples.length === 0) {
    console.warn(`[save-to-neo4j] [Physiological] WARNING: No physiological samples to save`);
    return [];
  }

  // サンプリング: 時間間隔と最大サンプル数で削減
  const sampledPhysiologicalSamples = sampleByTimeInterval(
    physiologicalSamples,
    SAMPLING_CONFIG.physiological.intervalSeconds,
    SAMPLING_CONFIG.physiological.maxRecords
  );
  
  const sampledSampleCount = sampledPhysiologicalSamples.length;
  const reductionPercent = originalSampleCount > 0
    ? ((1 - sampledSampleCount / originalSampleCount) * 100).toFixed(1)
    : '0.0';
  
  console.log(`[save-to-neo4j] [Physiological] Original: ${originalSampleCount} samples, Sampled: ${sampledSampleCount} samples (${reductionPercent}% reduction)`);

  // サンプリング後のデータを使用
  const samplesToSave = sampledPhysiologicalSamples;

  // 生理データをNeo4jにバルク保存
  console.log(`[save-to-neo4j] [Physiological] Starting bulk save operations...`);
  const saveStartTime = Date.now();
  const sessionId = `${participantId}-session-1`;
  
  // チャンネルごとのレコードをフラット化
  const physioRecords: Array<{
    id: string;
    channel: string;
    value: number;
    timestamp: number;
    quality: number;
    sessionId: string;
  }> = [];
  
  for (const sample of samplesToSave) {
    // timestampを確実にNumber型に変換
    const timestampNum = typeof sample.timestamp === 'bigint'
      ? Number(sample.timestamp)
      : (typeof sample.timestamp === 'number' ? sample.timestamp : parseInt(String(sample.timestamp), 10));
      
    for (const [channel, value] of Object.entries(sample.channels)) {
      // valueを確実にNumber型に変換
      const valueNum = typeof value === 'bigint'
        ? Number(value)
        : (typeof value === 'number' ? value : parseFloat(String(value)));
        
      physioRecords.push({
        id: `${participantId}-physio-${timestampNum}-${channel}`,
        channel: String(channel),
        value: valueNum,
        timestamp: timestampNum,
        quality: 1.0,
        sessionId: String(sessionId)
      });
    }
  }
  
  console.log(`[save-to-neo4j] [Physiological] Prepared ${physioRecords.length} records for bulk save`);
  
  if (physioRecords.length === 0) {
    console.warn(`[save-to-neo4j] [Physiological] No physiological records to save`);
    return physiologicalSamples;
  }
  
  // バッチサイズ1000でバルク処理
  const batchSize = 1000;
  let totalSaved = 0;
  
  for (let i = 0; i < physioRecords.length; i += batchSize) {
    const batch = physioRecords.slice(i, i + batchSize);
    const batchStartTime = Date.now();
    
    try {
      // UNWINDを使用したバッチMERGE処理
      // JSONシリアライズ/デシリアライズでBigIntを除去
      const serializedBatch = JSON.parse(JSON.stringify(batch, (key, value) => {
        if (typeof value === 'bigint') {
          return Number(value);
        }
        return value;
      }));
      
      const query = `
        UNWIND $data as item
        MATCH (s:ExperimentSession {id: item.sessionId})
        MERGE (p:PhysiologicalData {id: item.id})
        SET p.channel = item.channel, 
            p.value = toFloat(item.value), 
            p.timestamp = toInteger(item.timestamp), 
            p.quality = toFloat(item.quality), 
            p.createdAt = datetime()
        MERGE (s)-[:HAS_PHYSIOLOGICAL_DATA]->(p)
        RETURN count(p) as merged_count
      `;
      
      const result = await client.query(query, { data: serializedBatch });
      const mergedCount = result[0]?.merged_count || batch.length;
      totalSaved += mergedCount;
      
      const batchDuration = Date.now() - batchStartTime;
      const progress = ((i + batch.length) / physioRecords.length * 100).toFixed(1);
      console.log(`[save-to-neo4j] [Physiological] Batch ${Math.floor(i / batchSize) + 1}: ${mergedCount} records saved in ${batchDuration}ms (${progress}%)`);
      
    } catch (error) {
      console.error(`[save-to-neo4j] [Physiological] ERROR saving batch ${Math.floor(i / batchSize) + 1}:`, error);
      // エラー時は個別に処理を試みる（フォールバック）
      for (const record of batch) {
        try {
          await client.query(
            'MATCH (s:ExperimentSession {id: $sessionId}) MERGE (p:PhysiologicalData {id: $physioId}) SET p.channel = $channel, p.value = $value, p.timestamp = $timestamp, p.quality = $quality, p.createdAt = datetime() MERGE (s)-[:HAS_PHYSIOLOGICAL_DATA]->(p)',
            {
              sessionId: record.sessionId,
              physioId: record.id,
              channel: record.channel,
              value: record.value,
              timestamp: record.timestamp,
              quality: record.quality
            }
          );
          totalSaved++;
        } catch (individualError) {
          console.error(`[save-to-neo4j] [Physiological] ERROR saving individual record:`, individualError);
        }
      }
    }
  }
  
  const saveDuration = Date.now() - saveStartTime;
  console.log(`[save-to-neo4j] [Physiological] Completed saving ${totalSaved}/${physioRecords.length} records to Neo4j in ${saveDuration}ms`);

  return samplesToSave;
}
