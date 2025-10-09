// LLM-BOUNDARY: 50_adapters - RouteHandler/ServerActions/外部API実装

import { StoragePort } from 'scripts/src/20_ports';
import { ConsentData, SaveStructuredDataPayload, EmotionAnalysisResult, Participant, ParticipantWithFiles, SessionData } from 'scripts/src/00_schema';

export class StorageAdapter implements StoragePort {
  async saveStructuredData(payload: SaveStructuredDataPayload): Promise<void> {
    // Backend API経由で保存
    if (payload.type === "consent") {
      await this.saveConsentData(payload.data);
    } else if (payload.type === "session-data") {
      await this.saveSessionData(payload.data);
    }
  }

  async saveSessionData(data: SessionData): Promise<void> {
    // Backendのsession import APIを呼び出し
    const backendUrl = process.env.BACKEND_API_URL || 'http://backend:8080';
    const sessionData = {
      participantId: data.participantId,
      events: data.events,
      createdAt: data.events[0]?.timestamp || new Date().toISOString()
    };

    const response = await fetch(`${backendUrl}/api/admin/import/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: sessionData }),
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }
  }

  async saveConsentData(data: ConsentData): Promise<void> {
    // Backendのparticipant import APIを呼び出し
    const backendUrl = process.env.BACKEND_API_URL || 'http://backend:8080';
    const participantData = {
      id: data.participantId,
      signature: data.signature,
      agreedAt: new Date(data.agreedAt || new Date()),
      agreements: data.agreements || {}
    };

    const response = await fetch(`${backendUrl}/api/admin/import/participants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: participantData }),
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }
  }

  async saveEmotionAnalysis(participantId: string, result: EmotionAnalysisResult): Promise<void> {
    // Backendのemotion import APIを呼び出し
    const backendUrl = process.env.BACKEND_API_URL || 'http://backend:8080';
    const analysisData = {
      participantId: result.participantId,
      videoFile: result.videoFile,
      sessionType: result.sessionType,
      timestamp: result.timestamp,
      processingTime: result.processingTime,
      emotions: result.emotions
    };

    const response = await fetch(`${backendUrl}/api/admin/import/emotions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: analysisData }),
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }
  }

  async loadEmotionAnalysis(participantId: string): Promise<EmotionAnalysisResult[]> {
    // Backend APIから読み込み
    try {
      const backendUrl = process.env.BACKEND_API_URL || 'http://backend:8080';
      const response = await fetch(`${backendUrl}/api/emotion-analysis?action=get-results&participantId=${participantId}`);

      if (!response.ok) {
        console.warn(`Backend API error: ${response.status}`);
        return [];
      }

      const data = await response.json();
      if (!data.success || !data.data) {
        console.warn('Invalid response from backend API');
        return [];
      }

      // Backend APIのレスポンス形式を既存の形式に変換
      return (data.data || []).map((sa: any) => ({
        participantId: sa.participantId || participantId,
        videoFile: sa.videoFile || sa.videoFileId?.replace(`${sa.participantId}_`, '') || 'unknown',
        sessionType: sa.sessionType || 'unknown',
        emotions: sa.emotions || [],
        timestamp: sa.timestamp || new Date().toISOString(),
        processingTime: sa.processingTime || 0
      }));
    } catch (error) {
      console.warn('Failed to load emotion analysis from backend:', error);
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
    // Backend APIから参加者データを取得
    try {
      const backendUrl = process.env.BACKEND_API_URL || 'http://backend:8080';
      const response = await fetch(`${backendUrl}/api/experimental-data?type=participants`);

      if (!response.ok) {
        console.warn(`Backend API error: ${response.status}`);
        return [];
      }

      const data = await response.json();
      if (!data.success || !data.data) {
        console.warn('Invalid response from backend API');
        return [];
      }

      // Backend APIのレスポンス形式を既存の形式に変換
      return (data.data || []).map((sp: any) => ({
        id: sp.id,
        age: undefined, // Backend APIにはない
        gender: undefined, // Backend APIにはない
        handedness: undefined, // Backend APIにはない
        createdAt: new Date(sp.createdAt || sp.agreedAt), // createdAtを使用
        signature: sp.signature,
        agreedAt: sp.createdAt || sp.agreedAt || new Date().toISOString(),
        agreements: sp.agreements,
        hasSessionData: sp.hasSessionData || false,
        hasVideoFiles: sp.hasVideoFiles || false,
        videoFiles: sp.videoFiles || []
      }));
    } catch (error) {
      console.warn('Failed to load participants from backend:', error);
      return [];
    }
  }

  async loadSessionData(participantId: string): Promise<SessionData | null> {
    // Backend APIからセッションデータを取得
    try {
      const backendUrl = process.env.BACKEND_API_URL || 'http://backend:8080';
      const response = await fetch(`${backendUrl}/api/experimental-data?type=participant&participantId=${participantId}`);

      if (!response.ok) {
        console.warn(`Backend API error: ${response.status}`);
        return null;
      }

      const data = await response.json();
      if (!data.success || !data.data) {
        console.warn('Invalid response from backend API');
        return null;
      }

      // Backend APIのレスポンスをSessionData形式に変換
      // TODO: backendでセッションイベントデータを返すように実装する必要がある
      const participant = data.data;
      return {
        participantId: participant.id,
        events: [], // TODO: backendで実装
        createdAt: participant.agreedAt || new Date().toISOString(),
        sessionId: `session-${participant.id}`,
        wordResponses: [], // TODO: backendで実装
        sessionType: 'session-1', // デフォルト
        startTime: participant.agreedAt || new Date().toISOString(),
        endTime: participant.agreedAt || new Date().toISOString(),
      } as SessionData;
    } catch (error) {
      console.warn('Failed to load session data from backend:', error);
      return null;
    }
  }
}

export const storageAdapter = new StorageAdapter();

