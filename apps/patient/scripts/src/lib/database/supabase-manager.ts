// Merkle DAG: Supabaseデータベースマネージャー
// Supabaseを使用したデータベース操作マネージャー

import { supabase, Database } from '../supabase';

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

export class SupabaseManager {
  private supabase = supabase;

  /**
   * Merkle DAG: データベース初期化
   * Supabaseではマイグレーションでスキーマが作成されるため、ここでは接続確認のみ
   */
  async initialize(): Promise<void> {
    try {
      // 接続テスト
      const { data, error } = await this.supabase
        .from('participants')
        .select('count')
        .limit(1);

      if (error) {
        console.warn('Supabase connection test failed:', error);
        throw error;
      }

      console.log('Supabase database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Supabase database:', error);
      throw error;
    }
  }

  /**
   * Merkle DAG: 参加者データの保存
   */
  async saveParticipant(participant: Participant): Promise<void> {
    // 新しいスキーマではparticipantsとparticipant_consentsに分離
    // まずparticipantsテーブルに基本情報を保存
    const { error: participantError } = await this.supabase
      .from('participants')
      .upsert({
        id: participant.id,
        name: participant.name || null,
        age: participant.age || null,
        gender: participant.gender || null,
        handedness: participant.handedness || null,
      });

    if (participantError) {
      console.error('Error saving participant:', participantError);
      throw participantError;
    }

    // 次にparticipant_consentsテーブルに同意情報を保存
    const { error: consentError } = await this.supabase
      .from('participant_consents')
      .upsert({
        participant_id: participant.id,
        signature: participant.signature || '',
        agreements: participant.agreements || {},
        agreed_at: participant.agreedAt,
      });

    if (consentError) {
      console.error('Error saving participant consent:', consentError);
      throw consentError;
    }

    console.log(`Participant ${participant.id} saved to Supabase`);
  }

  /**
   * Merkle DAG: セッションデータの保存
   */
  async saveSession(session: Session): Promise<void> {
    // 新しいスキーマではparticipant_experiment_sessionsテーブルを使用
    // イベントデータからセッション情報を抽出
    const sessionStartedEvent = session.events.find((e: any) => e.type === 'session_started');
    const sessionEndedEvent = session.events.filter((e: any) => e.type === 'response_window_closed').pop();

    const { error } = await this.supabase
      .from('participant_experiment_sessions')
      .upsert({
        session_id: session.id,
        participant_id: session.participantId,
        session_type: 'session-1', // デフォルト値、必要に応じて変更
        start_time: sessionStartedEvent?.timestamp || session.createdAt,
        end_time: sessionEndedEvent?.timestamp || null,
      });

    if (error) {
      console.error('Error saving session:', error);
      throw error;
    }

    console.log(`Session ${session.id} saved to Supabase`);
  }

  /**
   * Merkle DAG: ビデオファイルの保存
   */
  async saveVideoFile(videoFile: VideoFile): Promise<void> {
    const { error } = await this.supabase
      .from('video_files')
      .upsert({
        id: videoFile.id,
        participant_id: videoFile.participantId,
        session_id: videoFile.sessionId,
        file_name: videoFile.fileName,
        file_path: videoFile.filePath,
        file_size: videoFile.fileSize,
        created_at: videoFile.createdAt,
      });

    if (error) {
      console.error('Error saving video file:', error);
      throw error;
    }

    console.log(`Video file ${videoFile.fileName} saved to Supabase`);
  }

  /**
   * Merkle DAG: 感情分析結果の保存
   */
  async saveEmotionAnalysis(analysis: EmotionAnalysis): Promise<void> {
    // 新しいスキーマではparticipant_response_dataテーブルに感情データを保存
    // 各感情を個別の応答データとして保存
    for (const emotion of analysis.emotions) {
      const { error } = await this.supabase
        .from('participant_response_data')
        .upsert({
          participant_id: analysis.participantId,
          experiment_id: analysis.id,
          word_stimulus_id: 1, // デフォルト値、必要に応じて変更
          stimulus_word: emotion.name, // 感情名を刺激語として使用
          response_word: emotion.name, // 感情名を応答語としても使用
          reaction_time_ms: 0, // 感情分析なので反応時間なし
          session: analysis.sessionType as 'session-1' | 'session-2',
          timestamp: analysis.timestamp,
          emotion: emotion.name,
          emotion_confidence: emotion.confidence,
          skin_potential: null, // 感情分析では取得しない
          audio_file_path: null,
          video_file_path: analysis.videoFileId,
        });

      if (error) {
        console.error('Error saving emotion analysis:', error);
        throw error;
      }
    }

    console.log(`Emotion analysis ${analysis.id} saved to Supabase`);
  }

  /**
   * Merkle DAG: 参加者データの取得
   */
  async getParticipant(participantId: string): Promise<Participant | null> {
    // 新しいスキーマではparticipantsとparticipant_consentsをJOINして取得
    const { data, error } = await this.supabase
      .from('participants')
      .select(`
        *,
        participant_consents (
          signature,
          agreements,
          agreed_at
        )
      `)
      .eq('id', participantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      console.error('Error getting participant:', error);
      throw error;
    }

    const consent = data.participant_consents?.[0]; // 最新の同意情報を取得

    return {
      id: data.id,
      name: data.name,
      age: data.age,
      gender: data.gender,
      handedness: data.handedness,
      signature: consent?.signature,
      agreedAt: consent?.agreed_at,
      agreements: consent?.agreements,
    };
  }

  /**
   * Merkle DAG: 全参加者データの取得
   */
  async getAllParticipants(): Promise<Participant[]> {
    const { data, error } = await this.supabase
      .from('participants')
      .select(`
        *,
        participant_consents (
          signature,
          agreements,
          agreed_at
        ),
        sessions (
          id
        ),
        video_files (
          id,
          file_name,
          file_path,
          file_size
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting all participants:', error);
      throw error;
    }

    return data.map(row => {
      const consent = row.participant_consents?.[0]; // 最新の同意情報を取得
      return {
        id: row.id,
        name: row.name,
        age: row.age,
        gender: row.gender,
        handedness: row.handedness,
        signature: consent?.signature,
        agreedAt: consent?.agreed_at,
        agreements: consent?.agreements,
        hasSessionData: (row.sessions?.length || 0) > 0,
        hasVideoFiles: (row.video_files?.length || 0) > 0,
        videoFiles: row.video_files || []
      };
    });
  }

  /**
   * Merkle DAG: 感情分析結果の取得
   */
  async getEmotionAnalysis(participantId: string): Promise<EmotionAnalysis[]> {
    // 新しいスキーマではparticipant_response_dataテーブルから感情データを取得
    const { data, error } = await this.supabase
      .from('participant_response_data')
      .select('*')
      .eq('participant_id', participantId)
      .not('emotion', 'is', null)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error getting emotion analysis:', error);
      throw error;
    }

    // データをグループ化してEmotionAnalysis形式に変換
    const analysisMap = new Map<string, EmotionAnalysis>();

    data.forEach((row: any) => {
      const experimentId = row.experiment_id;
      if (!analysisMap.has(experimentId)) {
        analysisMap.set(experimentId, {
          id: experimentId,
          participantId: row.participant_id,
          videoFileId: row.video_file_path || '',
          sessionType: row.session,
          timestamp: row.timestamp,
          processingTime: 0, // 処理時間は保存されていない
          emotions: []
        });
      }

      const analysis = analysisMap.get(experimentId)!;
      analysis.emotions.push({
        name: row.emotion,
        score: row.skin_potential || 0, // 感情スコアとして使用
        confidence: row.emotion_confidence || 0,
      });
    });

    return Array.from(analysisMap.values());
  }

  /**
   * Merkle DAG: 感情統計の取得
   */
  async getEmotionStatistics(): Promise<any> {
    // 新しいスキーマではparticipant_response_dataテーブルから感情データを取得
    const { data, error } = await this.supabase
      .from('participant_response_data')
      .select('emotion, emotion_confidence, skin_potential')
      .not('emotion', 'is', null);

    if (error) {
      console.error('Error getting emotion statistics:', error);
      return {
        totalAnalyses: 0,
        averageEmotions: {},
        dominantEmotions: [],
        processingStats: { averageTime: 0, totalTime: 0 }
      };
    }

    // 感情ごとの統計を計算
    const emotionStats = data.reduce((acc: any, emotion: any) => {
      const name = emotion.emotion;
      if (!acc[name]) {
        acc[name] = { count: 0, totalScore: 0, totalConfidence: 0 };
      }
      acc[name].count += 1;
      acc[name].totalScore += emotion.skin_potential || 0;
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
  }

  /**
   * Merkle DAG: カスタムクエリの実行
   */
  async executeQuery(query: string, params: Record<string, any> = {}): Promise<any> {
    // SupabaseではRPC関数を使用する場合
    console.warn('Custom queries not implemented for Supabase yet');
    return [];
  }

  /**
   * Merkle DAG: データベース接続のクローズ
   */
  async close(): Promise<void> {
    // Supabaseでは明示的なクローズは不要
    console.log('Supabase connection closed');
  }
}

// シングルトンインスタンス
export const supabaseManager = new SupabaseManager();
