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
        participant_id: payload.data.participantId,
        session_id: `${payload.data.participantId}_session`,
        session_type: 'session-1',
        start_time: payload.data.events[0]?.timestamp || new Date().toISOString(),
        end_time: null,
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
    // 感情分析結果はparticipant_hume_analysis_jobsテーブルに保存される
    // この実装は簡易版（詳細はemotion-analysis.tsで実装）
    console.log('Saving emotion analysis to Supabase:', result);
  }

  async loadEmotionAnalysis(participantId: string): Promise<EmotionAnalysisResult[]> {
    // Supabaseデータベースから読み込み（一本化）
    try {
      const emotionAnalysis = await supabaseManager.getEmotionAnalysis(participantId);
      return emotionAnalysis.map(sa => ({
        participantId: sa.participantId,
        videoFile: sa.videoFileId?.replace(`${sa.participantId}_`, '') || '',
        sessionType: sa.sessionType || 'session-1',
        emotions: sa.emotions || {},
        timestamp: sa.timestamp || new Date().toISOString(),
        processingTime: sa.processingTime || 0
      }));
    } catch (error) {
      console.warn('Failed to load emotion analysis from Supabase:', error);
      return [];
    }
  }

  async saveArtifact(participantId: string, type: string, filename: string, data: Buffer): Promise<string> {
    // Supabase Storageにアーティファクトを保存
    try {
      if (type === 'video') {
        // セッションIDをファイル名から抽出（例: session-1-video.webm -> session-1）
        const sessionMatch = filename.match(/session-(\d+)/);
        const sessionId = sessionMatch 
          ? `${participantId}-session-${sessionMatch[1]}`
          : `${participantId}-session-1`;

        // SupabaseManagerを使用して動画をアップロード
        const url = await supabaseManager.uploadVideoToStorage(
          participantId,
          sessionId,
          data,
          filename
        );
        return url;
      } else {
        // その他のアーティファクト（audio, consent, session_data）は現在未対応
        // 必要に応じて実装可能
        console.warn(`Artifact type ${type} not yet supported in Supabase Storage`);
        return `supabase://artifacts/${participantId}/${type}/${filename}`;
      }
    } catch (error) {
      console.error('Error saving artifact to Supabase Storage:', error);
      throw error;
    }
  }

  // data-loader.ts から統合した追加メソッド
  async loadAllParticipants(): Promise<ParticipantWithFiles[]> {
    // Supabaseデータベースから参加者データを取得（一本化）
    try {
      const participants = await supabaseManager.getAllParticipants();
      return participants.map(sp => ({
        id: sp.id,
        age: sp.age,
        gender: sp.gender,
        handedness: sp.handedness,
        createdAt: sp.agreedAt ? new Date(sp.agreedAt) : new Date(),
        signature: sp.signature,
        agreedAt: sp.agreedAt?.toISOString() || new Date().toISOString(),
        agreements: sp.agreements || {},
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

