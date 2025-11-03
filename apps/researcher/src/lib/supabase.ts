// Merkle DAG: Supabaseクライアント
// Supabaseを使用したデータベース操作クライアント

import { getSupabaseClient, SupabaseClient } from '@spiritinphysics/supabase';

class SupabaseClientWrapper {
  private client: SupabaseClient;

  constructor() {
    this.client = getSupabaseClient();
  }

  /**
   * Merkle DAG: カスタムクエリの実行
   * 注意: Supabaseでは直接SQLクエリは実行できないため、RPC関数を使用する必要がある
   */
  async query(sqlQuery: string, params?: Record<string, any>): Promise<any[]> {
    // Supabaseでは直接SQLクエリを実行できないため、
    // このメソッドは使用しない（RPC関数またはクエリビルダーを使用）
    console.warn('Direct SQL queries are not supported in Supabase. Use query builder or RPC functions.');
    throw new Error('Direct SQL queries are not supported. Use Supabase query builder or RPC functions.');
  }

  /**
   * Merkle DAG: ノードのマージ（UPSERT）
   */
  async mergeNode(
    tableName: string,
    properties: Record<string, unknown>,
    updateProperties: Record<string, unknown> = {}
  ): Promise<unknown> {
    try {
      const { data, error } = await this.client
        .from(tableName)
        .upsert({ ...properties, ...updateProperties }, {
          onConflict: 'id',
        });

      if (error) {
        throw error;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('Error in mergeNode:', error);
      throw error;
    }
  }

  /**
   * Merkle DAG: バルク挿入
   */
  async bulkInsertNodes(
    tableName: string,
    dataArray: Record<string, unknown>[],
    batchSize: number = 1000
  ): Promise<unknown> {
    try {
      // Supabaseのバッチサイズ制限に合わせて分割
      const batches: Record<string, unknown>[][] = [];
      for (let i = 0; i < dataArray.length; i += batchSize) {
        batches.push(dataArray.slice(i, i + batchSize));
      }

      let totalInserted = 0;
      for (const batch of batches) {
        const { data, error } = await this.client
          .from(tableName)
          .insert(batch);

        if (error) {
          throw error;
        }

        totalInserted += data?.length || 0;
      }

      return totalInserted;
    } catch (error) {
      console.error('Error in bulkInsertNodes:', error);
      throw error;
    }
  }

  /**
   * Merkle DAG: 最小限のフィールド投影
   */
  async projectMinimalFields(
    tableName: string,
    projectionFields: string[],
    conditions: Record<string, unknown> = {},
    options: { limit?: number; skip?: number } = {}
  ): Promise<unknown[]> {
    try {
      let query = this.client
        .from(tableName)
        .select(projectionFields.join(', '));

      // 条件を適用
      Object.entries(conditions).forEach(([key, value]) => {
        query = query.eq(key, value as any);
      });

      // オプションを適用
      if (options.skip) {
        query = query.range(options.skip, options.skip + (options.limit || 1000) - 1);
      } else if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in projectMinimalFields:', error);
      throw error;
    }
  }

  /**
   * Merkle DAG: 接続のクローズ
   */
  async close(): Promise<void> {
    // Supabaseクライアントは自動的に接続を管理するため、明示的なクローズは不要
    console.log('Supabase connection closed (no-op)');
  }

  /**
   * Merkle DAG: 参加者一覧の取得（統計情報付き）
   * participant_summaryビューが存在しない場合は、participantsテーブルから直接取得して統計を計算
   */
  async getParticipants(): Promise<any[]> {
    try {
      // participant_summaryビューを使用（既存のSupabaseビュー）
      const { data, error } = await this.client
        .from('participant_summary')
        .select('*')
        .order('last_activity', { ascending: false });

      if (error) {
        // PGRST205エラー（テーブル/ビューが見つからない）の場合はフォールバック
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          console.warn('participant_summary view not found, falling back to direct table queries');
          return await this.getParticipantsFallback();
        }
        throw error;
      }

      return (data || []).map((p: any) => ({
        participant_id: p.participant_id,
        session_count: p.session_count || 0,
        total_responses: p.total_responses || 0,
        average_spirit_probability: p.average_spirit_probability || 0,
        last_activity: p.last_activity || p.participant_created_at,
      }));
    } catch (error) {
      console.error('Error in getParticipants:', error);
      // エラーが発生した場合もフォールバックを試行
      try {
        return await this.getParticipantsFallback();
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        return [];
      }
    }
  }

  /**
   * Merkle DAG: 参加者一覧の取得（フォールバック処理）
   * participant_summaryビューが存在しない場合、participantsテーブルから直接取得して統計を計算
   */
  private async getParticipantsFallback(): Promise<any[]> {
    try {
      // participantsテーブルから全参加者を取得
      const { data: participants, error: participantsError } = await this.client
        .from('participants')
        .select('id, created_at')
        .order('created_at', { ascending: false });

      if (participantsError || !participants) {
        console.error('Failed to fetch participants:', participantsError);
        return [];
      }

      // 各参加者の統計情報を並列で取得
      const participantsWithStats = await Promise.all(
        participants.map(async (participant: any) => {
          const participantId = participant.id;

          // セッション数を取得
          const { count: sessionCount } = await this.client
            .from('participant_experiment_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('participant_id', participantId);

          // レスポンス数を取得
          const { count: responseCount } = await this.client
            .from('participant_response_data')
            .select('*', { count: 'exact', head: true })
            .eq('participant_id', participantId);

          // 平均spirit_probabilityを取得
          const { data: analysisResults } = await this.client
            .from('participant_analysis_results')
            .select('spirit_probability, created_at')
            .eq('participant_id', participantId);

          const averageSpiritProbability =
            analysisResults && analysisResults.length > 0
              ? analysisResults.reduce((sum: number, r: any) => sum + (Number(r.spirit_probability) || 0), 0) /
                analysisResults.length
              : 0;

          // 最後の活動日時を取得（セッションまたは分析結果の最新日時）
          const { data: lastSessionData } = await this.client
            .from('participant_experiment_sessions')
            .select('start_time')
            .eq('participant_id', participantId)
            .order('start_time', { ascending: false })
            .limit(1);

          const lastSession = lastSessionData && lastSessionData.length > 0 ? lastSessionData[0] : null;

          const lastActivity =
            lastSession?.start_time ||
            (analysisResults && analysisResults.length > 0
              ? analysisResults.reduce((latest: string | null, r: any) => {
                  if (!latest || (r.created_at && r.created_at > latest)) {
                    return r.created_at;
                  }
                  return latest;
                }, null as string | null)
              : null) ||
            participant.created_at;

          return {
            participant_id: participantId,
            session_count: sessionCount || 0,
            total_responses: responseCount || 0,
            average_spirit_probability: averageSpiritProbability,
            last_activity: lastActivity,
          };
        })
      );

      // last_activityでソート
      return participantsWithStats.sort((a, b) => {
        const aTime = a.last_activity ? new Date(a.last_activity).getTime() : 0;
        const bTime = b.last_activity ? new Date(b.last_activity).getTime() : 0;
        return bTime - aTime;
      });
    } catch (error) {
      console.error('Error in getParticipantsFallback:', error);
      return [];
    }
  }

  /**
   * Merkle DAG: 参加者詳細の取得
   */
  async getParticipantDetails(participantId: string): Promise<any> {
    try {
      const { data, error } = await this.client
        .from('participants')
        .select('id, age, gender, handedness, name')
        .eq('id', participantId)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        age: data.age,
        gender: data.gender,
        handedness: data.handedness,
        name: data.name,
      };
    } catch (error) {
      console.error('Error in getParticipantDetails:', error);
      return null;
    }
  }

  /**
   * Merkle DAG: 参加者のレスポンス取得
   */
  async getParticipantResponses(participantId: string): Promise<any[]> {
    try {
      const { data, error } = await this.client
        .from('participant_response_data')
        .select('*')
        .eq('participant_id', participantId)
        .order('timestamp', { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []).map((response: any) => ({
        id: response.id,
        stimulus_word: response.stimulus_word,
        response_word: response.response_word,
        reaction_time_ms: response.reaction_time_ms || 0,
        emotion: response.emotion,
        emotion_confidence: response.emotion_confidence || 0,
        session_id: response.experiment_id, // experiment_idをsession_idとして使用
        spirit_probability: null, // participant_response_dataにはspirit_probabilityがない
        event_ts: response.timestamp,
      }));
    } catch (error) {
      console.error('Error in getParticipantResponses:', error);
      return [];
    }
  }
}

// SupabaseManagerクラス（Neo4jManagerと互換性を保つ）
export class SupabaseManager {
  private client: SupabaseClientWrapper;

  constructor() {
    this.client = new SupabaseClientWrapper();
  }

  async testConnection(): Promise<boolean> {
    try {
      const { error } = await getSupabaseClient()
        .from('participants')
        .select('id')
        .limit(1);
      return !error;
    } catch (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
  }

  async query(cypherQuery: string, params?: Record<string, unknown>): Promise<unknown[]> {
    // Cypherクエリはサポートされていないため、エラーを投げる
    throw new Error('Cypher queries are not supported. Use Supabase query builder or RPC functions.');
  }

  async getParticipants(): Promise<unknown[]> {
    return this.client.getParticipants();
  }

  async getParticipantDetails(participantId: string): Promise<unknown> {
    return this.client.getParticipantDetails(participantId);
  }

  async getParticipantResponses(participantId: string): Promise<unknown[]> {
    return this.client.getParticipantResponses(participantId);
  }

  async getImportJobs(): Promise<unknown[]> {
    // ImportJobテーブルは現在Supabaseスキーマに存在しないため、空配列を返す
    console.warn('ImportJob table does not exist in Supabase schema');
    return [];
  }

  async getJobStatistics(): Promise<{ activeJobs: number; completedJobs: number; failedJobs: number }> {
    // ImportJobテーブルは現在Supabaseスキーマに存在しないため、デフォルト値を返す
    return { activeJobs: 0, completedJobs: 0, failedJobs: 0 };
  }

  async createImportJob(sessionId: string): Promise<unknown> {
    // ImportJobテーブルは現在Supabaseスキーマに存在しないため、エラーを投げる
    throw new Error('ImportJob table does not exist in Supabase schema');
  }

  async getSessionById(sessionId: string): Promise<unknown> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('participant_experiment_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error || !data) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getSessionById:', error);
      return null;
    }
  }

  async createPhysiologicalData(participantId: string, sessionId: string, physiologicalData: any[]): Promise<void> {
    // 生理データは現在Supabaseスキーマに保存されていないため、警告を出す
    console.warn('Physiological data storage is not implemented in Supabase schema');
  }

  async createParticipant(participantData: { participant_id: string; signature?: string; agreed_at?: string; agreements_json?: string; imported_at?: string }): Promise<void> {
    try {
      const agreements = participantData.agreements_json 
        ? JSON.parse(participantData.agreements_json) 
        : {};

      // participantsテーブルに挿入
      const { error: participantError } = await getSupabaseClient()
        .from('participants')
        .upsert({
          id: participantData.participant_id,
        }, {
          onConflict: 'id',
        });

      if (participantError) {
        throw participantError;
      }

      // participant_consentsテーブルに挿入
      if (participantData.signature || participantData.agreed_at) {
        const { error: consentError } = await getSupabaseClient()
          .from('participant_consents')
          .upsert({
            participant_id: participantData.participant_id,
            signature: participantData.signature || '',
            agreements: agreements,
            agreed_at: participantData.agreed_at || new Date().toISOString(),
          }, {
            onConflict: 'participant_id',
          });

        if (consentError) {
          console.warn('Error saving consent data:', consentError);
        }
      }
    } catch (error) {
      console.error('Error in createParticipant:', error);
      throw error;
    }
  }

  async createSessionEvents(events: Array<{ participant_id: string; type: string; timestamp: string; payload: any; imported_at: string }>): Promise<void> {
    // セッションイベントは現在Supabaseスキーマに保存されていないため、警告を出す
    console.warn('Session events storage is not implemented in Supabase schema');
  }

  async createWordResponses(participantId: string, responses: Array<{ stimulusWord: string; responseWord: string; reactionTimeMs: number; isDelayed: boolean; timestamp: string }>): Promise<void> {
    try {
      // participant_response_dataテーブルに挿入
      const responseData = responses.map((r, index) => ({
        participant_id: participantId,
        experiment_id: participantId, // experiment_idはparticipant_idを使用（Experimentテーブルは使用しない）
        word_stimulus_id: index, // デフォルト値
        stimulus_word: r.stimulusWord,
        response_word: r.responseWord,
        reaction_time_ms: r.reactionTimeMs,
        session: 'session-1' as 'session-1' | 'session-2', // デフォルト値
        timestamp: new Date(r.timestamp).toISOString(),
      }));

      const { error } = await getSupabaseClient()
        .from('participant_response_data')
        .insert(responseData);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error in createWordResponses:', error);
      throw error;
    }
  }

  async getSessionsByParticipantId(participantId: string): Promise<any[]> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('participant_experiment_sessions')
        .select('*')
        .eq('participant_id', participantId);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getSessionsByParticipantId:', error);
      return [];
    }
  }

  async createEmotionEntries(entries: Array<{ participant_id: string; registry_uuid?: string; text?: string; begin_time?: number; end_time?: number; confidence?: number; emotions?: any; position?: any; imported_at?: string }>): Promise<void> {
    // 感情エントリはparticipant_hume_*_predictionsテーブルに保存する必要があるが、
    // 詳細な実装は後で追加する
    console.warn('Emotion entries storage is partially implemented in Supabase schema');
  }

  async createCSVElements(elements: Array<Record<string, unknown>>): Promise<void> {
    // CSV要素は現在Supabaseスキーマに保存されていないため、警告を出す
    console.warn('CSV elements storage is not implemented in Supabase schema');
  }

  async getEmotionDataByParticipantId(participantId: string): Promise<any[]> {
    try {
      // participant_hume_*_predictionsテーブルから感情データを取得
      const { data: burstData } = await getSupabaseClient()
        .from('participant_hume_burst_predictions')
        .select('*')
        .eq('job_id', participantId); // 簡易実装

      return burstData || [];
    } catch (error) {
      console.error('Error in getEmotionDataByParticipantId:', error);
      return [];
    }
  }

  async close(): Promise<void> {
    return this.client.close();
  }
}

// シングルトンインスタンス
let clientInstance: SupabaseClientWrapper | null = null;

export function createSupabaseClient(): SupabaseClientWrapper {
  if (!clientInstance) {
    clientInstance = new SupabaseClientWrapper();
  }
  return clientInstance;
}

// 後方互換性のため
export function createNeo4jClient(): SupabaseClientWrapper {
  return createSupabaseClient();
}

export function createArangoDBClient(): SupabaseClientWrapper {
  return createSupabaseClient();
}

// Neo4jManagerのエクスポート（後方互換性のため）
export const Neo4jManager = SupabaseManager;
export const supabaseManager = new SupabaseManager();
export const neo4jManager = supabaseManager;

// ArangoDBManagerのエクスポート（後方互換性のため）
export class ArangoDBManager extends SupabaseManager {}

