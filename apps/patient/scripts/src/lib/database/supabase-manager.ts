// Merkle DAG: Supabaseデータベースマネージャー
// Supabaseを使用したデータベース操作マネージャー

import { getSupabaseClient, SupabaseClient } from './supabase-client';

// インターフェース定義（Neo4jManagerと互換性を保つ）
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
  private client: SupabaseClient;

  constructor() {
    this.client = getSupabaseClient();
  }

  /**
   * Merkle DAG: データベース初期化
   * Supabaseでは接続テストのみ
   */
  async initialize(): Promise<void> {
    try {
      // 接続テスト
      const { error } = await this.client.from('participants').select('id').limit(1);
      if (error) {
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
    try {
      // participantsテーブルに参加者を挿入または更新
      const { error: participantError } = await this.client
        .from('participants')
        .upsert({
          id: participant.id,
          name: participant.name,
          age: participant.age,
          gender: participant.gender,
          handedness: participant.handedness,
        }, {
          onConflict: 'id',
        });

      if (participantError) {
        throw participantError;
      }

      // participant_consentsテーブルに同意情報を保存
      if (participant.signature || participant.agreedAt || participant.agreements) {
        const { error: consentError } = await this.client
          .from('participant_consents')
          .upsert({
            participant_id: participant.id,
            signature: participant.signature || '',
            agreements: participant.agreements || {},
            agreed_at: participant.agreedAt ? new Date(participant.agreedAt).toISOString() : new Date().toISOString(),
          }, {
            onConflict: 'participant_id',
          });

        if (consentError) {
          console.warn('Error saving consent data:', consentError);
          // 同意情報のエラーは致命的ではないので続行
        }
      }

      console.log(`Participant ${participant.id} saved to Supabase`);
    } catch (error) {
      console.error('Error saving participant:', error);
      throw error;
    }
  }

  /**
   * Merkle DAG: セッションデータの保存
   */
  async saveSession(session: Session | { participant_id: string; session_id: string; session_type: string; start_time: string; end_time?: string | null }): Promise<void> {
    try {
      // Sessionインターフェースの形式と、簡易形式の両方に対応
      if ('events' in session) {
        // イベントデータからセッション情報を抽出
        const sessionStartedEvent = session.events.find((e: any) => e.type === 'session_started');
        const sessionEndedEvent = session.events.filter((e: any) => e.type === 'response_window_closed').pop();

        // セッションタイプを決定（デフォルトはsession-1）
        const sessionType = session.id.includes('session-2') ? 'session-2' : 'session-1';

        // participant_experiment_sessionsテーブルにセッションを保存
        const { error } = await this.client
          .from('participant_experiment_sessions')
          .upsert({
            participant_id: session.participantId,
            session_id: session.id,
            session_type: sessionType,
            start_time: sessionStartedEvent?.timestamp 
              ? new Date(sessionStartedEvent.timestamp).toISOString()
              : new Date(session.createdAt).toISOString(),
            end_time: sessionEndedEvent?.timestamp 
              ? new Date(sessionEndedEvent.timestamp).toISOString()
              : null,
          }, {
            onConflict: 'participant_id,session_id',
          });

        if (error) {
          throw error;
        }

        console.log(`Session ${session.id} saved to Supabase`);
      } else {
        // 簡易形式（直接パラメータ）
        const { error } = await this.client
          .from('participant_experiment_sessions')
          .upsert({
            participant_id: session.participant_id,
            session_id: session.session_id,
            session_type: session.session_type,
            start_time: session.start_time,
            end_time: session.end_time || null,
          }, {
            onConflict: 'participant_id,session_id',
          });

        if (error) {
          throw error;
        }

        console.log(`Session ${session.session_id} saved to Supabase`);
      }
    } catch (error) {
      console.error('Error saving session:', error);
      throw error;
    }
  }

  /**
   * Merkle DAG: 参加者IDによるセッション取得
   */
  async getSessionsByParticipantId(participantId: string): Promise<any[]> {
    try {
      const { data: sessions, error } = await this.client
        .from('participant_experiment_sessions')
        .select('*')
        .eq('participant_id', participantId)
        .order('start_time', { ascending: false });

      if (error) {
        throw error;
      }

      return sessions || [];
    } catch (error) {
      console.error('Error getting sessions by participant ID:', error);
      return [];
    }
  }

  /**
   * Merkle DAG: 単語応答データの一括作成
   */
  async createWordResponses(participantId: string, responses: Array<{
    stimulusWord: string;
    responseWord: string;
    reactionTimeMs: number;
    isDelayed?: boolean;
    timestamp: string;
  }>): Promise<void> {
    try {
      // セッションを取得（最新のセッションを使用）
      const sessions = await this.getSessionsByParticipantId(participantId);
      if (sessions.length === 0) {
        throw new Error(`No sessions found for participant ${participantId}`);
      }

      const sessionId = sessions[0].id;
      const sessionType = sessions[0].session_type || 'session-1';

      // 応答データを挿入
      const responsesToInsert = responses.map(response => ({
        participant_id: participantId,
        experiment_id: sessionId, // experiment_idとしてsession_idを使用
        word_stimulus_id: 1, // デフォルト値（word_stimuliテーブルから取得可能）
        stimulus_word: response.stimulusWord,
        response_word: response.responseWord,
        reaction_time_ms: response.reactionTimeMs,
        session: sessionType,
        timestamp: response.timestamp,
      }));

      if (responsesToInsert.length > 0) {
        const { error } = await this.client
          .from('participant_response_data')
          .insert(responsesToInsert);

        if (error) {
          throw error;
        }

        console.log(`Created ${responsesToInsert.length} word responses for participant ${participantId}`);
      }
    } catch (error) {
      console.error('Error creating word responses:', error);
      throw error;
    }
  }

  /**
   * Merkle DAG: ビデオファイルの保存
   * Supabase Storageに動画ファイルを保存
   */
  async saveVideoFile(videoFile: VideoFile): Promise<void> {
    try {
      await this.uploadVideoToStorage(
        videoFile.participantId,
        videoFile.sessionId,
        videoFile.filePath,
        videoFile.fileName
      );
      console.log(`Video file ${videoFile.fileName} saved to Supabase Storage`);
    } catch (error) {
      console.error('Error saving video file:', error);
      throw error;
    }
  }

  /**
   * Merkle DAG: 動画ファイルをSupabase Storageにアップロード
   * @param participantId 参加者ID
   * @param sessionId セッションID
   * @param filePath ファイルパス（Bufferまたはファイルパス）
   * @param fileName ファイル名
   * @returns アップロードされたファイルのURL
   */
  async uploadVideoToStorage(
    participantId: string,
    sessionId: string,
    filePath: string | Buffer,
    fileName: string
  ): Promise<string> {
    try {
      const { readFileSync } = await import('fs');
      
      // ファイルパスが文字列の場合は読み込む、Bufferの場合はそのまま使用
      const fileBuffer = typeof filePath === 'string' 
        ? readFileSync(filePath)
        : filePath;

      // Storageパス: participant-videos/{participantId}/{sessionId}/{fileName}
      const storagePath = `${participantId}/${sessionId}/${fileName}`;

      // Supabase Storageにアップロード
      const { data, error } = await this.client.storage
        .from('participant-videos')
        .upload(storagePath, fileBuffer, {
          contentType: 'video/webm',
          upsert: true, // 既存ファイルは上書き
        });

      if (error) {
        throw error;
      }

      // 公開URLを取得
      const { data: urlData } = this.client.storage
        .from('participant-videos')
        .getPublicUrl(storagePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading video to Supabase Storage:', error);
      throw error;
    }
  }

  /**
   * Merkle DAG: 動画ファイルをSupabase Storageから取得
   * @param participantId 参加者ID
   * @param sessionId セッションID
   * @param fileName ファイル名
   * @returns 動画ファイルのURL
   */
  async getVideoFileUrl(
    participantId: string,
    sessionId: string,
    fileName: string
  ): Promise<string | null> {
    try {
      const storagePath = `${participantId}/${sessionId}/${fileName}`;
      
      const { data, error } = await this.client.storage
        .from('participant-videos')
        .createSignedUrl(storagePath, 3600); // 1時間有効な署名付きURL

      if (error) {
        // ファイルが存在しない場合はnullを返す
        if (error.statusCode === 404) {
          return null;
        }
        throw error;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Error getting video file URL:', error);
      return null;
    }
  }

  /**
   * Merkle DAG: 参加者の動画ファイル一覧を取得
   * @param participantId 参加者ID
   * @param sessionId セッションID（オプション）
   * @returns 動画ファイル情報の配列
   */
  async listVideoFiles(
    participantId: string,
    sessionId?: string
  ): Promise<Array<{ name: string; url: string; size: number; createdAt: string }>> {
    try {
      const prefix = sessionId 
        ? `${participantId}/${sessionId}/`
        : `${participantId}/`;

      const { data, error } = await this.client.storage
        .from('participant-videos')
        .list(prefix, {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) {
        throw error;
      }

      // 各ファイルの署名付きURLを取得
      const filesWithUrls = await Promise.all(
        (data || []).map(async (file) => {
          // ファイルがディレクトリの場合はスキップ
          if (file.id === null) {
            return null;
          }

          const fullPath = `${prefix}${file.name}`;
          const { data: urlData } = await this.client.storage
            .from('participant-videos')
            .createSignedUrl(fullPath, 3600);

          return {
            name: file.name,
            url: urlData?.signedUrl || '',
            size: (file.metadata as any)?.size || 0,
            createdAt: file.created_at || new Date().toISOString(),
          };
        })
      );

      // null値を除外
      return filesWithUrls.filter((f): f is NonNullable<typeof f> => f !== null);
    } catch (error) {
      console.error('Error listing video files:', error);
      return [];
    }
  }

  /**
   * Merkle DAG: 感情分析結果の保存
   */
  async saveEmotionAnalysis(analysis: EmotionAnalysis): Promise<void> {
    try {
      // participant_response_dataテーブルに感情データを保存
      // 注意: この実装は簡略化されており、実際のHume AIデータ構造とは異なる可能性がある
      for (const emotion of analysis.emotions) {
        // 感情データをparticipant_response_dataに保存
        // stimulus_wordとresponse_wordは感情名を使用
        const { error } = await this.client
          .from('participant_response_data')
          .insert({
            participant_id: analysis.participantId,
            experiment_id: analysis.videoFileId || analysis.participantId, // fallback
            word_stimulus_id: 0, // デフォルト値
            stimulus_word: emotion.name,
            response_word: emotion.name,
            reaction_time_ms: 0,
            session: analysis.sessionType as 'session-1' | 'session-2',
            timestamp: new Date(analysis.timestamp).toISOString(),
            emotion: emotion.name,
            emotion_confidence: emotion.confidence,
          });

        if (error) {
          console.error('Error saving emotion analysis entry:', error);
          // 個別のエラーは続行
        }
      }

      console.log(`Emotion analysis ${analysis.id} saved to Supabase`);
    } catch (error) {
      console.error('Error saving emotion analysis:', error);
      throw error;
    }
  }

  /**
   * Merkle DAG: 参加者データの取得
   */
  async getParticipant(participantId: string): Promise<Participant | null> {
    try {
      // participantsテーブルから参加者情報を取得
      const { data: participantData, error: participantError } = await this.client
        .from('participants')
        .select('*')
        .eq('id', participantId)
        .single();

      if (participantError || !participantData) {
        return null;
      }

      // participant_consentsテーブルから同意情報を取得
      const { data: consentData } = await this.client
        .from('participant_consents')
        .select('*')
        .eq('participant_id', participantId)
        .single();

      // セッションデータの存在確認
      const { count: sessionCount } = await this.client
        .from('participant_experiment_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('participant_id', participantId);

      const [hasVideoFiles, videoFiles] = await Promise.all([
        this.checkVideoFilesExist(participantId),
        this.listVideoFiles(participantId),
      ]);

      return {
        id: participantData.id,
        name: participantData.name || undefined,
        age: participantData.age || undefined,
        gender: participantData.gender as Participant['gender'] | undefined,
        handedness: participantData.handedness || undefined,
        signature: consentData?.signature || undefined,
        agreedAt: consentData?.agreed_at ? new Date(consentData.agreed_at) : undefined,
        agreements: consentData?.agreements || undefined,
        hasSessionData: (sessionCount || 0) > 0,
        hasVideoFiles,
        videoFiles: videoFiles.map(f => ({
          id: f.name,
          fileName: f.name,
          filePath: f.url,
          fileSize: f.size,
          createdAt: f.createdAt,
        })),
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
      // participantsテーブルから全参加者を取得
      const { data: participants, error } = await this.client
        .from('participants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !participants) {
        return [];
      }

      // 各参加者の同意情報とセッション数を取得
      const participantsWithDetails = await Promise.all(
        participants.map(async (p) => {
          const [consentResult, sessionCountResult, hasVideoFiles, videoFiles] = await Promise.all([
            this.client
              .from('participant_consents')
              .select('*')
              .eq('participant_id', p.id)
              .single(),
            this.client
              .from('participant_experiment_sessions')
              .select('*', { count: 'exact', head: true })
              .eq('participant_id', p.id),
            this.checkVideoFilesExist(p.id),
            this.listVideoFiles(p.id),
          ]);

          const { data: consentData } = consentResult;
          const { count: sessionCount } = sessionCountResult;

          return {
            id: p.id,
            name: p.name || undefined,
            age: p.age || undefined,
            gender: p.gender as Participant['gender'] | undefined,
            handedness: p.handedness || undefined,
            signature: consentData?.signature || undefined,
            agreedAt: consentData?.agreed_at ? new Date(consentData.agreed_at) : undefined,
            agreements: consentData?.agreements || undefined,
            hasSessionData: (sessionCount || 0) > 0,
            hasVideoFiles,
            videoFiles: videoFiles.map(f => ({
              id: f.name,
              fileName: f.name,
              filePath: f.url,
              fileSize: f.size,
              createdAt: f.createdAt,
            })),
          };
        })
      );

      return participantsWithDetails;
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
      // participant_response_dataから感情データを取得
      const { data: responses, error } = await this.client
        .from('participant_response_data')
        .select('*')
        .eq('participant_id', participantId)
        .not('emotion', 'is', null)
        .order('timestamp', { ascending: false });

      if (error || !responses) {
        return [];
      }

      // データをグループ化してEmotionAnalysis形式に変換
      const analysisMap = new Map<string, EmotionAnalysis>();

      responses.forEach((response: any) => {
        const analysisId = `${participantId}_${response.session}_analysis`;
        if (!analysisMap.has(analysisId)) {
          analysisMap.set(analysisId, {
            id: analysisId,
            participantId: response.participant_id,
            videoFileId: response.experiment_id,
            sessionType: response.session,
            timestamp: new Date(response.timestamp).toISOString(),
            processingTime: 0,
            emotions: [],
          });
        }

        const analysis = analysisMap.get(analysisId)!;
        analysis.emotions.push({
          name: response.emotion,
          score: 0, // スコアは保存されていない
          confidence: response.emotion_confidence || 0,
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
      // participant_response_dataから感情データを取得
      const { data: responses, error } = await this.client
        .from('participant_response_data')
        .select('emotion, emotion_confidence')
        .not('emotion', 'is', null);

      if (error || !responses) {
        return {
          totalAnalyses: 0,
          averageEmotions: {},
          dominantEmotions: [],
          processingStats: { averageTime: 0, totalTime: 0 },
        };
      }

      // 感情ごとの統計を計算
      const emotionStats = responses.reduce((acc: any, response: any) => {
        const name = response.emotion;
        if (!name) return acc;
        if (!acc[name]) {
          acc[name] = { count: 0, totalScore: 0, totalConfidence: 0 };
        }
        acc[name].count += 1;
        acc[name].totalConfidence += response.emotion_confidence || 0;
        return acc;
      }, {});

      const averageEmotions: Record<string, number> = {};
      const dominantEmotions: Array<{ emotion: string; count: number }> = [];

      Object.entries(emotionStats).forEach(([name, stats]: [string, any]) => {
        averageEmotions[name] = stats.totalConfidence / stats.count;
        dominantEmotions.push({
          emotion: name,
          count: stats.count,
        });
      });

      dominantEmotions.sort((a, b) => b.count - a.count);

      return {
        totalAnalyses: responses.length,
        averageEmotions,
        dominantEmotions,
        processingStats: { averageTime: 0, totalTime: 0 },
      };
    } catch (error) {
      console.error('Error getting emotion statistics:', error);
      return {
        totalAnalyses: 0,
        averageEmotions: {},
        dominantEmotions: [],
        processingStats: { averageTime: 0, totalTime: 0 },
      };
    }
  }

  /**
   * Merkle DAG: カスタムクエリの実行
   * 注意: Supabaseでは直接SQLクエリは実行できないため、このメソッドは制限付き
   */
  async executeQuery(query: string, params: Record<string, any> = {}): Promise<any> {
    // Supabaseでは直接SQLクエリを実行できないため、
    // RPC関数を使用するか、クエリビルダーを使用する必要がある
    console.warn('executeQuery is not fully supported in Supabase. Use RPC functions or query builder instead.');
    throw new Error('Direct SQL queries are not supported. Use Supabase query builder or RPC functions.');
  }

  /**
   * Merkle DAG: 動画ファイルの存在確認
   * @param participantId 参加者ID
   * @returns 動画ファイルが存在するかどうか
   */
  private async checkVideoFilesExist(participantId: string): Promise<boolean> {
    try {
      const { data, error } = await this.client.storage
        .from('participant-videos')
        .list(`${participantId}/`, {
          limit: 1,
        });

      if (error) {
        return false;
      }

      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('Error checking video files:', error);
      return false;
    }
  }

  /**
   * Merkle DAG: データベース接続のクローズ
   * Supabaseでは明示的なクローズは不要
   */
  async close(): Promise<void> {
    // Supabaseクライアントは自動的に接続を管理するため、明示的なクローズは不要
    console.log('Supabase connection closed (no-op)');
  }
}

// シングルトンインスタンス
export const supabaseManager = new SupabaseManager();

// 後方互換性のため、neo4jManagerのエクスポートも維持（段階的移行のため）
export const neo4jManager = supabaseManager;

