// Merkle DAG: Supabaseデータベースマネージャー
// Supabaseを使用したデータベース操作マネージャー

import { supabase, Database } from '../supabase';
import type { Participant, Session, VideoFile, EmotionAnalysis } from './kuzu-manager';

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
    const { error } = await this.supabase
      .from('participants')
      .upsert({
        id: participant.id,
        signature: participant.signature,
        agreed_at: participant.agreedAt,
        agreements: participant.agreements,
      });

    if (error) {
      console.error('Error saving participant:', error);
      throw error;
    }

    console.log(`Participant ${participant.id} saved to Supabase`);
  }

  /**
   * Merkle DAG: セッションデータの保存
   */
  async saveSession(session: Session): Promise<void> {
    const { error } = await this.supabase
      .from('sessions')
      .upsert({
        id: session.id,
        participant_id: session.participantId,
        events: session.events,
        created_at: session.createdAt,
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
    // 感情分析結果を保存
    const { error: analysisError } = await this.supabase
      .from('emotion_analyses')
      .upsert({
        id: analysis.id,
        participant_id: analysis.participantId,
        video_file_id: analysis.videoFileId,
        session_type: analysis.sessionType,
        timestamp: analysis.timestamp,
        processing_time_ms: analysis.processingTime,
      });

    if (analysisError) {
      console.error('Error saving emotion analysis:', analysisError);
      throw analysisError;
    }

    // 各感情を保存
    for (const emotion of analysis.emotions) {
      const emotionId = `${analysis.id}_${emotion.name}`;

      const { error: emotionError } = await this.supabase
        .from('emotions')
        .upsert({
          id: emotionId,
          analysis_id: analysis.id,
          name: emotion.name,
          score: emotion.score,
          confidence: emotion.confidence,
        });

      if (emotionError) {
        console.error('Error saving emotion:', emotionError);
        throw emotionError;
      }
    }

    console.log(`Emotion analysis ${analysis.id} saved to Supabase`);
  }

  /**
   * Merkle DAG: 参加者データの取得
   */
  async getParticipant(participantId: string): Promise<Participant | null> {
    const { data, error } = await this.supabase
      .from('participants')
      .select('*')
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

    return {
      id: data.id,
      signature: data.signature,
      agreedAt: data.agreed_at,
      agreements: data.agreements,
    };
  }

  /**
   * Merkle DAG: 全参加者データの取得
   */
  async getAllParticipants(): Promise<Participant[]> {
    const { data, error } = await this.supabase
      .from('participants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting all participants:', error);
      throw error;
    }

    return data.map(row => ({
      id: row.id,
      signature: row.signature,
      agreedAt: row.agreed_at,
      agreements: row.agreements,
    }));
  }

  /**
   * Merkle DAG: 感情分析結果の取得
   */
  async getEmotionAnalysis(participantId: string): Promise<EmotionAnalysis[]> {
    const { data, error } = await this.supabase
      .from('emotion_analyses')
      .select(`
        *,
        emotions (*)
      `)
      .eq('participant_id', participantId);

    if (error) {
      console.error('Error getting emotion analysis:', error);
      throw error;
    }

    return data.map(row => ({
      id: row.id,
      participantId: row.participant_id,
      videoFileId: row.video_file_id,
      sessionType: row.session_type,
      timestamp: row.timestamp,
      processingTime: row.processing_time_ms,
      emotions: row.emotions.map((e: any) => ({
        name: e.name,
        score: e.score,
        confidence: e.confidence,
      })),
    }));
  }

  /**
   * Merkle DAG: 感情統計の取得
   */
  async getEmotionStatistics(): Promise<any> {
    const { data, error } = await this.supabase
      .from('emotions')
      .select('name, score');

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
      if (!acc[emotion.name]) {
        acc[emotion.name] = { count: 0, totalScore: 0 };
      }
      acc[emotion.name].count += 1;
      acc[emotion.name].totalScore += emotion.score;
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
      processingStats: { averageTime: 0, totalTime: 0 } // TODO: 処理時間統計を実装
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
