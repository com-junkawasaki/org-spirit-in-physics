// LLM-BOUNDARY: 80_app - app/(segments)/...（RSC & Client）
// Merkle DAG: import.sessions.endpoint
// セッションデータインポートAPIエンドポイント
// 依存関係: @participants/ (dataset), neo4j, session-data-processor

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from 'fs';
import path from 'path';
import { initializeNeo4jDatabase } from "scripts/src/lib/data-loader";
import { neo4jManager } from "scripts/src/lib/database/neo4j-manager";
import { neo4jClient } from "scripts/src/lib/neo4j";
import { validateSessionData } from "scripts/src/lib/import-utils";

// Merkle DAG: import.sessions.process
// セッションデータインポート処理関数
async function importSessionsFromDataset() {
  const results = [];

  try {
    // Merkle DAG: import.sessions.scan
    // データセットディレクトリをスキャン
    const datasetPath = path.join(process.cwd(), 'dataset', 'participants');

    try {
      await fs.access(datasetPath);
    } catch {
      throw new Error('Participants dataset directory not found');
    }

    const entries = await fs.readdir(datasetPath, { withFileTypes: true });
    const participantDirs = entries.filter(entry => entry.isDirectory());

    // Merkle DAG: import.sessions.initialize_db
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
        // Merkle DAG: import.sessions.check_participant
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

        // Merkle DAG: import.sessions.read_session_data
        // session_data.jsonを読み取り
        const sessionDataPath = path.join(participantPath, 'session_data.json');
        const sessionData = JSON.parse(await fs.readFile(sessionDataPath, 'utf-8'));

        // Merkle DAG: import.sessions.validate_session_data
        // セッションデータの検証
        if (!validateSessionData(sessionData)) {
          throw new Error('Invalid session data structure');
        }

        // Merkle DAG: import.sessions.check_existing
        // 既存セッションデータのチェック
        const existingSession = await checkExistingSession(participantId);
        if (existingSession) {
          results.push({
            participantId,
            status: 'skipped',
            message: 'Session data already exists for this participant'
          });
          continue;
        }

        // Merkle DAG: import.sessions.create_session
        // セッションイベントを処理してNeo4jに格納
        const sessionResult = await processSessionEvents(participantId, sessionData.events);

        // Merkle DAG: import.sessions.create_word_responses
        // 単語応答データを抽出して格納
        const wordResponses = extractWordResponses(sessionData.events);
        await storeWordResponses(participantId, wordResponses, sessionResult.sessionIndex);

        // Merkle DAG: import.sessions.calculate_statistics
        // セッション統計を計算
        const statistics = calculateSessionStatistics(sessionData.events);

        results.push({
          participantId,
          status: 'success',
          message: 'Session data imported successfully',
          statistics: {
            totalEvents: sessionData.events.length,
            wordResponsesCount: wordResponses.length,
            averageReactionTime: statistics.averageReactionTime,
            sessionDuration: statistics.duration
          }
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error during session import';
        console.error(`Error importing session for participant ${participantId}:`, error);
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

// Merkle DAG: import.sessions.check_participant
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

// Merkle DAG: import.sessions.check_existing_session
// 既存セッション存在チェック関数
async function checkExistingSession(participantId: string): Promise<boolean> {
  try {
    const query = `
      MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session)
      RETURN count(s) as sessionCount
    `;
    const result = await neo4jClient.query(query, { participantId });
    const sessionCount = result[0]?.sessionCount || 0;
    const exists = sessionCount > 0;
    if (exists) {
      console.log(`Session for participant ${participantId} already exists (count: ${sessionCount}), skipping import`);
    }
    return exists;
  } catch (error) {
    console.error(`Error checking existing session ${participantId}:`, error);
    return false;
  }
}

// Merkle DAG: import.sessions.process_events
// セッションイベント処理関数
async function processSessionEvents(participantId: string, events: any[]) {
  try {
    // セッションインデックスは0（最初のセッション）として扱う
    const sessionIndex = 0;
    
    // セッション開始時刻と終了時刻を取得
    const sessionStartedEvent = events.find((e: any) => e.type === 'session_started');
    const sessionEndedEvent = events.find((e: any) => e.type === 'session_ended');
    
    const startTime = sessionStartedEvent?.timestamp 
      ? new Date(sessionStartedEvent.timestamp).getTime() 
      : events[0]?.timestamp ? new Date(events[0].timestamp).getTime() : Date.now();
    
    const endTime = sessionEndedEvent?.timestamp 
      ? new Date(sessionEndedEvent.timestamp).getTime() 
      : null;

    // Neo4jManagerを使用してセッションを保存
    await neo4jManager.saveSession({
      id: `${participantId}-${sessionIndex}`,
      participantId,
      events,
      createdAt: new Date(startTime).toISOString()
    });

    return { 
      eventsProcessed: events.length,
      sessionIndex 
    };
  } catch (error) {
    console.error(`Error processing session events for ${participantId}:`, error);
    throw error;
  }
}

// Merkle DAG: import.sessions.extract_responses
// 単語応答抽出関数
function extractWordResponses(events: any[]) {
  const wordResponses = [];

  for (const event of events) {
    if (event.type === 'response_window_closed' && event.payload?.stimulusWord) {
      wordResponses.push({
        stimulusWord: event.payload.stimulusWord,
        responseWord: event.payload.responseWord || '',
        reactionTimeMs: event.payload.reactionTimeMs || 0,
        isDelayed: event.payload.isDelayed || false,
        timestamp: event.timestamp
      });
    }
  }

  return wordResponses;
}

// Merkle DAG: import.sessions.store_responses
// 単語応答格納関数
async function storeWordResponses(participantId: string, responses: any[], sessionIndex: number) {
  try {
    for (const response of responses) {
      await neo4jClient.insertResponse(participantId, sessionIndex, {
        stimulus_word: response.stimulusWord,
        response_word: response.responseWord,
        reaction_time_ms: response.reactionTimeMs,
        event_ts: typeof response.timestamp === 'number' 
          ? response.timestamp 
          : new Date(response.timestamp).getTime(),
        is_delayed: response.isDelayed || false
      });
    }
  } catch (error) {
    console.error(`Error storing word responses for ${participantId}:`, error);
    throw error;
  }
}

// Merkle DAG: import.sessions.calculate_stats
// セッション統計計算関数
function calculateSessionStatistics(events: any[]) {
  let totalReactionTime = 0;
  let responseCount = 0;
  let startTime: number | null = null;
  let endTime: number | null = null;

  for (const event of events) {
    if (event.type === 'session_started') {
      startTime = typeof event.timestamp === 'number' 
        ? event.timestamp 
        : new Date(event.timestamp).getTime();
    }
    if (event.type === 'session_ended') {
      endTime = typeof event.timestamp === 'number' 
        ? event.timestamp 
        : new Date(event.timestamp).getTime();
    }
    if (event.type === 'response_window_closed' && event.payload?.reactionTimeMs) {
      totalReactionTime += event.payload.reactionTimeMs;
      responseCount++;
    }
  }

  // 開始時刻がない場合は最初のイベントの時刻を使用
  if (!startTime && events.length > 0) {
    startTime = typeof events[0].timestamp === 'number' 
      ? events[0].timestamp 
      : new Date(events[0].timestamp).getTime();
  }

  // 終了時刻がない場合は最後のイベントの時刻を使用
  if (!endTime && events.length > 0) {
    const lastEvent = events[events.length - 1];
    endTime = typeof lastEvent.timestamp === 'number' 
      ? lastEvent.timestamp 
      : new Date(lastEvent.timestamp).getTime();
  }

  const duration = startTime && endTime ? (endTime - startTime) / 1000 : 0; // seconds
  const averageReactionTime = responseCount > 0 ? totalReactionTime / responseCount : 0;

  return {
    duration,
    averageReactionTime,
    responseCount
  };
}

export async function POST(request: NextRequest) {
  try {
    // Merkle DAG: import.sessions.execute
    // インポート処理実行
    const result = await importSessionsFromDataset();

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 500 });
    }

  } catch (error) {
    console.error('Import sessions error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
