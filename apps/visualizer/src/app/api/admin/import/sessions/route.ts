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
    console.log(`Dataset path resolved to: ${datasetPath}`);

    try {
      await fs.access(datasetPath);
      console.log(`Dataset path exists: ${datasetPath}`);
    } catch {
      console.error(`Dataset path not found: ${datasetPath}`);
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
    // session_data*.jsonファイルを読み取り（複数セッション対応）
    const sessionFiles = [];
    
    // session_data.json と session_data_*.json を検索
    try {
      const files = await fs.readdir(participantPath);
      const sessionDataFiles = files.filter(file => 
        file.startsWith('session_data') && file.endsWith('.json')
      );
      
      console.log(`Found session files: ${sessionDataFiles.join(', ')}`);
      console.log(`Total session files found: ${sessionDataFiles.length}`);
      
      for (const fileName of sessionDataFiles) {
        const sessionDataPath = path.join(participantPath, fileName);
        console.log(`Reading session data from ${sessionDataPath}`);
        const sessionData = JSON.parse(await fs.readFile(sessionDataPath, 'utf-8'));
        console.log(`Session data loaded from ${fileName}: ${sessionData.events?.length || 0} events`);
        sessionFiles.push({ fileName, sessionData });
      }
      
      console.log(`Total session files to process: ${sessionFiles.length}`);
    } catch (error) {
      console.log(`Error reading session files from ${participantPath}:`, error);
      results.push({
        participantId,
        status: 'skipped',
        message: 'No session data files found'
      });
      continue;
    }
    
    if (sessionFiles.length === 0) {
      results.push({
        participantId,
        status: 'skipped',
        message: 'No session data files found'
      });
      continue;
    }

        // Merkle DAG: import.sessions.validate_session_data
        // セッションデータの検証
        for (const { fileName, sessionData } of sessionFiles) {
          if (!sessionData.events) {
            throw new Error(`Invalid session data structure in ${fileName}`);
          }
        }

        // Merkle DAG: import.sessions.check_existing
        // 既存セッションデータのチェック
        const existingSessionsQuery = `
          MATCH (:Participant {id: $participantId})-[:HAS_SESSION]->(s:ExperimentSession)
          RETURN count(s) as session_count
        `;
        const existingSessionsResult = await client.query(existingSessionsQuery, { participantId });
        const sessionCount = existingSessionsResult[0]?.session_count || 0;
        
        // Merkle DAG: import.sessions.delete_existing
        // 既存データの削除（forceReimportがtrueの場合）
        if (sessionCount > 0 && body.forceReimport) {
          console.log(`Deleting existing session data for participant ${participantId}`);
          const deleteQuery = `
            MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:ExperimentSession)
            OPTIONAL MATCH (s)-[:HAS_RESPONSE]->(r:Response)
            OPTIONAL MATCH (s)-[:HAS_PHYSIOLOGICAL_DATA]->(pd:PhysiologicalData)
            DETACH DELETE s, r, pd
            RETURN count(s) as deleted_sessions
          `;
          await client.query(deleteQuery, { participantId });
          console.log(`Deleted existing session data for participant ${participantId}`);
        } else if (sessionCount > 0 && !body.forceReimport) {
          results.push({
            participantId,
            status: 'skipped',
            message: 'Session data already exists for this participant'
          });
          continue;
        }

        // Merkle DAG: import.sessions.create_session
        // 各セッションファイルを処理してNeo4jに格納
        let totalEvents = 0;
        let totalWordResponses = 0;
        let totalPhysiologicalRecords = 0;
        let totalReactionTime = 0;
        let sessionDuration = 0;

        console.log(`Starting to process ${sessionFiles.length} session files`);
        console.log(`Session files to process:`, sessionFiles.map(f => f.fileName));
        
        for (let i = 0; i < sessionFiles.length; i++) {
          const { fileName, sessionData } = sessionFiles[i];
          console.log(`Processing session file ${i + 1}/${sessionFiles.length}: ${fileName}`);
          console.log(`Session data events count: ${sessionData.events?.length || 0}`);
          
          // セッションIDを生成（ファイル名ベース）
          const sessionId = `session_${participantId}_${Date.now()}_${fileName.replace('.json', '')}`;
          console.log(`Generated session ID: ${sessionId}`);
          
          // セッションデータの検証
          if (!sessionData.events || !Array.isArray(sessionData.events)) {
            console.error(`Invalid session data structure in ${fileName}:`, sessionData);
            continue;
          }
          
          const sessionEvents = sessionData.events.map((event: any) => ({
            participant_id: participantId,
            session_id: sessionId,
            type: event.type,
            timestamp: new Date(event.timestamp).toISOString(),
            payload: event.payload || {},
            imported_at: new Date().toISOString()
          }));

          // ガイドライン: MERGE操作の段階化
          console.log(`Creating ExperimentSession node for ${sessionId}`);
          await client.mergeNode('ExperimentSession', {
            id: sessionId,
            participant_id: participantId,
            start_ts: sessionEvents.find(e => e.type === 'session_started')?.timestamp || new Date().toISOString(),
            end_ts: sessionEvents.find(e => e.type === 'session_ended')?.timestamp || new Date().toISOString(),
            status: 'completed',
            total_responses: sessionEvents.filter(e => e.type === 'word_response').length,
            completed_responses: sessionEvents.filter(e => e.type === 'word_response').length,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          console.log(`ExperimentSession node created for ${sessionId}`);

          // Merkle DAG: import.sessions.create_participant_session_relationship
          // 参加者→セッションのリレーションを作成
          console.log(`Creating participant-session relationship for ${sessionId}`);
          const participantSessionRelationshipQuery = `
            MATCH (p:Participant {id: $participantId})
            MATCH (s:ExperimentSession {id: $sessionId})
            MERGE (p)-[:HAS_SESSION]->(s)
            RETURN count(s) as relationship_count
          `;
          await client.query(participantSessionRelationshipQuery, { participantId, sessionId });
          console.log(`Participant-session relationship created for ${sessionId}`);

          // Merkle DAG: import.sessions.create_word_responses
          // 単語応答データを抽出して格納
          console.log(`Extracting word responses from ${sessionData.events.length} events`);
          const wordResponses = extractWordResponses(sessionData.events);
          console.log(`Extracted ${wordResponses.length} word responses from ${fileName}`);
          if (wordResponses.length > 0) {
            // ガイドライン: UNWINDバルク挿入・更新でラウンドトリップ最小化
            const responseData = wordResponses.map((response: any) => ({
              id: `response_${participantId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              participant_id: participantId,
              session_id: sessionId,
              stimulus_word: response.stimulus_word,
              response_word: response.response_word,
              reaction_time_ms: response.reaction_time_ms,
              event_ts: response.timestamp,
              emotion: response.emotion,
              emotion_confidence: response.emotion_confidence,
              spirit_probability: response.spirit_probability || 0.5,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }));
            
            await client.bulkInsertNodes('Response', responseData, 100);

            // Merkle DAG: import.sessions.create_relationships
            // セッション→応答のリレーションを作成
            const relationshipQuery = `
              MATCH (s:ExperimentSession {id: $sessionId})
              MATCH (r:Response {session_id: $sessionId})
              MERGE (s)-[:HAS_RESPONSE]->(r)
              RETURN count(r) as relationship_count
            `;
            await client.query(relationshipQuery, { sessionId });
            
            // 統計を累積
            totalEvents += sessionData.events.length;
            totalWordResponses += wordResponses.length;
            totalReactionTime += wordResponses.reduce((sum: number, r: any) => sum + (r.reaction_time_ms || 0), 0);
          }
        }

        // Merkle DAG: import.sessions.calculate_statistics
        // セッション統計を計算
        const averageReactionTime = totalWordResponses > 0 ? totalReactionTime / totalWordResponses : 0;

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

                // ガイドライン: UNWINDバルク挿入・更新でラウンドトリップ最小化
                const physiologicalData = data.map((record: any) => ({
                  id: `physio_${participantId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  participant_id: participantId,
                  session_id: sessionId,
                  time_sec: record.time_sec,
                  ch1: record.ch1,
                  ch2: record.ch2,
                  ch3: record.ch3,
                  ch4: record.ch4,
                  ch5: record.ch5,
                  ch6: record.ch6,
                  ch7: record.ch7,
                  ch8: record.ch8,
                  timestamp: record.timestamp,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }));
                
                await client.bulkInsertNodes('PhysiologicalData', physiologicalData, 100);
                physiologicalRecordsCount += data.length;

                // Merkle DAG: import.sessions.create_physiological_relationships
                // セッション→生理データのリレーションを作成
                const physiologicalRelationshipQuery = `
                  MATCH (s:ExperimentSession {id: $sessionId})
                  MATCH (p:PhysiologicalData {session_id: $sessionId})
                  MERGE (s)-[:HAS_PHYSIOLOGICAL_DATA]->(p)
                  RETURN count(p) as relationship_count
                `;
                await client.query(physiologicalRelationshipQuery, { sessionId });

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
            totalEvents,
            wordResponsesCount: totalWordResponses,
            physiologicalRecordsCount,
            averageReactionTime,
            sessionDuration: 0 // TODO: 複数セッションの総時間を計算
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
  
  console.log(`Processing ${events.length} events for word response extraction`);
  console.log(`Event types found: ${[...new Set(events.map(e => e.type))].join(', ')}`);

  // word_response イベントを直接処理（reaction_time_msが含まれている）
  for (const event of events) {
    if (event.type === 'word_response' && event.payload) {
      const stimulusWord = event.payload.stimulus_word;
      const responseWord = event.payload.response_word || '';
      const reactionTimeMs = event.payload.reaction_time_ms || 0;
      
      // デバッグログ追加
      console.log(`Event type: ${event.type}, stimulus: ${stimulusWord}, response: ${responseWord}, reaction_time_ms: ${reactionTimeMs}`);
      
      if (stimulusWord) {
        wordResponses.push({
          stimulus_word: stimulusWord,
          response_word: responseWord,
          reaction_time_ms: reactionTimeMs,
          is_delayed: event.payload.is_delayed || false,
          emotion: event.payload.emotion || null,
          emotion_confidence: event.payload.emotion_confidence || 0,
          spirit_probability: event.payload.spirit_probability || 0.5,
          timestamp: new Date(event.timestamp).toISOString()
        });
      }
    }
  }
  
  console.log(`Found ${wordResponses.length} word_response events`);

  // word_response イベントがない場合は、word_displayed と response_window_closed から計算
  if (wordResponses.length === 0) {
    const wordDisplayEvents = new Map(); // word -> timestamp のマップ

    // まず word_displayed イベントを収集
    for (const event of events) {
      if (event.type === 'word_displayed' && event.payload?.word) {
        wordDisplayEvents.set(event.payload.word, event.timestamp);
        console.log(`Found word_displayed: ${event.payload.word} at ${event.timestamp}`);
      }
    }

    // response_window_closed イベントを処理
    for (const event of events) {
      if (event.type === 'response_window_closed' && event.payload?.word) {
        const stimulusWord = event.payload.word;
        const responseTimestamp = event.timestamp;
        const displayTimestamp = wordDisplayEvents.get(stimulusWord);
        
        // 反応時間を計算（ミリ秒）
        const reactionTimeMs = displayTimestamp ? new Date(responseTimestamp).getTime() - new Date(displayTimestamp).getTime() : 0;
        
        // デバッグログ追加
        console.log(`Event type: ${event.type}, stimulus: ${stimulusWord}, reaction_time_ms: ${reactionTimeMs}, display_timestamp: ${displayTimestamp}, response_timestamp: ${responseTimestamp}`);
        
        if (stimulusWord && reactionTimeMs > 0) { // 正の値のみ保存
          wordResponses.push({
            stimulus_word: stimulusWord,
            response_word: '', // response_window_closed には応答語がない
            reaction_time_ms: reactionTimeMs,
            is_delayed: false,
            emotion: null,
            emotion_confidence: 0,
            spirit_probability: 0.5, // デフォルト値
            timestamp: new Date(responseTimestamp).toISOString()
          });
        }
      }
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

  console.log(`Calculating statistics for ${events.length} events`);
  console.log(`Event types: ${[...new Set(events.map(e => e.type))].join(', ')}`);

  for (const event of events) {
    if (event.type === 'session_started') {
      startTime = event.timestamp;
    }
    if (event.type === 'session_ended') {
      endTime = event.timestamp;
    }
    // word_response イベントから反応時間を取得
    if (event.type === 'word_response' && event.payload?.reaction_time_ms) {
      totalReactionTime += event.payload.reaction_time_ms;
      responseCount++;
      console.log(`Found word_response: ${event.payload.stimulus_word}, reaction_time_ms: ${event.payload.reaction_time_ms}`);
    }
    // response_window_closed イベントからも反応時間を取得（フォールバック）
    else if (event.type === 'response_window_closed' && event.payload?.reactionTimeMs) {
      totalReactionTime += event.payload.reactionTimeMs;
      responseCount++;
    }
  }

  const duration = startTime && endTime ? (endTime - startTime) / 1000 : 0; // seconds
  const averageReactionTime = responseCount > 0 ? totalReactionTime / responseCount : 0;

  console.log(`Session statistics: ${responseCount} responses, total reaction time: ${totalReactionTime}ms, average: ${averageReactionTime}ms`);

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
    '/app/apps/visualizer/src/dataset/participants',
    path.join(process.cwd(), 'apps', 'visualizer', 'src', 'dataset', 'participants'),
    path.join(process.cwd(), 'src', 'dataset', 'participants')
  ];
  console.log('Trying dataset path candidates:');
  console.log(`Current working directory: ${process.cwd()}`);
  for (const p of candidates) {
    console.log(`  Trying: ${p}`);
    try { 
      await fs.access(p); 
      console.log(`  Found: ${p}`);
      return p; 
    } catch (error) {
      console.log(`  Not found: ${p}`);
    }
  }
  console.log(`Using fallback: ${path.join(process.cwd(), 'dataset', 'participants')}`);
  return path.join(process.cwd(), 'dataset', 'participants');
}
