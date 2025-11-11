import { NextRequest, NextResponse } from "next/server";
import { createNeo4jClient } from '@/lib/neo4j';
import { Neo4jQueryBuilder } from '@/lib/neo4j-query-builder';

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
    
    console.log('=== Timeline Integration Summary ===');
    console.log('Integrated timeline data count:', integrated.length);
    console.log('Session data:', {
      startTime: sessionData.startTime,
      wordEventsCount: sessionData.wordEvents?.length || 0,
      firstWordTimestamp: sessionData.wordEvents?.[0]?.timestamp || null
    });
    console.log('Emotion data from Neo4j:', {
      count: emotionData.length,
      firstSample: emotionData.length > 0 ? {
        beginTime: emotionData[0].beginTime,
        endTime: emotionData[0].endTime,
        fileType: emotionData[0].fileType,
        emotionsCount: emotionData[0].emotions?.length || 0,
        emotions: emotionData[0].emotions?.slice(0, 3) || []
      } : null,
      timeRange: emotionData.length > 0 ? {
        minBeginTime: Math.min(...emotionData.map(e => e.beginTime || 0)),
        maxBeginTime: Math.max(...emotionData.map(e => e.beginTime || 0)),
        minEndTime: Math.min(...emotionData.map(e => e.endTime || 0)),
        maxEndTime: Math.max(...emotionData.map(e => e.endTime || 0))
      } : null,
      emotionTypeBreakdown: emotionData.reduce((acc: any, e: any) => {
        const type = e.fileType || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {})
    });
    
    if (integrated.length > 0) {
      const pointsWithEmotions = integrated.filter((pt: any) => pt.emotions && pt.emotions.length > 0);
      console.log(`Points with emotions: ${pointsWithEmotions.length}/${integrated.length}`);
      
      if (pointsWithEmotions.length > 0) {
        const sampleWithEmotions = pointsWithEmotions[0];
        console.log('Sample point with emotions:', {
          word: sampleWithEmotions.word,
          timestamp: sampleWithEmotions.timestamp,
          emotionsCount: sampleWithEmotions.emotions.length,
          emotionTypes: [...new Set(sampleWithEmotions.emotions.map((e: any) => e.fileType))],
          firstEmotions: sampleWithEmotions.emotions.slice(0, 3)
        });
      } else {
        console.log('⚠️ WARNING: No emotion data found in integrated timeline data');
        console.log('⚠️ Emotion data details:', {
          totalEmotionData: emotionData.length,
          emotionDataWithEmotions: emotionData.filter(e => e.emotions && e.emotions.length > 0).length,
          sampleEmotionData: emotionData.slice(0, 3).map(e => ({
            fileType: e.fileType,
            beginTime: e.beginTime,
            endTime: e.endTime,
            emotionsCount: e.emotions?.length || 0,
            emotions: e.emotions?.slice(0, 2) || []
          }))
        });
        // 時間マッチングの問題を診断
        if (sessionData.startTime === 0) {
          console.log('⚠️ Session start time is 0 - this may cause time matching issues');
        }
        if (emotionData.length > 0 && sessionData.wordEvents?.length > 0) {
          const firstWordTime = sessionData.wordEvents[0].timestamp;
          const firstEmotionTime = emotionData[0].beginTime;
          const timeDiff = Math.abs((firstWordTime - sessionData.startTime) / 1000 - firstEmotionTime);
          console.log('Time matching diagnostic:', {
            firstWordTimestamp: firstWordTime,
            firstWordRelativeSec: (firstWordTime - sessionData.startTime) / 1000,
            firstEmotionBeginTimeSec: firstEmotionTime,
            timeDifferenceSec: timeDiff,
            sessionStartTime: sessionData.startTime
          });
          
          // 最初の10件の感情データと単語イベントの時間を比較
          console.log('First 5 emotion data times:', emotionData.slice(0, 5).map(e => ({
            fileType: e.fileType,
            beginTime: e.beginTime,
            endTime: e.endTime,
            emotionsCount: e.emotions?.length || 0
          })));
          console.log('First 5 word event times:', sessionData.wordEvents.slice(0, 5).map((e: any) => ({
            timestamp: e.timestamp,
            relativeSec: (e.timestamp - sessionData.startTime) / 1000,
            word: e.payload?.word
          })));
        }
      }
    }
    
    const timelineData = integrated.map((pt: any) => {
      // NaNを防ぐための安全な変換
      const safeReactionValue = typeof pt.reactionValue === 'number' && !isNaN(pt.reactionValue) ? pt.reactionValue : 0;
      const safePhysioAverage = typeof pt?.physiological?.average === 'number' && !isNaN(pt.physiological.average) ? pt.physiological.average : 0;
      const safePhysioMax = typeof pt?.physiological?.max === 'number' && !isNaN(pt.physiological.max) ? pt.physiological.max : 0;
      const safePhysioMin = typeof pt?.physiological?.min === 'number' && !isNaN(pt.physiological.min) ? pt.physiological.min : 0;
      
      return {
        t: pt.timestamp,
        w: pt.word,
        e: pt.eventType,
        rt: pt.reactionTime ?? null, // 反応時間を追加
        em: Array.isArray(pt.emotions) ? pt.emotions : [],
        ph: {
          average: safePhysioAverage,
          max: safePhysioMax,
          min: safePhysioMin,
          channels: pt?.physiological?.channels ?? {}
        },
        rv: safeReactionValue,
        m: {
          ec: pt?.metadata?.emotionCount ?? 0,
          pc: pt?.metadata?.physiologicalCount ?? 0
        }
      };
    })

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
    console.error('=== Timeline API Error ===');
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // エラーオブジェクトの詳細を出力
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      if ((error as any).code) {
        console.error('Error code:', (error as any).code);
      }
      if ((error as any).cause) {
        console.error('Error cause:', (error as any).cause);
      }
    }
    
    // Neo4j固有のエラー情報を出力
    if (error && typeof error === 'object') {
      const errorObj = error as any;
      if (errorObj.code) {
        console.error('Neo4j error code:', errorObj.code);
      }
      if (errorObj.message) {
        console.error('Neo4j error message:', errorObj.message);
      }
      if (errorObj.stack) {
        console.error('Full error object:', JSON.stringify(errorObj, Object.getOwnPropertyNames(errorObj), 2));
      }
    }
    
    // エラーの種類を識別
    let errorCategory = 'Unknown';
    if (error instanceof Error) {
      if (error.message.includes('Neo4j') || error.message.includes('Cypher')) {
        errorCategory = 'Neo4j Query Error';
      } else if (error.message.includes('JSON') || error.message.includes('parse')) {
        errorCategory = 'JSON Parse Error';
      } else if (error.message.includes('timeout') || error.message.includes('Timeout')) {
        errorCategory = 'Timeout Error';
      } else if (error.message.includes('connection') || error.message.includes('Connection')) {
        errorCategory = 'Connection Error';
      }
    }
    
    console.error('Error category:', errorCategory);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCategory,
      details: process.env.NODE_ENV === 'development' ? {
        stack: error instanceof Error ? error.stack : undefined,
        type: error instanceof Error ? error.constructor.name : typeof error
      } : undefined
    }, { status: 500 });
  }
}

// Merkle DAG: participants.timeline.get_session_data_from_neo4j
// Neo4jからセッションデータ取得関数
// Cypher Code Builderを使用してプロパティを明示的に返すことで、Nodeオブジェクトのproperties抽出処理を不要にする
async function getSessionData(client: any, participantId: string, sessionId?: string): Promise<any> {
  try {
    console.log('Getting session data from Neo4j for participant:', participantId, sessionId ? `session: ${sessionId}` : '');
    
    // sessionResultsを外側で定義
    let sessionResults: any[] = [];
    
    // まず、新しい構造（Participant -> Session）を試す
    try {
      const builder = new Neo4jQueryBuilder();
      const { query, params } = builder.buildSessionDataQuery(participantId, sessionId);
      
      console.log('=== Session Data Query (New Structure) ===');
      console.log('Query:', query);
      console.log('Params:', JSON.stringify(params, null, 2));
      
      sessionResults = await client.query(query, params);
      console.log('Session query results count (new structure):', sessionResults.length);
      
      // 新しい構造でデータが見つからない場合、古い構造（Participant -> Experiment -> ExperimentSession）を試す
      if (sessionResults.length === 0) {
        try {
          const oldBuilder = new Neo4jQueryBuilder();
          const { query: oldQuery, params: oldParams } = oldBuilder.buildOldSessionDataQuery(participantId, sessionId);
          
          console.log('=== Session Data Query (Old Structure) ===');
          console.log('Query:', oldQuery);
          console.log('Params:', JSON.stringify(oldParams, null, 2));
          
          sessionResults = await client.query(oldQuery, oldParams);
          console.log('Session query results count (old structure):', sessionResults.length);
        } catch (oldError) {
          console.error('Error fetching session data (old structure):', oldError);
          console.error('Error type:', oldError instanceof Error ? oldError.constructor.name : typeof oldError);
          console.error('Error message:', oldError instanceof Error ? oldError.message : String(oldError));
          console.error('Error stack:', oldError instanceof Error ? oldError.stack : 'No stack trace');
          throw oldError;
        }
      }
    } catch (newError) {
      console.error('Error fetching session data (new structure):', newError);
      console.error('Error type:', newError instanceof Error ? newError.constructor.name : typeof newError);
      console.error('Error message:', newError instanceof Error ? newError.message : String(newError));
      console.error('Error stack:', newError instanceof Error ? newError.stack : 'No stack trace');
      throw newError;
    }
    
    if (sessionResults.length === 0) {
      throw new Error(`No session data found for participant: ${participantId}`);
    }
    
    // クエリビルダーを使用しているため、プロパティは既に展開されている
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
        events: Array.isArray(events) ? events : [],
        id: sessionResults[0].sessionId,
        created_at: sessionResults[0].createdAt,
        session_index: sessionResults[0].sessionIndex,
        start_ts: sessionResults[0].startTs,
        end_ts: sessionResults[0].endTs
      };
    } else if (sessionResults[0].sessionData) {
      // 古い構造の場合
      let sessionDataParsed = sessionResults[0].sessionData;
      if (typeof sessionDataParsed === 'string') {
        try {
          sessionDataParsed = JSON.parse(sessionDataParsed);
        } catch (e) {
          console.warn('Failed to parse sessionData JSON:', e);
          sessionDataParsed = {};
        }
      }
      sessionData = sessionDataParsed;
    } else {
      throw new Error(`Invalid session data structure for participant: ${participantId}`);
    }
    
    console.log('Parsed session data events count:', sessionData.events?.length || 0);

    // 単語表示イベントを基準点として抽出
    const wordEvents = (sessionData.events || []).filter((event: any) => 
      event.type === 'word_displayed' || 
      event.type === 'response_window_opened' || 
      event.type === 'response_window_closed' ||
      event.type === 'speech_detected'
    );

    // セッション開始時刻を取得
    // 1. startTsが設定されている場合はそれを使用（Neo4j Integer型に対応）
    // 2. なければ最初のイベントのtimestampを使用
    // 3. それもなければ0を使用
    let startTime = 0;
    const startTsRaw = sessionResults[0].startTs;
    
    console.log('Raw startTs from Neo4j:', {
      value: startTsRaw,
      type: typeof startTsRaw,
      isObject: typeof startTsRaw === 'object' && startTsRaw !== null,
      hasLow: typeof startTsRaw === 'object' && startTsRaw !== null && 'low' in startTsRaw,
      keys: typeof startTsRaw === 'object' && startTsRaw !== null ? Object.keys(startTsRaw) : []
    });
    
    if (startTsRaw) {
      if (typeof startTsRaw === 'object' && startTsRaw !== null && 'low' in startTsRaw) {
        startTime = startTsRaw.low;
        console.log('Using startTs.low:', startTime);
      } else if (typeof startTsRaw === 'number') {
        startTime = startTsRaw;
        console.log('Using startTs as number:', startTime);
      } else {
        console.warn('startTs is not a number or Integer object:', startTsRaw);
      }
    }
    
    // startTsが取得できなかった場合、最初のイベントのtimestampを使用
    if (startTime === 0 && sessionData.events?.length > 0 && sessionData.events[0].timestamp) {
      startTime = sessionData.events[0].timestamp;
      console.log('Using first event timestamp as startTime:', startTime);
    }
    
    if (startTime === 0) {
      console.warn('⚠️ WARNING: Session start time is 0 - time matching may fail');
    }
    
    console.log('Final session start time:', startTime, 'Word events count:', wordEvents.length);
    if (wordEvents.length > 0) {
      console.log('First word event timestamp:', wordEvents[0].timestamp, 'Relative:', (wordEvents[0].timestamp - startTime) / 1000, 'seconds');
    }

    return {
      ...sessionData,
      wordEvents,
      events: sessionData.events || [],
      startTime,
      sessionId: sessionResults[0].sessionId,
      startTs: sessionResults[0].startTs || sessionResults[0].createdAt
    };

  } catch (error) {
    console.error('=== Neo4j Session Data Query Error ===');
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // エラーオブジェクトの詳細を出力
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      if ((error as any).code) {
        console.error('Error code:', (error as any).code);
      }
      if ((error as any).cause) {
        console.error('Error cause:', (error as any).cause);
      }
    }
    
    // Neo4j固有のエラー情報を出力
    if (error && typeof error === 'object') {
      const errorObj = error as any;
      if (errorObj.code) {
        console.error('Neo4j error code:', errorObj.code);
      }
      if (errorObj.message) {
        console.error('Neo4j error message:', errorObj.message);
      }
    }
    
    throw error;
  }
}

// Merkle DAG: participants.timeline.get_emotion_data_from_neo4j
// Neo4jから感情データ取得関数
// Cypher Code Builderを使用してプロパティを明示的に返すことで、Nodeオブジェクトのproperties抽出処理を不要にする
async function getEmotionData(client: any, participantId: string, sessionId?: string): Promise<any[]> {
  try {
    console.log('Getting emotion data from Neo4j for participant:', participantId, sessionId ? `session: ${sessionId}` : '');
    
    // 各感情データタイプを個別に取得して結合
    const allEmotionResults: any[] = [];
    const emotionTypes: Array<'burst' | 'face' | 'language' | 'prosody'> = ['burst', 'face', 'language', 'prosody'];
    
    // 各感情データタイプごとにクエリビルダーを使用してクエリを生成・実行
    for (const emotionType of emotionTypes) {
      try {
        const builder = new Neo4jQueryBuilder();
        const { query, params } = builder.buildEmotionDataQuery(emotionType, participantId, sessionId);
        
        console.log(`=== ${emotionType} Emotion Query ===`);
        console.log('Query:', query);
        console.log('Params:', JSON.stringify(params, null, 2));
        
        const results = await client.query(query, params);
        console.log(`${emotionType} emotion results count:`, results.length);
        
        if (results.length > 0) {
          console.log(`First ${emotionType} result:`, JSON.stringify(results[0], null, 2));
        }
        
        allEmotionResults.push(...results);
      } catch (error) {
        console.error(`Error fetching ${emotionType} emotion data:`, error);
        console.error(`Error type:`, error instanceof Error ? error.constructor.name : typeof error);
        console.error(`Error message:`, error instanceof Error ? error.message : String(error));
        console.error(`Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
        
        // エラーが発生しても他の感情データタイプの取得を続行
        console.warn(`Skipping ${emotionType} emotion data due to error, continuing with other types...`);
      }
    }
    
    console.log('Emotion query results count (new structure):', allEmotionResults.length);
    console.log('All emotion results sample:', allEmotionResults.slice(0, 2).map(r => ({
      source: r.source,
      hasEmotionScores: !!r.emotion_scores,
      beginTime: r.begin_time || r.time,
      endTime: r.end_time
    })));
    
    // 4種類の感情データタイプの数を確認
    const emotionTypeCounts = allEmotionResults.reduce((acc: any, r: any) => {
      const source = r.source || 'unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});
    console.log('Emotion data type counts:', emotionTypeCounts);
    
    // 新しい構造の場合のマッピング
    const mappedResults: any[] = [];
    
    if (allEmotionResults.length > 0) {
      console.log('Processing emotion results, count:', allEmotionResults.length);
      
      // クエリビルダーを使用しているため、プロパティは既に展開されている
      allEmotionResults.forEach((result: any, index: number) => {
        const source = result.source || 'unknown';
        
        // デバッグログ（最初の数件のみ）
        if (index < 3) {
          console.log(`Processing emotion result ${index} (${source}):`, {
            keys: Object.keys(result),
            hasEmotionScores: !!result.emotion_scores,
            beginTime: result.begin_time || result.time,
            endTime: result.end_time
          });
        }
        
        // emotion_scoresから感情データを抽出（JSON文字列の場合も対応）
        let emotionScoresObj: any = {};
        if (result.emotion_scores) {
          if (typeof result.emotion_scores === 'string') {
            try {
              emotionScoresObj = JSON.parse(result.emotion_scores);
            } catch (e) {
              console.warn('Failed to parse emotion_scores JSON:', e, 'Raw value:', result.emotion_scores?.substring(0, 100));
            }
          } else {
            emotionScoresObj = result.emotion_scores;
          }
        } else {
          console.log(`Result ${index} (${source}): emotion_scores is missing. Available keys:`, Object.keys(result));
        }
        
        if (Object.keys(emotionScoresObj).length > 0) {
          // Hume AIの感情名を小文字に正規化（例: "Joy" -> "joy", "Surprise (positive)" -> "surprise"）
          const normalizeEmotionName = (name: string): string => {
            // 括弧内の情報を削除（例: "Surprise (positive)" -> "Surprise"）
            const cleaned = name.replace(/\s*\([^)]*\)/g, '').trim();
            // 小文字に変換
            const lower = cleaned.toLowerCase();
            // 特殊なマッピング
            const mapping: Record<string, string> = {
              'surprise (negative)': 'surprise',
              'surprise (positive)': 'surprise',
              'surprise': 'surprise',
              'joy': 'joy',
              'sadness': 'sadness',
              'anger': 'anger',
              'fear': 'fear',
              'disgust': 'disgust',
              'calmness': 'calm',
              'concentration': 'focus',
              'excitement': 'excitement',
              'confusion': 'confusion'
            };
            return mapping[lower] || lower;
          };
          
          const emotions = Object.entries(emotionScoresObj)
            .map(([name, score]) => ({
              name: normalizeEmotionName(name),
              score: Math.min(Math.max(Number(score) || 0, 0), 1)
            }))
            .filter(e => e.score > 0); // スコアが0の感情は除外
          
          // begin_timeとtimeの両方を確認（Neo4jのInteger型に対応）
          const toNumber = (value: any): number => {
            if (value === null || value === undefined) return 0;
            if (typeof value === 'object' && value !== null && 'low' in value) {
              return value.low;
            }
            return Number(value) || 0;
          };
          
          const beginTime = toNumber(result.begin_time) || toNumber(result.time) || 0;
          const endTime = toNumber(result.end_time) || (beginTime > 0 ? beginTime + 1 : 1);
          
          mappedResults.push({
            fileType: source,
            beginTime,
            endTime,
            emotions,
            sessionId: result.session_id || sessionId || 'unknown'
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
          // デバッグ: resultの全キーを確認
          if (index < 5) {
            console.log(`Result ${index} (${source}) result keys:`, Object.keys(result));
            console.log(`Result ${index} (${source}) result sample:`, JSON.stringify(result).substring(0, 500));
          }
        }
      });
      
      console.log('Total mapped results:', mappedResults.length);
    } else {
      console.log('No emotion results to process');
      
      // 古い構造（EmotionData）も試す（新しい構造でデータが見つからない場合）
      const oldEmotionQuery = `
        MATCH (p:Participant {id: $participantId})-[:HAS_EXPERIMENT]->(e:Experiment)-[:HAS_SESSION]->(s:ExperimentSession)
        MATCH (s)-[:HAS_EMOTION_DATA]->(ed:EmotionData)
        RETURN ed.name as name, ed.score as score, ed.timestamp as timestamp, ed.source as source
        ORDER BY ed.timestamp
      `;
      console.log('Executing emotion query (old structure):', oldEmotionQuery);
      const oldEmotionResults = await client.query(oldEmotionQuery, { participantId });
      console.log('Emotion query results count (old structure):', oldEmotionResults.length);
      
      if (oldEmotionResults.length > 0) {
        oldEmotionResults.forEach((result: any) => {
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
    }

    console.log('Mapped emotion results:', mappedResults.slice(0, 3));
    return mappedResults;

  } catch (error) {
    console.error('=== Neo4j Emotion Data Query Error ===');
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // エラーオブジェクトの詳細を出力
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      if ((error as any).code) {
        console.error('Error code:', (error as any).code);
      }
      if ((error as any).cause) {
        console.error('Error cause:', (error as any).cause);
      }
    }
    
    // Neo4j固有のエラー情報を出力
    if (error && typeof error === 'object') {
      const errorObj = error as any;
      if (errorObj.code) {
        console.error('Neo4j error code:', errorObj.code);
      }
      if (errorObj.message) {
        console.error('Neo4j error message:', errorObj.message);
      }
    }
    
    return [];
  }
}

// Merkle DAG: participants.timeline.get_physiological_data_from_neo4j
// Neo4jから生理データ取得関数
async function getPhysiologicalData(client: any, participantId: string, sessionId?: string): Promise<any[]> {
  try {
    console.log('Getting physiological data from Neo4j for participant:', participantId, sessionId ? `session: ${sessionId}` : '');
    
    let physiologicalResults: any[] = [];
    
    // 新しい構造（Participant -> Session -> PhysiologicalData）を試す
    try {
      const builder = new Neo4jQueryBuilder();
      const { query, params } = builder.buildPhysiologicalDataQuery(participantId, sessionId);
      
      console.log('=== Physiological Data Query (New Structure) ===');
      console.log('Query:', query);
      console.log('Params:', JSON.stringify(params, null, 2));
      
      physiologicalResults = await client.query(query, params);
      console.log('Physiological query results count (new structure):', physiologicalResults.length);
      
      // 新しい構造でデータが見つからない場合、古い構造を試す
      if (physiologicalResults.length === 0) {
        try {
          const oldBuilder = new Neo4jQueryBuilder();
          const { query: oldQuery, params: oldParams } = oldBuilder.buildOldPhysiologicalDataQuery(participantId);
          
          console.log('=== Physiological Data Query (Old Structure) ===');
          console.log('Query:', oldQuery);
          console.log('Params:', JSON.stringify(oldParams, null, 2));
          
          physiologicalResults = await client.query(oldQuery, oldParams);
          console.log('Physiological query results count (old structure):', physiologicalResults.length);
        } catch (oldError) {
          console.error('Error fetching physiological data (old structure):', oldError);
          console.error('Error type:', oldError instanceof Error ? oldError.constructor.name : typeof oldError);
          console.error('Error message:', oldError instanceof Error ? oldError.message : String(oldError));
          console.error('Error stack:', oldError instanceof Error ? oldError.stack : 'No stack trace');
          // 古い構造のエラーは無視して続行（空配列のまま）
        }
      }
    } catch (newError) {
      console.error('Error fetching physiological data (new structure):', newError);
      console.error('Error type:', newError instanceof Error ? newError.constructor.name : typeof newError);
      console.error('Error message:', newError instanceof Error ? newError.message : String(newError));
      console.error('Error stack:', newError instanceof Error ? newError.stack : 'No stack trace');
      // 新しい構造のエラーは無視して続行（空配列のまま）
      physiologicalResults = [];
    }
    
    // クエリビルダーを使用しているため、プロパティは既に展開されている
    // 新しい構造の場合（ch1-ch8プロパティ）
    if (physiologicalResults.length > 0 && physiologicalResults[0].ch1 !== undefined) {
      // Neo4j Integer型に対応するヘルパー関数
      const toNumber = (value: any): number => {
        if (value === null || value === undefined) return 0;
        if (typeof value === 'object' && value !== null && 'low' in value) {
          return value.low;
        }
        return Number(value) || 0;
      };
      
      // 時系列データポイントに変換
      const timePoints: Record<number, any> = {};
      physiologicalResults.forEach((result: any) => {
        const timeSecValue = toNumber(result.timeSec);
        const timestampValue = toNumber(result.timestamp);
        const timeKey = Math.floor(timeSecValue); // 秒単位でグループ化
        
        if (!timePoints[timeKey]) {
          timePoints[timeKey] = {
            timeSec: timeSecValue,
            timestamp: timestampValue,
            channels: {}
          };
        }
        
        // チャンネルデータを追加（Neo4j Integer型に対応）
        if (result.ch1 !== undefined) timePoints[timeKey].channels.Ch1 = toNumber(result.ch1);
        if (result.ch2 !== undefined) timePoints[timeKey].channels.Ch2 = toNumber(result.ch2);
        if (result.ch3 !== undefined) timePoints[timeKey].channels.Ch3 = toNumber(result.ch3);
        if (result.ch4 !== undefined) timePoints[timeKey].channels.Ch4 = toNumber(result.ch4);
        if (result.ch5 !== undefined) timePoints[timeKey].channels.Ch5 = toNumber(result.ch5);
        if (result.ch6 !== undefined) timePoints[timeKey].channels.Ch6 = toNumber(result.ch6);
        if (result.ch7 !== undefined) timePoints[timeKey].channels.Ch7 = toNumber(result.ch7);
        if (result.ch8 !== undefined) timePoints[timeKey].channels.Ch8 = toNumber(result.ch8);
      });
      
      const result = Object.values(timePoints).sort((a: any, b: any) => a.timeSec - b.timeSec);
      console.log('Processed physiological data points (new structure):', result.length);
      return result;
    }
    
    // 古い構造の場合（channel/valueプロパティ）
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
    console.log('Processed physiological data points (old structure):', result.length);
    return result;

  } catch (error) {
    console.error('=== Neo4j Physiological Data Query Error ===');
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // エラーオブジェクトの詳細を出力
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      if ((error as any).code) {
        console.error('Error code:', (error as any).code);
      }
      if ((error as any).cause) {
        console.error('Error cause:', (error as any).cause);
      }
    }
    
    // Neo4j固有のエラー情報を出力
    if (error && typeof error === 'object') {
      const errorObj = error as any;
      if (errorObj.code) {
        console.error('Neo4j error code:', errorObj.code);
      }
      if (errorObj.message) {
        console.error('Neo4j error message:', errorObj.message);
      }
    }
    
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
      const sessionStartTime = sessionData.startTime || 0;
      
      // セッション開始時刻からの相対時間を計算（ミリ秒単位）
      const relativeTimestampMs = timestamp - sessionStartTime;
      const relativeTimestampSec = relativeTimestampMs / 1000; // 秒単位に変換
      
      // デバッグログ（最初の10件と、マッチが見つからない場合）
      const isDebugTarget = timelineData.length < 10 || (timelineData.length % 20 === 0);
      if (isDebugTarget) {
        console.log(`[${timelineData.length}] Matching emotions for word "${word}" at timestamp ${timestamp} (relative: ${relativeTimestampSec.toFixed(2)}s)`);
        console.log(`  Session start time: ${sessionStartTime}, Available emotion data count: ${emotionData.length}`);
        if (emotionData.length > 0) {
          const firstEmotion = emotionData[0];
          console.log(`  First emotion sample:`, {
            beginTime: firstEmotion.beginTime,
            endTime: firstEmotion.endTime,
            fileType: firstEmotion.fileType,
            emotionsCount: firstEmotion.emotions?.length || 0
          });
          // 時間範囲のサンプルを表示
          const sampleTimes = emotionData.slice(0, 10).map(e => ({
            beginTime: e.beginTime,
            endTime: e.endTime,
            fileType: e.fileType
          }));
          console.log(`  First 10 emotion time ranges:`, sampleTimes);
        }
      }
      
      const relatedEmotions = emotionData.filter(emotion => {
        const beginTime = emotion.beginTime || 0; // 秒単位
        const endTime = emotion.endTime || (beginTime > 0 ? beginTime + 1 : 1); // 秒単位
        
        // 感情データの時間範囲でマッチング
        // より柔軟なマッチング：±60秒の範囲内、または時間範囲内
        const timeDiff = Math.abs(relativeTimestampSec - beginTime);
        const isInRange = beginTime <= relativeTimestampSec && endTime >= relativeTimestampSec;
        const matches = timeDiff <= 60 || isInRange;
        
        // デバッグログ（マッチした場合、または最初の10件でマッチしなかった場合）
        if (matches && isDebugTarget) {
          console.log(`    ✓ Matched: ${emotion.fileType}, beginTime=${beginTime}s, endTime=${endTime}s, timeDiff=${timeDiff.toFixed(2)}s`);
        }
        
        return matches;
      });
      
      // デバッグログ（マッチが見つからない場合、または最初の10件）
      if (isDebugTarget) {
        console.log(`  → Found ${relatedEmotions.length} matching emotions for word "${word}"`);
        if (relatedEmotions.length === 0 && emotionData.length > 0) {
          // 最も近い感情データを探す
          const closestEmotion = emotionData.reduce((closest, current) => {
            const currentDiff = Math.abs(relativeTimestampSec - (current.beginTime || 0));
            const closestDiff = Math.abs(relativeTimestampSec - (closest.beginTime || 0));
            return currentDiff < closestDiff ? current : closest;
          });
          const closestDiff = Math.abs(relativeTimestampSec - (closestEmotion.beginTime || 0));
          console.log(`  ⚠ Closest emotion: ${closestEmotion.fileType}, beginTime=${closestEmotion.beginTime}s, diff=${closestDiff.toFixed(2)}s`);
        }
      }
      
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
      
      // デバッグ: 感情データの統合状況を確認（最初の10件と、感情データが見つかった場合）
      const hasEmotions = emotionDetails.length > 0;
      if (timelineData.length < 10 || (hasEmotions && timelineData.length < 50)) {
        console.log(`Timeline point ${timelineData.length}: word=${word}, timestamp=${timestamp}, relatedEmotions=${relatedEmotions.length}, emotionDetails=${emotionDetails.length}`, {
          emotionTypes: emotionDetails.map(e => e.fileType),
          emotionNames: emotionDetails.map(e => e.name).slice(0, 5),
          emotionScores: emotionDetails.map(e => e.score).slice(0, 5),
          relatedEmotionTimes: relatedEmotions.slice(0, 3).map(e => ({ beginTime: e.beginTime, endTime: e.endTime, fileType: e.fileType, emotionsCount: e.emotions?.length || 0 }))
        });
      }
      
      // 感情データが存在する場合の統計
      if (emotionDetails.length > 0 && timelineData.length < 10) {
        const emotionTypeCounts = emotionDetails.reduce((acc: any, e: any) => {
          acc[e.fileType] = (acc[e.fileType] || 0) + 1;
          return acc;
        }, {});
        console.log(`Emotion type counts for word "${word}":`, emotionTypeCounts);
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
        const allValues = relatedPhysiological.flatMap(p => {
          const channels = p.channels || {};
          return Object.values(channels).filter((v: any) => typeof v === 'number' && !isNaN(v)) as number[];
        });
        
        if (allValues.length > 0) {
          physiologicalValues.average = allValues.reduce((sum, val) => sum + val, 0) / allValues.length;
          physiologicalValues.max = Math.max(...allValues);
          physiologicalValues.min = Math.min(...allValues);
        }
        
        // 各チャンネルの平均値を計算
        ['Ch1', 'Ch2', 'Ch3', 'Ch4', 'Ch5', 'Ch6', 'Ch7', 'Ch8'].forEach(ch => {
          const channelValues = relatedPhysiological
            .map(p => {
              const channels = p.channels || {};
              const val = channels[ch] || 0;
              return typeof val === 'number' && !isNaN(val) ? val : 0;
            })
            .filter(v => v > 0);
          
          if (channelValues.length > 0) {
            physiologicalValues.channels[ch] = channelValues.reduce((sum, val) => sum + val, 0) / channelValues.length;
          } else {
            physiologicalValues.channels[ch] = 0;
          }
        });
      }
      
      // NaNを防ぐための安全な計算
      const safeEmotionTotal = isNaN(emotionValues.total) ? 0 : emotionValues.total;
      const safePhysioAverage = isNaN(physiologicalValues.average) ? 0 : physiologicalValues.average;
      const safeReactionValue = safeEmotionTotal + safePhysioAverage;
      
      // 統合データポイントを作成
      timelineData.push({
        timestamp,
        word,
        eventType: event.type,
        reactionTime: reactionTime, // 反応時間を追加
        emotions: emotionDetails, // 詳細な感情データ（fileTypeを含む）
        physiological: {
          average: safePhysioAverage,
          max: isNaN(physiologicalValues.max) ? 0 : physiologicalValues.max,
          min: isNaN(physiologicalValues.min) ? 0 : physiologicalValues.min,
          channels: physiologicalValues.channels || {}
        },
        reactionValue: safeReactionValue,
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