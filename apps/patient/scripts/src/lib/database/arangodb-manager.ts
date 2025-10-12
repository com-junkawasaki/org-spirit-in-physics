// Merkle DAG: ArangoDBデータベースマネージャー
// ArangoDBを使用したデータベース操作マネージャー

import { arangodb, Database } from '../supabase';

// インターフェース定義
export interface Participant {
  id: string;
  signature?: string;
  agreedAt?: Date;
  agreements?: Record<string, any>;
  name?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  handedness?: string;
  hasSessionData?: boolean;
  hasVideoFiles?: boolean;
  videoFiles?: any[];
}

export interface Session {
  id: string;
  participantId: string;
  events: any[];
  createdAt: string;
}

export interface VideoFile {
  id: string;
  participantId: string;
  sessionId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  createdAt: string;
}

export interface EmotionAnalysis {
  id: string;
  participantId: string;
  videoFileId: string;
  sessionType: string;
  emotions: Array<{
    name: string;
    score: number;
    confidence: number;
  }>;
  timestamp: string;
  processingTime: number;
}

export interface Emotion {
  id: string;
  analysisId: string;
  name: string;
  score: number;
  confidence: number;
}

export class ArangoDBManager {
  private arangodb = arangodb;

  /**
   * Merkle DAG: データベース初期化
   * ArangoDBではコレクションの存在確認のみ
   */
  async initialize(): Promise<void> {
    try {
      // 接続テスト
      await this.arangodb.query('RETURN 1');

      console.log('ArangoDB database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ArangoDB database:', error);
      throw error;
    }
  }

  /**
   * Merkle DAG: 参加者データの保存
   */
  async saveParticipant(participant: Participant): Promise<void> {
    try {
      // ArangoDBのparticipantsコレクションに保存
      await this.arangodb.insertParticipant(participant.id, {
        signature: participant.signature,
        agreedAt: participant.agreedAt,
        agreements: participant.agreements,
        name: participant.name,
        age: participant.age,
        gender: participant.gender,
        handedness: participant.handedness,
        hasSessionData: participant.hasSessionData,
        hasVideoFiles: participant.hasVideoFiles,
        videoFiles: participant.videoFiles
      });

      console.log(`Participant ${participant.id} saved to ArangoDB`);
    } catch (error) {
      console.error('Error saving participant:', error);
      throw error;
    }
  }

  /**
   * Merkle DAG: セッションデータの保存
   */
  async saveSession(session: Session): Promise<void> {
    try {
      // イベントデータからセッション情報を抽出
      const sessionStartedEvent = session.events.find((e: any) => e.type === 'session_started');
      const sessionEndedEvent = session.events.filter((e: any) => e.type === 'response_window_closed').pop();

      // セッションインデックスを抽出（session.idから）
      const sessionIndex = parseInt(session.id.split('_')[1] || '0') || 0;

      await this.arangodb.insertSession(session.participantId, sessionIndex, {
        start_ts: new Date(sessionStartedEvent?.timestamp || session.createdAt).getTime(),
        end_ts: sessionEndedEvent?.timestamp ? new Date(sessionEndedEvent.timestamp).getTime() : null,
        events: session.events
      });

      console.log(`Session ${session.id} saved to ArangoDB`);
    } catch (error) {
      console.error('Error saving session:', error);
      throw error;
    }
  }

  /**
   * Merkle DAG: ビデオファイルの保存
   */
  async saveVideoFile(videoFile: VideoFile): Promise<void> {
    // TODO: Implement video file saving to ArangoDB
    console.log(`Video file ${videoFile.fileName} save not implemented for ArangoDB`);
  }

  /**
   * Merkle DAG: 感情分析結果の保存
   */
  async saveEmotionAnalysis(analysis: EmotionAnalysis): Promise<void> {
    // ArangoDBではparticipant_session_responsesに感情データを保存
    for (const emotion of analysis.emotions) {
      try {
        await this.arangodb.insertResponse(analysis.participantId, 0, {
          stimulus_word: emotion.name,
          response_word: emotion.name,
          reaction_time_ms: 0,
          event_ts: new Date(analysis.timestamp).getTime(),
          emotion: emotion.name,
          emotion_confidence: emotion.confidence
        });
      } catch (error) {
        console.error('Error saving emotion analysis:', error);
        throw error;
      }
    }

    console.log(`Emotion analysis ${analysis.id} saved to ArangoDB`);
  }

  /**
   * Merkle DAG: 参加者データの取得
   */
  async getParticipant(participantId: string): Promise<Participant | null> {
    try {
      const query = `
        FOR participant IN participants
          FILTER participant._key == @participantId
          RETURN participant
      `;
      const result = await this.arangodb.query(query, { participantId });

      if (!result || result.length === 0) {
        return null;
      }

      const data = result[0];

      return {
        id: data._key,
        name: data.name,
        age: data.age,
        gender: data.gender,
        handedness: data.handedness,
        signature: data.signature,
        agreedAt: data.agreedAt,
        agreements: data.agreements,
      };
    } catch (error) {
      console.error('Error getting participant:', error);
      return null;
    }
  }

  /**
   * Merkle DAG: 全参加者データの取得
   */
  async getAllParticipants(): Promise<Participant[]> {
    try {
      const query = `
        FOR participant IN participants
          SORT participant.created_at DESC
          RETURN participant
      `;
      const data = await this.arangodb.query(query);

      return data.map(row => ({
        id: row._key,
        name: row.name,
        age: row.age,
        gender: row.gender,
        handedness: row.handedness,
        signature: row.signature,
        agreedAt: row.agreedAt,
        agreements: row.agreements,
        hasSessionData: false, // TODO: セッション数をカウント
        hasVideoFiles: false, // TODO: ビデオファイル数をカウント
        videoFiles: []
      }));
    } catch (error) {
      console.error('Error getting all participants:', error);
      return [];
    }
  }

  /**
   * Merkle DAG: 感情分析結果の取得
   */
  async getEmotionAnalysis(participantId: string): Promise<EmotionAnalysis[]> {
    try {
      const query = `
        FOR response IN participant_session_responses
          FILTER response.participant_id == @participantId
          AND response.emotion != null
          SORT response.event_ts DESC
          RETURN response
      `;
      const data = await this.arangodb.query(query, { participantId });

    // データをグループ化してEmotionAnalysis形式に変換
    const analysisMap = new Map<string, EmotionAnalysis>();

      data.forEach((row: any) => {
        const analysisId = `${participantId}_analysis`;
        if (!analysisMap.has(analysisId)) {
          analysisMap.set(analysisId, {
            id: analysisId,
            participantId: row.participant_id,
            videoFileId: '',
            sessionType: 'session-1',
            timestamp: new Date(row.event_ts).toISOString(),
            processingTime: 0,
            emotions: []
          });
        }

        const analysis = analysisMap.get(analysisId)!;
        analysis.emotions.push({
          name: row.emotion,
          score: 0, // 感情スコア
          confidence: row.emotion_confidence || 0,
        });
      });

    return Array.from(analysisMap.values());
    } catch (error) {
      console.error('Error getting emotion analysis:', error);
      return [];
    }
  }

  /**
   * Merkle DAG: 感情統計の取得
   */
  async getEmotionStatistics(): Promise<any> {
    try {
      const query = `
        FOR response IN participant_session_responses
          FILTER response.emotion != null
          RETURN {
            emotion: response.emotion,
            emotion_confidence: response.emotion_confidence,
            score: 0
          }
      `;
      const data = await this.arangodb.query(query);

      // 感情ごとの統計を計算
      const emotionStats = data.reduce((acc: any, emotion: any) => {
        const name = emotion.emotion;
        if (!acc[name]) {
          acc[name] = { count: 0, totalScore: 0, totalConfidence: 0 };
        }
        acc[name].count += 1;
        acc[name].totalScore += emotion.score || 0;
        acc[name].totalConfidence += emotion.emotion_confidence || 0;
        return acc;
      }, {});

    const averageEmotions: Record<string, number> = {};
    const dominantEmotions: Array<{ emotion: string; count: number }> = [];

    Object.entries(emotionStats).forEach(([name, stats]: [string, any]) => {
      averageEmotions[name] = stats.totalScore / stats.count;
      dominantEmotions.push({
        emotion: name,
        count: stats.count,
      });
    });

    dominantEmotions.sort((a, b) => b.count - a.count);

    return {
      totalAnalyses: data.length,
      averageEmotions,
      dominantEmotions,
      processingStats: { averageTime: 0, totalTime: 0 } // 処理時間統計は保存されていない
    };
    } catch (error) {
      console.error('Error getting emotion statistics:', error);
      return {
        totalAnalyses: 0,
        averageEmotions: {},
        dominantEmotions: [],
        processingStats: { averageTime: 0, totalTime: 0 }
      };
    }
  }

  /**
   * Merkle DAG: カスタムクエリの実行
   */
  async executeQuery(query: string, params: Record<string, any> = {}): Promise<any> {
    return await this.arangodb.query(query, params);
  }

  /**
   * Merkle DAG: データベース接続のクローズ
   */
  async close(): Promise<void> {
    // ArangoDBでは明示的なクローズは不要
    console.log('ArangoDB connection closed');
  }
}

// シングルトンインスタンス
export const arangodbManager = new ArangoDBManager();
