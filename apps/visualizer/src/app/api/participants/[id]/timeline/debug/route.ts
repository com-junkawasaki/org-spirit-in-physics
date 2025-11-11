// Merkle DAG: participants.timeline.debug.endpoint
// タイムラインデータのデバッグ情報取得APIエンドポイント

import { NextRequest, NextResponse } from "next/server";
import { createNeo4jClient } from '@/lib/neo4j';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: participantId } = params;
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    const client = createNeo4jClient();
    
    const debugInfo: any = {
      participantId,
      sessionId: sessionId || null,
      timestamp: new Date().toISOString(),
      checks: {}
    };
    
    // 1. Sessionノードの存在確認
    try {
      const sessionQuery = sessionId
        ? `MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session {id: $sessionId}) RETURN s`
        : `MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session) RETURN s ORDER BY s.created_at DESC LIMIT 1`;
      
      const sessionResults = await client.query(sessionQuery, { participantId, sessionId: sessionId || undefined });
      const sessionRecord = sessionResults.length > 0 ? sessionResults[0] : null;
      const sessionNode = sessionRecord?.s || sessionRecord;
      
      debugInfo.checks.session = {
        exists: sessionResults.length > 0,
        count: sessionResults.length,
        sample: sessionNode ? {
          id: sessionNode.id,
          hasEvents: !!sessionNode.events,
          eventsType: typeof sessionNode.events,
          startTs: sessionNode.start_ts,
          endTs: sessionNode.end_ts,
          sessionIndex: sessionNode.session_index
        } : null
      };
      
      // eventsの内容を確認
      if (sessionNode) {
        const events = sessionNode.events;
        let parsedEvents: any[] = [];
        if (events) {
          if (typeof events === 'string') {
            try {
              parsedEvents = JSON.parse(events);
            } catch (e) {
              // パース失敗
            }
          } else if (Array.isArray(events)) {
            parsedEvents = events;
          }
        }
        debugInfo.checks.session.eventsInfo = {
          total: parsedEvents.length,
          wordDisplayed: parsedEvents.filter((e: any) => e.type === 'word_displayed').length,
          speechDetected: parsedEvents.filter((e: any) => e.type === 'speech_detected').length,
          firstEvent: parsedEvents[0] || null,
          lastEvent: parsedEvents[parsedEvents.length - 1] || null
        };
      }
    } catch (error: any) {
      debugInfo.checks.session = { error: error.message };
    }
    
    // 2. 感情データの存在確認
    const emotionTypes = ['BurstEmotionData', 'FaceEmotionData', 'LanguageEmotionData', 'ProsodyEmotionData'];
    const emotionRelationships = ['HAS_BURST_EMOTION_DATA', 'HAS_FACE_EMOTION_DATA', 'HAS_LANGUAGE_EMOTION_DATA', 'HAS_PROSODY_EMOTION_DATA'];
    
    for (let i = 0; i < emotionTypes.length; i++) {
      const emotionType = emotionTypes[i];
      const relationship = emotionRelationships[i];
      const source = emotionType.toLowerCase().replace('emotiondata', ''); // burst, face, language, prosody
      
      try {
        const emotionQuery = sessionId
          ? `MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session {id: $sessionId})-[:${relationship}]->(e:${emotionType}) RETURN e LIMIT 10`
          : `MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session)-[:${relationship}]->(e:${emotionType}) RETURN e LIMIT 10`;
        
        const emotionResults = await client.query(emotionQuery, { participantId, sessionId: sessionId || undefined });
        const emotionRecord = emotionResults.length > 0 ? emotionResults[0] : null;
        const emotionNode = emotionRecord?.e || emotionRecord;
        
        debugInfo.checks[source] = {
          exists: emotionResults.length > 0,
          count: emotionResults.length,
          sample: emotionNode ? {
            id: emotionNode.id,
            hasEmotionScores: !!emotionNode.emotion_scores,
            emotionScoresType: typeof emotionNode.emotion_scores,
            beginTime: emotionNode.begin_time || emotionNode.time,
            endTime: emotionNode.end_time,
            sessionId: emotionNode.session_id
          } : null
        };
        
        // emotion_scoresの内容を確認
        if (emotionNode) {
          const emotionScores = emotionNode.emotion_scores;
          let parsedScores: any = {};
          if (emotionScores) {
            if (typeof emotionScores === 'string') {
              try {
                parsedScores = JSON.parse(emotionScores);
              } catch (e) {
                // パース失敗
              }
            } else if (typeof emotionScores === 'object') {
              parsedScores = emotionScores;
            }
          }
          debugInfo.checks[source].emotionScoresInfo = {
            totalEmotions: Object.keys(parsedScores).length,
            emotionNames: Object.keys(parsedScores).slice(0, 10),
            sampleScores: Object.entries(parsedScores).slice(0, 5).reduce((acc: any, [name, score]) => {
              acc[name] = score;
              return acc;
            }, {})
          };
        }
      } catch (error: any) {
        debugInfo.checks[source] = { error: error.message };
      }
    }
    
    // 3. 生理データの存在確認
    try {
      const physioQuery = sessionId
        ? `MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session {id: $sessionId})-[:HAS_PHYSIOLOGICAL_DATA]->(pd:PhysiologicalData) RETURN pd LIMIT 10`
        : `MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session)-[:HAS_PHYSIOLOGICAL_DATA]->(pd:PhysiologicalData) RETURN pd LIMIT 10`;
      
      const physioResults = await client.query(physioQuery, { participantId, sessionId: sessionId || undefined });
      const physioRecord = physioResults.length > 0 ? physioResults[0] : null;
      const physioNode = physioRecord?.pd || physioRecord;
      
      debugInfo.checks.physiological = {
        exists: physioResults.length > 0,
        count: physioResults.length,
        sample: physioNode ? {
          id: physioNode.id,
          timestamp: physioNode.timestamp,
          channels: Object.keys(physioNode.channels || {}).length
        } : null
      };
    } catch (error: any) {
      debugInfo.checks.physiological = { error: error.message };
    }
    
    // 4. データ信頼性スコアの計算
    const reliability = {
      session: debugInfo.checks.session?.exists ? 1.0 : 0.0,
      emotions: {
        burst: debugInfo.checks.burst?.exists ? 1.0 : 0.0,
        face: debugInfo.checks.face?.exists ? 1.0 : 0.0,
        language: debugInfo.checks.language?.exists ? 1.0 : 0.0,
        prosody: debugInfo.checks.prosody?.exists ? 1.0 : 0.0
      },
      physiological: debugInfo.checks.physiological?.exists ? 1.0 : 0.0
    };
    
    const emotionCount = Object.values(reliability.emotions).filter(v => v > 0).length;
    reliability.emotions.total = emotionCount / 4; // 4種類中何種類存在するか
    
    reliability.overall = (
      reliability.session * 0.3 +
      reliability.emotions.total * 0.5 +
      reliability.physiological * 0.2
    );
    
    debugInfo.reliability = reliability;
    
    return NextResponse.json(debugInfo);
  } catch (error: any) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { error: error.message || 'Unknown error', checks: {}, reliability: { overall: 0 } },
      { status: 500 }
    );
  }
}

