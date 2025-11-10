// Merkle DAG: debug.check_emotion_data
// Neo4jデータ確認用のデバッグAPIエンドポイント

import { NextRequest, NextResponse } from "next/server";
import { createNeo4jClient } from '@/lib/neo4j';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const participantId = searchParams.get('participantId') || '25111604-c7db-4bfd-8662-e55060e332d6';
    const sessionId = searchParams.get('sessionId') || '25111604-c7db-4bfd-8662-e55060e332d6-0';

    const client = createNeo4jClient();

    const results: any = {
      participantId,
      sessionId,
      checks: {}
    };

    // 1. 参加者の存在確認
    const participantQuery = `
      MATCH (p:Participant {id: $participantId})
      RETURN p.id as id, p.created_at as createdAt
    `;
    const participantResult = await client.query(participantQuery, { participantId });
    results.checks.participantExists = participantResult.length > 0;
    results.checks.participantData = participantResult[0] || null;

    // 2. セッションの存在確認
    const sessionQuery = `
      MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session {id: $sessionId})
      RETURN s.id as id, s.created_at as createdAt, s.session_index as sessionIndex
    `;
    const sessionResult = await client.query(sessionQuery, { participantId, sessionId });
    results.checks.sessionExists = sessionResult.length > 0;
    results.checks.sessionData = sessionResult[0] || null;

    // 3. BurstEmotionDataの確認
    const burstQuery = `
      MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session {id: $sessionId})
      MATCH (s)-[:HAS_BURST_EMOTION_DATA]->(b:BurstEmotionData)
      RETURN count(b) as count, 
             collect(b.id)[0..5] as sampleIds,
             collect(b.record_id)[0..5] as sampleRecordIds
    `;
    const burstResult = await client.query(burstQuery, { participantId, sessionId });
    results.checks.burstEmotionData = {
      count: burstResult[0]?.count || 0,
      sampleIds: burstResult[0]?.sampleIds || [],
      sampleRecordIds: burstResult[0]?.sampleRecordIds || []
    };

    // 4. FaceEmotionDataの確認
    const faceQuery = `
      MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session {id: $sessionId})
      MATCH (s)-[:HAS_FACE_EMOTION_DATA]->(f:FaceEmotionData)
      RETURN count(f) as count,
             collect(f.id)[0..5] as sampleIds,
             collect(f.record_id)[0..5] as sampleRecordIds
    `;
    const faceResult = await client.query(faceQuery, { participantId, sessionId });
    results.checks.faceEmotionData = {
      count: faceResult[0]?.count || 0,
      sampleIds: faceResult[0]?.sampleIds || [],
      sampleRecordIds: faceResult[0]?.sampleRecordIds || []
    };

    // 5. LanguageEmotionDataの確認
    const languageQuery = `
      MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session {id: $sessionId})
      MATCH (s)-[:HAS_LANGUAGE_EMOTION_DATA]->(l:LanguageEmotionData)
      RETURN count(l) as count,
             collect(l.id)[0..5] as sampleIds,
             collect(l.record_id)[0..5] as sampleRecordIds
    `;
    const languageResult = await client.query(languageQuery, { participantId, sessionId });
    results.checks.languageEmotionData = {
      count: languageResult[0]?.count || 0,
      sampleIds: languageResult[0]?.sampleIds || [],
      sampleRecordIds: languageResult[0]?.sampleRecordIds || []
    };

    // 6. ProsodyEmotionDataの確認
    const prosodyQuery = `
      MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session {id: $sessionId})
      MATCH (s)-[:HAS_PROSODY_EMOTION_DATA]->(pr:ProsodyEmotionData)
      RETURN count(pr) as count,
             collect(pr.id)[0..5] as sampleIds,
             collect(pr.record_id)[0..5] as sampleRecordIds
    `;
    const prosodyResult = await client.query(prosodyQuery, { participantId, sessionId });
    results.checks.prosodyEmotionData = {
      count: prosodyResult[0]?.count || 0,
      sampleIds: prosodyResult[0]?.sampleIds || [],
      sampleRecordIds: prosodyResult[0]?.sampleRecordIds || []
    };

    // 7. サンプルデータの詳細確認（最初のBurstEmotionDataがあれば）
    if (results.checks.burstEmotionData.count > 0) {
      const sampleQuery = `
        MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session {id: $sessionId})
        MATCH (s)-[:HAS_BURST_EMOTION_DATA]->(b:BurstEmotionData)
        RETURN b.id as id,
               b.record_id as recordId,
               b.begin_time as beginTime,
               b.end_time as endTime,
               b.emotion_scores as emotionScores,
               b.vocal_types as vocalTypes
        LIMIT 1
      `;
      const sampleResult = await client.query(sampleQuery, { participantId, sessionId });
      results.checks.sampleBurstData = sampleResult[0] || null;
    }

    // 8. 全セッションの感情データ数確認
    const allSessionsQuery = `
      MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session)
      OPTIONAL MATCH (s)-[:HAS_BURST_EMOTION_DATA]->(b:BurstEmotionData)
      OPTIONAL MATCH (s)-[:HAS_FACE_EMOTION_DATA]->(f:FaceEmotionData)
      OPTIONAL MATCH (s)-[:HAS_LANGUAGE_EMOTION_DATA]->(l:LanguageEmotionData)
      OPTIONAL MATCH (s)-[:HAS_PROSODY_EMOTION_DATA]->(pr:ProsodyEmotionData)
      RETURN s.id as sessionId,
             count(DISTINCT b) as burstCount,
             count(DISTINCT f) as faceCount,
             count(DISTINCT l) as languageCount,
             count(DISTINCT pr) as prosodyCount
      ORDER BY s.created_at ASC
    `;
    const allSessionsResult = await client.query(allSessionsQuery, { participantId });
    results.checks.allSessionsEmotionData = allSessionsResult;

    return NextResponse.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('Debug check error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

