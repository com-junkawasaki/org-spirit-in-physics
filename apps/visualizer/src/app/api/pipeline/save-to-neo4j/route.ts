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
    const dataRootPath = '/app/public/dataset';
    const basePath = `${dataRootPath}/participants/${participantId}`;

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

  // セッションノードの作成
  await client.query(
    'MATCH (e:Experiment {id: $experimentId}) MERGE (s:ExperimentSession {id: $sessionId}) SET s.session_data = $sessionData, s.createdAt = datetime() MERGE (e)-[:HAS_SESSION]->(s)',
    { 
      experimentId: 'default-experiment',
      sessionId: `${participantId}-session-1`,
      sessionData: JSON.stringify(session)
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
    return [];
  }

  const humeDataPath = join(basePath, humeArtifactsDir);
  const humeFiles = fs.readdirSync(humeDataPath, { recursive: true });
  const csvFiles = humeFiles.filter((file: string) => file.endsWith('.csv'));
  
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
        Object.entries(record).forEach(([key, value]) => {
          if (key !== 'Id' && key !== 'BeginTime' && key !== 'EndTime' && !isNaN(parseFloat(value))) {
            emotionRecords.push({
              name: key,
              score: parseFloat(value),
              timestamp: parseFloat(record.BeginTime || '0'),
              source: file.includes('burst') ? 'burst' : 
                     file.includes('face') ? 'face' : 
                     file.includes('language') ? 'language' : 
                     file.includes('prosody') ? 'prosody' : 'unknown',
            });
          }
        });
      });
    } catch (error) {
      console.warn(`Failed to read Hume CSV: ${filePath}`, error);
    }
  });

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
  const csvFile = files.find((file: string) => file.endsWith('.CSV') || file.endsWith('.csv'));
  if (!csvFile) {
    return [];
  }

  const csvPath = join(basePath, csvFile);
  const content = readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  // CSVファイルの構造を確認
  // ヘッダー行を探す（"Time_Sec"または"Time"を含む行）
  let headerIndex = -1;
  let headerLine = '';
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Time_Sec') || lines[i].includes('Time,') || lines[i].toLowerCase().includes('time_sec')) {
      headerIndex = i;
      headerLine = lines[i];
      break;
    }
  }

  if (headerIndex === -1) {
    console.warn('CSV header not found, skipping physiological data import');
    return [];
  }

  // ヘッダーをパース
  const header = headerLine.split(',').map(col => col.trim());
  const timeColumnIndex = header.findIndex(col => col.toLowerCase().includes('time'));
  
  if (timeColumnIndex === -1) {
    console.warn('Time column not found in CSV header, skipping physiological data import');
    return [];
  }

  // チャンネル列を特定（Ch1, Ch2, Ch3, Ch4, Ch5, Ch6, Ch7, Ch8）
  const channelColumns = header
    .map((col, index) => ({ name: col, index }))
    .filter(({ name }) => /^Ch\d+$/i.test(name))
    .sort((a, b) => {
      const aNum = parseInt(a.name.match(/\d+/)?.[0] || '0');
      const bNum = parseInt(b.name.match(/\d+/)?.[0] || '0');
      return aNum - bNum;
    });

  if (channelColumns.length === 0) {
    console.warn('No channel columns found in CSV header, skipping physiological data import');
    return [];
  }

  // データ行をパース（ヘッダー行の後から開始）
  const dataLines = lines.slice(headerIndex + 1);
  const samples: Array<{ timeSec: number; channels: Record<string, number> }> = [];

  for (const line of dataLines) {
    if (!line.trim()) continue;
    
    const values = line.split(',').map(v => v.trim());
    if (values.length < header.length) continue;

    const timeSecStr = values[timeColumnIndex];
    const timeSec = parseFloat(timeSecStr);
    
    if (isNaN(timeSec)) continue;

    const channels: Record<string, number> = {};
    for (const { name, index } of channelColumns) {
      const value = parseFloat(values[index] || '0');
      if (!isNaN(value)) {
        channels[name] = value;
      }
    }

    if (Object.keys(channels).length > 0) {
      samples.push({ timeSec, channels });
    }
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
    console.warn(`No session found for participant: ${participantId}, skipping physiological data import`);
    return [];
  }

  const sessionId = sessionResults[0].sessionId;

  // セッション開始時刻を取得
  const sessionStartQuery = `
    MATCH (s:Session {id: $sessionId})
    RETURN s.start_ts as startTs
  `;
  const startResults = await client.query(sessionStartQuery, { sessionId });
  const sessionStartTime = startResults[0]?.startTs?.low || startResults[0]?.startTs || Date.now();

  // 生理データをNeo4jに保存（バッチ処理）
  const batchSize = 1000;
  let imported = 0;

  for (let i = 0; i < samples.length; i += batchSize) {
    const batch = samples.slice(i, i + batchSize);
    
    // 各サンプルを個別に保存（UNWINDが使えない場合の代替）
    for (const sample of batch) {
      const physioId = `${sessionId}_physio_${sample.timeSec}`;
      const timestamp = sessionStartTime + (sample.timeSec * 1000);

      await client.query(
        `MATCH (s:Session {id: $sessionId})
         MERGE (pd:PhysiologicalData {id: $physioId})
         SET pd.participant_id = $participantId,
             pd.session_id = $sessionId,
             pd.time_sec = $timeSec,
             pd.timestamp = $timestamp,
             pd.ch1 = $ch1,
             pd.ch2 = $ch2,
             pd.ch3 = $ch3,
             pd.ch4 = $ch4,
             pd.ch5 = $ch5,
             pd.ch6 = $ch6,
             pd.ch7 = $ch7,
             pd.ch8 = $ch8,
             pd.created_at = datetime()
         MERGE (s)-[:HAS_PHYSIOLOGICAL_DATA]->(pd)`,
        {
          sessionId,
          participantId,
          physioId,
          timeSec: sample.timeSec,
          timestamp,
          ch1: sample.channels.Ch1 || 0,
          ch2: sample.channels.Ch2 || 0,
          ch3: sample.channels.Ch3 || 0,
          ch4: sample.channels.Ch4 || 0,
          ch5: sample.channels.Ch5 || 0,
          ch6: sample.channels.Ch6 || 0,
          ch7: sample.channels.Ch7 || 0,
          ch8: sample.channels.Ch8 || 0
        }
      );
      imported++;
    }

    console.log(`Imported ${imported}/${samples.length} physiological data samples`);
  }

  return samples;
}
