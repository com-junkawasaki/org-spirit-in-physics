// Merkle DAG: neo4j_timeline_manager -> timeline_integration_operations
// TimelineIntegrationPointノードの操作を管理するクラス
// 依存関係: neo4j client, neo4j-timeline-schema
// BPMN: TimelineIntegrationManagementProcess

import { createNeo4jClient } from './neo4j';
import type { TimelineIntegrationPointProperties } from './neo4j-timeline-schema';
import {
  generateTimelinePointId,
  createTimelineIntegrationPointQuery,
  createTimelinePointRelationshipsQuery,
  getTimelineIntegrationPointsQuery,
  getTimelineIntegrationPointsByTimeRangeQuery,
  checkTimelineIntegrationPointsExistQuery,
  deleteTimelineIntegrationPointsBySessionQuery,
} from './neo4j-timeline-schema';

/**
 * TimelineIntegrationPointManager
 * 時系列統合分析結果ノードの作成・取得・更新・削除を管理
 */
export class TimelineIntegrationPointManager {
  private client = createNeo4jClient();

  /**
   * TimelineIntegrationPointノードを作成
   */
  async createTimelinePoint(
    properties: Omit<TimelineIntegrationPointProperties, 'created_at' | 'updated_at' | 'version'>
  ): Promise<TimelineIntegrationPointProperties> {
    const now = new Date().toISOString();
    const id = generateTimelinePointId(
      properties.participant_id,
      properties.session_id,
      properties.timestamp
    );

    const pointProperties: TimelineIntegrationPointProperties = {
      ...properties,
      id,
      created_at: now,
      updated_at: now,
      version: 1,
    };

    try {
      // ノード作成
      const createQuery = createTimelineIntegrationPointQuery();
      const result = await this.client.query(createQuery, {
        id: pointProperties.id,
        participant_id: pointProperties.participant_id,
        session_id: pointProperties.session_id,
        timestamp: pointProperties.timestamp,
        word: pointProperties.word,
        event_type: pointProperties.event_type,
        reaction_time: pointProperties.reaction_time,
        reaction_value: pointProperties.reaction_value,
        emotions: JSON.stringify(pointProperties.emotions),
        physiological: JSON.stringify(pointProperties.physiological),
        metadata: JSON.stringify(pointProperties.metadata),
        created_at: pointProperties.created_at,
        updated_at: pointProperties.updated_at,
        version: pointProperties.version,
      });

      // リレーションシップ作成
      const relationshipQuery = createTimelinePointRelationshipsQuery();
      await this.client.query(relationshipQuery, {
        participant_id: pointProperties.participant_id,
        session_id: pointProperties.session_id,
        timeline_point_id: pointProperties.id,
      });

      return pointProperties;
    } catch (error) {
      console.error('Error creating timeline integration point:', error);
      throw error;
    }
  }

  /**
   * TimelineIntegrationPointノードを一括作成
   */
  async createTimelinePointsBulk(
    points: Array<Omit<TimelineIntegrationPointProperties, 'created_at' | 'updated_at' | 'version'>>
  ): Promise<number> {
    if (points.length === 0) return 0;

    const now = new Date().toISOString();
    let createdCount = 0;

    // バッチサイズで分割して処理（Neo4jの負荷を考慮）
    const batchSize = 100;
    for (let i = 0; i < points.length; i += batchSize) {
      const batch = points.slice(i, i + batchSize);
      
      try {
        // UNWINDを使用した一括作成
        const query = `
          UNWIND $points as point
          CREATE (t:TimelineIntegrationPoint {
            id: point.id,
            participant_id: point.participant_id,
            session_id: point.session_id,
            timestamp: point.timestamp,
            word: point.word,
            event_type: point.event_type,
            reaction_time: point.reaction_time,
            reaction_value: point.reaction_value,
            emotions: point.emotions,
            physiological: point.physiological,
            metadata: point.metadata,
            created_at: datetime(point.created_at),
            updated_at: datetime(point.updated_at),
            version: point.version
          })
          WITH t, point
          MATCH (p:Participant {id: point.participant_id})
          MATCH (s:Session {id: point.session_id})
          MERGE (p)-[:HAS_TIMELINE_POINT]->(t)
          MERGE (s)-[:HAS_TIMELINE_POINT]->(t)
          RETURN count(t) as created_count
        `;

        const pointsData = batch.map(point => ({
          id: generateTimelinePointId(point.participant_id, point.session_id, point.timestamp),
          participant_id: point.participant_id,
          session_id: point.session_id,
          timestamp: point.timestamp,
          word: point.word,
          event_type: point.event_type,
          reaction_time: point.reaction_time,
          reaction_value: point.reaction_value,
          emotions: JSON.stringify(point.emotions),
          physiological: JSON.stringify(point.physiological),
          metadata: JSON.stringify(point.metadata),
          created_at: now,
          updated_at: now,
          version: 1,
        }));

        const result = await this.client.query(query, { points: pointsData });
        createdCount += result[0]?.created_count || 0;
      } catch (error) {
        console.error(`Error creating timeline points batch ${i}-${i + batch.length}:`, error);
        throw error;
      }
    }

    return createdCount;
  }

  /**
   * TimelineIntegrationPointノードを取得（時系列順）
   */
  async getTimelinePoints(
    participantId: string,
    sessionId?: string
  ): Promise<TimelineIntegrationPointProperties[]> {
    try {
      const query = getTimelineIntegrationPointsQuery();
      const results = await this.client.query(query, {
        participant_id: participantId,
        session_id: sessionId || null,
      });

      return results.map((r: any) => {
        const t = r.t || r;
        return {
          id: t.id,
          participant_id: t.participant_id,
          session_id: t.session_id,
          timestamp: typeof t.timestamp === 'object' && t.timestamp?.low ? t.timestamp.low : t.timestamp,
          word: t.word,
          event_type: t.event_type,
          reaction_time: t.reaction_time,
          reaction_value: t.reaction_value,
          emotions: typeof t.emotions === 'string' ? JSON.parse(t.emotions) : t.emotions,
          physiological: typeof t.physiological === 'string' ? JSON.parse(t.physiological) : t.physiological,
          metadata: typeof t.metadata === 'string' ? JSON.parse(t.metadata) : t.metadata,
          created_at: t.created_at?.toString() || new Date().toISOString(),
          updated_at: t.updated_at?.toString() || new Date().toISOString(),
          version: t.version || 1,
        };
      });
    } catch (error) {
      console.error('Error getting timeline points:', error);
      throw error;
    }
  }

  /**
   * TimelineIntegrationPointノードをタイムスタンプ範囲で取得
   */
  async getTimelinePointsByTimeRange(
    participantId: string,
    startTimestamp: number,
    endTimestamp: number,
    sessionId?: string
  ): Promise<TimelineIntegrationPointProperties[]> {
    try {
      const query = getTimelineIntegrationPointsByTimeRangeQuery();
      const results = await this.client.query(query, {
        participant_id: participantId,
        session_id: sessionId || null,
        start_timestamp: startTimestamp,
        end_timestamp: endTimestamp,
      });

      return results.map((r: any) => {
        const t = r.t || r;
        return {
          id: t.id,
          participant_id: t.participant_id,
          session_id: t.session_id,
          timestamp: typeof t.timestamp === 'object' && t.timestamp?.low ? t.timestamp.low : t.timestamp,
          word: t.word,
          event_type: t.event_type,
          reaction_time: t.reaction_time,
          reaction_value: t.reaction_value,
          emotions: typeof t.emotions === 'string' ? JSON.parse(t.emotions) : t.emotions,
          physiological: typeof t.physiological === 'string' ? JSON.parse(t.physiological) : t.physiological,
          metadata: typeof t.metadata === 'string' ? JSON.parse(t.metadata) : t.metadata,
          created_at: t.created_at?.toString() || new Date().toISOString(),
          updated_at: t.updated_at?.toString() || new Date().toISOString(),
          version: t.version || 1,
        };
      });
    } catch (error) {
      console.error('Error getting timeline points by time range:', error);
      throw error;
    }
  }

  /**
   * TimelineIntegrationPointノードの存在確認
   */
  async checkTimelinePointsExist(
    participantId: string,
    sessionId: string
  ): Promise<{
    exists: boolean;
    count: number;
    minTimestamp: number | null;
    maxTimestamp: number | null;
    maxVersion: number | null;
  }> {
    try {
      const query = checkTimelineIntegrationPointsExistQuery();
      const results = await this.client.query(query, {
        participant_id: participantId,
        session_id: sessionId,
      });

      if (results.length === 0) {
        return {
          exists: false,
          count: 0,
          minTimestamp: null,
          maxTimestamp: null,
          maxVersion: null,
        };
      }

      const result = results[0];
      const count = typeof result.count === 'object' && result.count?.low ? result.count.low : result.count || 0;
      const minTimestamp = typeof result.min_timestamp === 'object' && result.min_timestamp?.low
        ? result.min_timestamp.low
        : result.min_timestamp;
      const maxTimestamp = typeof result.max_timestamp === 'object' && result.max_timestamp?.low
        ? result.max_timestamp.low
        : result.max_timestamp;
      const maxVersion = typeof result.max_version === 'object' && result.max_version?.low
        ? result.max_version.low
        : result.max_version;

      return {
        exists: count > 0,
        count,
        minTimestamp,
        maxTimestamp,
        maxVersion,
      };
    } catch (error) {
      console.error('Error checking timeline points existence:', error);
      throw error;
    }
  }

  /**
   * TimelineIntegrationPointノードをセッション単位で削除
   */
  async deleteTimelinePointsBySession(sessionId: string): Promise<number> {
    try {
      const query = deleteTimelineIntegrationPointsBySessionQuery();
      const results = await this.client.query(query, {
        session_id: sessionId,
      });

      const deletedCount = typeof results[0]?.deleted_count === 'object' && results[0].deleted_count?.low
        ? results[0].deleted_count.low
        : results[0]?.deleted_count || 0;

      return deletedCount;
    } catch (error) {
      console.error('Error deleting timeline points:', error);
      throw error;
    }
  }
}

// Merkle DAG: neo4j_timeline_manager -> implementation_complete
// TimelineIntegrationPointノード操作管理クラスの実装完了

