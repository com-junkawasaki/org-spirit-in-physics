// Merkle DAG: neo4j_schema -> schema_definition
// 主要ラベルに対する主キー制約とインデックス

export const SCHEMA_CONSTRAINTS_PRIMARY = {
  participant_pk: `CREATE CONSTRAINT participant_pk IF NOT EXISTS FOR (n:Participant) REQUIRE n.id IS UNIQUE`,
  experiment_pk: `CREATE CONSTRAINT experiment_pk IF NOT EXISTS FOR (n:Experiment) REQUIRE n.id IS UNIQUE`,
  window_pk: `CREATE CONSTRAINT window_pk IF NOT EXISTS FOR (n:Window) REQUIRE n.id IS UNIQUE`,
  emotionAgg_pk: `CREATE CONSTRAINT emotionAgg_pk IF NOT EXISTS FOR (n:EmotionAggregation) REQUIRE n.id IS UNIQUE`,
  physioAgg_pk: `CREATE CONSTRAINT physioAgg_pk IF NOT EXISTS FOR (n:PhysiologicalAggregation) REQUIRE n.id IS UNIQUE`,
  embedding_pk: `CREATE CONSTRAINT embedding_pk IF NOT EXISTS FOR (n:EmbeddingResult) REQUIRE n.id IS UNIQUE`,
  fusion_pk: `CREATE CONSTRAINT fusion_pk IF NOT EXISTS FOR (n:KernelFusionRun) REQUIRE n.id IS UNIQUE`,
};

export const SCHEMA_INDEXES_PRIMARY = {
  exp_participant: `CREATE INDEX exp_participant IF NOT EXISTS FOR (n:Experiment) ON (n.participantId)`,
  win_participant: `CREATE INDEX win_participant IF NOT EXISTS FOR (n:Window) ON (n.participantId)`,
  emo_window: `CREATE INDEX emo_window IF NOT EXISTS FOR (n:EmotionAggregation) ON (n.windowId)`,
  physio_window: `CREATE INDEX physio_window IF NOT EXISTS FOR (n:PhysiologicalAggregation) ON (n.windowId)`,
  embed_participant: `CREATE INDEX embed_participant IF NOT EXISTS FOR (n:EmbeddingResult) ON (n.participantId)`,
};

// Merkle DAG: Neo4jスキーマ定義
// Spirit in PhysicsプロジェクトのNeo4jグラフデータモデル

// TODO: 将来的に @neo4j/cypher-builder を使用した型安全なスキーマ定義を実装

// ノードラベル定義
export const NODE_LABELS = {
  PARTICIPANT: 'Participant',
  EXPERIMENT: 'Experiment',
  SESSION: 'ExperimentSession',
  RESPONSE: 'Response',
  WORD_STIMULUS: 'WordStimulus',
  VIDEO_FILE: 'VideoFile',
  EMOTION_ANALYSIS: 'EmotionAnalysis',
} as const;

// リレーションシップタイプ定義
export const RELATIONSHIP_TYPES = {
  HAS_EXPERIMENT: 'HAS_EXPERIMENT',
  HAS_SESSION: 'HAS_SESSION',
  HAS_RESPONSE: 'HAS_RESPONSE',
  HAS_VIDEO_FILE: 'HAS_VIDEO_FILE',
  STIMULUS_WORD: 'STIMULUS_WORD',
  RESPONSE_WORD: 'RESPONSE_WORD',
  HAS_EMOTION_ANALYSIS: 'HAS_EMOTION_ANALYSIS',
} as const;

// ノード定義（Cypher文字列として）
// TODO: 将来的に @neo4j/cypher-builder を使用した型安全なノード定義を実装

export const Participant = (properties: Record<string, unknown> = {}) =>
  `(:Participant ${Object.keys(properties).length > 0 ? JSON.stringify(properties) : ''})`;

export const Experiment = (properties: Record<string, unknown> = {}) =>
  `(:Experiment ${Object.keys(properties).length > 0 ? JSON.stringify(properties) : ''})`;

export const Session = (properties: Record<string, unknown> = {}) =>
  `(:ExperimentSession ${Object.keys(properties).length > 0 ? JSON.stringify(properties) : ''})`;

export const Response = (properties: Record<string, unknown> = {}) =>
  `(:Response ${Object.keys(properties).length > 0 ? JSON.stringify(properties) : ''})`;

export const WordStimulus = (properties: Record<string, unknown> = {}) =>
  `(:WordStimulus ${Object.keys(properties).length > 0 ? JSON.stringify(properties) : ''})`;

export const VideoFile = (properties: Record<string, unknown> = {}) =>
  `(:VideoFile ${Object.keys(properties).length > 0 ? JSON.stringify(properties) : ''})`;

export const EmotionAnalysis = (properties: Record<string, unknown> = {}) =>
  `(:EmotionAnalysis ${Object.keys(properties).length > 0 ? JSON.stringify(properties) : ''})`;

// リレーションシップ定義（Cypher文字列として）
// TODO: 将来的に @neo4j/cypher-builder を使用した型安全なリレーションシップ定義を実装

export const HasExperiment = (_from: unknown, _to: unknown, properties: Record<string, unknown> = {}) =>
  `-[${Object.keys(properties).length > 0 ? JSON.stringify(properties) : ''}:HAS_EXPERIMENT]->`;

export const HasSession = (_from: unknown, _to: unknown, properties: Record<string, unknown> = {}) =>
  `-[${Object.keys(properties).length > 0 ? JSON.stringify(properties) : ''}:HAS_SESSION]->`;

export const HasResponse = (_from: unknown, _to: unknown, properties: Record<string, unknown> = {}) =>
  `-[${Object.keys(properties).length > 0 ? JSON.stringify(properties) : ''}:HAS_RESPONSE]->`;

export const HasVideoFile = (_from: unknown, _to: unknown, properties: Record<string, unknown> = {}) =>
  `-[${Object.keys(properties).length > 0 ? JSON.stringify(properties) : ''}:HAS_VIDEO_FILE]->`;

export const StimulusWord = (_from: unknown, _to: unknown, properties: Record<string, unknown> = {}) =>
  `-[${Object.keys(properties).length > 0 ? JSON.stringify(properties) : ''}:STIMULUS_WORD]->`;

export const ResponseWord = (_from: unknown, _to: unknown, properties: Record<string, unknown> = {}) =>
  `-[${Object.keys(properties).length > 0 ? JSON.stringify(properties) : ''}:RESPONSE_WORD]->`;

export const HasEmotionAnalysis = (_from: unknown, _to: unknown, properties: Record<string, unknown> = {}) =>
  `-[${Object.keys(properties).length > 0 ? JSON.stringify(properties) : ''}:HAS_EMOTION_ANALYSIS]->`;

// スキーマ制約定義（Cypherクエリとして）
export const SCHEMA_CONSTRAINTS = {
  // ユニーク制約（主キーはアプリ側の安定ID＋DB制約で固める）
  participantId: `CREATE CONSTRAINT participant_id_unique IF NOT EXISTS FOR (p:Participant) REQUIRE p.id IS UNIQUE`,
  experimentId: `CREATE CONSTRAINT experiment_id_unique IF NOT EXISTS FOR (e:Experiment) REQUIRE e.id IS UNIQUE`,
  sessionId: `CREATE CONSTRAINT session_id_unique IF NOT EXISTS FOR (s:ExperimentSession) REQUIRE s.id IS UNIQUE`,
  responseId: `CREATE CONSTRAINT response_id_unique IF NOT EXISTS FOR (r:Response) REQUIRE r.id IS UNIQUE`,
  wordStimulusId: `CREATE CONSTRAINT word_stimulus_id_unique IF NOT EXISTS FOR (w:WordStimulus) REQUIRE w.id IS UNIQUE`,
  emotionAnalysisId: `CREATE CONSTRAINT emotion_analysis_id_unique IF NOT EXISTS FOR (e:EmotionAnalysis) REQUIRE e.id IS UNIQUE`,
  importJobId: `CREATE CONSTRAINT import_job_id_unique IF NOT EXISTS FOR (j:ImportJob) REQUIRE j.id IS UNIQUE`,

  // ノードキー制約（複合キーによる整合性ハード担保）
  participantNodeKey: `CREATE CONSTRAINT participant_node_key IF NOT EXISTS FOR (p:Participant) REQUIRE (p.id, p.created_at) IS NODE KEY`,
  experimentNodeKey: `CREATE CONSTRAINT experiment_node_key IF NOT EXISTS FOR (e:Experiment) REQUIRE (e.id, e.created_at) IS NODE KEY`,
  sessionNodeKey: `CREATE CONSTRAINT session_node_key IF NOT EXISTS FOR (s:ExperimentSession) REQUIRE (s.id, s.participant_id, s.experiment_id) IS NODE KEY`,
  responseNodeKey: `CREATE CONSTRAINT response_node_key IF NOT EXISTS FOR (r:Response) REQUIRE (r.id, r.session_id, r.experiment_id) IS NODE KEY`,
  
  // 存在制約（EXISTS制約による整合性ハード担保）
  participantConsentExists: `CREATE CONSTRAINT participant_consent_exists IF NOT EXISTS FOR (p:Participant) REQUIRE p.consent_given IS NOT NULL`,
  experimentStatusExists: `CREATE CONSTRAINT experiment_status_exists IF NOT EXISTS FOR (e:Experiment) REQUIRE e.status IS NOT NULL`,
  sessionStatusExists: `CREATE CONSTRAINT session_status_exists IF NOT EXISTS FOR (s:ExperimentSession) REQUIRE s.status IS NOT NULL`,
  responseEventTsExists: `CREATE CONSTRAINT response_event_ts_exists IF NOT EXISTS FOR (r:Response) REQUIRE r.event_ts IS NOT NULL`,
  
  // 範囲制約（データ整合性の向上）
  participantAgeRange: `CREATE CONSTRAINT participant_age_range IF NOT EXISTS FOR (p:Participant) REQUIRE p.age >= 0 AND p.age <= 150`,
  responseConfidenceRange: `CREATE CONSTRAINT response_confidence_range IF NOT EXISTS FOR (r:Response) REQUIRE r.confidence_score >= 0.0 AND r.confidence_score <= 1.0`,
  sessionProgressRange: `CREATE CONSTRAINT session_progress_range IF NOT EXISTS FOR (s:ExperimentSession) REQUIRE s.completed_responses >= 0 AND s.completed_responses <= s.total_responses`,
} as const;

// インデックス定義
export const SCHEMA_INDEXES = {
  // 基本インデックス
  participantCreatedAt: `CREATE INDEX participant_created_at_idx IF NOT EXISTS FOR (p:Participant) ON (p.created_at)`,
  experimentCreatedAt: `CREATE INDEX experiment_created_at_idx IF NOT EXISTS FOR (e:Experiment) ON (e.created_at)`,
  sessionStartTs: `CREATE INDEX session_start_ts_idx IF NOT EXISTS FOR (s:ExperimentSession) ON (s.start_ts)`,
  responseEventTs: `CREATE INDEX response_event_ts_idx IF NOT EXISTS FOR (r:Response) ON (r.event_ts)`,
  responseEmotion: `CREATE INDEX response_emotion_idx IF NOT EXISTS FOR (r:Response) ON (r.emotion)`,
  
  // 複合インデックス（パフォーマンス最適化）
  participantExperimentComposite: `CREATE INDEX participant_experiment_composite_idx IF NOT EXISTS FOR (p:Participant)-[r:HAS_EXPERIMENT]->(e:Experiment) ON (p.id, e.created_at)`,
  experimentSessionComposite: `CREATE INDEX experiment_session_composite_idx IF NOT EXISTS FOR (e:Experiment)-[r:HAS_SESSION]->(s:ExperimentSession) ON (e.id, s.start_ts)`,
  participantSessionComposite: `CREATE INDEX participant_session_composite_idx IF NOT EXISTS FOR (p:Participant)-[r:HAS_SESSION]->(s:ExperimentSession) ON (p.id, s.start_ts)`,
  responseEmotionComposite: `CREATE INDEX response_emotion_composite_idx IF NOT EXISTS FOR (r:Response) ON (r.emotion, r.confidence_score)`,
  sessionTemporal: `CREATE INDEX session_temporal_idx IF NOT EXISTS FOR (s:ExperimentSession) ON (s.start_ts, s.end_ts)`,
  
  // 関係プロパティインデックス
  responseStimulusRelationship: `CREATE INDEX response_stimulus_rel_idx IF NOT EXISTS FOR ()-[r:STIMULUS_WORD]->() ON (r.reaction_time, r.confidence)`,
  emotionAnalysisRelationship: `CREATE INDEX emotion_analysis_rel_idx IF NOT EXISTS FOR ()-[r:HAS_EMOTION_ANALYSIS]->() ON (r.analysis_timestamp, r.confidence_score)`,
  
  // 全文検索インデックス
  wordStimulusText: `CREATE FULLTEXT INDEX word_stimulus_text_idx IF NOT EXISTS FOR (w:WordStimulus) ON EACH [w.word, w.pronunciation, w.category]`,
  responseText: `CREATE FULLTEXT INDEX response_text_idx IF NOT EXISTS FOR (r:Response) ON EACH [r.response_word, r.emotion]`,
} as const;

// スキーマ初期化クエリ
export const getSchemaInitializationQueries = (): string[] => {
  return [
    // 制約作成
    ...Object.values(SCHEMA_CONSTRAINTS_PRIMARY),
    ...Object.values(SCHEMA_CONSTRAINTS),
    // インデックス作成
    ...Object.values(SCHEMA_INDEXES_PRIMARY),
    ...Object.values(SCHEMA_INDEXES),
  ];
};

// Merkle DAG: スキーマ定義完了
// このスキーマはNeo4jグラフ構造を定義したもの
