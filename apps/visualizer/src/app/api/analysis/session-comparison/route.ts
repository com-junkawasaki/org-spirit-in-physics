import { NextRequest, NextResponse } from 'next/server';
import { createNeo4jClient } from '@/lib/neo4j';

// Merkle DAG: api.analysis.session_comparison -> session_comparison_analysis
// セッション比較分析API
// 依存関係: neo4j, analysis

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { participantId } = body;

    if (!participantId) {
      return NextResponse.json({
        success: false,
        error: 'participantId is required'
      }, { status: 400 });
    }

    console.log(`Starting session comparison analysis for participant ${participantId}`);

    const client = createNeo4jClient();

    // Merkle DAG: api.analysis.session_comparison.check_participant
    // 参加者存在確認
    const participantQuery = `
      MATCH (p:Participant {id: $participantId})
      RETURN p.id as id, p.name as name
    `;
    const participantResult = await client.query(participantQuery, { participantId });
    
    if (participantResult.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Participant not found'
      }, { status: 404 });
    }

    // Merkle DAG: api.analysis.session_comparison.get_sessions
    // セッションデータ取得
    const sessionsQuery = `
      MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:ExperimentSession)
      RETURN s.id as sessionId, s.start_time as startTime, s.end_time as endTime
      ORDER BY s.start_time
    `;
    const sessions = await client.query(sessionsQuery, { participantId });
    
    if (sessions.length < 2) {
      return NextResponse.json({
        success: false,
        error: 'At least 2 sessions required for comparison'
      }, { status: 400 });
    }

    console.log(`Found ${sessions.length} sessions for participant ${participantId}`);

    // Merkle DAG: api.analysis.session_comparison.extract_session_data
    // セッション1回目と2回目のデータ抽出
    const session1Id = sessions[0].sessionId;
    const session2Id = sessions[1].sessionId;

    const session1Query = `
      MATCH (s:ExperimentSession {id: $sessionId})-[:HAS_RESPONSE]->(r:Response)
      WHERE r.stimulus_word IS NOT NULL AND r.response_word IS NOT NULL
      RETURN 
        r.stimulus_word as stimulus_word,
        r.response_word as response_word,
        r.reaction_time_ms as reaction_time_ms,
        r.spirit_probability as spirit_probability,
        r.event_ts as timestamp
      ORDER BY r.event_ts
    `;

    const session1Responses = await client.query(session1Query, { sessionId: session1Id });
    const session2Responses = await client.query(session1Query, { sessionId: session2Id });

    console.log(`Session 1: ${session1Responses.length} responses`);
    console.log(`Session 2: ${session2Responses.length} responses`);

    // Merkle DAG: api.analysis.session_comparison.calculate_differences
    // 反応時間差異計算
    const session1Data = new Map();
    const session2Data = new Map();

    // セッション1のデータをマップに格納
    session1Responses.forEach((response: any) => {
      session1Data.set(response.stimulus_word, {
        reactionTime: response.reaction_time_ms || 0,
        spiritProbability: response.spirit_probability || 0.5,
        timestamp: response.timestamp
      });
    });

    // セッション2のデータをマップに格納
    session2Responses.forEach((response: any) => {
      session2Data.set(response.stimulus_word, {
        reactionTime: response.reaction_time_ms || 0,
        spiritProbability: response.spirit_probability || 0.5,
        timestamp: response.timestamp
      });
    });

    // 共通の単語を特定
    const commonWords = Array.from(session1Data.keys()).filter(word => 
      session2Data.has(word)
    );

    console.log(`Found ${commonWords.length} common words between sessions`);

    // 差異計算
    const differences = commonWords.map(word => {
      const session1WordData = session1Data.get(word);
      const session2WordData = session2Data.get(word);
      
      const reactionTimeDiff = session2WordData.reactionTime - session1WordData.reactionTime;
      const spiritProbDiff = session2WordData.spiritProbability - session1WordData.spiritProbability;
      
      return {
        word,
        session1ReactionTime: session1WordData.reactionTime,
        session2ReactionTime: session2WordData.reactionTime,
        reactionTimeDifference: reactionTimeDiff,
        session1SpiritProbability: session1WordData.spiritProbability,
        session2SpiritProbability: session2WordData.spiritProbability,
        spiritProbabilityDifference: spiritProbDiff
      };
    });

    // Merkle DAG: api.analysis.session_comparison.statistical_analysis
    // 統計分析（平均・分散・改善度）
    const reactionTimeDiffs = differences.map(d => d.reactionTimeDifference);
    const spiritProbDiffs = differences.map(d => d.spiritProbabilityDifference);

    // セッション1と2の平均反応時間
    const session1AvgReactionTime = session1Responses.reduce((sum: number, r: any) => sum + (r.reaction_time_ms || 0), 0) / session1Responses.length;
    const session2AvgReactionTime = session2Responses.reduce((sum: number, r: any) => sum + (r.reaction_time_ms || 0), 0) / session2Responses.length;

    // 反応時間の分散計算
    const session1Variance = session1Responses.reduce((sum: number, r: any) => {
      const diff = (r.reaction_time_ms || 0) - session1AvgReactionTime;
      return sum + (diff * diff);
    }, 0) / session1Responses.length;

    const session2Variance = session2Responses.reduce((sum: number, r: any) => {
      const diff = (r.reaction_time_ms || 0) - session2AvgReactionTime;
      return sum + (diff * diff);
    }, 0) / session2Responses.length;

    // 改善度計算（反応時間が短くなる = 改善）
    const improvementRate = ((session1AvgReactionTime - session2AvgReactionTime) / session1AvgReactionTime) * 100;

    const statistics = {
      totalCommonWords: commonWords.length,
      session1Stats: {
        averageReactionTime: session1AvgReactionTime,
        variance: session1Variance,
        standardDeviation: Math.sqrt(session1Variance),
        responseCount: session1Responses.length
      },
      session2Stats: {
        averageReactionTime: session2AvgReactionTime,
        variance: session2Variance,
        standardDeviation: Math.sqrt(session2Variance),
        responseCount: session2Responses.length
      },
      comparisonStats: {
        averageReactionTimeDifference: reactionTimeDiffs.reduce((sum, diff) => sum + diff, 0) / reactionTimeDiffs.length,
        averageSpiritProbabilityDifference: spiritProbDiffs.reduce((sum, diff) => sum + diff, 0) / spiritProbDiffs.length,
        improvementRate: improvementRate,
        reactionTimeImprovement: reactionTimeDiffs.filter(diff => diff < 0).length,
        reactionTimeDegradation: reactionTimeDiffs.filter(diff => diff > 0).length,
        spiritProbabilityImprovement: spiritProbDiffs.filter(diff => diff > 0).length,
        spiritProbabilityDegradation: spiritProbDiffs.filter(diff => diff < 0).length
      }
    };

    // Merkle DAG: api.analysis.session_comparison.save_results
    // 結果保存
    const analysisId = `session_comparison_${participantId}_${Date.now()}`;
    const saveQuery = `
      MERGE (a:SessionComparisonAnalysis {id: $analysisId})
      SET a.participant_id = $participantId,
          a.session1_id = $session1Id,
          a.session2_id = $session2Id,
          a.total_common_words = $totalCommonWords,
          a.average_reaction_time_difference = $averageReactionTimeDifference,
          a.average_spirit_probability_difference = $averageSpiritProbabilityDifference,
          a.improvement_rate = $improvementRate,
          a.reaction_time_improvement = $reactionTimeImprovement,
          a.reaction_time_degradation = $reactionTimeDegradation,
          a.spirit_probability_improvement = $spiritProbabilityImprovement,
          a.spirit_probability_degradation = $spiritProbabilityDegradation,
          a.created_at = datetime(),
          a.updated_at = datetime()
      RETURN a.id as analysisId
    `;

    await client.query(saveQuery, {
      analysisId,
      participantId,
      session1Id,
      session2Id,
      totalCommonWords: statistics.totalCommonWords,
      averageReactionTimeDifference: statistics.comparisonStats.averageReactionTimeDifference,
      averageSpiritProbabilityDifference: statistics.comparisonStats.averageSpiritProbabilityDifference,
      improvementRate: statistics.comparisonStats.improvementRate,
      reactionTimeImprovement: statistics.comparisonStats.reactionTimeImprovement,
      reactionTimeDegradation: statistics.comparisonStats.reactionTimeDegradation,
      spiritProbabilityImprovement: statistics.comparisonStats.spiritProbabilityImprovement,
      spiritProbabilityDegradation: statistics.comparisonStats.spiritProbabilityDegradation
    });

    // 参加者とのリレーション作成
    const relationshipQuery = `
      MATCH (p:Participant {id: $participantId})
      MATCH (a:SessionComparisonAnalysis {id: $analysisId})
      MERGE (p)-[:HAS_SESSION_COMPARISON]->(a)
      RETURN count(a) as relationshipCount
    `;
    await client.query(relationshipQuery, { participantId, analysisId });

    console.log(`Session comparison analysis completed for participant ${participantId}`);

    return NextResponse.json({
      success: true,
      participantId,
      analysisId,
      statistics,
      differences: differences.slice(0, 20), // 最初の20件のみ返す
      message: 'Session comparison analysis completed successfully'
    });

  } catch (error) {
    console.error('API: Failed to perform session comparison analysis:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const participantId = searchParams.get('participantId');

    if (!participantId) {
      return NextResponse.json({
        success: false,
        error: 'participantId is required'
      }, { status: 400 });
    }

    const client = createNeo4jClient();

    // Merkle DAG: api.analysis.session_comparison.get_results
    // 既存の分析結果取得
    const query = `
      MATCH (p:Participant {id: $participantId})-[:HAS_SESSION_COMPARISON]->(a:SessionComparisonAnalysis)
      RETURN a.id as analysisId,
             a.session1_id as session1Id,
             a.session2_id as session2Id,
             a.total_common_words as totalCommonWords,
             a.average_reaction_time_difference as averageReactionTimeDifference,
             a.average_spirit_probability_difference as averageSpiritProbabilityDifference,
             a.improvement_rate as improvementRate,
             a.reaction_time_improvement as reactionTimeImprovement,
             a.reaction_time_degradation as reactionTimeDegradation,
             a.spirit_probability_improvement as spiritProbabilityImprovement,
             a.spirit_probability_degradation as spiritProbabilityDegradation,
             a.created_at as createdAt
      ORDER BY a.created_at DESC
    `;

    const results = await client.query(query, { participantId });

    return NextResponse.json({
      success: true,
      participantId,
      analyses: results
    });

  } catch (error) {
    console.error('API: Failed to get session comparison results:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
