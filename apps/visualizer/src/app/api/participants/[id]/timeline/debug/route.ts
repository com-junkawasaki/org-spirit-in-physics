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
      const sessionNodeRaw = sessionRecord?.s || sessionRecord;
      // Neo4jクライアントはpropertiesオブジェクト内にプロパティを返す
      const sessionNode = sessionNodeRaw?.properties || sessionNodeRaw;
      
      // 実際のノードのプロパティキーを取得
      let sessionKeys: string[] = [];
      if (sessionNode) {
        sessionKeys = Object.keys(sessionNode);
      }
      
      debugInfo.checks.session = {
        exists: sessionResults.length > 0,
        count: sessionResults.length,
        sample: sessionNode ? {
          id: sessionNode.id,
          hasEvents: !!sessionNode.events,
          eventsType: typeof sessionNode.events,
          startTs: sessionNode.start_ts,
          endTs: sessionNode.end_ts,
          sessionIndex: sessionNode.session_index,
          availableKeys: sessionKeys
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
              console.error('Failed to parse events JSON:', e);
              debugInfo.checks.session.eventsParseError = String(e);
            }
          } else if (Array.isArray(events)) {
            parsedEvents = events;
          } else {
            console.warn('Events is not a string or array:', typeof events, events);
            debugInfo.checks.session.eventsType = typeof events;
          }
        } else {
          debugInfo.checks.session.eventsMissing = true;
        }
        debugInfo.checks.session.eventsInfo = {
          total: parsedEvents.length,
          wordDisplayed: parsedEvents.filter((e: any) => e.type === 'word_displayed' || e.event_type === 'word_displayed').length,
          speechDetected: parsedEvents.filter((e: any) => e.type === 'speech_detected' || e.event_type === 'speech_detected').length,
          firstEvent: parsedEvents[0] || null,
          lastEvent: parsedEvents[parsedEvents.length - 1] || null,
          rawEventsType: typeof events,
          rawEventsLength: typeof events === 'string' ? events.length : Array.isArray(events) ? events.length : 0
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
        // 全件数を取得
        const countQuery = sessionId
          ? `MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session {id: $sessionId})-[:${relationship}]->(e:${emotionType}) RETURN count(e) as total`
          : `MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session)-[:${relationship}]->(e:${emotionType}) RETURN count(e) as total`;
        
        const countResults = await client.query(countQuery, { participantId, sessionId: sessionId || undefined });
        const totalCount = countResults.length > 0 ? (countResults[0].total?.low || countResults[0].total || 0) : 0;
        
        // サンプルデータを取得（最大10件）
        const emotionQuery = sessionId
          ? `MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session {id: $sessionId})-[:${relationship}]->(e:${emotionType}) RETURN e LIMIT 10`
          : `MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session)-[:${relationship}]->(e:${emotionType}) RETURN e LIMIT 10`;
        
        const emotionResults = await client.query(emotionQuery, { participantId, sessionId: sessionId || undefined });
        const emotionRecord = emotionResults.length > 0 ? emotionResults[0] : null;
        const emotionNodeRaw = emotionRecord?.e || emotionRecord;
        // Neo4jクライアントはpropertiesオブジェクト内にプロパティを返す
        const emotionNode = emotionNodeRaw?.properties || emotionNodeRaw;
        
        // 実際のノードのプロパティキーを取得
        let emotionKeys: string[] = [];
        if (emotionNode) {
          emotionKeys = Object.keys(emotionNode);
        }
        
        debugInfo.checks[source] = {
          exists: totalCount > 0,
          count: totalCount,
          sample: emotionNode ? {
            id: emotionNode.id,
            hasEmotionScores: !!emotionNode.emotion_scores,
            emotionScoresType: typeof emotionNode.emotion_scores,
            beginTime: emotionNode.begin_time || emotionNode.time,
            endTime: emotionNode.end_time,
            sessionId: emotionNode.session_id,
            availableKeys: emotionKeys
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
    
    // 3. 生理データの存在確認（複数の構造を試す）
    try {
      // 新しい構造（Participant -> Session -> PhysiologicalData）
      let physioQuery = sessionId
        ? `MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session {id: $sessionId})-[:HAS_PHYSIOLOGICAL_DATA]->(pd:PhysiologicalData) RETURN pd LIMIT 10`
        : `MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session)-[:HAS_PHYSIOLOGICAL_DATA]->(pd:PhysiologicalData) RETURN pd LIMIT 10`;
      
      let physioResults = await client.query(physioQuery, { participantId, sessionId: sessionId || undefined });
      
      // 新しい構造で見つからない場合、古い構造を試す
      if (physioResults.length === 0) {
        physioQuery = sessionId
          ? `MATCH (p:Participant {id: $participantId})-[:HAS_EXPERIMENT]->(e:Experiment)-[:HAS_SESSION]->(s:ExperimentSession {id: $sessionId})-[:HAS_PHYSIOLOGICAL_DATA]->(pd:PhysiologicalData) RETURN pd LIMIT 10`
          : `MATCH (p:Participant {id: $participantId})-[:HAS_EXPERIMENT]->(e:Experiment)-[:HAS_SESSION]->(s:ExperimentSession)-[:HAS_PHYSIOLOGICAL_DATA]->(pd:PhysiologicalData) RETURN pd LIMIT 10`;
        physioResults = await client.query(physioQuery, { participantId, sessionId: sessionId || undefined });
      }
      
      // 全件数を取得
      let countQuery = sessionId
        ? `MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session {id: $sessionId})-[:HAS_PHYSIOLOGICAL_DATA]->(pd:PhysiologicalData) RETURN count(pd) as total`
        : `MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session)-[:HAS_PHYSIOLOGICAL_DATA]->(pd:PhysiologicalData) RETURN count(pd) as total`;
      let countResults = await client.query(countQuery, { participantId, sessionId: sessionId || undefined });
      
      if (countResults.length === 0) {
        countQuery = sessionId
          ? `MATCH (p:Participant {id: $participantId})-[:HAS_EXPERIMENT]->(e:Experiment)-[:HAS_SESSION]->(s:ExperimentSession {id: $sessionId})-[:HAS_PHYSIOLOGICAL_DATA]->(pd:PhysiologicalData) RETURN count(pd) as total`
          : `MATCH (p:Participant {id: $participantId})-[:HAS_EXPERIMENT]->(e:Experiment)-[:HAS_SESSION]->(s:ExperimentSession)-[:HAS_PHYSIOLOGICAL_DATA]->(pd:PhysiologicalData) RETURN count(pd) as total`;
        countResults = await client.query(countQuery, { participantId, sessionId: sessionId || undefined });
      }
      
      const totalCount = countResults.length > 0 ? (countResults[0].total?.low || countResults[0].total || 0) : 0;
      const physioRecord = physioResults.length > 0 ? physioResults[0] : null;
      const physioNodeRaw = physioRecord?.pd || physioRecord;
      // Neo4jクライアントはpropertiesオブジェクト内にプロパティを返す
      const physioNode = physioNodeRaw?.properties || physioNodeRaw;
      
      debugInfo.checks.physiological = {
        exists: totalCount > 0,
        count: totalCount,
        sample: physioNode ? {
          id: physioNode.id,
          timestamp: physioNode.timestamp,
          channel: physioNode.channel,
          value: physioNode.value,
          time_sec: physioNode.time_sec,
          ch1: physioNode.ch1,
          ch2: physioNode.ch2,
          ch3: physioNode.ch3,
          ch4: physioNode.ch4,
          availableKeys: Object.keys(physioNode)
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

