// Merkle DAG: DuckDB分析アダプター
// ports層とdomain層を接続する分析データベースアダプター

import { duckDBManager, AnalyticalParticipant, AnalyticalSession, AnalyticalEmotionData } from '../lib/database/duckdb-manager';

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

export class DuckDBAdapter implements AnalyticalDataPort {
  private manager = duckDBManager;

  /**
   * Merkle DAG: アダプター初期化
   */
  async initialize(): Promise<void> {
    await this.manager.initialize();
  }

  /**
   * Merkle DAG: 参加者分析データの取得
   */
  async getParticipantAnalytics(participantId: string): Promise<AnalyticalParticipant | null> {
    return await this.manager.getParticipantAnalytics(participantId);
  }

  /**
   * Merkle DAG: 全参加者の分析データ取得
   */
  async getAllParticipantAnalytics(): Promise<AnalyticalParticipant[]> {
    return await this.manager.getAllParticipantAnalytics();
  }

  /**
   * Merkle DAG: 感情の時系列データ取得
   */
  async getEmotionTimeSeries(participantId: string, emotionName?: string): Promise<any[]> {
    return await this.manager.getEmotionTimeSeries(participantId, emotionName);
  }

  /**
   * Merkle DAG: 感情分布の分析
   */
  async getEmotionDistribution(participantId?: string): Promise<any[]> {
    return await this.manager.getEmotionDistribution(participantId);
  }

  /**
   * Merkle DAG: 感情の相関分析
   */
  async getEmotionCorrelations(): Promise<any[]> {
    return await this.manager.getEmotionCorrelations();
  }

  /**
   * Merkle DAG: クラスタリング用データ取得
   */
  async getClusteringData(): Promise<any[]> {
    return await this.manager.getClusteringData();
  }

  /**
   * Merkle DAG: 参加者データの同期
   */
  async syncParticipantData(participant: any): Promise<void> {
    await this.manager.syncParticipant(participant);
  }

  /**
   * Merkle DAG: セッションデータの同期
   */
  async syncSessionData(session: any): Promise<void> {
    await this.manager.syncSession(session);
  }

  /**
   * Merkle DAG: 感情分析データの同期
   */
  async syncEmotionAnalysisData(analysis: any): Promise<void> {
    await this.manager.syncEmotionAnalysis(analysis);
  }

  /**
   * Merkle DAG: カスタム分析クエリの実行
   */
  async executeCustomAnalysis(query: string, params: any[] = []): Promise<any[]> {
    return await this.manager.executeAnalyticalQuery(query, params);
  }

  /**
   * Merkle DAG: アダプター終了処理
   */
  async close(): Promise<void> {
    await this.manager.close();
  }
}

// シングルトンインスタンス
export const duckDBAdapter = new DuckDBAdapter();
