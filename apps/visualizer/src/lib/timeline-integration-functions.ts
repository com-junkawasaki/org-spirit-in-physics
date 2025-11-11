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
  const allEmotionResults: any[] = [];
  const emotionTypes: Array<'burst' | 'face' | 'language' | 'prosody'> = ['burst', 'face', 'language', 'prosody'];
  
  for (const emotionType of emotionTypes) {
    try {
      const builder = new Neo4jQueryBuilder();
      const { query, params } = builder.buildEmotionDataQuery(emotionType, participantId, sessionId);
      const results = await client.query(query, params);
      
      if (results.length > 0) {
        const mappedResults = results.map((result: any) => {
          let emotionScoresObj: any = {};
          if (result.emotion_scores) {
            if (typeof result.emotion_scores === 'string') {
              emotionScoresObj = JSON.parse(result.emotion_scores);
            } else {
              emotionScoresObj = result.emotion_scores;
            }
          }

          const toNumber = (value: any): number => {
            if (value === null || value === undefined) return 0;
            if (typeof value === 'object' && value !== null && 'low' in value) {
              return value.low;
            }
            return Number(value) || 0;
          };

          const beginTime = toNumber(result.begin_time) || toNumber(result.time) || 0;
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

          return {
            fileType: emotionType,
            beginTime,
            endTime,
            emotions,
            sessionId: result.session_id || sessionId || 'unknown'
          };
        });

        allEmotionResults.push(...mappedResults);
      }
    } catch (error) {
      console.warn(`Skipping ${emotionType} emotion data due to error:`, error);
    }
  }

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
  const timelineData: any[] = [];
  const wordDisplayedEvents = sessionData.wordEvents.filter((event: any) => event.type === 'word_displayed');
  const speechDetectedEvents = sessionData.wordEvents.filter((event: any) => event.type === 'speech_detected');
  const sessionStartTime = sessionData.startTime || 0;

  const sortedEmotions = [...emotionData].sort((a, b) => (a.beginTime || 0) - (b.beginTime || 0));
  const emotionTimeIndex: Map<number, any[]> = new Map();
  sortedEmotions.forEach(emotion => {
    const beginTime = Math.floor(emotion.beginTime || 0);
    if (!emotionTimeIndex.has(beginTime)) {
      emotionTimeIndex.set(beginTime, []);
    }
    emotionTimeIndex.get(beginTime)!.push(emotion);
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
      }
    });

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

