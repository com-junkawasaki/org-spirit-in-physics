// LLM-BOUNDARY: 50_adapters - RouteHandler/ServerActions/外部API実装

import { StoragePort } from 'scripts/src/20_ports';
import { ConsentData, SaveStructuredDataPayload, EmotionAnalysisResult, Participant, ParticipantWithFiles, SessionData } from 'scripts/src/00_schema';
// Neo4j removed - using GraphQL service instead

export class StorageAdapter implements StoragePort {
  async saveStructuredData(payload: SaveStructuredDataPayload): Promise<void> {
    // PostgreSQLデータベースに保存（GraphQLサービス経由）
    if (payload.type === "consent") {
      await this.saveConsentData(payload.data);
    } else if (payload.type === "session-data") {
      // GraphQLサービス経由でセッションデータを保存（実装予定）
      console.warn('saveStructuredData: GraphQL経由での実装は未対応');
      /* await neo4jManager.saveSession({
        id: `${payload.data.participantId}_session`,
        participantId: payload.data.participantId,
        events: payload.data.events,
        createdAt: payload.data.events[0]?.timestamp || new Date().toISOString()
      }); */
    }
  }

  async saveConsentData(data: ConsentData): Promise<void> {
    // GraphQLサービス経由でPostgreSQLに保存（実装予定）
    console.warn('saveConsentData: GraphQL経由での実装は未対応');
    /* await neo4jManager.saveParticipant({
      id: data.participantId,
      signature: data.signature,
      agreedAt: new Date(data.agreedAt),
      agreements: data.agreements
    }); */
  }

  async saveEmotionAnalysis(participantId: string, result: EmotionAnalysisResult): Promise<void> {
    // GraphQLサービス経由でPostgreSQLに保存（実装予定）
    console.warn('saveEmotionAnalysis: GraphQL経由での実装は未対応');
    /* const analysis = {
      id: `${result.participantId}_${result.videoFile}_${Date.now()}`,
      participantId: result.participantId,
      videoFileId: `${result.participantId}_${result.videoFile}`,
      sessionType: result.sessionType,
      timestamp: result.timestamp,
      processingTime: result.processingTime,
      emotions: result.emotions
    };

    await neo4jManager.saveEmotionAnalysis(analysis); */
  }

  async loadEmotionAnalysis(participantId: string): Promise<EmotionAnalysisResult[]> {
    // GraphQLサービス経由でPostgreSQLから読み込み（実装予定）
    console.warn('loadEmotionAnalysis: GraphQL経由での実装は未対応');
    return [];
    /* try {
      const neo4jResults = await neo4jManager.getEmotionAnalysis(participantId);
      return neo4jResults.map(sa => ({
        participantId: sa.participantId,
        videoFile: sa.videoFileId.replace(`${sa.participantId}_`, ''),
        sessionType: sa.sessionType,
        emotions: sa.emotions,
        timestamp: sa.timestamp,
        processingTime: sa.processingTime
      })); */
    /* } catch (error) {
      console.warn('Failed to load emotion analysis from PostgreSQL:', error);
      return [];
    } */
  }

  async saveArtifact(participantId: string, type: string, filename: string, data: Buffer): Promise<string> {
    // アーティファクト保存は未実装（必要に応じて実装）
    // GraphQLサービス経由でPostgreSQLまたはBlobストレージに保存
    return `graphql://artifacts/${participantId}/${filename}`;
  }

  // data-loader.ts から統合した追加メソッド
  async loadAllParticipants(): Promise<ParticipantWithFiles[]> {
    // GraphQLサービス経由でPostgreSQLから参加者データを取得（実装予定）
    console.warn('loadAllParticipants: GraphQL経由での実装は未対応');
    return [];
    /* try {
      const neo4jParticipants = await neo4jManager.getAllParticipants();
      return neo4jParticipants.map(sp => ({
        id: sp.id,
        age: undefined,
        gender: undefined,
        handedness: undefined,
        createdAt: new Date(sp.agreedAt), // agreedAtを使用
        signature: sp.signature,
        agreedAt: sp.agreedAt?.toISOString() || new Date().toISOString(),
        agreements: sp.agreements,
        hasSessionData: false, // 後で更新
        hasVideoFiles: false, // 後で更新
        videoFiles: []
      })); */
    /* } catch (error) {
      console.warn('Failed to load participants from PostgreSQL:', error);
      return [];
    } */
  }

  async loadSessionData(participantId: string): Promise<SessionData | null> {
    // GraphQLサービス経由でPostgreSQLからセッションデータを取得（実装予定）
    console.warn('loadSessionData: GraphQL経由での実装は未対応');
    return null;
    /* try {
      // GraphQLサービス経由でセッションデータを取得
      // 現時点では仮の実装
      console.log(`Loading session data from PostgreSQL for ${participantId}`);
      return null; // 仮実装
    } catch (error) {
      console.warn('Failed to load session data from PostgreSQL:', error);
      return null;
    } */
  }
}

export const storageAdapter = new StorageAdapter();

