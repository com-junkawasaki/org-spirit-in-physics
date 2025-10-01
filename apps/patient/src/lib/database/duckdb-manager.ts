// Merkle DAG: 分析データベースマネージャー
// DuckDBを使用した高速分析クエリのためのマネージャー

// サーバーサイドでのみDuckDBをインポート
let duckdb: any;
let duckdbLoaded = false;

if (typeof window === 'undefined') {
  try {
    duckdb = require('duckdb');
    duckdbLoaded = true;
  } catch (error) {
    console.warn('DuckDB not available:', error);
  }
}

import { join } from 'path';

export interface AnalyticalParticipant {
  id: string;
  signature: string;
  agreed_at: string;
  session_count: number;
  total_videos: number;
  total_analyses: number;
  created_at: string;
}

export interface AnalyticalSession {
  id: string;
  participant_id: string;
  video_count: number;
  analysis_count: number;
  total_emotion_score: number;
  dominant_emotion: string;
  created_at: string;
  duration_seconds: number;
}

export interface AnalyticalEmotionData {
  participant_id: string;
  session_id: string;
  emotion_name: string;
  average_score: number;
  max_score: number;
  min_score: number;
  confidence_avg: number;
  sample_count: number;
  timestamp_range: { start: string; end: string };
}

export class DuckDBManager {
  private db: any;
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || join(process.cwd(), 'analytics.duckdb');

    if (!duckdbLoaded || !duckdb) {
      console.warn('DuckDB not available, using fallback mode');
      this.db = null;
      return;
    }

    try {
      this.db = new duckdb.Database(this.dbPath);
    } catch (error) {
      console.error('Failed to create DuckDB database:', error);
      this.db = null;
    }
  }

  /**
   * Merkle DAG: データベース初期化
   * 分析用テーブルとインデックスの作成
   */
  async initialize(): Promise<void> {
    if (!this.db) {
      console.warn('DuckDB not available, skipping initialization');
      return;
    }

    const queries = [
      // 参加者分析テーブル
      `
      CREATE TABLE IF NOT EXISTS analytical_participants (
        id VARCHAR PRIMARY KEY,
        signature VARCHAR,
        agreed_at TIMESTAMP,
        session_count INTEGER DEFAULT 0,
        total_videos INTEGER DEFAULT 0,
        total_analyses INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
      `,

      // セッション分析テーブル
      `
      CREATE TABLE IF NOT EXISTS analytical_sessions (
        id VARCHAR PRIMARY KEY,
        participant_id VARCHAR,
        video_count INTEGER DEFAULT 0,
        analysis_count INTEGER DEFAULT 0,
        total_emotion_score DOUBLE DEFAULT 0.0,
        dominant_emotion VARCHAR,
        created_at TIMESTAMP,
        duration_seconds INTEGER,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
      `,

      // 感情分析データテーブル（時系列データ）
      `
      CREATE TABLE IF NOT EXISTS analytical_emotions (
        id VARCHAR PRIMARY KEY,
        participant_id VARCHAR,
        session_id VARCHAR,
        video_file_id VARCHAR,
        emotion_name VARCHAR,
        score DOUBLE,
        confidence DOUBLE,
        timestamp TIMESTAMP,
        processing_time_ms INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
      `,

      // 感情統計ビュー
      `
      CREATE OR REPLACE VIEW emotion_statistics AS
      SELECT
        participant_id,
        emotion_name,
        COUNT(*) as sample_count,
        AVG(score) as avg_score,
        MAX(score) as max_score,
        MIN(score) as min_score,
        AVG(confidence) as avg_confidence,
        MIN(timestamp) as first_seen,
        MAX(timestamp) as last_seen
      FROM analytical_emotions
      GROUP BY participant_id, emotion_name
      `,

      // 参加者統計ビュー
      `
      CREATE OR REPLACE VIEW participant_statistics AS
      SELECT
        p.*,
        s.total_sessions,
        e.total_emotions,
        e.dominant_emotion,
        e.avg_emotion_score
      FROM analytical_participants p
      LEFT JOIN (
        SELECT
          participant_id,
          COUNT(DISTINCT id) as total_sessions,
          SUM(analysis_count) as total_emotions
        FROM analytical_sessions
        GROUP BY participant_id
      ) s ON p.id = s.participant_id
      LEFT JOIN (
        SELECT
          participant_id,
          emotion_name as dominant_emotion,
          avg_score as avg_emotion_score
        FROM emotion_statistics
        ORDER BY sample_count DESC, avg_score DESC
        LIMIT 1 BY participant_id
      ) e ON p.id = e.participant_id
      `,

      // インデックスの作成
      `CREATE INDEX IF NOT EXISTS idx_emotions_participant ON analytical_emotions(participant_id)`,
      `CREATE INDEX IF NOT EXISTS idx_emotions_session ON analytical_emotions(session_id)`,
      `CREATE INDEX IF NOT EXISTS idx_emotions_timestamp ON analytical_emotions(timestamp)`,
      `CREATE INDEX IF NOT EXISTS idx_emotions_name ON analytical_emotions(emotion_name)`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_participant ON analytical_sessions(participant_id)`
    ];

    for (const query of queries) {
      await this.executeQuery(query);
    }

    console.log('DuckDB analytics database initialized successfully');
  }

  /**
   * Merkle DAG: 参加者データの同期
   * KuzuからDuckDBへのデータ同期
   */
  async syncParticipant(participant: any): Promise<void> {
    const query = `
      INSERT OR REPLACE INTO analytical_participants
      (id, signature, agreed_at, created_at)
      VALUES (?, ?, ?, ?)
    `;

    await this.executeQuery(query, [
      participant.id,
      participant.signature,
      participant.agreedAt,
      new Date().toISOString()
    ]);
  }

  /**
   * Merkle DAG: セッションデータの同期
   */
  async syncSession(session: any): Promise<void> {
    const query = `
      INSERT OR REPLACE INTO analytical_sessions
      (id, participant_id, created_at, duration_seconds)
      VALUES (?, ?, ?, ?)
    `;

    await this.executeQuery(query, [
      session.id,
      session.participantId,
      session.createdAt,
      0 // duration_seconds will be calculated later
    ]);
  }

  /**
   * Merkle DAG: 感情分析データの同期
   */
  async syncEmotionAnalysis(analysis: any): Promise<void> {
    const emotionInserts = analysis.emotions.map((emotion: any) => ({
      id: `${analysis.id}_${emotion.name}`,
      participant_id: analysis.participantId,
      session_id: analysis.sessionId || '',
      video_file_id: analysis.videoFileId,
      emotion_name: emotion.name,
      score: emotion.score,
      confidence: emotion.confidence,
      timestamp: analysis.timestamp,
      processing_time_ms: analysis.processingTime
    }));

    if (emotionInserts.length > 0) {
      const query = `
        INSERT OR REPLACE INTO analytical_emotions
        (id, participant_id, session_id, video_file_id, emotion_name, score, confidence, timestamp, processing_time_ms)
        VALUES ${emotionInserts.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}
      `;

      const params = emotionInserts.flatMap(e => [
        e.id, e.participant_id, e.session_id, e.video_file_id,
        e.emotion_name, e.score, e.confidence, e.timestamp, e.processing_time_ms
      ]);

      await this.executeQuery(query, params);
    }

    // セッション統計の更新
    await this.updateSessionStats(analysis.sessionId || analysis.participantId);
  }

  /**
   * Merkle DAG: セッション統計の更新
   */
  private async updateSessionStats(sessionId: string): Promise<void> {
    const query = `
      UPDATE analytical_sessions
      SET
        analysis_count = (
          SELECT COUNT(*) FROM analytical_emotions
          WHERE session_id = analytical_sessions.id
        ),
        total_emotion_score = (
          SELECT AVG(score) FROM analytical_emotions
          WHERE session_id = analytical_sessions.id
        ),
        dominant_emotion = (
          SELECT emotion_name FROM analytical_emotions
          WHERE session_id = analytical_sessions.id
          GROUP BY emotion_name
          ORDER BY AVG(score) DESC
          LIMIT 1
        ),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await this.executeQuery(query, [sessionId]);
  }

  /**
   * Merkle DAG: 分析クエリの実行
   */
  async getParticipantAnalytics(participantId: string): Promise<AnalyticalParticipant | null> {
    const query = `
      SELECT * FROM participant_statistics WHERE id = ?
    `;

    const result = await this.executeQuery(query, [participantId]);
    return result[0] || null;
  }

  /**
   * Merkle DAG: 全参加者の分析データ取得
   */
  async getAllParticipantAnalytics(): Promise<AnalyticalParticipant[]> {
    const query = `SELECT * FROM participant_statistics ORDER BY created_at DESC`;
    return await this.executeQuery(query);
  }

  /**
   * Merkle DAG: 感情の時系列分析
   */
  async getEmotionTimeSeries(participantId: string, emotionName?: string): Promise<any[]> {
    let query = `
      SELECT
        emotion_name,
        timestamp,
        score,
        confidence
      FROM analytical_emotions
      WHERE participant_id = ?
    `;

    const params = [participantId];

    if (emotionName) {
      query += ` AND emotion_name = ?`;
      params.push(emotionName);
    }

    query += ` ORDER BY timestamp ASC`;

    return await this.executeQuery(query, params);
  }

  /**
   * Merkle DAG: 感情分布の分析
   */
  async getEmotionDistribution(participantId?: string): Promise<any[]> {
    let query = `
      SELECT
        emotion_name,
        COUNT(*) as count,
        AVG(score) as avg_score,
        STDDEV(score) as std_dev,
        MIN(score) as min_score,
        MAX(score) as max_score
      FROM analytical_emotions
    `;

    const params: any[] = [];

    if (participantId) {
      query += ` WHERE participant_id = ?`;
      params.push(participantId);
    }

    query += ` GROUP BY emotion_name ORDER BY count DESC`;

    return await this.executeQuery(query, params);
  }

  /**
   * Merkle DAG: 相関分析
   */
  async getEmotionCorrelations(): Promise<any[]> {
    const query = `
      WITH emotion_pivot AS (
        SELECT
          participant_id,
          session_id,
          timestamp,
          emotion_name,
          score
        FROM analytical_emotions
        WHERE emotion_name IN ('joy', 'sadness', 'anger', 'fear', 'surprise')
      )
      SELECT
        e1.emotion_name as emotion1,
        e2.emotion_name as emotion2,
        CORR(e1.score, e2.score) as correlation
      FROM emotion_pivot e1
      JOIN emotion_pivot e2 ON e1.participant_id = e2.participant_id
        AND e1.timestamp = e2.timestamp
        AND e1.emotion_name < e2.emotion_name
      GROUP BY e1.emotion_name, e2.emotion_name
      HAVING COUNT(*) > 10
      ORDER BY ABS(correlation) DESC
    `;

    return await this.executeQuery(query);
  }

  /**
   * Merkle DAG: クラスタリング分析用のデータ取得
   */
  async getClusteringData(): Promise<any[]> {
    const query = `
      SELECT
        participant_id,
        AVG(CASE WHEN emotion_name = 'joy' THEN score END) as joy_avg,
        AVG(CASE WHEN emotion_name = 'sadness' THEN score END) as sadness_avg,
        AVG(CASE WHEN emotion_name = 'anger' THEN score END) as anger_avg,
        AVG(CASE WHEN emotion_name = 'fear' THEN score END) as fear_avg,
        AVG(CASE WHEN emotion_name = 'surprise' THEN score END) as surprise_avg,
        COUNT(*) as total_samples
      FROM analytical_emotions
      WHERE emotion_name IN ('joy', 'sadness', 'anger', 'fear', 'surprise')
      GROUP BY participant_id
      HAVING total_samples > 5
    `;

    return await this.executeQuery(query);
  }

  /**
   * Merkle DAG: カスタム分析クエリの実行
   */
  async executeAnalyticalQuery(query: string, params: any[] = []): Promise<any[]> {
    return await this.executeQuery(query, params);
  }

  /**
   * 汎用クエリ実行メソッド
   */
  private async executeQuery(query: string, params: any[] = []): Promise<any[]> {
    if (!this.db) {
      console.warn('DuckDB not available, returning empty result');
      return [];
    }

    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err: any, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  /**
   * データベース接続のクローズ
   */
  async close(): Promise<void> {
    if (!this.db) {
      console.warn('DuckDB not available, skipping close');
      return;
    }

    return new Promise((resolve, reject) => {
      this.db.close((err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

// シングルトンインスタンス
export const duckDBManager = new DuckDBManager();
