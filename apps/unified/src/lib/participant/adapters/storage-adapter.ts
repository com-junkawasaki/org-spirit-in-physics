// LLM-BOUNDARY: 50_adapters - RouteHandler/ServerActions/外部API実装
// GraphQLサービス経由でPostgreSQLを使用

import type { StoragePort } from '@/lib/participant/ports/storage';
import type { ConsentData, SaveStructuredDataPayload, EmotionAnalysisResult, ParticipantWithFiles, SessionData } from '@/lib/participant/schema';

export class StorageAdapter implements StoragePort {
  async saveStructuredData(payload: SaveStructuredDataPayload): Promise<void> {
    // GraphQLサービス経由でPostgreSQLに保存（実装予定）
    if (payload.type === "consent") {
      await this.saveConsentData(payload.data);
    } else if (payload.type === "session-data") {
      // GraphQLサービス経由でセッションデータを保存
      console.warn('saveStructuredData: GraphQL経由での実装は未対応');
    }
  }

  async saveConsentData(_data: ConsentData): Promise<void> {
    // GraphQLサービス経由でPostgreSQLに保存（実装予定）
    console.warn('saveConsentData: GraphQL経由での実装は未対応');
  }

  async saveEmotionAnalysis(_participantId: string, _result: EmotionAnalysisResult): Promise<void> {
    // GraphQLサービス経由でPostgreSQLに保存（実装予定）
    console.warn('saveEmotionAnalysis: GraphQL経由での実装は未対応');
  }

  async loadEmotionAnalysis(_participantId: string): Promise<EmotionAnalysisResult[]> {
    // GraphQLサービス経由でPostgreSQLから読み込み（実装予定）
    console.warn('loadEmotionAnalysis: GraphQL経由での実装は未対応');
    return [];
  }

  async saveArtifact(participantId: string, _type: string, filename: string, _data: Buffer): Promise<string> {
    // アーティファクト保存は未実装（必要に応じて実装）
    // GraphQLサービス経由でPostgreSQLまたはBlobストレージに保存
    return `graphql://artifacts/${participantId}/${filename}`;
  }

  // data-loader.ts から統合した追加メソッド
  async loadAllParticipants(): Promise<ParticipantWithFiles[]> {
    // GraphQLサービス経由でPostgreSQLから参加者データを取得（実装予定）
    console.warn('loadAllParticipants: GraphQL経由での実装は未対応');
    return [];
  }

  async loadSessionData(_participantId: string): Promise<SessionData | null> {
    // GraphQLサービス経由でPostgreSQLからセッションデータを取得（実装予定）
    console.warn('loadSessionData: GraphQL経由での実装は未対応');
    return null;
  }
}

export const storageAdapter = new StorageAdapter();
