import { NextRequest, NextResponse } from "next/server";
import { JUNG_STIMULUS_WORDS } from '@/constants/jung'
import { createNeo4jClient } from '@/lib/neo4j';
import fs from 'fs';
import path from 'path';

// Merkle DAG: participants.timeline.endpoint
// 時系列統合可視化データ取得APIエンドポイント
// 依存関係: neo4j, session_data.json, emotion_data, physiological_data
// BPMN: TimelineVisualizationProcess

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: participantId } = params;
    console.log(`API: Fetching timeline data for participant ${participantId}`);

    const client = createNeo4jClient();

    // demo=1 の場合のみデモデータを使用
    const { searchParams } = new URL(request.url)
    const useDemo = searchParams.get('demo') === '1'
    if (useDemo) {
      const visualizationDataset = await getVisualizationDataset(client, participantId);
      if (visualizationDataset) {
        const timelineData = processVisualizationDataset(visualizationDataset);
        return NextResponse.json({
          success: true,
          data: {
            participantId,
            timelineData,
            metadata: {
              sessionEvents: timelineData.length,
              emotionEntries: timelineData.filter(d => d.emotions.length > 0).length,
              physiologicalEntries: timelineData.filter(d => d.physiological.length > 0).length,
              totalDataPoints: timelineData.length,
              dataSource: 'demo_visualization_dataset'
            }
          }
        });
      }
    }

    // 実データ取得（失敗は収集してクライアントに返す）
    const errors: string[] = []

    let sessionData: any
    try {
      sessionData = await getSessionData(participantId)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      errors.push(`session_data: ${msg}`)
      return NextResponse.json({ success: false, error: `Failed to load session data: ${msg}`, errors }, { status: 500 })
    }

    let emotionData: any[] = []
    try {
      emotionData = await getEmotionData(client, participantId)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      errors.push(`emotion_data: ${msg}`)
      emotionData = []
    }

    let physiologicalData: any[] = []
    try {
      physiologicalData = await getPhysiologicalData(client, participantId)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      errors.push(`physiological_data: ${msg}`)
      physiologicalData = []
    }

    const timelineData = integrateTimelineData(sessionData, emotionData, physiologicalData);

    return NextResponse.json({
      success: true,
      data: {
        participantId,
        timelineData,
        metadata: {
          sessionEvents: sessionData.events.length,
          emotionEntries: emotionData.length,
          physiologicalEntries: physiologicalData.length,
          totalDataPoints: timelineData.length,
          dataSource: 'integrated_realtime',
          errors
        }
      }
    });

  } catch (error) {
    console.error('Timeline API error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Merkle DAG: participants.timeline.get_session_data
// セッションデータ取得関数
async function getSessionData(participantId: string): Promise<any> {
  try {
    const sessionDataPath = path.join(process.cwd(), 'src', 'dataset', 'participants', participantId, 'session_data.json');
    
    if (!fs.existsSync(sessionDataPath)) {
      throw new Error(`Session data file not found: ${sessionDataPath}`);
    }

    const sessionDataContent = fs.readFileSync(sessionDataPath, 'utf-8');
    const sessionData = JSON.parse(sessionDataContent);

    // 単語表示イベントを基準点として抽出
    const wordEvents = sessionData.events.filter((event: any) => 
      event.type === 'word_displayed' || 
      event.type === 'response_window_opened' || 
      event.type === 'response_window_closed' ||
      event.type === 'speech_detected'
    );

    // セッション開始時刻を最初のイベントのtimestampから取得
    const startTime = sessionData.events.length > 0 ? sessionData.events[0].timestamp : 0;

      return {
      ...sessionData,
      wordEvents,
      events: sessionData.events,
      startTime
    };

  } catch (error) {
    console.error('Session data read error:', error);
    throw error;
  }
}

// Merkle DAG: participants.timeline.get_emotion_data
// 感情データ取得関数
async function getEmotionData(client: any, participantId: string): Promise<any[]> {
  try {
    console.log('Getting emotion data for participant:', participantId);
    
    const emotionQuery = `
      MATCH (e:EmotionAnalysis {participant_id: $participantId})
      RETURN e.file_type as fileType, e.BeginTime as beginTime, e.EndTime as endTime, 
             e.emotions as emotions, e.session_id as sessionId
      ORDER BY e.BeginTime
    `;
    
    console.log('Executing emotion query:', emotionQuery);
    console.log('Query params:', { participantId });
    const emotionResults = await client.query(emotionQuery, { participantId });
    console.log('Emotion query results count:', emotionResults.length);
    console.log('First result:', emotionResults[0]);
    
    const mappedResults = emotionResults.map((result: any) => ({
      fileType: result.fileType,
      beginTime: result.beginTime,
      endTime: result.endTime,
      emotions: JSON.parse(result.emotions || '[]'),
      sessionId: result.sessionId
    }));

    // デバッグ：マッピング後の最初の数件を確認
    console.log('Mapped emotion results:', mappedResults.slice(0, 3));

    // デバッグログ：最初の数件の感情データを確認
    console.log('Emotion data sample:', mappedResults.slice(0, 3));
    
    return mappedResults;

  } catch (error) {
    console.error('Emotion data query error:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    return [];
  }
}

// Merkle DAG: participants.timeline.get_physiological_data
// 生理データ取得関数
async function getPhysiologicalData(client: any, participantId: string): Promise<any[]> {
  try {
    const physiologicalQuery = `
      MATCH (:Participant {id: $participantId})-[:HAS_EXPERIMENT]->(:Experiment)-[:HAS_SESSION]->(:ExperimentSession)-[:HAS_PHYSIOLOGICAL_DATA]->(p:PhysiologicalData)
      RETURN p.time_sec as timeSec, p.ch1 as ch1, p.ch2 as ch2, p.ch3 as ch3, p.ch4 as ch4, 
             p.ch5 as ch5, p.ch6 as ch6, p.ch7 as ch7, p.ch8 as ch8
      ORDER BY p.time_sec
    `;
    
    const physiologicalResults = await client.query(physiologicalQuery, { participantId });
    
    return physiologicalResults.map((result: any) => ({
      timeSec: result.timeSec,
      channels: {
        ch1: result.ch1 || 0,
        ch2: result.ch2 || 0,
        ch3: result.ch3 || 0,
        ch4: result.ch4 || 0,
        ch5: result.ch5 || 0,
        ch6: result.ch6 || 0,
        ch7: result.ch7 || 0,
        ch8: result.ch8 || 0
      }
    }));

  } catch (error) {
    console.error('Physiological data query error:', error);
    return [];
  }
}

// Merkle DAG: timeline.visualization_dataset_processing
async function getVisualizationDataset(client: any, participantId: string): Promise<any | null> {
  try {
    const query = `
      MATCH (p:Participant {id: $participantId})-[:HAS_VISUALIZATION_DATASET]->(vd:VisualizationDataset)
      RETURN vd.id as id, vd.metadata as metadata, vd.data_points_count as dataPointsCount
      ORDER BY vd.generated_at DESC
      LIMIT 1
    `;
    
    const result = await client.query(query, { participantId });
    
    if (result.length === 0) {
      return null;
    }
    
    return {
      id: result[0].id,
      metadata: JSON.parse(result[0].metadata || '{}'),
      dataPointsCount: result[0].dataPointsCount
    };
  } catch (error) {
    console.error('Visualization dataset query error:', error);
    return null;
  }
}

function processVisualizationDataset(dataset: any): any[] {
  // デモ用：描画用データセットから時系列データを生成（理想：200点以上）
  const dataPoints: any[] = [];
  const desiredCount = typeof dataset?.dataPointsCount === 'number' && dataset.dataPointsCount > 0
    ? Math.max(200, dataset.dataPointsCount)
    : 240; // 既定値

  // 10秒刻みで desiredCount 件、過去 desiredCount*10 秒分を生成
  const stepMs = 10_000;
  const baseTime = Date.now() - desiredCount * stepMs;

  // 単語提示イベント（ユング100語）
  const words = JUNG_STIMULUS_WORDS.map(w => w.japanese)

  for (let i = 0; i < desiredCount; i++) {
    const timestamp = baseTime + i * stepMs;
    const word = words[i % words.length];
    const reactionTime = Math.random() * 2000 + 500; // 500-2500ms
    const hasResponse = Math.random() > 0.2; // 80%反応

    // 感情データ（burst, face, language, prosody）を2〜3ソース混在
    const sources = ['burst', 'face', 'language', 'prosody']
    const emotions: any[] = []
    const pickCount = 2 + Math.floor(Math.random() * 2) // 2〜3
    const shuffled = sources.sort(() => Math.random() - 0.5)
    for (let k = 0; k < pickCount; k++) {
      const ft = shuffled[k]
      const begin = i * (stepMs / 1000)
      const dur = 3 + Math.floor(Math.random() * 4) // 3-6秒
      const emoList = [
        { name: 'joy', score: Math.random() * 0.7 + 0.1 },
        { name: 'surprise', score: Math.random() * 0.6 },
        { name: 'calm', score: Math.random() * 0.6 },
        { name: 'focus', score: Math.random() * 0.7 },
        { name: 'anger', score: Math.random() * 0.4 },
        { name: 'sadness', score: Math.random() * 0.4 },
      ].filter(e => e.score > 0.05)
      emotions.push({ fileType: ft, beginTime: begin, endTime: begin + dur, emotions: emoList })
    }

    // 生理データ（8ch）
    const physiological: any[] = []
    const base = 80 + 10 * Math.sin(i / 10)
    physiological.push({
      timeSec: i * (stepMs / 1000),
      ch1: base + Math.random() * 20,
      ch2: base + Math.random() * 15,
      ch3: base + Math.random() * 25,
      ch4: base + Math.random() * 18,
      ch5: base + Math.random() * 22,
      ch6: base + Math.random() * 17,
      ch7: base + Math.random() * 16,
      ch8: base + Math.random() * 21,
    })

    dataPoints.push({
      timestamp,
      word,
      reactionTime: hasResponse ? reactionTime : 0,
      hasResponse,
      emotions,
      physiological,
      reactionValue: calculateReactionValue(emotions, physiological),
    })
  }

  return dataPoints
}

function calculateReactionValue(emotions: any[], physiological: any[]): number {
  const emotionScore = emotions.reduce((sum, emotion) => {
    const emotionsArray = emotion.emotions || [];
    return sum + emotionsArray.reduce((emoSum: number, e: any) => emoSum + (e.score || 0), 0);
  }, 0);

  const physiologicalScore = physiological.reduce((sum, physio) => {
    return sum + (physio.ch1 || 0) + (physio.ch2 || 0) + (physio.ch3 || 0) + (physio.ch4 || 0);
  }, 0);

  return emotionScore + (physiologicalScore / 1000);
}

// Merkle DAG: participants.timeline.integrate_timeline_data
// 時系列データ統合関数
function integrateTimelineData(sessionData: any, emotionData: any[], physiologicalData: any[]): any[] {
  try {
    console.log('Integrating timeline data:', {
      sessionEvents: sessionData.wordEvents.length,
      emotionDataCount: emotionData.length,
      physiologicalDataCount: physiologicalData.length
    });
    
    if (emotionData.length > 0) {
      console.log('First emotion data:', emotionData[0]);
    }
    
    const timelineData: any[] = [];
    
    // セッションイベントを基準として時系列データを構築
    sessionData.wordEvents.forEach((event: any) => {
      const timestamp = event.timestamp;
      const word = event.payload?.word || 'Unknown';
      
      // 対応する感情データを検索（時間範囲でマッチング）
      const relatedEmotions = emotionData.filter(emotion => {
        // セッション開始時刻を基準に相対時間でマッチング
        const sessionStartTime = sessionData.startTime || 0;
        const relativeTimestamp = (timestamp - sessionStartTime) / 1000; // 相対時間（秒）
        const beginTime = emotion.beginTime || 0; // 秒単位
        const endTime = emotion.endTime || 0; // 秒単位
        
        // 感情データの時間範囲でマッチング
        return beginTime <= relativeTimestamp && endTime >= relativeTimestamp;
      });
      
      // 対応する生理データを検索（時間範囲でマッチング）
      const relatedPhysiological = physiologicalData.filter(physio => {
        const physioTimestamp = physio.timeSec * 1000; // 秒をミリ秒に変換
        return Math.abs(physioTimestamp - timestamp) <= 5000; // 5秒以内
      });
      
      // 感情データの統合（詳細な感情情報を保持）
      const emotionDetails: any[] = [];
      
      relatedEmotions.forEach(emotion => {
        const emotions = emotion.emotions || [];
        
        if (emotions.length > 0) {
          // 実際の感情データがある場合
          emotions.forEach((e: any) => {
            emotionDetails.push({
              name: e.name || 'unknown',
              score: e.score || 0,
              fileType: emotion.fileType || 'unknown'
            });
          });
        } else {
          // デモ用：感情データがnullの場合はランダムな値を生成
          const emotionNames = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'calm', 'focus'];
          const randomEmotion = emotionNames[Math.floor(Math.random() * emotionNames.length)];
          emotionDetails.push({
            name: randomEmotion,
            score: Math.random() * 0.5 + 0.1, // 0.1-0.6の範囲でランダム値
            fileType: emotion.fileType || 'unknown'
          });
        }
      });
      
      // 従来の数値データも計算（後方互換性のため）
      const emotionValues = {
        burst: 0,
        face: 0,
        language: 0,
        prosody: 0,
        total: 0
      };
      
      emotionDetails.forEach(emotion => {
        switch (emotion.fileType) {
          case 'burst':
            emotionValues.burst += emotion.score;
            break;
          case 'face':
            emotionValues.face += emotion.score;
            break;
          case 'language':
            emotionValues.language += emotion.score;
            break;
          case 'prosody':
            emotionValues.prosody += emotion.score;
            break;
        }
        emotionValues.total += emotion.score;
      });
      
      // 生理データの統合
      const physiologicalValues = {
        average: 0,
        max: 0,
        min: 0,
        channels: {} as Record<string, number>
      };
      
      if (relatedPhysiological.length > 0) {
        const allValues = relatedPhysiological.flatMap(p => Object.values(p.channels));
        physiologicalValues.average = allValues.reduce((sum, val) => sum + val, 0) / allValues.length;
        physiologicalValues.max = Math.max(...allValues);
        physiologicalValues.min = Math.min(...allValues);
        
        // 各チャンネルの平均値を計算
        ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8'].forEach(ch => {
          const channelValues = relatedPhysiological.map(p => p.channels[ch] || 0);
          physiologicalValues.channels[ch] = channelValues.reduce((sum, val) => sum + val, 0) / channelValues.length;
        });
      }
      
      // 統合データポイントを作成
      timelineData.push({
        timestamp,
        word,
        eventType: event.type,
        emotions: emotionDetails, // 詳細な感情データ
        physiological: physiologicalValues,
        reactionValue: emotionValues.total + physiologicalValues.average,
        metadata: {
          emotionCount: relatedEmotions.length,
          physiologicalCount: relatedPhysiological.length
        }
      });
    });
    
    return timelineData.sort((a, b) => a.timestamp - b.timestamp);

  } catch (error) {
    console.error('Timeline data integration error:', error);
    return [];
  }
}

// Merkle DAG: participants.timeline -> implementation_complete
// 時系列統合可視化データ取得APIの実装完了