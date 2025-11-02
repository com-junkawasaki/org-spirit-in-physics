// LLM-BOUNDARY: 80_app - app/(segments)/...（RSC & Client）
// Merkle DAG: import.sessions.endpoint
// セッションデータインポートAPIエンドポイント
// 依存関係: @participants/ (dataset), neo4j, session-data-processor

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from 'fs';
import path from 'path';
import { initializeSupabaseDatabase } from "scripts/src/lib/data-loader";
import { supabaseManager } from "scripts/src/lib/database/supabase-manager";
import { getSupabaseClient } from "scripts/src/lib/database/supabase-client";

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
    // Supabaseデータベース初期化
    await initializeSupabaseDatabase();

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
        if (!sessionData.participantId || !sessionData.events) {
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
        const wordResponses = await extractWordResponses(sessionData.events);
        await storeWordResponses(participantId, wordResponses);

        // Merkle DAG: import.sessions.calculate_statistics
        // セッション統計を計算
        const statistics = await calculateSessionStatistics(sessionData.events);

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
        results.push({
          participantId,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error during session import'
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

// Merkle DAG: import.sessions.check_participant
// 参加者存在チェック関数
async function checkParticipantExists(participantId: string): Promise<boolean> {
  const participant = await supabaseManager.getParticipant(participantId);
  return participant !== null;
}

// Merkle DAG: import.sessions.check_existing_session
// 既存セッション存在チェック関数
async function checkExistingSession(participantId: string): Promise<boolean> {
  const sessions = await supabaseManager.getSessionsByParticipantId(participantId);
  return sessions.length > 0;
}

// Merkle DAG: import.sessions.process_events
// セッションイベント処理関数
async function processSessionEvents(participantId: string, events: any[]) {
  // セッション開始・終了イベントを検出
  const sessionStartedEvent = events.find((e: any) => e.type === 'session_started' || e.event_type === 'session_started');
  const sessionEndedEvent = events.filter((e: any) => e.type === 'session_ended' || e.event_type === 'session_ended').pop();
  
  // participant_experiment_sessionsテーブルにセッションを作成
  const sessionId = `${participantId}-session-1`;
  await supabaseManager.saveSession({
    participant_id: participantId,
    session_id: sessionId,
    session_type: 'session-1',
    start_time: sessionStartedEvent?.timestamp 
      ? new Date(sessionStartedEvent.timestamp).toISOString()
      : new Date().toISOString(),
    end_time: sessionEndedEvent?.timestamp 
      ? new Date(sessionEndedEvent.timestamp).toISOString()
      : null,
  });
  
  return { eventsProcessed: events.length };
}

// Merkle DAG: import.sessions.extract_responses
// 単語応答抽出関数
async function extractWordResponses(events: any[]) {
  const wordResponses = [];

  for (const event of events) {
    if (event.type === 'response_window_closed' && event.payload?.stimulusWord) {
      wordResponses.push({
        stimulusWord: event.payload.stimulusWord,
        responseWord: event.payload.responseWord || '',
        reactionTimeMs: event.payload.reactionTimeMs || 0,
        isDelayed: event.payload.isDelayed || false,
        timestamp: new Date(event.timestamp).toISOString()
      });
    }
  }

  return wordResponses;
}

// Merkle DAG: import.sessions.store_responses
// 単語応答格納関数
async function storeWordResponses(participantId: string, responses: any[]) {
  // 単語応答をSupabaseに格納
  await supabaseManager.createWordResponses(participantId, responses);
}

// Merkle DAG: import.sessions.calculate_stats
// セッション統計計算関数
async function calculateSessionStatistics(events: any[]) {
  let totalReactionTime = 0;
  let responseCount = 0;
  let startTime = null;
  let endTime = null;

  for (const event of events) {
    if (event.type === 'session_started') {
      startTime = event.timestamp;
    }
    if (event.type === 'session_ended') {
      endTime = event.timestamp;
    }
    if (event.type === 'response_window_closed' && event.payload?.reactionTimeMs) {
      totalReactionTime += event.payload.reactionTimeMs;
      responseCount++;
    }
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
