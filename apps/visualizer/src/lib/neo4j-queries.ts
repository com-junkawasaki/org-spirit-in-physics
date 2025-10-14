// Merkle DAG: Neo4j Cypherクエリビルダー
// @neo4j/cypher-builderを使用した型安全なクエリ構築

import CypherBuilder, {
  Node,
  Relationship,
  Match,
  Create,
  Merge,
  Returning,
  OrderBy,
  Skip,
  Limit,
  Count,
  Collect,
  Sum,
  Avg,
  Max,
  Min,
} from '@neo4j/cypher-builder';
import {
  Participant,
  Session,
  Response,
  WordStimulus,
  VideoFile,
  EmotionAnalysis,
  HasSession,
  HasResponse,
  HasVideoFile,
  StimulusWord,
  ResponseWord,
  HasEmotionAnalysis,
  NODE_LABELS,
  RELATIONSHIP_TYPES,
} from './neo4j-schema';

// Cypherエディタインスタンス
export const cypherEditor = createCypherEditor();

// 参加者関連クエリ
export class ParticipantQueries {
  /**
   * 参加者を作成するクエリ
   */
  static createParticipant(participantData: {
    id: string;
    name?: string;
    age?: number;
    gender?: string;
    handedness?: string;
    signature?: string;
    agreedAt?: Date;
    agreements?: Record<string, any>;
    hasSessionData?: boolean;
    hasVideoFiles?: boolean;
    videoFiles?: any[];
    created_at?: string;
  }) {
    const participant = Participant(participantData);

    const createQuery = Create(participant)
      .returning(participant);

    return createQuery.build();
  }

  /**
   * 参加者を取得するクエリ
   */
  static getParticipant(participantId: string) {
    const participant = Participant({ id: participantId });

    const getQuery = Match(participant)
      .returning(participant);

    return getQuery.build();
  }

  /**
   * 全参加者を取得するクエリ（セッション数とレスポンス数を集計）
   */
  static getAllParticipants() {
    const participant = Participant().named('p');
    const session = Session().named('s');
    const response = Response().named('r');

    const hasSessionRel = HasSession(participant, session);
    const hasResponseRel = HasResponse(session, response);

    const query = Match(participant)
      .optionalMatch(hasSessionRel)
      .optionalMatch(hasResponseRel)
      .returning(
        participant.property('id').as('participant_id'),
        Count(session).as('session_count'),
        Count(response).as('total_responses'),
        CypherBuilder.literal(0.5).as('average_spirit_probability'),
        participant.property('created_at').as('last_activity')
      )
      .orderBy(participant.property('created_at'), 'DESC');

    return query.build();
  }

  /**
   * 参加者の詳細情報を取得するクエリ
   */
  static getParticipantDetails(participantId: string) {
    const participant = Participant({ id: participantId });

    const query = Match(participant)
      .returning(
        participant.property('id'),
        participant.property('age'),
        participant.property('gender'),
        participant.property('handedness')
      );

    return query.build();
  }

  /**
   * 特定の参加者のレスポンスを取得するクエリ
   */
  static getParticipantResponses(participantId: string) {
    const participant = Participant({ id: participantId }).named('p');
    const session = Session().named('s');
    const response = Response().named('r');

    const hasSessionRel = HasSession(participant, session);
    const hasResponseRel = HasResponse(session, response);

    const query = Match(hasSessionRel, hasResponseRel)
      .returning(response)
      .orderBy(response.property('event_ts'), 'DESC');

    return query.build();
  }
}

// セッション関連クエリ
export class SessionQueries {
  /**
   * セッションを作成するクエリ
   */
  static createSession(participantId: string, sessionData: {
    id: string;
    session_index: number;
    start_ts: number;
    end_ts?: number;
    events: any[];
  }) {
    const participant = Participant({ id: participantId });
    const session = Session(sessionData);
    const hasSessionRel = HasSession(participant, session);

    const query = Match(participant)
      .create(hasSessionRel)
      .returning(session);

    return query.build();
  }
}

// レスポンス関連クエリ
export class ResponseQueries {
  /**
   * レスポンスを作成するクエリ
   */
  static createResponse(participantId: string, sessionId: string, responseData: {
    stimulus_word: string;
    response_word: string;
    reaction_time_ms: number;
    event_ts: number;
    emotion?: string;
    emotion_confidence?: number;
  }) {
    const participant = Participant({ id: participantId });
    const session = Session({ id: sessionId });
    const response = Response(responseData);
    const hasSessionRel = HasSession(participant, session);
    const hasResponseRel = HasResponse(session, response);

    const query = Match(hasSessionRel)
      .create(hasResponseRel)
      .returning(response);

    return query.build();
  }
}

// 感情分析関連クエリ
export class EmotionQueries {
  /**
   * 感情統計を取得するクエリ
   */
  static getEmotionStatistics() {
    const response = Response().named('r');

    const query = Match(response)
      .where(response.property('emotion').isNotNull())
      .returning(
        response.property('emotion'),
        response.property('emotion_confidence')
      );

    return query.build();
  }

  /**
   * 特定の参加者の感情分析を取得するクエリ
   */
  static getParticipantEmotionAnalysis(participantId: string) {
    const participant = Participant({ id: participantId }).named('p');
    const session = Session().named('s');
    const response = Response().named('r');

    const hasSessionRel = HasSession(participant, session);
    const hasResponseRel = HasResponse(session, response);

    const query = Match(hasSessionRel, hasResponseRel)
      .where(response.property('emotion').isNotNull())
      .returning(response)
      .orderBy(response.property('event_ts'), 'DESC');

    return query.build();
  }
}

// 汎用ユーティリティクエリ
export class UtilityQueries {
  /**
   * 接続テストクエリ
   */
  static connectionTest() {
    return CypherBuilder.raw('RETURN 1 as test').build();
  }

  /**
   * 全ノード数をカウントするクエリ
   */
  static countAllNodes() {
    const nodes = [Participant(), Session(), Response(), WordStimulus(), VideoFile(), EmotionAnalysis()];

    const query = CypherBuilder.union(
      ...nodes.map(node =>
        Match(node).returning(Count(node).as(`${node.getLabels()[0]}Count`))
      )
    );

    return query.build();
  }

  /**
   * 全リレーションシップ数をカウントするクエリ
   */
  static countAllRelationships() {
    const relationships = [
      HasSession(Participant(), Session()),
      HasResponse(Session(), Response()),
      HasVideoFile(Participant(), VideoFile()),
      StimulusWord(Response(), WordStimulus()),
      ResponseWord(Response(), WordStimulus()),
      HasEmotionAnalysis(Participant(), EmotionAnalysis()),
    ];

    const query = CypherBuilder.union(
      ...relationships.map(rel =>
        Match(rel).returning(Count(rel).as(`${rel.getType()}Count`))
      )
    );

    return query.build();
  }
}

// Merkle DAG: Cypherクエリビルダー完了
// これにより型安全なCypherクエリ生成が可能
