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
  const csvFile = files.find((file: string) => file.endsWith('.CSV'));
  if (!csvFile) {
    return [];
  }

  const csvPath = join(basePath, csvFile);
  const content = readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    return [];
  }

  const header = lines[0].split(',');
  const samples = lines.slice(1).map(line => {
    const values = line.split(',');
    const sample: Record<string, string> = {};
    header.forEach((col, index) => {
      sample[col.trim()] = values[index]?.trim() || '';
    });
    return sample;
  });

  // 生理データをチャンネル別に整理
  const channels = header.filter(col => 
    col.includes('ch') || col.includes('channel') || col.includes('Ch')
  );

  const physiologicalSamples = samples.map((sample: Record<string, string>) => ({
    timestamp: parseFloat(sample.timestamp || sample.time || '0'),
    channels: channels.reduce((acc: Record<string, number>, channel: string) => {
      acc[channel] = parseFloat(sample[channel] || '0');
      return acc;
    }, {}),
  }));

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
