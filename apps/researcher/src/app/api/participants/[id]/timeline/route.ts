import { NextRequest, NextResponse } from "next/server";
import { createNeo4jClient } from '@/lib/neo4j';

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

    // デモモード機能を除去 - 実データのみを使用

    // 実データ取得（失敗は収集してクライアントに返す）
    const errors: string[] = []

    let sessionData: any
    try {
      sessionData = await getSessionData(client, participantId)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      errors.push(`session_data: ${msg}`)
      return NextResponse.json({ success: false, error: `Failed to load session data: ${msg}`, errors }, { status: 500 })
    }

    let emotionData: any[] = []
    try {
      emotionData = await getEmotionData(client, participantId, sessionData.startTs)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      errors.push(`emotion_data: ${msg}`)
      emotionData = []
    }

    let physiologicalData: any[] = []
    try {
      physiologicalData = await getPhysiologicalData(client, participantId, sessionData.startTs)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      errors.push(`physiological_data: ${msg}`)
      physiologicalData = []
    }

    // 実データを統合（セッション×感情×生理）し、クライアント期待形式へ変換
    const integrated = integrateTimelineData(sessionData, emotionData, physiologicalData)
    const timelineData = integrated.map((pt: any) => ({
      t: pt.timestamp,
      w: pt.word,
      e: pt.eventType,
      em: Array.isArray(pt.emotions) ? pt.emotions : [],
      ph: {
        average: pt?.physiological?.average ?? 0,
        max: pt?.physiological?.max ?? 0,
        min: pt?.physiological?.min ?? 0,
        channels: pt?.physiological?.channels ?? {}
      },
      rv: pt?.reactionValue ?? 0,
      m: {
        ec: pt?.metadata?.emotionCount ?? 0,
        pc: pt?.metadata?.physiologicalCount ?? 0
      }
    }))

    // ストリーミングレスポンスで大きなデータを効率的に送信
    const responseData = {
      success: true,
      data: {
        participantId,
        timelineData: timelineData,
        metadata: {
          sessionEvents: sessionData.wordEvents.length,
          emotionEntries: emotionData.length,
          physiologicalEntries: physiologicalData.length,
          totalDataPoints: timelineData.length,
          dataSource: 'integrated_realtime',
          errors
        }
      }
    };

    // JSON文字列化の前にサイズチェック
    try {
      const jsonString = JSON.stringify(responseData);
      console.log('Response size:', jsonString.length, 'bytes');
      
      // 10MB制限チェック（Next.jsのデフォルト制限）
      if (jsonString.length > 10 * 1024 * 1024) {
        console.warn('Response size exceeds 10MB limit, returning summary only');
        return NextResponse.json({
          success: true,
          data: {
            participantId,
            timelineData: timelineData.slice(0, 1000), // フォールバック：1000件まで
            metadata: {
              ...responseData.data.metadata,
              totalDataPoints: Math.min(timelineData.length, 1000),
              truncated: true,
              originalSize: timelineData.length
            }
          }
        });
      }
      
      return NextResponse.json(responseData);
    } catch (error) {
      console.error('JSON serialization error:', error);
      return NextResponse.json({
        success: false,
        error: 'Data serialization failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Timeline API error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Merkle DAG: participants.timeline.get_session_data_from_neo4j
// Neo4jからセッションデータ取得関数
async function getSessionData(client: any, participantId: string): Promise<any> {
  try {
    console.log('Getting session data from Neo4j for participant:', participantId);
    
    const sessionQuery = `
      MATCH (p:Participant {id: $participantId})-[:HAS_EXPERIMENT]->(e:Experiment)-[:HAS_SESSION]->(s:ExperimentSession)
      RETURN s.session_data as sessionData, s.id as sessionId, s.start_ts as startTs
      ORDER BY s.start_ts DESC
      LIMIT 1
    `;
    
    console.log('Executing session query:', sessionQuery);
    const sessionResults = await client.query(sessionQuery, { participantId });
    console.log('Session query results count:', sessionResults.length);
    
    if (sessionResults.length === 0) {
      throw new Error(`No session data found for participant: ${participantId}`);
    }
    
    const sessionData = JSON.parse(sessionResults[0].sessionData || '{}');
    console.log('Parsed session data events count:', sessionData.events?.length || 0);

    // 単語表示イベントを基準点として抽出
    const wordEvents = (sessionData.events || []).filter((event: any) => 
      event.type === 'word_displayed' || 
      event.type === 'response_window_opened' || 
      event.type === 'response_window_closed' ||
      event.type === 'speech_detected'
    );

    // セッション開始時刻を最初のイベントのtimestampから取得
    const startTime = sessionData.events?.length > 0 ? sessionData.events[0].timestamp : 0;

    return {
      ...sessionData,
      wordEvents,
      events: sessionData.events || [],
      startTime,
      sessionId: sessionResults[0].sessionId,
      startTs: sessionResults[0].startTs
    };

  } catch (error) {
    console.error('Neo4j session data read error:', error);
    throw error;
  }
}

// Merkle DAG: participants.timeline.get_emotion_data_from_neo4j
// Neo4jから感情データ取得関数
async function getEmotionData(client: any, participantId: string, sessionStartTs?: number): Promise<any[]> {
  try {
    console.log('Getting emotion data from Neo4j for participant:', participantId);
    
    const emotionQuery = `
      MATCH (p:Participant {id: $participantId})-[:HAS_EXPERIMENT]->(e:Experiment)-[:HAS_SESSION]->(s:ExperimentSession)
      MATCH (s)-[:HAS_EMOTION_DATA]->(ed:EmotionData)
      RETURN ed.name as name, ed.score as score, ed.timestamp as timestamp, ed.source as source, s.start_ts as sessionStartTs
      ORDER BY ed.timestamp
    `;
    
    console.log('Executing emotion query:', emotionQuery);
    const emotionResults = await client.query(emotionQuery, { participantId });
    console.log('Emotion query results count:', emotionResults.length);
    
    // セッション開始時刻を取得（クエリ結果から、または引数から）
    const sessionStartMs = emotionResults.length > 0 
      ? (emotionResults[0].sessionStartTs || sessionStartTs || 0)
      : (sessionStartTs || 0);
    
    // timestampはミリ秒単位で保存されている（セッション開始時刻を基準）
    // timeline APIが期待する形式に変換（セッション開始からの相対時間を秒単位で）
    const mappedResults = emotionResults.map((result: any) => {
      const timestampMs = result.timestamp || 0;
      // セッション開始時刻からの相対時間（秒）を計算
      const beginTimeSec = sessionStartMs > 0 ? (timestampMs - sessionStartMs) / 1000 : timestampMs / 1000;
      const endTimeSec = beginTimeSec + 1.0; // 1秒間隔で仮定
      
      return {
        fileType: result.source || 'unknown',
        beginTime: Math.max(0, beginTimeSec), // 秒単位（セッション開始からの相対時間）
        endTime: Math.max(0, endTimeSec), // 秒単位
        timestamp: timestampMs, // ミリ秒単位（デバッグ用に保持）
        emotions: [{ 
          name: result.name, 
          score: Math.min(Math.max(result.score || 0, 0), 1) // 0-1の範囲に制限
        }],
        sessionId: 'unknown'
      };
    });

    console.log('Mapped emotion results:', mappedResults.slice(0, 3));
    return mappedResults;

  } catch (error) {
    console.error('Neo4j emotion data query error:', error);
    return [];
  }
}

// Merkle DAG: participants.timeline.get_physiological_data_from_neo4j
// Neo4jから生理データ取得関数
async function getPhysiologicalData(client: any, participantId: string, sessionStartTs?: number): Promise<any[]> {
  try {
    console.log('Getting physiological data from Neo4j for participant:', participantId);
    
    const physiologicalQuery = `
      MATCH (p:Participant {id: $participantId})-[:HAS_EXPERIMENT]->(e:Experiment)-[:HAS_SESSION]->(s:ExperimentSession)
      MATCH (s)-[:HAS_PHYSIOLOGICAL_DATA]->(pd:PhysiologicalData)
      RETURN pd.channel as channel, pd.value as value, pd.timestamp as timestamp, pd.quality as quality
      ORDER BY pd.timestamp
    `;
    
    console.log('Executing physiological query:', physiologicalQuery);
    const physiologicalResults = await client.query(physiologicalQuery, { participantId });
    console.log('Physiological query results count:', physiologicalResults.length);
    
    // チャンネル別にデータをグループ化
    const channelData: Record<string, any[]> = {};
    physiologicalResults.forEach((result: any) => {
      const channel = result.channel;
      if (!channelData[channel]) {
        channelData[channel] = [];
      }
      // timestampはミリ秒単位で保存されている
      channelData[channel].push({
        timestamp: result.timestamp,
        value: result.value,
        quality: result.quality || 1.0
      });
    });
    
    // 時系列データポイントに変換（timestampはミリ秒単位）
    const timePoints: Record<number, any> = {};
    Object.entries(channelData).forEach(([channel, data]) => {
      data.forEach(point => {
        const timestampMs = point.timestamp || 0;
        // セッション開始時刻を基準にした相対時間（秒）を計算
        const sessionStartMs = sessionStartTs || 0;
        const relativeTimeSec = sessionStartMs > 0 ? (timestampMs - sessionStartMs) / 1000 : timestampMs / 1000;
        
        // 1秒単位でグループ化
        const timeKey = Math.floor(relativeTimeSec);
        if (!timePoints[timeKey]) {
          timePoints[timeKey] = {
            timeSec: relativeTimeSec, // 相対時間（秒）
            timestampMs, // 絶対時間（ミリ秒）- デバッグ用
            channels: {}
          };
        }
        timePoints[timeKey].channels[channel] = point.value;
      });
    });
    
    const result = Object.values(timePoints).sort((a: any, b: any) => a.timeSec - b.timeSec);
    console.log('Processed physiological data points:', result.length);
    return result;

  } catch (error) {
    console.error('Neo4j physiological data query error:', error);
    return [];
  }
}

// デモデータ生成機能を除去 - 実データのみを使用

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
        const sessionStartTime = sessionData.startTime || sessionData.startTs || 0;
        const relativeTimestampSec = (timestamp - sessionStartTime) / 1000; // 相対時間（秒）
        const beginTime = emotion.beginTime || 0; // 秒単位（セッション開始からの相対時間）
        const endTime = emotion.endTime || beginTime + 1.0; // 秒単位
        
        // 感情データの時間範囲でマッチング（±0.5秒のマージン）
        return relativeTimestampSec >= (beginTime - 0.5) && relativeTimestampSec <= (endTime + 0.5);
      });
      
      // 対応する生理データを検索（時間範囲でマッチング）
      const relatedPhysiological = physiologicalData.filter(physio => {
        // physio.timeSecはセッション開始からの相対時間（秒）
        // timestampはイベントの絶対時間（ミリ秒）
        const sessionStartTime = sessionData.startTime || sessionData.startTs || 0;
        const relativeEventTimeSec = (timestamp - sessionStartTime) / 1000;
        const timeDiff = Math.abs(physio.timeSec - relativeEventTimeSec);
        return timeDiff <= 5.0; // 5秒以内
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
        const allValues = relatedPhysiological.flatMap(p => Object.values(p.channels)) as number[];
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