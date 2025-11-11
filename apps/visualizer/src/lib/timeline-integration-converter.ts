// Merkle DAG: timeline_integration_converter -> convert_integrated_data_to_nodes
// 統合処理結果をTimelineIntegrationPointノード形式に変換
// 依存関係: integrateTimelineData結果, TimelineIntegrationPointProperties
// BPMN: TimelineIntegrationConversionProcess

import type { TimelineIntegrationPointProperties } from './neo4j-timeline-schema';

/**
 * 統合処理結果のデータポイント型定義
 */
export interface IntegratedTimelineDataPoint {
  timestamp: number;
  word: string;
  eventType: string;
  reactionTime: number | null;
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
  reactionValue: number;
  metadata: {
    emotionCount: number;
    physiologicalCount: number;
  };
}

/**
 * 統合処理結果をTimelineIntegrationPointノード形式に変換
 */
export function convertIntegratedDataToTimelinePoints(
  integratedData: IntegratedTimelineDataPoint[],
  participantId: string,
  sessionId: string
): Array<Omit<TimelineIntegrationPointProperties, 'created_at' | 'updated_at' | 'version'>> {
  return integratedData.map((point) => ({
    participant_id: participantId,
    session_id: sessionId,
    timestamp: point.timestamp,
    word: point.word,
    event_type: point.eventType,
    reaction_time: point.reactionTime,
    reaction_value: point.reactionValue,
    emotions: point.emotions,
    physiological: point.physiological,
    metadata: point.metadata,
  }));
}

/**
 * TimelineIntegrationPointノードをAPIレスポンス形式に変換
 */
export function convertTimelinePointsToApiResponse(
  timelinePoints: TimelineIntegrationPointProperties[]
): Array<{
  t: number;
  w: string;
  e: string;
  rt: number | null;
  em: Array<{ name: string; score: number; fileType: string }>;
  ph: {
    average: number;
    max: number;
    min: number;
    channels: Record<string, number>;
  };
  rv: number;
  m: {
    ec: number;
    pc: number;
  };
}> {
  return timelinePoints.map((point) => ({
    t: point.timestamp,
    w: point.word,
    e: point.event_type,
    rt: point.reaction_time,
    em: point.emotions,
    ph: point.physiological,
    rv: point.reaction_value,
    m: {
      ec: point.metadata.emotionCount,
      pc: point.metadata.physiologicalCount,
    },
  }));
}

// Merkle DAG: timeline_integration_converter -> implementation_complete
// 統合処理結果変換関数の実装完了

