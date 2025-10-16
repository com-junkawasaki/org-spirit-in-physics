import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from 'fs';
import path from 'path';
import { createNeo4jClient } from '@/lib/neo4j';

// Merkle DAG: import.sessions.csv_parser
// CSVデータパース関数
function parsePhysiologicalCSV(csvContent: string): { metadata: any, data: any[] } {
  const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line);

  let metadata: any = {};
  const data: any[] = [];

  let dataStartIndex = -1;

  // メタデータを解析
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(',')) {
      const [key, ...valueParts] = line.split(',');
      const value = valueParts.join(',').trim();

      if (key === 'Date' && value) metadata.date = value;
      if (key === 'Begin' && value) metadata.beginTime = value.trim();
      if (key === 'End' && value) metadata.endTime = value.trim();
      if (key === 'Time Range' && value) metadata.timeRange = value.trim();

      // データ開始行を検出
      if (key === 'Time_Sec') {
        dataStartIndex = i;
        break;
      }
    }
  }

  // データ行を解析
  if (dataStartIndex >= 0) {
    for (let i = dataStartIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      const values = line.split(',').map(v => v.trim());

      if (values.length >= 9) { // Time_Sec + Ch1-Ch8
        const record = {
          time_sec: parseFloat(values[0]),
          ch1: parseFloat(values[1]) || 0,
          ch2: parseFloat(values[2]) || 0,
          ch3: parseFloat(values[3]) || 0,
          ch4: parseFloat(values[4]) || 0,
          ch5: parseFloat(values[5]) || 0,
          ch6: parseFloat(values[6]) || 0,
          ch7: parseFloat(values[7]) || 0,
          ch8: parseFloat(values[8]) || 0,
          timestamp: 0 // 後で計算
        };

        // タイムスタンプを計算（開始時間 + time_sec）
        if (metadata.date && metadata.beginTime) {
          const [hours, minutes, seconds] = metadata.beginTime.split(':').map(Number);
          const baseDate = new Date(metadata.date);
          baseDate.setHours(hours, minutes, seconds || 0, 0);
          record.timestamp = baseDate.getTime() + (record.time_sec * 1000);
        }

        data.push(record);
      }
    }
  }

  return { metadata, data };
}

// Merkle DAG: import.sessions.endpoint
// セッションデータインポートAPIエンドポイント
// 依存関係: @participants/ (dataset), neo4j

export async function POST(request: NextRequest) {
  try {
    console.log('API: Starting session import from dataset...');

    const body = await request.json();
    const targetParticipantIds = body.participantIds || null;

    const results = [];

    // Merkle DAG: import.sessions.scan
    // データセットディレクトリをスキャン（複数候補から解決）
    const datasetPath = await resolveDatasetParticipantsPath();

    try {
      await fs.access(datasetPath);
    } catch {
      throw new Error('Participants dataset directory not found');
    }

    const entries = await fs.readdir(datasetPath, { withFileTypes: true });
    let participantDirs = entries.filter(entry => entry.isDirectory());

    // 指定された participant ID でフィルタリング
    if (targetParticipantIds) {
      participantDirs = participantDirs.filter(dir => targetParticipantIds.includes(dir.name));
    }

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

        // Merkle DAG: import.sessions.process_csv_data
        // 生理データCSVファイルを処理
        let physiologicalRecordsCount = 0;
        try {
          const csvFiles = await fs.readdir(participantPath, { withFileTypes: true });
          const physiologicalCsvFiles = csvFiles.filter(file =>
            file.isFile() &&
            file.name.endsWith('.CSV') &&
            file.name.includes('2025-08') // 2025-08を含むCSVファイルのみ
          );

          for (const csvFile of physiologicalCsvFiles) {
            try {
              const csvPath = path.join(participantPath, csvFile.name);
              const csvContent = await fs.readFile(csvPath, 'utf-8');

              console.log(`Processing CSV file: ${csvFile.name} for participant ${participantId}`);

              const { metadata, data } = parsePhysiologicalCSV(csvContent);

              if (data.length > 0) {
                // セッションIDを生成（既存のセッションを使用）
                const sessionId = `session_${participantId}_${new Date(metadata.date).getTime()}`;

                await (client as any).createPhysiologicalData(participantId, sessionId, data);
                physiologicalRecordsCount += data.length;

                console.log(`Imported ${data.length} physiological records from ${csvFile.name}`);
              }
            } catch (csvError) {
              console.warn(`Error processing CSV file ${csvFile.name}:`, csvError);
            }
          }
        } catch (csvDirError) {
          console.warn(`Error reading CSV files for participant ${participantId}:`, csvDirError);
        }

        results.push({
          participantId,
          status: 'success',
          message: 'Session data imported successfully',
          statistics: {
            totalEvents: sessionData.events.length,
            wordResponsesCount: wordResponses.length,
            physiologicalRecordsCount,
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

// Merkle DAG: import.sessions.resolve_dataset_path
async function resolveDatasetParticipantsPath(): Promise<string> {
  const candidates = [
    path.join(process.cwd(), 'dataset', 'participants'),
    '/app/dataset/participants',
    path.join(process.cwd(), 'apps', 'visualizer', 'src', 'dataset', 'participants'),
    path.join(process.cwd(), 'src', 'dataset', 'participants')
  ];
  for (const p of candidates) {
    try { await fs.access(p); return p; } catch {}
  }
  return path.join(process.cwd(), 'dataset', 'participants');
}
