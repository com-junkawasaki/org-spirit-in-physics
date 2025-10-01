// Merkle DAG: 分析データアダプター
// ports層とdomain層を接続する分析データベースアダプター
// 現在はインメモリストアを使用、将来DuckDBに置き換え可能

export interface AnalyticalParticipant {
  id: string;
  signature: string;
  agreed_at: string;
  session_count: number;
  total_videos: number;
  total_analyses: number;
  created_at: string;
}

export interface AnalyticalDataPort {
  // Merkle DAG: 分析データ取得インターフェース
  getParticipantAnalytics(participantId: string): Promise<AnalyticalParticipant | null>;
  getAllParticipantAnalytics(): Promise<AnalyticalParticipant[]>;
  getEmotionTimeSeries(participantId: string, emotionName?: string): Promise<any[]>;
  getEmotionDistribution(participantId?: string): Promise<any[]>;
  getEmotionCorrelations(): Promise<any[]>;
  getClusteringData(): Promise<any[]>;

  // Merkle DAG: データ同期インターフェース
  syncParticipantData(participant: any): Promise<void>;
  syncSessionData(session: any): Promise<void>;
  syncEmotionAnalysisData(analysis: any): Promise<void>;
}

// インメモリストア（将来DuckDBに置き換え）
class InMemoryAnalyticalStore {
  private participants: Map<string, AnalyticalParticipant> = new Map();
  private emotionData: any[] = [];

  async initialize(): Promise<void> {
    console.log('In-memory analytical store initialized');
  }

  async getParticipantAnalytics(participantId: string): Promise<AnalyticalParticipant | null> {
    return this.participants.get(participantId) || null;
  }

  async getAllParticipantAnalytics(): Promise<AnalyticalParticipant[]> {
    return Array.from(this.participants.values());
  }

  async getEmotionTimeSeries(participantId: string, emotionName?: string): Promise<any[]> {
    let data = this.emotionData.filter(d => d.participant_id === participantId);
    if (emotionName) {
      data = data.filter(d => d.emotion_name === emotionName);
    }
    return data;
  }

  async getEmotionDistribution(participantId?: string): Promise<any[]> {
    let data = this.emotionData;
    if (participantId) {
      data = data.filter(d => d.participant_id === participantId);
    }

    // 感情ごとの集計
    const distribution = data.reduce((acc, item) => {
      if (!acc[item.emotion_name]) {
        acc[item.emotion_name] = { emotion_name: item.emotion_name, count: 0, avg_score: 0, total: 0 };
      }
      acc[item.emotion_name].count += 1;
      acc[item.emotion_name].total += item.score;
      acc[item.emotion_name].avg_score = acc[item.emotion_name].total / acc[item.emotion_name].count;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(distribution);
  }

  async getEmotionCorrelations(): Promise<any[]> {
    // 簡易的な相関分析（実際の実装では統計計算が必要）
    return [];
  }

  async getClusteringData(): Promise<any[]> {
    return this.participants.values().map(p => ({
      participant_id: p.id,
      total_sessions: p.session_count,
      total_analyses: p.total_analyses,
    }));
  }

  async syncParticipantData(participant: any): Promise<void> {
    const analyticalParticipant: AnalyticalParticipant = {
      id: participant.id,
      signature: participant.signature,
      agreed_at: participant.agreedAt || new Date().toISOString(),
      session_count: 0,
      total_videos: 0,
      total_analyses: 0,
      created_at: new Date().toISOString(),
    };
    this.participants.set(participant.id, analyticalParticipant);
  }

  async syncSessionData(session: any): Promise<void> {
    const participant = this.participants.get(session.participantId);
    if (participant) {
      participant.session_count += 1;
    }
  }

  async syncEmotionAnalysisData(analysis: any): Promise<void> {
    const participant = this.participants.get(analysis.participantId);
    if (participant) {
      participant.total_analyses += analysis.emotions?.length || 0;
    }

    // 感情データを保存
    if (analysis.emotions) {
      for (const emotion of analysis.emotions) {
        this.emotionData.push({
          participant_id: analysis.participantId,
          emotion_name: emotion.name,
          score: emotion.score,
          confidence: emotion.confidence,
          timestamp: analysis.timestamp,
        });
      }
    }
  }

  async close(): Promise<void> {
    this.participants.clear();
    this.emotionData = [];
  }
}

export class AnalyticalDataAdapter implements AnalyticalDataPort {
  private store = new InMemoryAnalyticalStore();

  /**
   * Merkle DAG: アダプター初期化
   */
  async initialize(): Promise<void> {
    await this.store.initialize();
  }

  /**
   * Merkle DAG: 参加者分析データの取得
   */
  async getParticipantAnalytics(participantId: string): Promise<AnalyticalParticipant | null> {
    return await this.store.getParticipantAnalytics(participantId);
  }

  /**
   * Merkle DAG: 全参加者の分析データ取得
   */
  async getAllParticipantAnalytics(): Promise<AnalyticalParticipant[]> {
    return await this.store.getAllParticipantAnalytics();
  }

  /**
   * Merkle DAG: 感情の時系列データ取得
   */
  async getEmotionTimeSeries(participantId: string, emotionName?: string): Promise<any[]> {
    return await this.store.getEmotionTimeSeries(participantId, emotionName);
  }

  /**
   * Merkle DAG: 感情分布の分析
   */
  async getEmotionDistribution(participantId?: string): Promise<any[]> {
    return await this.store.getEmotionDistribution(participantId);
  }

  /**
   * Merkle DAG: 感情の相関分析
   */
  async getEmotionCorrelations(): Promise<any[]> {
    return await this.store.getEmotionCorrelations();
  }

  /**
   * Merkle DAG: クラスタリング用データ取得
   */
  async getClusteringData(): Promise<any[]> {
    return await this.store.getClusteringData();
  }

  /**
   * Merkle DAG: 参加者データの同期
   */
  async syncParticipantData(participant: any): Promise<void> {
    await this.store.syncParticipantData(participant);
  }

  /**
   * Merkle DAG: セッションデータの同期
   */
  async syncSessionData(session: any): Promise<void> {
    await this.store.syncSessionData(session);
  }

  /**
   * Merkle DAG: 感情分析データの同期
   */
  async syncEmotionAnalysisData(analysis: any): Promise<void> {
    await this.store.syncEmotionAnalysisData(analysis);
  }

  /**
   * Merkle DAG: アダプター終了処理
   */
  async close(): Promise<void> {
    await this.store.close();
  }
}

// シングルトンインスタンス
export const duckDBAdapter = new AnalyticalDataAdapter();
