// Merkle DAG: timeline_integration_functions -> shared_integration_logic
// 時系列統合処理の共通関数
// 依存関係: neo4j client, Neo4jQueryBuilder
// BPMN: TimelineIntegrationProcess

import { Neo4jQueryBuilder } from './neo4j-query-builder';

/**
 * セッションデータ取得関数（詳細なログとエラーハンドリング付き）
 */
export async function getSessionData(client: any, participantId: string, sessionId?: string): Promise<any> {
  try {
    console.log('Getting session data from Neo4j for participant:', participantId, sessionId ? `session: ${sessionId}` : '');
    
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
      
      // 新しい構造でデータが見つからない場合、古い構造を試す
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
          throw oldError;
        }
      }
    } catch (newError) {
      console.error('Error fetching session data (new structure):', newError);
      throw newError;
    }
    
    if (sessionResults.length === 0) {
      throw new Error(`No session data found for participant: ${participantId}`);
    }
    
    let sessionData: any;
    if (sessionResults[0].events) {
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

    const wordEvents = (sessionData.events || []).filter((event: any) => 
      event.type === 'word_displayed' || 
      event.type === 'response_window_opened' || 
      event.type === 'response_window_closed' ||
      event.type === 'speech_detected'
    );

    let startTime = 0;
    const startTsRaw = sessionResults[0].startTs;
    
    if (startTsRaw) {
      if (typeof startTsRaw === 'object' && startTsRaw !== null && 'low' in startTsRaw) {
        startTime = startTsRaw.low;
      } else if (typeof startTsRaw === 'number') {
        startTime = startTsRaw;
      }
    }

    if (startTime === 0 && sessionData.events?.length > 0 && sessionData.events[0].timestamp) {
      startTime = sessionData.events[0].timestamp;
    }

    if (startTime === 0) {
      console.warn('⚠️ WARNING: Session start time is 0 - time matching may fail');
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
    throw error;
  }
}

/**
 * 感情データ取得関数
 */
export async function getEmotionData(client: any, participantId: string, sessionId?: string): Promise<any[]> {
  console.log('[GET_EMOTION_DATA] Starting emotion data fetch for participant:', participantId, sessionId ? `session: ${sessionId}` : '');
  const allEmotionResults: any[] = [];
  const emotionTypes: Array<'burst' | 'face' | 'language' | 'prosody'> = ['burst', 'face', 'language', 'prosody'];
  
  for (const emotionType of emotionTypes) {
    try {
      const builder = new Neo4jQueryBuilder();
      const { query, params } = builder.buildEmotionDataQuery(emotionType, participantId, sessionId);
      const results = await client.query(query, params);
      
      console.log(`[GET_EMOTION_DATA] ${emotionType}: fetched ${results.length} raw results`);
      
      if (results.length > 0) {
        const mappedResults = results.map((result: any) => {
          let emotionScoresObj: any = {};
          if (result.emotion_scores) {
            if (typeof result.emotion_scores === 'string') {
              try {
                emotionScoresObj = JSON.parse(result.emotion_scores);
              } catch (e) {
                console.warn(`[GET_EMOTION_DATA] Failed to parse emotion_scores JSON for ${emotionType}:`, e);
              }
            } else {
              emotionScoresObj = result.emotion_scores;
            }
          } else {
            // デバッグ: emotion_scoresが存在しない場合
            if (allEmotionResults.length < 3) {
              console.log(`[GET_EMOTION_DATA] ${emotionType}: result without emotion_scores:`, {
                keys: Object.keys(result),
                hasBeginTime: !!result.begin_time,
                hasTime: !!result.time
              });
            }
          }

          const toNumber = (value: any): number => {
            if (value === null || value === undefined) return 0;
            if (typeof value === 'object' && value !== null && 'low' in value) {
              return value.low;
            }
            return Number(value) || 0;
          };

          // 5パターンの時間フィールド処理:
          // 1. burst: begin_time (秒単位)
          // 2. face: time (秒単位、begin_timeが存在しない場合はtimeを使用)
          // 3. language: begin_time (秒単位)
          // 4. prosody: begin_time (秒単位)
          // 5. physiological: time_sec (秒単位) - 別関数で処理
          let beginTime = 0;
          if (emotionType === 'face') {
            // faceデータはtimeフィールドを優先（begin_timeが存在しない可能性が高い）
            const timeValue = toNumber(result.time);
            const beginTimeValue = toNumber(result.begin_time);
            // timeが1000より大きい場合はミリ秒単位と判断して秒に変換
            if (timeValue > 1000) {
              beginTime = timeValue / 1000;
            } else if (timeValue > 0) {
              beginTime = timeValue;
            } else if (beginTimeValue > 0) {
              beginTime = beginTimeValue;
            }
          } else {
            // burst, language, prosodyはbegin_timeを優先
            beginTime = toNumber(result.begin_time);
            if (beginTime === 0) {
              // begin_timeが0の場合はtimeフィールドを試す
              const timeValue = toNumber(result.time);
              if (timeValue > 1000) {
                beginTime = timeValue / 1000; // ミリ秒の場合は秒に変換
              } else if (timeValue > 0) {
                beginTime = timeValue;
              }
            }
          }
          
          const endTime = toNumber(result.end_time) || (beginTime > 0 ? beginTime + 1 : 1);

          const normalizeEmotionName = (name: string): string => {
            const cleaned = name.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
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
            return mapping[cleaned] || cleaned;
          };

          const emotions = Object.entries(emotionScoresObj)
            .map(([name, score]) => ({
              name: normalizeEmotionName(name),
              score: Math.min(Math.max(Number(score) || 0, 0), 1)
            }))
            .filter(e => e.score > 0);

          // デバッグ: 感情データが空の場合
          if (emotions.length === 0 && allEmotionResults.length < 5) {
            console.log(`[GET_EMOTION_DATA] ${emotionType}: mapped result with no emotions:`, {
              emotionScoresObjKeys: Object.keys(emotionScoresObj),
              emotionScoresObjSample: Object.entries(emotionScoresObj).slice(0, 3),
              beginTime,
              endTime
            });
          }

          return {
            fileType: emotionType,
            beginTime,
            endTime,
            emotions,
            sessionId: result.session_id || sessionId || 'unknown'
          };
        });

        const resultsWithEmotions = mappedResults.filter(r => r.emotions.length > 0);
        console.log(`[GET_EMOTION_DATA] ${emotionType}: mapped ${mappedResults.length} results, ${resultsWithEmotions.length} with emotions`);
        
        if (resultsWithEmotions.length > 0 && allEmotionResults.length < 3) {
          console.log(`[GET_EMOTION_DATA] ${emotionType}: sample with emotions:`, {
            fileType: resultsWithEmotions[0].fileType,
            beginTime: resultsWithEmotions[0].beginTime,
            emotionsCount: resultsWithEmotions[0].emotions.length,
            emotionsSample: resultsWithEmotions[0].emotions.slice(0, 3)
          });
        }

        allEmotionResults.push(...mappedResults);
      }
    } catch (error) {
      console.error(`[GET_EMOTION_DATA] Error fetching ${emotionType} emotion data:`, error);
    }
  }

  const totalWithEmotions = allEmotionResults.filter(r => r.emotions && r.emotions.length > 0).length;
  console.log(`[GET_EMOTION_DATA] Total: ${allEmotionResults.length} entries, ${totalWithEmotions} with emotions (${((totalWithEmotions / allEmotionResults.length) * 100).toFixed(1)}%)`);

  return allEmotionResults;
}

/**
 * 生理データ取得関数
 */
export async function getPhysiologicalData(client: any, participantId: string, sessionId?: string): Promise<any[]> {
  const builder = new Neo4jQueryBuilder();
  const { query, params } = builder.buildPhysiologicalDataQuery(participantId, sessionId);
  const physiologicalResults = await client.query(query, params);

  if (physiologicalResults.length === 0) {
    return [];
  }

  const toNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'object' && value !== null && 'low' in value) {
      return value.low;
    }
    return Number(value) || 0;
  };

  const timePoints: Record<number, any> = {};
  physiologicalResults.forEach((result: any) => {
    const timeSecValue = toNumber(result.timeSec);
    const timestampValue = toNumber(result.timestamp);
    const timeKey = Math.floor(timeSecValue);

    if (!timePoints[timeKey]) {
      timePoints[timeKey] = {
        timeSec: timeSecValue,
        timestamp: timestampValue,
        channels: {}
      };
    }

    if (result.ch1 !== undefined) timePoints[timeKey].channels.Ch1 = toNumber(result.ch1);
    if (result.ch2 !== undefined) timePoints[timeKey].channels.Ch2 = toNumber(result.ch2);
    if (result.ch3 !== undefined) timePoints[timeKey].channels.Ch3 = toNumber(result.ch3);
    if (result.ch4 !== undefined) timePoints[timeKey].channels.Ch4 = toNumber(result.ch4);
    if (result.ch5 !== undefined) timePoints[timeKey].channels.Ch5 = toNumber(result.ch5);
    if (result.ch6 !== undefined) timePoints[timeKey].channels.Ch6 = toNumber(result.ch6);
    if (result.ch7 !== undefined) timePoints[timeKey].channels.Ch7 = toNumber(result.ch7);
    if (result.ch8 !== undefined) timePoints[timeKey].channels.Ch8 = toNumber(result.ch8);
  });

  return Object.values(timePoints).sort((a: any, b: any) => a.timeSec - b.timeSec);
}

/**
 * 時系列データ統合関数
 */
export function integrateTimelineData(sessionData: any, emotionData: any[], physiologicalData: any[]): any[] {
  console.log('[INTEGRATION] Starting integration:', {
    sessionEvents: sessionData.wordEvents.length,
    emotionDataCount: emotionData.length,
    physiologicalDataCount: physiologicalData.length
  });
  
  // デバッグ: 感情データのサンプルを確認
  if (emotionData.length > 0) {
    console.log('[INTEGRATION] First emotion data sample:', {
      fileType: emotionData[0].fileType,
      beginTime: emotionData[0].beginTime,
      endTime: emotionData[0].endTime,
      emotions: emotionData[0].emotions,
      emotionsLength: Array.isArray(emotionData[0].emotions) ? emotionData[0].emotions.length : 'not array',
      emotionsType: typeof emotionData[0].emotions
    });
    
    // 感情データタイプの数を確認
    const emotionTypes = emotionData.reduce((acc: any, e: any) => {
      const type = e.fileType || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    console.log('[INTEGRATION] Emotion data types count:', emotionTypes);
    
    // 感情データが含まれているエントリの数を確認
    const entriesWithEmotions = emotionData.filter(e => Array.isArray(e.emotions) && e.emotions.length > 0);
    console.log('[INTEGRATION] Entries with emotions:', entriesWithEmotions.length, `(${((entriesWithEmotions.length / emotionData.length) * 100).toFixed(1)}%)`);
    
    if (entriesWithEmotions.length > 0) {
      console.log('[INTEGRATION] Sample entry with emotions:', {
        fileType: entriesWithEmotions[0].fileType,
        emotions: entriesWithEmotions[0].emotions.slice(0, 3)
      });
    }
  } else {
    console.warn('[INTEGRATION] ⚠️ No emotion data provided!');
  }
  
  const timelineData: any[] = [];
  const wordDisplayedEvents = sessionData.wordEvents.filter((event: any) => event.type === 'word_displayed');
  const speechDetectedEvents = sessionData.wordEvents.filter((event: any) => event.type === 'speech_detected');
  const sessionStartTime = sessionData.startTime || 0;

  const sortedEmotions = [...emotionData].sort((a, b) => (a.beginTime || 0) - (b.beginTime || 0));
  
  // 時間インデックス: beginTimeが0のデータは特別なキー(-1)で管理
  const emotionTimeIndex: Map<number, any[]> = new Map();
  const zeroTimeEmotions: any[] = []; // beginTimeが0のデータを別途管理
  
  sortedEmotions.forEach(emotion => {
    const beginTime = emotion.beginTime || 0;
    if (beginTime === 0) {
      // beginTimeが0のデータは全時間範囲に適用するため、別途管理
      zeroTimeEmotions.push(emotion);
    } else {
      const timeSec = Math.floor(beginTime);
      if (!emotionTimeIndex.has(timeSec)) {
        emotionTimeIndex.set(timeSec, []);
      }
      const bucket = emotionTimeIndex.get(timeSec);
      if (bucket) {
        bucket.push(emotion);
      }
    }
  });
  
  console.log('[INTEGRATION] Emotion time index stats:', {
    indexedEmotions: Array.from(emotionTimeIndex.values()).reduce((sum, arr) => sum + arr.length, 0),
    zeroTimeEmotions: zeroTimeEmotions.length,
    timeBuckets: emotionTimeIndex.size,
    sampleTimeBuckets: Array.from(emotionTimeIndex.keys()).slice(0, 10).sort((a, b) => a - b)
  });

  wordDisplayedEvents.forEach((event: any, eventIndex: number) => {
    const timestamp = event.timestamp;
    const word = event.payload?.word || 'Unknown';

    const nextWordIndex = eventIndex + 1;
    const nextWordTimestamp = nextWordIndex < wordDisplayedEvents.length 
      ? wordDisplayedEvents[nextWordIndex].timestamp 
      : timestamp + 10000;

    const speechEvent = speechDetectedEvents.find((speechEvent: any) => 
      speechEvent.timestamp > timestamp && speechEvent.timestamp <= nextWordTimestamp
    );
    const reactionTime = speechEvent ? speechEvent.timestamp - timestamp : null;

    const relativeTimestampMs = timestamp - sessionStartTime;
    const relativeTimestampSec = relativeTimestampMs / 1000;

    const relatedEmotions: any[] = [];
    const searchStartSec = Math.max(0, Math.floor(relativeTimestampSec - 60));
    const searchEndSec = Math.ceil(relativeTimestampSec + 60);

    // 1. 時間インデックスから該当する感情データを検索
    for (let timeSec = searchStartSec; timeSec <= searchEndSec; timeSec++) {
      const bucketEmotions = emotionTimeIndex.get(timeSec) || [];
      bucketEmotions.forEach(emotion => {
        const beginTime = emotion.beginTime || 0;
        const endTime = emotion.endTime || (beginTime > 0 ? beginTime + 1 : 1);
        const timeDiff = Math.abs(relativeTimestampSec - beginTime);
        const isInRange = beginTime <= relativeTimestampSec && endTime >= relativeTimestampSec;
        const matches = timeDiff <= 60 || isInRange;

        if (matches) {
          relatedEmotions.push(emotion);
        }
      });
    }
    
    // 2. beginTimeが0のデータも全時間範囲に適用（burst, faceデータなど）
    zeroTimeEmotions.forEach(emotion => {
      // 重複チェック（既に追加されている場合はスキップ）
      if (!relatedEmotions.find(e => e === emotion)) {
        relatedEmotions.push(emotion);
      }
    });

    const relatedPhysiological = physiologicalData.filter(physio => {
      const physioTimestamp = physio.timeSec * 1000;
      return Math.abs(physioTimestamp - timestamp) <= 5000;
    });

    const emotionDetails: any[] = [];
    relatedEmotions.forEach(emotion => {
      const emotions = emotion.emotions || [];
      const fileType = emotion.fileType || 'unknown';

      if (emotions.length > 0) {
        emotions.forEach((e: any) => {
          emotionDetails.push({
            name: e.name || 'unknown',
            score: e.score || 0,
            fileType: fileType
          });
        });
      } else {
        // デバッグ: 感情データが空の場合のログ
        if (eventIndex < 5) {
          console.log(`[INTEGRATION DEBUG] Word "${word}" at ${timestamp}: emotion.emotions is empty`, {
            emotion,
            fileType,
            hasEmotions: !!emotion.emotions,
            emotionsType: typeof emotion.emotions,
            emotionsLength: Array.isArray(emotion.emotions) ? emotion.emotions.length : 'not array'
          });
        }
      }
    });
    
    // デバッグ: 感情データの統計（最初の10件のみ）
    if (eventIndex < 10) {
      console.log(`[INTEGRATION DEBUG] Word "${word}" at ${timestamp}:`, {
        relatedEmotionsCount: relatedEmotions.length,
        emotionDetailsCount: emotionDetails.length,
        emotionDetailsSample: emotionDetails.slice(0, 3)
      });
    }

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

    const safeEmotionTotal = isNaN(emotionValues.total) ? 0 : emotionValues.total;
    const safePhysioAverage = isNaN(physiologicalValues.average) ? 0 : physiologicalValues.average;
    const safeReactionValue = safeEmotionTotal + safePhysioAverage;

    timelineData.push({
      timestamp,
      word,
      eventType: event.type,
      reactionTime: reactionTime,
      emotions: emotionDetails,
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
}

// Merkle DAG: timeline_integration_functions -> implementation_complete
// 時系列統合処理共通関数の実装完了

