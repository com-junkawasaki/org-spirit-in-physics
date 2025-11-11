// Merkle DAG: neo4j_timeline_schema -> timeline_integration_node_design
// 時系列統合分析結果表示用ノード設計
// DoDAF v2 DM2ベース: InformationType = TimelineIntegrationPoint
// 依存関係: Participant, Session, EmotionData, PhysiologicalData
// BPMN: TimelineIntegrationProcess

/**
 * TimelineIntegrationPoint ノード設計
 * 
 * 目的: 事前計算された統合分析結果をNeo4jに保存し、
 *       リアルタイム統合処理の負荷を削減する
 * 
 * InformationType: TimelineIntegrationPoint
 * - 時系列統合可視化データポイント
 * - セッションイベント、感情データ、生理データを統合した結果
 */

// ノードラベル定義
export const TIMELINE_NODE_LABELS = {
  TIMELINE_INTEGRATION_POINT: 'TimelineIntegrationPoint',
} as const;

// リレーションシップタイプ定義
export const TIMELINE_RELATIONSHIP_TYPES = {
  HAS_TIMELINE_POINT: 'HAS_TIMELINE_POINT',
  DERIVED_FROM_SESSION_EVENT: 'DERIVED_FROM_SESSION_EVENT',
  DERIVED_FROM_EMOTION_DATA: 'DERIVED_FROM_EMOTION_DATA',
  DERIVED_FROM_PHYSIOLOGICAL_DATA: 'DERIVED_FROM_PHYSIOLOGICAL_DATA',
} as const;

/**
 * TimelineIntegrationPoint ノードプロパティ定義
 * 
 * DataType定義:
 * - id: string (UUID形式: {participantId}_{sessionId}_{timestamp})
 * - participant_id: string
 * - session_id: string
 * - timestamp: integer (ミリ秒、Unix timestamp)
 * - word: string (刺激語)
 * - event_type: string ('word_displayed', 'speech_detected'など)
 * - reaction_time: integer | null (ミリ秒、nullable)
 * - reaction_value: float (統合反応値)
 * - emotions: JSON array (感情データ配列)
 * - physiological: JSON object (生理データ)
 * - metadata: JSON object (メタデータ)
 * - created_at: datetime
 * - updated_at: datetime
 * - version: integer (データバージョン、将来のスキーマ変更対応)
 */
export interface TimelineIntegrationPointProperties {
  id: string;
  participant_id: string;
  session_id: string;
  timestamp: number;
  word: string;
  event_type: string;
  reaction_time: number | null;
  reaction_value: number;
  emotions: Array<{
    name: string;
    score: number;
    fileType: 'burst' | 'face' | 'language' | 'prosody';
  }>;
  physiological: {
    average: number;
    max: number;
    min: number;
    channels: Record<string, number>;
  };
  metadata: {
    emotionCount: number;
    physiologicalCount: number;
  };
  created_at: string; // ISO 8601 datetime string
  updated_at: string; // ISO 8601 datetime string
  version: number; // スキーマバージョン（現在は1）
}

/**
 * Neo4jスキーマ制約定義
 */
export const TIMELINE_SCHEMA_CONSTRAINTS = {
  // ユニーク制約（主キー）
  timelinePointIdUnique: `CREATE CONSTRAINT timeline_integration_point_id_unique IF NOT EXISTS 
    FOR (t:TimelineIntegrationPoint) REQUIRE t.id IS UNIQUE`,
  
  // ノードキー制約（複合キーによる整合性保証）
  timelinePointNodeKey: `CREATE CONSTRAINT timeline_integration_point_node_key IF NOT EXISTS 
    FOR (t:TimelineIntegrationPoint) REQUIRE (t.id, t.participant_id, t.session_id, t.timestamp) IS NODE KEY`,
  
  // 存在制約
  timelinePointParticipantExists: `CREATE CONSTRAINT timeline_integration_point_participant_exists IF NOT EXISTS 
    FOR (t:TimelineIntegrationPoint) REQUIRE t.participant_id IS NOT NULL`,
  
  timelinePointSessionExists: `CREATE CONSTRAINT timeline_integration_point_session_exists IF NOT EXISTS 
    FOR (t:TimelineIntegrationPoint) REQUIRE t.session_id IS NOT NULL`,
  
  timelinePointTimestampExists: `CREATE CONSTRAINT timeline_integration_point_timestamp_exists IF NOT EXISTS 
    FOR (t:TimelineIntegrationPoint) REQUIRE t.timestamp IS NOT NULL`,
} as const;

/**
 * Neo4jインデックス定義
 */
export const TIMELINE_SCHEMA_INDEXES = {
  // 参加者ID + セッションID + タイムスタンプでの高速検索
  timelinePointParticipantSessionTimestamp: `CREATE INDEX timeline_integration_point_participant_session_timestamp IF NOT EXISTS 
    FOR (t:TimelineIntegrationPoint) ON (t.participant_id, t.session_id, t.timestamp)`,
  
  // セッションID + タイムスタンプでの高速検索
  timelinePointSessionTimestamp: `CREATE INDEX timeline_integration_point_session_timestamp IF NOT EXISTS 
    FOR (t:TimelineIntegrationPoint) ON (t.session_id, t.timestamp)`,
  
  // 単語での高速検索
  timelinePointWord: `CREATE INDEX timeline_integration_point_word IF NOT EXISTS 
    FOR (t:TimelineIntegrationPoint) ON (t.word)`,
  
  // タイムスタンプ範囲検索用
  timelinePointTimestampRange: `CREATE INDEX timeline_integration_point_timestamp_range IF NOT EXISTS 
    FOR (t:TimelineIntegrationPoint) ON (t.timestamp)`,
} as const;

/**
 * TimelineIntegrationPoint ID生成関数
 */
export function generateTimelinePointId(
  participantId: string,
  sessionId: string,
  timestamp: number
): string {
  return `${participantId}_${sessionId}_${timestamp}`;
}

/**
 * TimelineIntegrationPoint ノード作成用Cypherクエリ生成
 */
export function createTimelineIntegrationPointQuery(): string {
  return `
    CREATE (t:TimelineIntegrationPoint {
      id: $id,
      participant_id: $participant_id,
      session_id: $session_id,
      timestamp: $timestamp,
      word: $word,
      event_type: $event_type,
      reaction_time: $reaction_time,
      reaction_value: $reaction_value,
      emotions: $emotions,
      physiological: $physiological,
      metadata: $metadata,
      created_at: datetime($created_at),
      updated_at: datetime($updated_at),
      version: $version
    })
    RETURN t
  `;
}

/**
 * TimelineIntegrationPoint とParticipant/Sessionのリレーションシップ作成クエリ
 */
export function createTimelinePointRelationshipsQuery(): string {
  return `
    MATCH (p:Participant {id: $participant_id})
    MATCH (s:Session {id: $session_id})
    MATCH (t:TimelineIntegrationPoint {id: $timeline_point_id})
    MERGE (p)-[:HAS_TIMELINE_POINT]->(t)
    MERGE (s)-[:HAS_TIMELINE_POINT]->(t)
    RETURN t
  `;
}

/**
 * TimelineIntegrationPoint 一括取得クエリ（時系列順）
 */
export function getTimelineIntegrationPointsQuery(): string {
  return `
    MATCH (p:Participant {id: $participant_id})-[:HAS_TIMELINE_POINT]->(t:TimelineIntegrationPoint)
    WHERE ($session_id IS NULL OR t.session_id = $session_id)
    RETURN t
    ORDER BY t.timestamp ASC
  `;
}

/**
 * TimelineIntegrationPoint 範囲取得クエリ（タイムスタンプ範囲指定）
 */
export function getTimelineIntegrationPointsByTimeRangeQuery(): string {
  return `
    MATCH (p:Participant {id: $participant_id})-[:HAS_TIMELINE_POINT]->(t:TimelineIntegrationPoint)
    WHERE ($session_id IS NULL OR t.session_id = $session_id)
      AND t.timestamp >= $start_timestamp
      AND t.timestamp <= $end_timestamp
    RETURN t
    ORDER BY t.timestamp ASC
  `;
}

/**
 * TimelineIntegrationPoint 存在確認クエリ
 */
export function checkTimelineIntegrationPointsExistQuery(): string {
  return `
    MATCH (p:Participant {id: $participant_id})-[:HAS_TIMELINE_POINT]->(t:TimelineIntegrationPoint)
    WHERE t.session_id = $session_id
    RETURN count(t) as count, 
           min(t.timestamp) as min_timestamp,
           max(t.timestamp) as max_timestamp,
           max(t.version) as max_version
  `;
}

/**
 * TimelineIntegrationPoint 一括削除クエリ（セッション単位）
 */
export function deleteTimelineIntegrationPointsBySessionQuery(): string {
  return `
    MATCH (s:Session {id: $session_id})-[:HAS_TIMELINE_POINT]->(t:TimelineIntegrationPoint)
    DETACH DELETE t
    RETURN count(t) as deleted_count
  `;
}

// Merkle DAG: neo4j_timeline_schema -> implementation_complete
// 時系列統合分析結果表示用ノード設計の実装完了

