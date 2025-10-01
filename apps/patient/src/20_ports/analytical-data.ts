// Merkle DAG: 分析データポート
// 分析データベースへの抽象インターフェース

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
