// LLM-BOUNDARY: 50_adapters - RouteHandler/ServerActions/外部API実装

import { StoragePort } from 'scripts/src/20_ports';
import { ConsentData, SaveStructuredDataPayload, EmotionAnalysisResult, Participant, ParticipantWithFiles, SessionData } from 'scripts/src/00_schema';
import { supabaseManager } from 'scripts/src/lib/database/supabase-manager';

export class StorageAdapter implements StoragePort {
  async saveStructuredData(payload: SaveStructuredDataPayload): Promise<void> {
    // Supabaseデータベースに保存（一本化）
    if (payload.type === "consent") {
      await this.saveConsentData(payload.data);
    } else if (payload.type === "session-data") {
      await supabaseManager.saveSession({
        id: `${payload.data.participantId}_session`,
        participantId: payload.data.participantId,
        events: payload.data.events,
        createdAt: payload.data.events[0]?.timestamp || new Date().toISOString()
      });
    }
  }

  async saveConsentData(data: ConsentData): Promise<void> {
    // Supabaseデータベースに保存（一本化）
    await supabaseManager.saveParticipant({
      id: data.participantId,
      signature: data.signature,
      agreedAt: new Date(data.agreedAt),
      agreements: data.agreements
    });
  }

  async saveEmotionAnalysis(participantId: string, result: EmotionAnalysisResult): Promise<void> {
    // Supabaseデータベースに保存（一本化）
    const analysis = {
      id: `${result.participantId}_${result.videoFile}_${Date.now()}`,
      participantId: result.participantId,
      videoFileId: `${result.participantId}_${result.videoFile}`,
      sessionType: result.sessionType,
      timestamp: result.timestamp,
      processingTime: result.processingTime,
      emotions: result.emotions
    };

    await supabaseManager.saveEmotionAnalysis(analysis);
  }

  async loadEmotionAnalysis(participantId: string): Promise<EmotionAnalysisResult[]> {
    // Supabaseデータベースから読み込み（一本化）
    try {
      const supabaseResults = await supabaseManager.getEmotionAnalysis(participantId);
      return supabaseResults.map(sa => ({
        participantId: sa.participantId,
        videoFile: sa.videoFileId.replace(`${sa.participantId}_`, ''),
        sessionType: sa.sessionType,
        emotions: sa.emotions,
        timestamp: sa.timestamp,
        processingTime: sa.processingTime
      }));
    } catch (error) {
      console.warn('Failed to load emotion analysis from Supabase:', error);
      return [];
    }
  }

  async saveArtifact(participantId: string, type: string, filename: string, data: Buffer): Promise<string> {
    // アーティファクト保存は未実装（必要に応じて実装）
      // 現在はURLを返すダミー実装
      return `supabase://artifacts/${participantId}/${filename}`;
  }

  // data-loader.ts から統合した追加メソッド
  async loadAllParticipants(): Promise<ParticipantWithFiles[]> {
    // Supabaseデータベースから参加者データを取得（一本化）
    try {
      const supabaseParticipants = await supabaseManager.getAllParticipants();
      return supabaseParticipants.map(sp => ({
        id: sp.id,
        age: undefined, // SupabaseParticipantにはない
        gender: undefined, // SupabaseParticipantにはない
        handedness: undefined, // SupabaseParticipantにはない
        createdAt: new Date(sp.agreedAt), // agreedAtを使用
        signature: sp.signature,
        agreedAt: sp.agreedAt?.toISOString() || new Date().toISOString(),
        agreements: sp.agreements,
        hasSessionData: false, // 後で更新
        hasVideoFiles: false, // 後で更新
        videoFiles: []
      }));
    } catch (error) {
      console.warn('Failed to load participants from Supabase:', error);
      return [];
    }
  }

  async loadSessionData(participantId: string): Promise<SessionData | null> {
    // Supabaseデータベースからセッションデータを取得（一本化）
    try {
      // SupabaseManagerからセッションデータを取得
      // 現時点では仮の実装
      console.log(`Loading session data from Supabase for ${participantId}`);
      return null; // 仮実装
    } catch (error) {
      console.warn('Failed to load session data from Supabase:', error);
      return null;
    }
  }
}

export const storageAdapter = new StorageAdapter();

