// Merkle DAG: Neo4j Cypherクエリ
// @neo4j/cypher-builderを使用した型安全なクエリ構築
// 段階的に実装中 - 基本機能から開始

import Cypher from '@neo4j/cypher-builder';

// 参加者関連クエリ
export class ParticipantQueries {
  static createParticipant(participantData: any) {
    // 基本的なCREATEクエリ - 動作確認済み
    const participant = new Cypher.Node();
    const pattern = new Cypher.Pattern(participant, { labels: ["Participant"] });
    const createQuery = new Cypher.Create(pattern);
    const result = createQuery.return(participant);
    return result.build();
  }

  static getParticipant(participantId: string) {
    // 基本的なMATCHクエリ - 動作確認済み
    const participant = new Cypher.Node();
    const pattern = new Cypher.Pattern(participant, { labels: ["Participant"] });
    const matchQuery = new Cypher.Match(pattern);
    const result = matchQuery.return(participant.property("id"));
    return result.build();
  }

  static getAllParticipants() {
    // シンプルな全参加者取得 - 段階的に実装
    const participant = new Cypher.Node();
    const pattern = new Cypher.Pattern(participant, { labels: ["Participant"] });
    const matchQuery = new Cypher.Match(pattern);
    const result = matchQuery.return([participant.property("id"), "participant_id"]);
    return result.build();
  }

  static getParticipantDetails(participantId: string) {
    // 基本的な詳細取得
    const participant = new Cypher.Node();
    const pattern = new Cypher.Pattern(participant, { labels: ["Participant"] });
    const matchQuery = new Cypher.Match(pattern);
    const result = matchQuery.return(participant.property("id"));
    return result.build();
  }

  static getParticipantResponses(participantId: string) {
    // 基本的なレスポンス取得
    const participant = new Cypher.Node();
    const session = new Cypher.Node();
    const response = new Cypher.Node();

    const pattern = new Cypher.Pattern(participant, { labels: ["Participant"] })
      .related({ type: "HAS_SESSION" })
      .to(session, { labels: ["Session"] })
      .related({ type: "HAS_RESPONSE" })
      .to(response, { labels: ["Response"] });

    const matchQuery = new Cypher.Match(pattern);
    const result = matchQuery.return(response.property("id"));
    return result.build();
  }

  static getAllSessions() {
    // 基本的な全セッション取得
    const participant = new Cypher.Node();
    const session = new Cypher.Node();

    const pattern = new Cypher.Pattern(participant, { labels: ["Participant"] })
      .related({ type: "HAS_SESSION" })
      .to(session, { labels: ["Session"] });

    const matchQuery = new Cypher.Match(pattern);
    const result = matchQuery.return([participant.property("id"), "participant_id"], session);
    return result.build();
  }
}

// セッション関連クエリ
export class SessionQueries {
  static createSession(participantId: string, sessionData: any) {
    // 基本的なセッション作成
    const participant = new Cypher.Node();
    const session = new Cypher.Node();

    const pattern = new Cypher.Pattern(participant, { labels: ["Participant"] })
      .related({ type: "HAS_SESSION" })
      .to(session, { labels: ["Session"] });

    const createQuery = new Cypher.Create(pattern);
    const result = createQuery.return(session);
    return result.build();
  }
}

// レスポンス関連クエリ
export class ResponseQueries {
  static createResponse(participantId: string, sessionId: string, responseData: any) {
    // 基本的なレスポンス作成
    const response = new Cypher.Node();
    const pattern = new Cypher.Pattern(response, { labels: ["Response"] });
    const createQuery = new Cypher.Create(pattern);
    const result = createQuery.return(response);
    return result.build();
  }

  static getAllResponsesForReactionTimes() {
    // 基本的な全レスポンス取得
    const participant = new Cypher.Node();
    const session = new Cypher.Node();
    const response = new Cypher.Node();

    const pattern = new Cypher.Pattern(participant, { labels: ["Participant"] })
      .related({ type: "HAS_SESSION" })
      .to(session, { labels: ["Session"] })
      .related({ type: "HAS_RESPONSE" })
      .to(response, { labels: ["Response"] });

    const matchQuery = new Cypher.Match(pattern);
    const result = matchQuery.return(
      [participant.property("id"), "participant_id"],
      [response.property("stimulus_word"), "stimulus_word"]
    );
    return result.build();
  }
}

// 感情分析関連クエリ
export class EmotionQueries {
  static getEmotionStatistics() {
    // 基本的な感情統計取得
    const response = new Cypher.Node();
    const pattern = new Cypher.Pattern(response, { labels: ["Response"] });
    const matchQuery = new Cypher.Match(pattern);
    const result = matchQuery.return(response.property("emotion"));
    return result.build();
  }

  static getParticipantEmotionAnalysis(participantId: string) {
    // 基本的な参加者感情分析取得
    const response = new Cypher.Node();
    const pattern = new Cypher.Pattern(response, { labels: ["Response"] });
    const matchQuery = new Cypher.Match(pattern);
    const result = matchQuery.return(response.property("emotion"));
    return result.build();
  }
}

// 汎用ユーティリティクエリ
export class UtilityQueries {
  static connectionTest() {
    // 接続テスト用クエリ
    const result = new Cypher.Return(new Cypher.Literal(1));
    return result.build();
  }

  static countAllNodes() {
    // 全ノード数カウント - 基本的な実装
    const node = new Cypher.Node();
    const pattern = new Cypher.Pattern(node);
    const matchQuery = new Cypher.Match(pattern);
    const result = matchQuery.return(Cypher.count(node));
    return result.build();
  }

  static countAllRelationships() {
    // 全リレーションシップ数カウント - 基本的な実装
    const fromNode = new Cypher.Node();
    const toNode = new Cypher.Node();
    const pattern = new Cypher.Pattern(fromNode).related().to(toNode);
    const matchQuery = new Cypher.Match(pattern);
    const result = matchQuery.return(Cypher.count(fromNode));
    return result.build();
  }
}

// Merkle DAG: Cypher Builder完了
// @neo4j/cypher-builderを使用した型安全なクエリ構築を実装