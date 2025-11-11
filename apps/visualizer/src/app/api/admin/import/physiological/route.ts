// Merkle DAG: import.physiological.endpoint
// 生理データインポートAPIエンドポイント

import { NextRequest, NextResponse } from 'next/server';
import { createNeo4jClient } from '@/lib/neo4j';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

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
    const dataRootPath = process.env.DATASET_PATH || join(process.cwd(), 'public', 'dataset');
    const basePath = join(dataRootPath, 'participants', participantId);

    if (!existsSync(basePath)) {
      return NextResponse.json({
        error: `Participant directory not found: ${basePath}`
      }, { status: 404 });
    }

    // CSVファイルを検索
    const files = readdirSync(basePath);
    const csvFile = files.find((file: string) => file.endsWith('.CSV') || file.endsWith('.csv'));
    
    if (!csvFile) {
      return NextResponse.json({
        error: 'CSV file not found',
        message: `No CSV file found in ${basePath}`
      }, { status: 404 });
    }

    const csvPath = join(basePath, csvFile);
    const result = await importPhysiologicalData(client, csvPath, participantId);

    return NextResponse.json({
      success: true,
      message: '生理データをインポートしました',
      data: result
    });

  } catch (error) {
    console.error('Physiological data import error:', error);
    return NextResponse.json({
      error: 'Import failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function importPhysiologicalData(client: any, csvPath: string, participantId: string) {
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
    throw new Error('CSV header not found');
  }

  // ヘッダーをパース
  const header = headerLine.split(',').map(col => col.trim());
  const timeColumnIndex = header.findIndex(col => col.toLowerCase().includes('time'));
  
  if (timeColumnIndex === -1) {
    throw new Error('Time column not found in CSV header');
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
    throw new Error('No channel columns found in CSV header');
  }

  console.log(`Found ${channelColumns.length} channels:`, channelColumns.map(c => c.name).join(', '));

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

  console.log(`Parsed ${samples.length} physiological data samples`);

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

  // 既存の生理データを確認（重複インポート防止）
  const checkQuery = `
    MATCH (s:Session {id: $sessionId})-[:HAS_PHYSIOLOGICAL_DATA]->(pd:PhysiologicalData)
    RETURN count(pd) as existingCount
  `;
  const checkResults = await client.query(checkQuery, { sessionId });
  const existingCount = checkResults[0]?.existingCount?.low || checkResults[0]?.existingCount || 0;

  if (existingCount > 0) {
    console.log(`Found ${existingCount} existing physiological data records. Skipping import.`);
    return {
      imported: 0,
      skipped: samples.length,
      total: samples.length,
      message: `既に${existingCount}件の生理データが存在するため、インポートをスキップしました`
    };
  }

  // 生理データをNeo4jに保存
  // バッチ処理で効率化（UNWINDを使用）
  const batchSize = 1000;
  let imported = 0;

  for (let i = 0; i < samples.length; i += batchSize) {
    const batch = samples.slice(i, i + batchSize);
    
    // UNWINDを使用したバッチ挿入
    const createQuery = `
      MATCH (s:Session {id: $sessionId})
      UNWIND $samples as sample
      CREATE (pd:PhysiologicalData {
        id: $sessionId + '_physio_' + toString(sample.timeSec),
        participant_id: $participantId,
        session_id: $sessionId,
        time_sec: sample.timeSec,
        timestamp: $sessionStartTime + (sample.timeSec * 1000),
        ch1: sample.channels.Ch1,
        ch2: sample.channels.Ch2,
        ch3: sample.channels.Ch3,
        ch4: sample.channels.Ch4,
        ch5: sample.channels.Ch5,
        ch6: sample.channels.Ch6,
        ch7: sample.channels.Ch7,
        ch8: sample.channels.Ch8,
        created_at: datetime()
      })
      CREATE (s)-[:HAS_PHYSIOLOGICAL_DATA]->(pd)
    `;

    // セッション開始時刻を取得
    const sessionStartQuery = `
      MATCH (s:Session {id: $sessionId})
      RETURN s.start_ts as startTs
    `;
    const startResults = await client.query(sessionStartQuery, { sessionId });
    const sessionStartTime = startResults[0]?.startTs?.low || startResults[0]?.startTs || Date.now();

    // チャンネルデータを配列に変換
    const samplesForQuery = batch.map(sample => ({
      timeSec: sample.timeSec,
      channels: {
        Ch1: sample.channels.Ch1 || 0,
        Ch2: sample.channels.Ch2 || 0,
        Ch3: sample.channels.Ch3 || 0,
        Ch4: sample.channels.Ch4 || 0,
        Ch5: sample.channels.Ch5 || 0,
        Ch6: sample.channels.Ch6 || 0,
        Ch7: sample.channels.Ch7 || 0,
        Ch8: sample.channels.Ch8 || 0
      }
    }));

    await client.query(createQuery, {
      sessionId,
      participantId,
      samples: samplesForQuery,
      sessionStartTime
    });

    imported += batch.length;
    console.log(`Imported ${imported}/${samples.length} physiological data samples`);
  }

  return {
    imported,
    skipped: 0,
    total: samples.length,
    sessionId,
    message: `${imported}件の生理データをインポートしました`
  };
}

