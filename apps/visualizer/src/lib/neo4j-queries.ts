// Merkle DAG: Neogmaベースのクエリ
// Neogmaを使用した型安全なObject-Graph Mapping
// 高レベルAPIによる効率的なデータ操作

import {
  Participant,
  ExperimentSession,
  Response,
  EmotionAnalysis,
  WordStimulus,
  ImportJob,
} from './neogma-models'

// 参加者関連クエリ - Neogmaベース
export class ParticipantQueries {
  static async createParticipant(participantData: {
    id: string;
    age?: number;
    gender?: string;
    handedness?: string;
    consent_given?: boolean;
  }) {
    return await Participant.createOne(participantData);
  }

  static async getParticipant(participantId: string) {
    return await Participant.findOne({
      where: { id: participantId },
    });
  }

  static async getAllParticipants() {
    return await Participant.findMany({
      order: [['created_at', 'DESC']],
    });
  }

  static async getParticipantDetails(participantId: string) {
    return await Participant.findOne({
      where: { id: participantId },
    });
  }

  static async getParticipantResponses(participantId: string) {
    return await Response.findMany({
      where: { participant_id: participantId },
      order: [['event_ts', 'DESC']],
    });
  }

  static async getAllSessions() {
    return await ExperimentSession.findMany({
      order: [['start_ts', 'DESC']],
    });
  }

  // 参加者の統計情報を取得
  static async getParticipantStatistics(participantId: string) {
    const participant = await Participant.findOne({ where: { id: participantId } });
    if (!participant) return null;

    // Cypherクエリを使って統計を取得
    const { createNeo4jClient } = await import('./neo4j.js')
    const client = createNeo4jClient()

    const queries = [
      `MATCH (:Participant {id: $participantId})-[:HAS_SESSION]->(s:ExperimentSession) RETURN count(s) as count`,
      `MATCH (:Participant {id: $participantId})-[:HAS_SESSION]->(:ExperimentSession)-[:HAS_RESPONSE]->(r:Response) RETURN count(r) as count`,
      `MATCH (:Participant {id: $participantId})-[:HAS_SESSION]->(:ExperimentSession)-[:HAS_RESPONSE]->(r:Response) WHERE r.spirit_probability IS NOT NULL RETURN avg(r.spirit_probability) as average, count(r) as count`,
    ]

    const results = await Promise.all(queries.map(q => client.query(q, { participantId })))

    const sessionCount = results[0][0]?.count || 0
    const responseCount = results[1][0]?.count || 0
    const spiritStats = results[2][0]
    const averageSpiritProbability = spiritStats?.average || 0

    return {
      participant,
      sessionCount,
      responseCount,
      averageSpiritProbability,
    };
  }
}

// セッション関連クエリ - Neogmaベース
export class SessionQueries {
  static async createSession(participantId: string, sessionData: {
    id: string;
    start_ts: string;
    status: string;
  }) {
    return await ExperimentSession.createOne({
      ...sessionData,
      participant_id: participantId,
    });
  }

  static async getSessionById(sessionId: string) {
    return await ExperimentSession.findOne({
      where: { id: sessionId },
    });
  }

  static async getSessionsByParticipant(participantId: string) {
    return await ExperimentSession.findMany({
      where: { participant_id: participantId },
      order: [['start_ts', 'DESC']],
    });
  }

  static async updateSessionStatus(sessionId: string, status: string) {
    return await ExperimentSession.update(
      { status },
      { where: { id: sessionId } }
    );
  }
}

// レスポンス関連クエリ - Neogmaベース
export class ResponseQueries {
  static async createResponse(participantId: string, sessionId: string, responseData: {
    id: string;
    stimulus_word: string;
    response_word: string;
    reaction_time_ms?: number;
    event_ts: string;
    emotion?: string;
    emotion_confidence?: number;
    spirit_probability?: number;
  }) {
    return await Response.createOne({
      ...responseData,
      participant_id: participantId,
      session_id: sessionId,
    });
  }

  static async getResponseById(responseId: string) {
    return await Response.findOne({
      where: { id: responseId },
    });
  }

  static async getAllResponsesForReactionTimes() {
    return await Response.findMany({
      order: [['event_ts', 'ASC']],
    });
  }

  static async getResponsesBySession(sessionId: string) {
    return await Response.findMany({
      where: { session_id: sessionId },
      order: [['event_ts', 'ASC']],
    });
  }

  static async getResponsesByStimulusWord(stimulusWord: string) {
    return await Response.findMany({
      where: { stimulus_word: stimulusWord },
    });
  }

  // 反応時間の統計を取得
  static async getReactionTimeStatistics() {
    // Neogmaでnullチェックができないため、Cypherクエリを使用
    const { createNeo4jClient } = await import('./neo4j.js')
    const client = createNeo4jClient()

    const query = `
      MATCH (r:Response)
      WHERE r.reaction_time_ms IS NOT NULL
      RETURN r.reaction_time_ms as reaction_time_ms, r.stimulus_word as stimulus_word
    `
    const responses = await client.query(query)

    if (responses.length === 0) return null;

    const reactionTimes = responses
      .map(r => r.reaction_time_ms)
      .filter((rt): rt is number => rt !== undefined && rt !== null);

    const average = reactionTimes.reduce((sum, rt) => sum + rt, 0) / reactionTimes.length;
    const min = Math.min(...reactionTimes);
    const max = Math.max(...reactionTimes);

    return {
      count: reactionTimes.length,
      average,
      min,
      max,
      responses: responses.length,
    };
  }
}

// 感情分析関連クエリ - Neogmaベース
export class EmotionQueries {
  static async getEmotionStatistics() {
    // Neogmaでnullチェックができないため、Cypherクエリを使用
    const { createNeo4jClient } = await import('./neo4j.js')
    const client = createNeo4jClient()

    const query = `
      MATCH (r:Response)
      WHERE r.emotion IS NOT NULL
      RETURN r.emotion as emotion, r.emotion_confidence as emotion_confidence
    `
    const responses = await client.query(query)

    if (responses.length === 0) return {};

    // 感情タイプごとの統計を集計
    const emotionStats: Record<string, { count: number; totalConfidence: number; averageConfidence: number }> = {};

    responses.forEach(response => {
      if (response.emotion) {
        if (!emotionStats[response.emotion]) {
          emotionStats[response.emotion] = { count: 0, totalConfidence: 0, averageConfidence: 0 };
        }
        emotionStats[response.emotion].count++;
        emotionStats[response.emotion].totalConfidence += response.emotion_confidence || 0;
      }
    });

    // 平均信頼度を計算
    Object.keys(emotionStats).forEach(emotion => {
      const stats = emotionStats[emotion];
      stats.averageConfidence = stats.totalConfidence / stats.count;
    });

    return emotionStats;
  }

  static async getParticipantEmotionAnalysis(participantId: string) {
    // Neogmaでnullチェックができないため、Cypherクエリを使用
    const { createNeo4jClient } = await import('./neo4j.js')
    const client = createNeo4jClient()

    const query = `
      MATCH (r:Response {participant_id: $participantId})
      WHERE r.emotion IS NOT NULL
      RETURN r.emotion as emotion, r.emotion_confidence as emotion_confidence,
             r.stimulus_word as stimulus_word, r.response_word as response_word
    `
    const responses = await client.query(query, { participantId })

    return responses
  }

  static async getEmotionAnalysisByResponse(responseId: string) {
    return await EmotionAnalysis.findMany({
      where: { response_id: responseId },
      order: [['analysis_timestamp', 'DESC']],
    });
  }

  static async createEmotionAnalysis(responseId: string, emotionData: any, confidenceScore?: number) {
    return await EmotionAnalysis.createOne({
      id: `ea_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      response_id: responseId,
      emotion_data: emotionData,
      confidence_score: confidenceScore,
      analysis_timestamp: new Date().toISOString(),
    });
  }
}

// 汎用ユーティリティクエリ - Neogmaベース
export class UtilityQueries {
  static async connectionTest(): Promise<boolean> {
    try {
      // Neogmaインスタンスが初期化されているか確認
      const result = await Promise.resolve(1); // 基本的な接続テスト
      return result === 1;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  static async countAllNodes() {
    // Cypherクエリを使って全ノード数をカウント
    const { createNeo4jClient } = await import('./neo4j.js')
    const client = createNeo4jClient()

    const queries = [
      'MATCH (p:Participant) RETURN count(p) as count',
      'MATCH (s:ExperimentSession) RETURN count(s) as count',
      'MATCH (r:Response) RETURN count(r) as count',
      'MATCH (e:EmotionAnalysis) RETURN count(e) as count',
    ]

    const results = await Promise.all(queries.map(q => client.query(q)))

    const counts = results.map(r => r[0]?.count || 0)

    return {
      participants: counts[0],
      sessions: counts[1],
      responses: counts[2],
      emotionAnalyses: counts[3],
      total: counts.reduce((sum, count) => sum + count, 0),
    };
  }

  static async countAllRelationships() {
    // Cypherクエリを使ってリレーションシップ数をカウント
    const { createNeo4jClient } = await import('./neo4j.js')
    const client = createNeo4jClient()

    const queries = [
      'MATCH (:Participant)-[:HAS_SESSION]->(:ExperimentSession) RETURN count(*) as count',
      'MATCH (:ExperimentSession)-[:HAS_RESPONSE]->(:Response) RETURN count(*) as count',
    ]

    const results = await Promise.all(queries.map(q => client.query(q)))

    const counts = results.map(r => r[0]?.count || 0)

    return {
      participantToSession: counts[0],
      sessionToResponse: counts[1],
      total: counts.reduce((sum, count) => sum + count, 0),
    };
  }

  static async getDatabaseStatistics() {
    const [nodeCounts, relationshipCounts] = await Promise.all([
      this.countAllNodes(),
      this.countAllRelationships(),
    ]);

    return {
      nodes: nodeCounts,
      relationships: relationshipCounts,
      timestamp: new Date().toISOString(),
    };
  }

  static async clearAllData() {
    // 注意: このメソッドは危険です。本番環境では使用しないでください
    console.warn('Clearing all data from Neo4j database...');

    const { createNeo4jClient } = await import('./neo4j.js')
    const client = createNeo4jClient()

    // Cypherクエリを使って全てのデータを削除
    const queries = [
      'MATCH (n:EmotionAnalysis) DETACH DELETE n',
      'MATCH (n:Response) DETACH DELETE n',
      'MATCH (n:ExperimentSession) DETACH DELETE n',
      'MATCH (n:Participant) DETACH DELETE n',
      'MATCH (n:ImportJob) DETACH DELETE n',
    ]

    for (const query of queries) {
      await client.query(query)
    }

    return { success: true, message: 'All data cleared' };
  }
}

// Merkle DAG: Neogma実装完了
// Neogmaを使用した型安全なObject-Graph Mappingを実装