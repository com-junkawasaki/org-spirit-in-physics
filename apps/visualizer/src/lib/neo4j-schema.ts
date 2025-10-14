// Merkle DAG: Neo4jスキーマ定義
// Spirit in PhysicsプロジェクトのNeo4jグラフデータモデル

// TODO: 将来的に @neo4j/cypher-builder を使用した型安全なスキーマ定義を実装

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

// ノード定義（Cypher文字列として）
// TODO: 将来的に @neo4j/cypher-builder を使用した型安全なノード定義を実装

export const Participant = (properties: Record<string, any> = {}) =>
  `(:Participant ${Object.keys(properties).length > 0 ? JSON.stringify(properties) : ''})`;

export const Session = (properties: Record<string, any> = {}) =>
  `(:Session ${Object.keys(properties).length > 0 ? JSON.stringify(properties) : ''})`;

export const Response = (properties: Record<string, any> = {}) =>
  `(:Response ${Object.keys(properties).length > 0 ? JSON.stringify(properties) : ''})`;

export const WordStimulus = (properties: Record<string, any> = {}) =>
  `(:WordStimulus ${Object.keys(properties).length > 0 ? JSON.stringify(properties) : ''})`;

export const VideoFile = (properties: Record<string, any> = {}) =>
  `(:VideoFile ${Object.keys(properties).length > 0 ? JSON.stringify(properties) : ''})`;

export const EmotionAnalysis = (properties: Record<string, any> = {}) =>
  `(:EmotionAnalysis ${Object.keys(properties).length > 0 ? JSON.stringify(properties) : ''})`;

// リレーションシップ定義（Cypher文字列として）
// TODO: 将来的に @neo4j/cypher-builder を使用した型安全なリレーションシップ定義を実装

export const HasSession = (from: any, to: any, properties: Record<string, any> = {}) =>
  `-[${Object.keys(properties).length > 0 ? JSON.stringify(properties) : ''}:HAS_SESSION]->`;

export const HasResponse = (from: any, to: any, properties: Record<string, any> = {}) =>
  `-[${Object.keys(properties).length > 0 ? JSON.stringify(properties) : ''}:HAS_RESPONSE]->`;

export const HasVideoFile = (from: any, to: any, properties: Record<string, any> = {}) =>
  `-[${Object.keys(properties).length > 0 ? JSON.stringify(properties) : ''}:HAS_VIDEO_FILE]->`;

export const StimulusWord = (from: any, to: any, properties: Record<string, any> = {}) =>
  `-[${Object.keys(properties).length > 0 ? JSON.stringify(properties) : ''}:STIMULUS_WORD]->`;

export const ResponseWord = (from: any, to: any, properties: Record<string, any> = {}) =>
  `-[${Object.keys(properties).length > 0 ? JSON.stringify(properties) : ''}:RESPONSE_WORD]->`;

export const HasEmotionAnalysis = (from: any, to: any, properties: Record<string, any> = {}) =>
  `-[${Object.keys(properties).length > 0 ? JSON.stringify(properties) : ''}:HAS_EMOTION_ANALYSIS]->`;

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
