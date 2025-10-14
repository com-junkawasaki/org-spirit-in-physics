// Merkle DAG: Neo4j Cypherクエリ
// @neo4j/cypher-builderを使用した型安全なクエリ構築

import Cypher from '@neo4j/cypher-builder';

// 参加者関連クエリ
export class ParticipantQueries {
  static createParticipant(participantData: any) {
    const participant = new Cypher.Node();
    const pattern = new Cypher.Pattern(participant, { labels: ["Participant"] });

    const createQuery = new Cypher.Create(pattern).set([
      participant,
      new Cypher.Map(participantData)
    ]).return(participant);

    return createQuery.build();
  }

  static getParticipant(participantId: string) {
    const participant = new Cypher.Node();
    const pattern = new Cypher.Pattern(participant, { labels: ["Participant"] });

    const matchQuery = new Cypher.Match(pattern)
      .where(participant, { id: new Cypher.Param(participantId) })
      .return(participant);

    return matchQuery.build();
  }

  static getAllParticipants() {
    const participant = new Cypher.Node();
    const session = new Cypher.Node();
    const response = new Cypher.Node();

    const participantPattern = new Cypher.Pattern(participant, { labels: ["Participant"] });
    const sessionPattern = new Cypher.Pattern(session, { labels: ["Session"] });
    const responsePattern = new Cypher.Pattern(response, { labels: ["Response"] });

    const hasSessionRel = new Cypher.Pattern(participant, { labels: ["Participant"] })
      .related({ type: "HAS_SESSION" })
      .to(session, { labels: ["Session"] });

    const hasResponseRel = new Cypher.Pattern(session, { labels: ["Session"] })
      .related({ type: "HAS_RESPONSE" })
      .to(response, { labels: ["Response"] });

    const matchQuery = new Cypher.Match(participantPattern)
      .optionalMatch(hasSessionRel)
      .optionalMatch(hasResponseRel)
      .return(
        participant.property("id").as("participant_id"),
        Cypher.count(session).as("session_count"),
        Cypher.count(response).as("total_responses"),
        new Cypher.Literal(0.5).as("average_spirit_probability"),
        participant.property("created_at").as("last_activity")
      )
      .orderBy(participant.property("created_at"), "DESC");

    return matchQuery.build();
  }

  static getParticipantDetails(participantId: string) {
    const participant = new Cypher.Node();
    const pattern = new Cypher.Pattern(participant, { labels: ["Participant"] });

    const matchQuery = new Cypher.Match(pattern)
      .where(participant, { id: new Cypher.Param(participantId) })
      .return(
        participant.property("id"),
        participant.property("age"),
        participant.property("gender"),
        participant.property("handedness")
      );

    return matchQuery.build();
  }

  static getParticipantResponses(participantId: string) {
    const participant = new Cypher.Node();
    const session = new Cypher.Node();
    const response = new Cypher.Node();

    const pattern = new Cypher.Pattern(participant, { labels: ["Participant"] })
      .related({ type: "HAS_SESSION" })
      .to(session, { labels: ["Session"] })
      .related({ type: "HAS_RESPONSE" })
      .to(response, { labels: ["Response"] });

    const matchQuery = new Cypher.Match(pattern)
      .where(participant, { id: new Cypher.Param(participantId) })
      .return(response)
      .orderBy(response.property("event_ts"), "DESC");

    return matchQuery.build();
  }

  static getAllSessions() {
    const participant = new Cypher.Node();
    const session = new Cypher.Node();
    const response = new Cypher.Node();

    const pattern = new Cypher.Pattern(participant, { labels: ["Participant"] })
      .related({ type: "HAS_SESSION" })
      .to(session, { labels: ["Session"] });

    const responsePattern = new Cypher.Pattern(session, { labels: ["Session"] })
      .related({ type: "HAS_RESPONSE" })
      .to(response, { labels: ["Response"] });

    const matchQuery = new Cypher.Match(pattern)
      .optionalMatch(responsePattern)
      .return(
        participant.property("id").as("participant_id"),
        session,
        Cypher.count(response).as("response_count")
      )
      .orderBy(session.property("created_at"), "DESC");

    return matchQuery.build();
  }
}

// セッション関連クエリ
export class SessionQueries {
  static createSession(participantId: string, sessionData: any) {
    const participant = new Cypher.Node();
    const session = new Cypher.Node();

    const pattern = new Cypher.Pattern(participant, { labels: ["Participant"] })
      .related({ type: "HAS_SESSION" })
      .to(session, { labels: ["Session"] });

    const matchQuery = new Cypher.Match(
      new Cypher.Pattern(participant, { labels: ["Participant"] })
    )
      .where(participant, { id: new Cypher.Param(participantId) });

    const createQuery = new Cypher.Create(pattern).set([
      session,
      new Cypher.Map(sessionData)
    ]);

    const fullQuery = Cypher.utils.concat(matchQuery, createQuery.return(session));
    return fullQuery.build();
  }
}

// レスポンス関連クエリ
export class ResponseQueries {
  static createResponse(participantId: string, sessionId: string, responseData: any) {
    const participant = new Cypher.Node();
    const session = new Cypher.Node();
    const response = new Cypher.Node();

    const pattern = new Cypher.Pattern(participant, { labels: ["Participant"] })
      .related({ type: "HAS_SESSION" })
      .to(session, { labels: ["Session"] })
      .related({ type: "HAS_RESPONSE" })
      .to(response, { labels: ["Response"] });

    const matchQuery = new Cypher.Match(
      new Cypher.Pattern(participant, { labels: ["Participant"] })
        .related({ type: "HAS_SESSION" })
        .to(session, { labels: ["Session"] })
    )
      .where(participant, { id: new Cypher.Param(participantId) })
      .where(session, { id: new Cypher.Param(sessionId) });

    const createQuery = new Cypher.Create(
      new Cypher.Pattern(session, { labels: ["Session"] })
        .related({ type: "HAS_RESPONSE" })
        .to(response, { labels: ["Response"] })
    ).set([
      response,
      new Cypher.Map(responseData)
    ]);

    const fullQuery = Cypher.utils.concat(matchQuery, createQuery.return(response));
    return fullQuery.build();
  }

  static getAllResponsesForReactionTimes() {
    const participant = new Cypher.Node();
    const session = new Cypher.Node();
    const response = new Cypher.Node();

    const pattern = new Cypher.Pattern(participant, { labels: ["Participant"] })
      .related({ type: "HAS_SESSION" })
      .to(session, { labels: ["Session"] })
      .related({ type: "HAS_RESPONSE" })
      .to(response, { labels: ["Response"] });

    const matchQuery = new Cypher.Match(pattern)
      .return(
        participant.property("id").as("participant_id"),
        session.property("id").as("session_id"),
        response.property("stimulus_word").as("stimulus_word"),
        response.property("response_word").as("response_word"),
        response.property("reaction_time_ms").as("reaction_time_ms"),
        response.property("event_ts").as("event_ts")
      )
      .orderBy(response.property("event_ts"), "DESC");

    return matchQuery.build();
  }
}

// 感情分析関連クエリ
export class EmotionQueries {
  static getEmotionStatistics() {
    const response = new Cypher.Node();

    const matchQuery = new Cypher.Match(
      new Cypher.Pattern(response, { labels: ["Response"] })
    )
      .where(response.property("emotion").isNotNull())
      .return(
        response.property("emotion"),
        response.property("emotion_confidence")
      );

    return matchQuery.build();
  }

  static getParticipantEmotionAnalysis(participantId: string) {
    const participant = new Cypher.Node();
    const session = new Cypher.Node();
    const response = new Cypher.Node();

    const pattern = new Cypher.Pattern(participant, { labels: ["Participant"] })
      .related({ type: "HAS_SESSION" })
      .to(session, { labels: ["Session"] })
      .related({ type: "HAS_RESPONSE" })
      .to(response, { labels: ["Response"] });

    const matchQuery = new Cypher.Match(pattern)
      .where(participant, { id: new Cypher.Param(participantId) })
      .where(response.property("emotion").isNotNull())
      .return(response)
      .orderBy(response.property("event_ts"), "DESC");

    return matchQuery.build();
  }
}

// 汎用ユーティリティクエリ
export class UtilityQueries {
  static connectionTest() {
    return new Cypher.Return(new Cypher.Literal(1).as("test")).build();
  }

  static countAllNodes() {
    const node = new Cypher.Node();
    const matchQuery = new Cypher.Match(node)
      .return(Cypher.count(node).as("total_nodes"));
    return matchQuery.build();
  }

  static countAllRelationships() {
    const fromNode = new Cypher.Node();
    const toNode = new Cypher.Node();
    const relationship = new Cypher.Relationship(fromNode, null, toNode);

    const matchQuery = new Cypher.Match(relationship)
      .return(Cypher.count(relationship).as("total_relationships"));
    return matchQuery.build();
  }
}

// Merkle DAG: Cypher Builder完了
// @neo4j/cypher-builderを使用した型安全なクエリ構築を実装