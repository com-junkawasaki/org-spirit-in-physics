// Merkle DAG: Neo4jスキーマ定義
// Spirit in PhysicsプロジェクトのNeo4jグラフデータモデル

import { Node, Relationship } from '@neo4j/cypher-builder';

// ノードラベル定義
export const NODE_LABELS = {
  PARTICIPANT: 'Participant',
  SESSION: 'Session',
  RESPONSE: 'Response',
  WORD_STIMULUS: 'WordStimulus',
  VIDEO_FILE: 'VideoFile',
  EMOTION_ANALYSIS: 'EmotionAnalysis',
} as const;

// リレーションシップタイプ定義
export const RELATIONSHIP_TYPES = {
  HAS_SESSION: 'HAS_SESSION',
  HAS_RESPONSE: 'HAS_RESPONSE',
  HAS_VIDEO_FILE: 'HAS_VIDEO_FILE',
  STIMULUS_WORD: 'STIMULUS_WORD',
  RESPONSE_WORD: 'RESPONSE_WORD',
  HAS_EMOTION_ANALYSIS: 'HAS_EMOTION_ANALYSIS',
} as const;

// ノード定義
export const Participant = (properties: Record<string, any> = {}) =>
  new Node(NODE_LABELS.PARTICIPANT, properties);

export const Session = (properties: Record<string, any> = {}) =>
  new Node(NODE_LABELS.SESSION, properties);

export const Response = (properties: Record<string, any> = {}) =>
  new Node(NODE_LABELS.RESPONSE, properties);

export const WordStimulus = (properties: Record<string, any> = {}) =>
  new Node(NODE_LABELS.WORD_STIMULUS, properties);

export const VideoFile = (properties: Record<string, any> = {}) =>
  new Node(NODE_LABELS.VIDEO_FILE, properties);

export const EmotionAnalysis = (properties: Record<string, any> = {}) =>
  new Node(NODE_LABELS.EMOTION_ANALYSIS, properties);

// リレーションシップ定義
export const HasSession = (from: Node, to: Node, properties: Record<string, any> = {}) =>
  new Relationship(from, RELATIONSHIP_TYPES.HAS_SESSION, to, properties);

export const HasResponse = (from: Node, to: Node, properties: Record<string, any> = {}) =>
  new Relationship(from, RELATIONSHIP_TYPES.HAS_RESPONSE, to, properties);

export const HasVideoFile = (from: Node, to: Node, properties: Record<string, any> = {}) =>
  new Relationship(from, RELATIONSHIP_TYPES.HAS_VIDEO_FILE, to, properties);

export const StimulusWord = (from: Node, to: Node, properties: Record<string, any> = {}) =>
  new Relationship(from, RELATIONSHIP_TYPES.STIMULUS_WORD, to, properties);

export const ResponseWord = (from: Node, to: Node, properties: Record<string, any> = {}) =>
  new Relationship(from, RELATIONSHIP_TYPES.RESPONSE_WORD, to, properties);

export const HasEmotionAnalysis = (from: Node, to: Node, properties: Record<string, any> = {}) =>
  new Relationship(from, RELATIONSHIP_TYPES.HAS_EMOTION_ANALYSIS, to, properties);

// スキーマ制約定義（Cypherクエリとして）
export const SCHEMA_CONSTRAINTS = {
  // ユニーク制約
  participantId: `CREATE CONSTRAINT participant_id_unique IF NOT EXISTS FOR (p:Participant) REQUIRE p.id IS UNIQUE`,
  sessionId: `CREATE CONSTRAINT session_id_unique IF NOT EXISTS FOR (s:Session) REQUIRE s.id IS UNIQUE`,
  responseId: `CREATE CONSTRAINT response_id_unique IF NOT EXISTS FOR (r:Response) REQUIRE r.id IS UNIQUE`,
  wordStimulusId: `CREATE CONSTRAINT word_stimulus_id_unique IF NOT EXISTS FOR (w:WordStimulus) REQUIRE w.id IS UNIQUE`,

  // ノードキー制約
  participantNodeKey: `CREATE CONSTRAINT participant_node_key IF NOT EXISTS FOR (p:Participant) REQUIRE (p.id, p.created_at) IS NODE KEY`,
  sessionNodeKey: `CREATE CONSTRAINT session_node_key IF NOT EXISTS FOR (s:Session) REQUIRE (s.id, s.participant_id) IS NODE KEY`,
} as const;

// インデックス定義
export const SCHEMA_INDEXES = {
  participantCreatedAt: `CREATE INDEX participant_created_at_idx IF NOT EXISTS FOR (p:Participant) ON (p.created_at)`,
  sessionStartTs: `CREATE INDEX session_start_ts_idx IF NOT EXISTS FOR (s:Session) ON (s.start_ts)`,
  responseEventTs: `CREATE INDEX response_event_ts_idx IF NOT EXISTS FOR (r:Response) ON (r.event_ts)`,
  responseEmotion: `CREATE INDEX response_emotion_idx IF NOT EXISTS FOR (r:Response) ON (r.emotion)`,
} as const;

// スキーマ初期化クエリ
export const getSchemaInitializationQueries = (): string[] => {
  return [
    // 制約作成
    ...Object.values(SCHEMA_CONSTRAINTS),
    // インデックス作成
    ...Object.values(SCHEMA_INDEXES),
  ];
};

// Merkle DAG: スキーマ定義完了
// このスキーマはArangoDBのマルチモデル構造をNeo4jグラフ構造に変換したもの
