import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from 'fs';
import path from 'path';
import { createNeo4jClient } from '@/lib/neo4j';

// Merkle DAG: import.sessions.endpoint
// セッションデータインポートAPIエンドポイント
// 依存関係: @participants/ (dataset), neo4j

export async function POST(request: NextRequest) {
  try {
    console.log('API: Starting session import from dataset...');

    const results = [];

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

    const client = createNeo4jClient();

    for (const dirEntry of participantDirs) {
      const participantId = dirEntry.name;
      const participantPath = path.join(datasetPath, participantId);

      try {
        // Merkle DAG: import.sessions.check_participant
        // 参加者が存在するか確認
        const participantExists = await client.getParticipantDetails(participantId);
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
        const existingSessions = await (client as any).getSessionsByParticipantId(participantId);
        if (existingSessions && existingSessions.length > 0) {
          results.push({
            participantId,
            status: 'skipped',
            message: 'Session data already exists for this participant'
          });
          continue;
        }

        // Merkle DAG: import.sessions.create_session
        // セッションイベントを処理してNeo4jに格納
        const sessionEvents = sessionData.events.map((event: any) => ({
          participant_id: participantId,
          type: event.type,
          timestamp: new Date(event.timestamp).toISOString(),
          payload: event.payload || {},
          imported_at: new Date().toISOString()
        }));

        await (client as any).createSessionEvents(sessionEvents);

        // Merkle DAG: import.sessions.create_word_responses
        // 単語応答データを抽出して格納
        const wordResponses = extractWordResponses(sessionData.events);
        if (wordResponses.length > 0) {
          await (client as any).createWordResponses(participantId, wordResponses);
        }

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
        console.error(`Import error for participant ${participantId}:`, error);
        results.push({
          participantId,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error during session import'
        });
      }
    }

    console.log(`API: Session import completed. Success: ${results.filter(r => r.status === 'success').length}, Failed: ${results.filter(r => r.status === 'error').length}, Skipped: ${results.filter(r => r.status === 'skipped').length}`);

    return NextResponse.json({
      success: true,
      total: participantDirs.length,
      processed: results.length,
      results
    });

  } catch (error) {
    console.error('API: Failed to import sessions:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
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
        timestamp: new Date(event.timestamp).toISOString()
      });
    }
  }

  return wordResponses;
}

// Merkle DAG: import.sessions.calculate_stats
// セッション統計計算関数
function calculateSessionStatistics(events: any[]) {
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
