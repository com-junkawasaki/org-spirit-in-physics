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
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    console.log(`API: Fetching timeline data for participant ${participantId}${sessionId ? `, session ${sessionId}` : ''}`);

    const client = createNeo4jClient();

    // デモモード機能を除去 - 実データのみを使用

    // 実データ取得（失敗は収集してクライアントに返す）
    const errors: string[] = []

    let sessionData: any
    try {
      sessionData = await getSessionData(client, participantId, sessionId || undefined)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      errors.push(`session_data: ${msg}`)
      return NextResponse.json({ success: false, error: `Failed to load session data: ${msg}`, errors }, { status: 500 })
    }

    let emotionData: any[] = []
    try {
      emotionData = await getEmotionData(client, participantId, sessionId || undefined)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      errors.push(`emotion_data: ${msg}`)
      emotionData = []
    }

    let physiologicalData: any[] = []
    try {
      physiologicalData = await getPhysiologicalData(client, participantId, sessionId || undefined)
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
      rt: pt.reactionTime ?? null, // 反応時間を追加
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
async function getSessionData(client: any, participantId: string, sessionId?: string): Promise<any> {
  try {
    console.log('Getting session data from Neo4j for participant:', participantId, sessionId ? `session: ${sessionId}` : '');
    
    // まず、新しい構造（Participant -> Session）を試す
    let sessionQuery: string;
    let queryParams: any = { participantId };
    
    if (sessionId) {
      // 特定のセッションIDでフィルタリング
      sessionQuery = `
        MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session {id: $sessionId})
        RETURN s.events as events, s.id as sessionId, s.created_at as createdAt, s.session_index as sessionIndex
        LIMIT 1
      `;
      queryParams.sessionId = sessionId;
    } else {
      // 最新のセッションを取得
      sessionQuery = `
        MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session)
        RETURN s.events as events, s.id as sessionId, s.created_at as createdAt, s.session_index as sessionIndex
        ORDER BY s.created_at DESC
        LIMIT 1
      `;
    }
    
    console.log('Executing session query (new structure):', sessionQuery);
    let sessionResults = await client.query(sessionQuery, queryParams);
    console.log('Session query results count (new structure):', sessionResults.length);
    
    // 新しい構造でデータが見つからない場合、古い構造（Participant -> Experiment -> ExperimentSession）を試す
    if (sessionResults.length === 0) {
      if (sessionId) {
        sessionQuery = `
        MATCH (p:Participant {id: $participantId})-[:HAS_EXPERIMENT]->(e:Experiment)-[:HAS_SESSION]->(s:ExperimentSession {id: $sessionId})
        RETURN s.session_data as sessionData, s.id as sessionId, s.start_ts as startTs
        LIMIT 1
      `;
        queryParams = { participantId, sessionId };
      } else {
        sessionQuery = `
        MATCH (p:Participant {id: $participantId})-[:HAS_EXPERIMENT]->(e:Experiment)-[:HAS_SESSION]->(s:ExperimentSession)
        RETURN s.session_data as sessionData, s.id as sessionId, s.start_ts as startTs
        ORDER BY s.start_ts DESC
        LIMIT 1
      `;
        queryParams = { participantId };
      }
      console.log('Executing session query (old structure):', sessionQuery);
      sessionResults = await client.query(sessionQuery, queryParams);
      console.log('Session query results count (old structure):', sessionResults.length);
    }
    
    if (sessionResults.length === 0) {
      throw new Error(`No session data found for participant: ${participantId}`);
    }
    
    // 新しい構造の場合
    let sessionData: any;
    if (sessionResults[0].events) {
      // eventsがJSON文字列の場合はパース、配列の場合はそのまま使用
      let events = sessionResults[0].events;
      if (typeof events === 'string') {
        try {
          events = JSON.parse(events);
        } catch (e) {
          console.warn('Failed to parse events JSON:', e);
          events = [];
        }
      }
      sessionData = {
        events: Array.isArray(events) ? events : []
      };
    } else {
      // 古い構造の場合
      sessionData = JSON.parse(sessionResults[0].sessionData || '{}');
    }
    
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
      startTs: sessionResults[0].startTs || sessionResults[0].createdAt
    };

  } catch (error) {
    console.error('Neo4j session data read error:', error);
    throw error;
  }
}

// Merkle DAG: participants.timeline.get_emotion_data_from_neo4j
// Neo4jから感情データ取得関数
async function getEmotionData(client: any, participantId: string, sessionId?: string): Promise<any[]> {
  try {
    console.log('Getting emotion data from Neo4j for participant:', participantId, sessionId ? `session: ${sessionId}` : '');
    
    // 新しい構造（Participant -> Session -> BurstEmotionData/FaceEmotionData/LanguageEmotionData/ProsodyEmotionData）を試す
    let emotionQuery: string;
    let queryParams: any = { participantId };
    
    // 各感情データタイプを個別に取得して結合
    const allEmotionResults: any[] = [];
    
    if (sessionId) {
      // 特定のセッションの感情データを取得
      queryParams.sessionId = sessionId;
      
      // BurstEmotionData
      const burstQuery = `
        MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session {id: $sessionId})
        MATCH (s)-[:HAS_BURST_EMOTION_DATA]->(b:BurstEmotionData)
        RETURN 'burst' as source, b as emotionData
        ORDER BY COALESCE(b.begin_time, 0)
      `;
      const burstResults = await client.query(burstQuery, queryParams);
      console.log('Burst emotion results count:', burstResults.length);
      if (burstResults.length > 0) {
        console.log('First burst result:', JSON.stringify(burstResults[0], null, 2));
      }
      allEmotionResults.push(...burstResults);
      
      // FaceEmotionData
      const faceQuery = `
        MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session {id: $sessionId})
        MATCH (s)-[:HAS_FACE_EMOTION_DATA]->(f:FaceEmotionData)
        RETURN 'face' as source, f as emotionData
        ORDER BY COALESCE(f.time, 0)
      `;
      const faceResults = await client.query(faceQuery, queryParams);
      console.log('Face emotion results count:', faceResults.length);
      if (faceResults.length > 0) {
        console.log('First face result:', JSON.stringify(faceResults[0], null, 2));
      }
      allEmotionResults.push(...faceResults);
      
      // LanguageEmotionData
      const languageQuery = `
        MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session {id: $sessionId})
        MATCH (s)-[:HAS_LANGUAGE_EMOTION_DATA]->(l:LanguageEmotionData)
        RETURN 'language' as source, l as emotionData
        ORDER BY COALESCE(l.begin_time, 0)
      `;
      const languageResults = await client.query(languageQuery, queryParams);
      console.log('Language emotion results count:', languageResults.length);
      if (languageResults.length > 0) {
        console.log('First language result:', JSON.stringify(languageResults[0], null, 2));
      }
      allEmotionResults.push(...languageResults);
      
      // ProsodyEmotionData
      const prosodyQuery = `
        MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session {id: $sessionId})
        MATCH (s)-[:HAS_PROSODY_EMOTION_DATA]->(pr:ProsodyEmotionData)
        RETURN 'prosody' as source, pr as emotionData
        ORDER BY COALESCE(pr.begin_time, 0)
      `;
      const prosodyResults = await client.query(prosodyQuery, queryParams);
      console.log('Prosody emotion results count:', prosodyResults.length);
      if (prosodyResults.length > 0) {
        console.log('First prosody result:', JSON.stringify(prosodyResults[0], null, 2));
      }
      allEmotionResults.push(...prosodyResults);
    } else {
      // 全セッションの感情データを取得
      // BurstEmotionData
      const burstQuery = `
        MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session)
        MATCH (s)-[:HAS_BURST_EMOTION_DATA]->(b:BurstEmotionData)
        RETURN 'burst' as source, b as emotionData
        ORDER BY COALESCE(b.begin_time, 0)
      `;
      const burstResults = await client.query(burstQuery, queryParams);
      allEmotionResults.push(...burstResults);
      
      // FaceEmotionData
      const faceQuery = `
        MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session)
        MATCH (s)-[:HAS_FACE_EMOTION_DATA]->(f:FaceEmotionData)
        RETURN 'face' as source, f as emotionData
        ORDER BY COALESCE(f.time, 0)
      `;
      const faceResults = await client.query(faceQuery, queryParams);
      allEmotionResults.push(...faceResults);
      
      // LanguageEmotionData
      const languageQuery = `
        MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session)
        MATCH (s)-[:HAS_LANGUAGE_EMOTION_DATA]->(l:LanguageEmotionData)
        RETURN 'language' as source, l as emotionData
        ORDER BY COALESCE(l.begin_time, 0)
      `;
      const languageResults = await client.query(languageQuery, queryParams);
      allEmotionResults.push(...languageResults);
      
      // ProsodyEmotionData
      const prosodyQuery = `
        MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session)
        MATCH (s)-[:HAS_PROSODY_EMOTION_DATA]->(pr:ProsodyEmotionData)
        RETURN 'prosody' as source, pr as emotionData
        ORDER BY COALESCE(pr.begin_time, 0)
      `;
      const prosodyResults = await client.query(prosodyQuery, queryParams);
      allEmotionResults.push(...prosodyResults);
    }
    
    console.log('Emotion query results count (new structure):', allEmotionResults.length);
    console.log('All emotion results sample:', allEmotionResults.slice(0, 2).map(r => ({
      source: r.source,
      hasEmotionData: !!r.emotionData,
      emotionDataKeys: r.emotionData ? Object.keys(r.emotionData) : []
    })));
    
    // 4種類の感情データタイプの数を確認
    const emotionTypeCounts = allEmotionResults.reduce((acc: any, r: any) => {
      const source = r.source || 'unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});
    console.log('Emotion data type counts:', emotionTypeCounts);
    let emotionResults = allEmotionResults;
    
    // 新しい構造でデータが見つからない場合、古い構造を試す
    if (emotionResults.length === 0) {
      const oldEmotionQuery = `
        MATCH (p:Participant {id: $participantId})-[:HAS_EXPERIMENT]->(e:Experiment)-[:HAS_SESSION]->(s:ExperimentSession)
        MATCH (s)-[:HAS_EMOTION_DATA]->(ed:EmotionData)
        RETURN ed.name as name, ed.score as score, ed.timestamp as timestamp, ed.source as source
        ORDER BY ed.timestamp
      `;
      console.log('Executing emotion query (old structure):', oldEmotionQuery);
      emotionResults = await client.query(oldEmotionQuery, { participantId });
      console.log('Emotion query results count (old structure):', emotionResults.length);
    }
    
    // 新しい構造の場合のマッピング
    const mappedResults: any[] = [];
    
    if (emotionResults.length > 0) {
      console.log('Processing emotion results, count:', emotionResults.length);
      // 新しい構造（BurstEmotionData/FaceEmotionData/LanguageEmotionData/ProsodyEmotionData）
      emotionResults.forEach((result: any, index: number) => {
        const emotionData = result.emotionData;
        const source = result.source || 'unknown';
        
        if (!emotionData) {
          console.log(`Skipping result ${index}: emotionData is null`);
          return; // emotionDataがnullの場合はスキップ
        }
        
        // emotion_scoresから感情データを抽出（JSON文字列の場合も対応）
        let emotionScoresObj: any = {};
        if (emotionData.emotion_scores) {
          if (typeof emotionData.emotion_scores === 'string') {
            try {
              emotionScoresObj = JSON.parse(emotionData.emotion_scores);
            } catch (e) {
              console.warn('Failed to parse emotion_scores JSON:', e, 'Raw value:', emotionData.emotion_scores?.substring(0, 100));
            }
          } else {
            emotionScoresObj = emotionData.emotion_scores;
          }
        } else {
          console.log(`Result ${index} (${source}): emotion_scores is missing. Available keys:`, Object.keys(emotionData));
        }
        
        if (Object.keys(emotionScoresObj).length > 0) {
          const emotions = Object.entries(emotionScoresObj).map(([name, score]) => ({
            name,
            score: Math.min(Math.max(Number(score) || 0, 0), 1)
          }));
          
          // begin_timeとtimeの両方を確認（Neo4jのInteger型に対応）
          const toNumber = (value: any): number => {
            if (value === null || value === undefined) return 0;
            if (typeof value === 'object' && value !== null && 'low' in value) {
              return value.low;
            }
            return Number(value) || 0;
          };
          
          const beginTime = toNumber(emotionData.begin_time) || toNumber(emotionData.time) || 0;
          const endTime = toNumber(emotionData.end_time) || (beginTime > 0 ? beginTime + 1 : 1);
          
          mappedResults.push({
            fileType: source,
            beginTime,
            endTime,
            emotions,
            sessionId: emotionData.session_id || sessionId || 'unknown'
          });
          
          if (mappedResults.length <= 10) {
            console.log(`Mapped result ${mappedResults.length - 1} (${source}):`, {
              fileType: source,
              beginTime,
              endTime,
              emotionsCount: emotions.length,
              firstEmotion: emotions[0],
              emotionNames: emotions.map(e => e.name).slice(0, 3)
            });
          }
        } else {
          console.log(`Result ${index} (${source}): No emotion scores found after parsing. emotion_scores keys:`, Object.keys(emotionScoresObj));
          // デバッグ: emotionDataの全キーを確認
          if (index < 3) {
            console.log(`Result ${index} (${source}) emotionData keys:`, Object.keys(emotionData));
            console.log(`Result ${index} (${source}) emotionData sample:`, JSON.stringify(emotionData).substring(0, 200));
          }
        }
      });
      
      console.log('Total mapped results:', mappedResults.length);
    } else {
      console.log('No emotion results to process');
    }
    
    // 古い構造（EmotionData）も試す（新しい構造でデータが見つからない場合）
    if (mappedResults.length === 0 && emotionResults.length > 0 && !emotionResults[0].emotionData) {
      emotionResults.forEach((result: any) => {
        mappedResults.push({
          fileType: result.source || 'unknown',
          beginTime: result.timestamp,
          endTime: result.timestamp + 1000, // 1秒間隔で仮定
          emotions: [{ 
            name: result.name, 
            score: Math.min(Math.max(result.score || 0, 0), 1) // 0-1の範囲に制限
          }],
          sessionId: sessionId || 'unknown'
        });
      });
    }

    console.log('Mapped emotion results:', mappedResults.slice(0, 3));
    return mappedResults;

  } catch (error) {
    console.error('Neo4j emotion data query error:', error);
    return [];
  }
}

// Merkle DAG: participants.timeline.get_physiological_data_from_neo4j
// Neo4jから生理データ取得関数
async function getPhysiologicalData(client: any, participantId: string, sessionId?: string): Promise<any[]> {
  try {
    console.log('Getting physiological data from Neo4j for participant:', participantId, sessionId ? `session: ${sessionId}` : '');
    
    // 新しい構造（Participant -> Session -> PhysiologicalData）を試す
    let physiologicalQuery: string;
    let queryParams: any = { participantId };
    
    if (sessionId) {
      physiologicalQuery = `
        MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session {id: $sessionId})
        MATCH (s)-[:HAS_PHYSIOLOGICAL_DATA]->(pd:PhysiologicalData)
        RETURN pd.channel as channel, pd.value as value, pd.timestamp as timestamp, pd.quality as quality
        ORDER BY pd.timestamp
      `;
      queryParams.sessionId = sessionId;
    } else {
      physiologicalQuery = `
        MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session)
        MATCH (s)-[:HAS_PHYSIOLOGICAL_DATA]->(pd:PhysiologicalData)
        RETURN pd.channel as channel, pd.value as value, pd.timestamp as timestamp, pd.quality as quality
        ORDER BY pd.timestamp
      `;
    }
    
    console.log('Executing physiological query (new structure):', physiologicalQuery);
    let physiologicalResults = await client.query(physiologicalQuery, queryParams);
    console.log('Physiological query results count (new structure):', physiologicalResults.length);
    
    // 新しい構造でデータが見つからない場合、古い構造を試す
    if (physiologicalResults.length === 0) {
      physiologicalQuery = `
        MATCH (p:Participant {id: $participantId})-[:HAS_EXPERIMENT]->(e:Experiment)-[:HAS_SESSION]->(s:ExperimentSession)
        MATCH (s)-[:HAS_PHYSIOLOGICAL_DATA]->(pd:PhysiologicalData)
        RETURN pd.channel as channel, pd.value as value, pd.timestamp as timestamp, pd.quality as quality
        ORDER BY pd.timestamp
      `;
      console.log('Executing physiological query (old structure):', physiologicalQuery);
      physiologicalResults = await client.query(physiologicalQuery, { participantId });
      console.log('Physiological query results count (old structure):', physiologicalResults.length);
    }
    
    // チャンネル別にデータをグループ化
    const channelData: Record<string, any[]> = {};
    physiologicalResults.forEach((result: any) => {
      const channel = result.channel;
      if (!channelData[channel]) {
        channelData[channel] = [];
      }
      channelData[channel].push({
        timestamp: result.timestamp,
        value: result.value,
        quality: result.quality || 1.0
      });
    });
    
    // 時系列データポイントに変換
    const timePoints: Record<number, any> = {};
    Object.entries(channelData).forEach(([channel, data]) => {
      data.forEach(point => {
        const timeKey = Math.floor(point.timestamp / 1000) * 1000; // 1秒単位でグループ化
        if (!timePoints[timeKey]) {
          timePoints[timeKey] = {
            timeSec: point.timestamp / 1000,
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
      // 4種類の感情データタイプの数を確認
      const emotionTypes = emotionData.reduce((acc: any, e: any) => {
        const type = e.fileType || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});
      console.log('Emotion data types count:', emotionTypes);
    }
    
    const timelineData: any[] = [];
    
    // セッションイベントを基準として時系列データを構築
    // word_displayedイベントのみを処理
    const wordDisplayedEvents = sessionData.wordEvents.filter((event: any) => event.type === 'word_displayed');
    const speechDetectedEvents = sessionData.wordEvents.filter((event: any) => event.type === 'speech_detected');
    
    wordDisplayedEvents.forEach((event: any) => {
      const timestamp = event.timestamp;
      const word = event.payload?.word || 'Unknown';
      
      // 反応時間の計算: word_displayedからspeech_detectedまでの時間差
      const nextWordIndex = wordDisplayedEvents.indexOf(event) + 1;
      const nextWordTimestamp = nextWordIndex < wordDisplayedEvents.length 
        ? wordDisplayedEvents[nextWordIndex].timestamp 
        : timestamp + 10000; // デフォルト10秒
      
      const speechEvent = speechDetectedEvents.find((speechEvent: any) => 
        speechEvent.timestamp > timestamp && speechEvent.timestamp <= nextWordTimestamp
      );
      const reactionTime = speechEvent ? speechEvent.timestamp - timestamp : null;
      
      // 対応する感情データを検索（時間範囲でマッチング）
      const relatedEmotions = emotionData.filter(emotion => {
        // セッション開始時刻を基準に相対時間でマッチング
        const sessionStartTime = sessionData.startTime || 0;
        const relativeTimestamp = (timestamp - sessionStartTime) / 1000; // 相対時間（秒）
        const beginTime = emotion.beginTime || 0; // 秒単位
        const endTime = emotion.endTime || (beginTime + 1); // 秒単位（endTimeがない場合はbeginTime+1秒）
        
        // 感情データの時間範囲でマッチング（より柔軟なマッチング：±5秒の範囲内）
        const timeDiff = Math.abs(relativeTimestamp - beginTime);
        return timeDiff <= 5 || (beginTime <= relativeTimestamp && endTime >= relativeTimestamp);
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
        const fileType = emotion.fileType || 'unknown';
        
        if (emotions.length > 0) {
          // 実際の感情データがある場合
          emotions.forEach((e: any) => {
            emotionDetails.push({
              name: e.name || 'unknown',
              score: e.score || 0,
              fileType: fileType // fileTypeを確実に設定
            });
          });
        }
        // デモ用のランダム値生成を削除（実データのみを使用）
      });
      
      // デバッグ: 最初の数個のデータポイントで感情データの統合状況を確認
      if (timelineData.length < 5) {
        console.log(`Timeline point ${timelineData.length}: word=${word}, relatedEmotions=${relatedEmotions.length}, emotionDetails=${emotionDetails.length}`, {
          emotionTypes: emotionDetails.map(e => e.fileType),
          emotionNames: emotionDetails.map(e => e.name)
        });
      }
      
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
        reactionTime: reactionTime, // 反応時間を追加
        emotions: emotionDetails, // 詳細な感情データ（fileTypeを含む）
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