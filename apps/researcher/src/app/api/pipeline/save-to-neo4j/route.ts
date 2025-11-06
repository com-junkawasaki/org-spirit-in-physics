import { NextRequest, NextResponse } from 'next/server';
import { createNeo4jClient } from '@/lib/neo4j';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Merkle DAG: neo4j_save_api -> data_persistence
// Neo4j保存APIエンドポイント

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { participantId } = body;

    if (!participantId) {
      return NextResponse.json({
        error: 'participantId is required'
      }, { status: 400 });
    }

    const client = createNeo4jClient();
    // ローカル開発環境とDocker環境の両方に対応
    const dataRootPath = process.env.DATASET_ROOT_PATH || 
      (process.cwd().includes('/apps/researcher') 
        ? join(process.cwd(), 'public', 'dataset')
        : '/app/public/dataset');
    const basePath = join(dataRootPath, 'participants', participantId);

    // セッションデータの読み込みと保存
    const sessionData = await loadAndSaveSessionData(client, basePath, participantId);
    
    // 感情データの読み込みと保存
    const emotionData = await loadAndSaveEmotionData(client, basePath, participantId);
    
    // 生理データの読み込みと保存
    const physiologicalData = await loadAndSavePhysiologicalData(client, basePath, participantId);

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
            emotionRecords.push({
              name: key.trim(),
              score: parseFloat(value),
              timestamp: timestampMs, // ミリ秒単位（セッション開始時刻を基準）
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

  console.log(`[save-to-neo4j] Extracted ${emotionRecords.length} emotion records for participant ${participantId}`);

  // 感情データをNeo4jに保存
  for (const emotion of emotionRecords) {
    await client.query(
      'MATCH (s:ExperimentSession {id: $sessionId}) MERGE (e:EmotionData {id: $emotionId}) SET e.name = $name, e.score = $score, e.timestamp = $timestamp, e.source = $source, e.createdAt = datetime() MERGE (s)-[:HAS_EMOTION_DATA]->(e)',
      {
        sessionId: `${participantId}-session-1`,
        emotionId: `${participantId}-emotion-${emotion.timestamp}-${emotion.name}`,
        name: emotion.name,
        score: emotion.score,
        timestamp: emotion.timestamp,
        source: emotion.source
      }
    );
  }

  return emotionRecords;
}

async function loadAndSavePhysiologicalData(client: any, basePath: string, participantId: string) {
  const fs = require('fs');
  const files = fs.readdirSync(basePath);
  
  // CSVファイルを検索
  const csvFile = files.find((file: string) => file.endsWith('.CSV'));
  if (!csvFile) {
    console.log(`[save-to-neo4j] No CSV file found for participant ${participantId}`);
    return [];
  }

  const csvPath = join(basePath, csvFile);
  const content = readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    return [];
  }

  // "Measurement Record"行を探して、その後の行からデータを読み取る
  let dataStartIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes('measurement record')) {
      dataStartIndex = i + 1;
      break;
    }
  }
  
  if (dataStartIndex === -1 || dataStartIndex >= lines.length) {
    console.warn(`[save-to-neo4j] Could not find "Measurement Record" line in CSV for participant ${participantId}`);
    return [];
  }

  const headerLine = lines[dataStartIndex];
  const header = headerLine.split(',').map(col => col.trim());
  
  if (!header.includes('Time_Sec')) {
    console.warn(`[save-to-neo4j] CSV header does not contain Time_Sec for participant ${participantId}`);
    return [];
  }

  const dataLines = lines.slice(dataStartIndex + 1);
  const samples = dataLines.map(line => {
    const values = line.split(',');
    const sample: Record<string, string> = {};
    header.forEach((col, index) => {
      sample[col] = values[index]?.trim() || '';
    });
    return sample;
  }).filter(sample => sample.Time_Sec !== undefined && sample.Time_Sec !== '');

  // チャンネル列を抽出（Ch1, Ch2, etc）
  const channels = header.filter(col => 
    /^Ch\d+$/i.test(col) || col.toLowerCase().includes('channel')
  );

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

  console.log(`[save-to-neo4j] Extracted ${physiologicalSamples.length} physiological samples for participant ${participantId}`);

  // 生理データをNeo4jに保存
  for (const sample of physiologicalSamples) {
    for (const [channel, value] of Object.entries(sample.channels)) {
      await client.query(
        'MATCH (s:ExperimentSession {id: $sessionId}) MERGE (p:PhysiologicalData {id: $physioId}) SET p.channel = $channel, p.value = $value, p.timestamp = $timestamp, p.quality = $quality, p.createdAt = datetime() MERGE (s)-[:HAS_PHYSIOLOGICAL_DATA]->(p)',
        {
          sessionId: `${participantId}-session-1`,
          physioId: `${participantId}-physio-${sample.timestamp}-${channel}`,
          channel,
          value,
          timestamp: sample.timestamp,
          quality: 1.0 // デフォルト品質
        }
      );
    }
  }

  return physiologicalSamples;
}
