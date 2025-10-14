// LLM-BOUNDARY: 50_adapters - RouteHandler/ServerActions/外部API実装

import { StoragePort } from 'scripts/src/20_ports';
import { ConsentData, SaveStructuredDataPayload, EmotionAnalysisResult, Participant, ParticipantWithFiles, SessionData } from 'scripts/src/00_schema';
import { neo4jManager } from 'scripts/src/lib/database/arangodb-manager';

export class StorageAdapter implements StoragePort {
  async saveStructuredData(payload: SaveStructuredDataPayload): Promise<void> {
    // Neo4jデータベースに保存（一本化）
    if (payload.type === "consent") {
      await this.saveConsentData(payload.data);
    } else if (payload.type === "session-data") {
      await neo4jManager.saveSession({
        id: `${payload.data.participantId}_session`,
        participantId: payload.data.participantId,
        events: payload.data.events,
        createdAt: payload.data.events[0]?.timestamp || new Date().toISOString()
      });
    }
  }

  async saveConsentData(data: ConsentData): Promise<void> {
    // Neo4jデータベースに保存（一本化）
    await neo4jManager.saveParticipant({
      id: data.participantId,
      signature: data.signature,
      agreedAt: new Date(data.agreedAt),
      agreements: data.agreements
    });
  }

  async saveEmotionAnalysis(participantId: string, result: EmotionAnalysisResult): Promise<void> {
    // Neo4jデータベースに保存（一本化）
    const analysis = {
      id: `${result.participantId}_${result.videoFile}_${Date.now()}`,
      participantId: result.participantId,
      videoFileId: `${result.participantId}_${result.videoFile}`,
      sessionType: result.sessionType,
      timestamp: result.timestamp,
      processingTime: result.processingTime,
      emotions: result.emotions
    };

    await neo4jManager.saveEmotionAnalysis(analysis);
  }

  async loadEmotionAnalysis(participantId: string): Promise<EmotionAnalysisResult[]> {
    // Neo4jデータベースから読み込み（一本化）
    try {
      const neo4jResults = await neo4jManager.getEmotionAnalysis(participantId);
      return neo4jResults.map(sa => ({
        participantId: sa.participantId,
        videoFile: sa.videoFileId.replace(`${sa.participantId}_`, ''),
        sessionType: sa.sessionType,
        emotions: sa.emotions,
        timestamp: sa.timestamp,
        processingTime: sa.processingTime
      }));
    } catch (error) {
      console.warn('Failed to load emotion analysis from Neo4j:', error);
      return [];
    }
  }

  async saveArtifact(participantId: string, type: string, filename: string, data: Buffer): Promise<string> {
    // アーティファクト保存は未実装（必要に応じて実装）
      // 現在はURLを返すダミー実装
      return `neo4j://artifacts/${participantId}/${filename}`;
  }

  // data-loader.ts から統合した追加メソッド
  async loadAllParticipants(): Promise<ParticipantWithFiles[]> {
    // Neo4jデータベースから参加者データを取得（一本化）
    try {
      const neo4jParticipants = await neo4jManager.getAllParticipants();
      return neo4jParticipants.map(sp => ({
        id: sp.id,
        age: undefined, // Neo4jParticipantにはない
        gender: undefined, // Neo4jParticipantにはない
        handedness: undefined, // Neo4jParticipantにはない
        createdAt: new Date(sp.agreedAt), // agreedAtを使用
        signature: sp.signature,
        agreedAt: sp.agreedAt?.toISOString() || new Date().toISOString(),
        agreements: sp.agreements,
        hasSessionData: false, // 後で更新
        hasVideoFiles: false, // 後で更新
        videoFiles: []
      }));
    } catch (error) {
      console.warn('Failed to load participants from Neo4j:', error);
      return [];
    }
  }

  async loadSessionData(participantId: string): Promise<SessionData | null> {
    // Neo4jデータベースからセッションデータを取得（一本化）
    try {
      // Neo4jManagerからセッションデータを取得
      // 現時点では仮の実装
      console.log(`Loading session data from Neo4j for ${participantId}`);
      return null; // 仮実装
    } catch (error) {
      console.warn('Failed to load session data from Neo4j:', error);
      return null;
    }
  }
}

export const storageAdapter = new StorageAdapter();

