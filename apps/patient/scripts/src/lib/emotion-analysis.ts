import { HumeClient } from 'hume';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { supabaseManager } from './database/supabase-manager';

// サーバーサイドでのみインポート
let blobStorage: any = null;

if (typeof window === 'undefined') {
  try {
    const blobModule = require('./blob-storage');
    blobStorage = blobModule.blobStorage;
  } catch (error) {
    console.warn('Blob storage not available:', error);
  }
}

const ARTIFACTS_CACHE_PATH = '/Users/junkawasaki/jun784/root/procs/250901-com-junkawasaki-spiritinphysics/.artifacts_cache';

// Types for emotion analysis data
export interface EmotionAnalysisResult {
  participantId: string;
  videoFile: string;
  sessionType: string;
  emotions: Array<{
    name: string;
    score: number;
    confidence: number;
  }>;
  timestamp: string;
  processingTime: number;
}

interface HumeEmotionResponse {
  predictions: Array<{
    emotions: Array<{
      name: string;
      score: number;
    }>;
    confidence?: number;
  }>;
}

// Humeクライアントの初期化
const hume = new HumeClient({
  apiKey: process.env.HUME_API_KEY || '',
  secretKey: process.env.HUME_API || ''
});

/**
 * ビデオファイルに対して感情分析を実行
 */
export async function analyzeVideoEmotions(
  participantId: string,
  videoFileName: string,
  sessionType: string
): Promise<EmotionAnalysisResult | null> {
  try {
    console.log(`Starting emotion analysis for ${participantId}/${videoFileName}`);
    const startTime = Date.now();

    // セッションIDを取得または生成
    const sessionId = `${participantId}_${sessionType}`;

    // Supabase Storageから動画ファイルをダウンロード
    let videoBuffer: Buffer | null = null;
    let videoUrl: string | null = null;

    try {
      // まずSupabase Storageからダウンロードを試みる
      videoBuffer = await supabaseManager.downloadVideoFile(participantId, sessionId, videoFileName);
      
      if (!videoBuffer) {
        // フォールバック: ファイルシステムから読み込む（後方互換性のため）
        const videoPath = join(ARTIFACTS_CACHE_PATH, participantId, videoFileName);
        if (existsSync(videoPath)) {
          const { readFileSync } = await import('fs');
          videoBuffer = readFileSync(videoPath);
          console.warn(`Video file not found in Supabase Storage, using file system: ${videoPath}`);
        } else {
          console.error(`Video file not found: ${videoFileName} for participant ${participantId}`);
          return null;
        }
      }
    } catch (downloadError) {
      console.error(`Error downloading video from Supabase Storage:`, downloadError);
      // フォールバック: ファイルシステムから読み込む
      const videoPath = join(ARTIFACTS_CACHE_PATH, participantId, videoFileName);
      if (existsSync(videoPath)) {
        const { readFileSync } = await import('fs');
        videoBuffer = readFileSync(videoPath);
        console.warn(`Using file system fallback: ${videoPath}`);
      } else {
        console.error(`Video file not found in both Supabase Storage and file system`);
        return null;
      }
    }

    // 一時ファイルとして保存してHume APIに渡す（Hume APIはファイルパスまたはURLを要求）
    const tempFilePath = join(process.cwd(), 'tmp', `${participantId}_${videoFileName}`);
    const { mkdirSync } = await import('fs');
    const { dirname } = await import('path');
    
    try {
      mkdirSync(dirname(tempFilePath), { recursive: true });
      writeFileSync(tempFilePath, videoBuffer);
    } catch (tempError) {
      console.error(`Error writing temp file:`, tempError);
      // 一時ファイル作成に失敗した場合、URLを使用
      videoUrl = await supabaseManager.getVideoFileUrl(participantId, sessionId, videoFileName);
      if (!videoUrl) {
        throw new Error('Failed to get video URL from Supabase Storage');
      }
    }

    // Hume APIで感情分析を実行
    const job = await hume.expressionMeasurement.batch.startInferenceJob({
      models: {
        face: {
          facs: {},
          descriptions: {}
        }
      },
      urls: videoUrl ? [videoUrl] : [`file://${tempFilePath}`]
    });

    console.log(`Job started: ${job.jobId}`);

    // ジョブの完了を待つ
    await job.awaitCompletion();

    // 結果を取得
    const predictions = await hume.expressionMeasurement.batch.getJobPredictions(job.jobId);

    const processingTime = Date.now() - startTime;

    // 結果を処理
    const emotions = processHumePredictions(predictions);

    const result: EmotionAnalysisResult = {
      participantId,
      videoFile: videoFileName,
      sessionType,
      emotions,
      timestamp: new Date().toISOString(),
      processingTime
    };

    // 結果を保存
    await saveEmotionAnalysisResult(result);

    // 一時ファイルを削除
    try {
      if (!videoUrl && existsSync(tempFilePath)) {
        const { unlinkSync } = await import('fs');
        unlinkSync(tempFilePath);
      }
    } catch (cleanupError) {
      console.warn(`Failed to cleanup temp file:`, cleanupError);
    }

    console.log(`Emotion analysis completed for ${participantId}/${videoFileName}`);
    return result;

  } catch (error) {
    console.error(`Error analyzing emotions for ${participantId}/${videoFileName}:`, error);
    return null;
  }
}

/**
 * Hume APIの予測結果を処理して感情データを抽出
 */
function processHumePredictions(predictions: any): Array<{
  name: string;
  score: number;
  confidence: number;
}> {
  if (!predictions.predictions || predictions.predictions.length === 0) {
    return [];
  }

  // 最初の予測結果を使用（必要に応じて平均化などの処理を追加可能）
  const prediction = predictions.predictions[0];

  return prediction.emotions.map(emotion => ({
    name: emotion.name,
    score: emotion.score,
    confidence: prediction.confidence || 0.5
  })).sort((a, b) => b.score - a.score); // スコアの高い順にソート
}

/**
 * 感情分析結果をファイルに保存
 */
export async function saveEmotionAnalysisResult(result: EmotionAnalysisResult): Promise<void> {
  try {
    // Supabaseに直接保存（ファイルシステム依存を削除）
    const { supabaseManager } = await import('./database/supabase-manager.js');
    // EmotionAnalysisResultをEmotionAnalysis形式に変換
    await supabaseManager.saveEmotionAnalysis({
      id: `${result.participantId}_${result.videoFile}_${Date.now()}`,
      participantId: result.participantId,
      videoFileId: `${result.participantId}_${result.videoFile}`,
      sessionType: result.sessionType,
      emotions: result.emotions,
      timestamp: result.timestamp,
      processingTime: result.processingTime,
    });

  } catch (error) {
    console.error('Error saving emotion analysis result:', error);
  }
}

/**
 * 保存された感情分析結果を読み込み
 */
export async function loadEmotionAnalysisResults(participantId: string): Promise<EmotionAnalysisResult[]> {
  try {
    // storageAdapter経由でNeo4jから感情分析データを取得
    // Supabaseから直接読み込み（storageAdapterは非推奨）
    const { supabaseManager } = await import('./database/supabase-manager.js');
    const emotionAnalysis = await supabaseManager.getEmotionAnalysis(participantId);
    return emotionAnalysis.map(sa => ({
      participantId: sa.participantId,
      videoFile: sa.videoFileId?.replace(`${sa.participantId}_`, '') || '',
      sessionType: sa.sessionType || 'session-1',
      emotions: Array.isArray(sa.emotions) ? sa.emotions : (sa.emotions ? Object.entries(sa.emotions).map(([name, data]: [string, any]) => ({
        name,
        score: typeof data === 'number' ? data : data?.score || 0,
        confidence: typeof data === 'number' ? data : data?.confidence || 0,
      })) : []),
      timestamp: sa.timestamp || new Date().toISOString(),
      processingTime: 0, // データベースには保存されていないためデフォルト値
    }));
  } catch (error) {
    console.error(`Error loading emotion analysis results for ${participantId}:`, error);
    return [];
  }
}

/**
 * 参加者の全ビデオファイルに対して感情分析を実行
 */
export async function analyzeAllParticipantVideos(participantId: string): Promise<EmotionAnalysisResult[]> {
  try {
    // Supabaseから動画ファイル一覧を取得
    const videoFiles = await supabaseManager.getParticipantVideoFiles(participantId);

    if (videoFiles.length === 0) {
      // フォールバック: ファイルシステムから取得（後方互換性のため）
      const participantPath = join(ARTIFACTS_CACHE_PATH, participantId);
      if (existsSync(participantPath)) {
        const { readdirSync } = await import('fs');
        const fileSystemFiles = readdirSync(participantPath)
          .filter((file: string) => file.endsWith('.webm'))
          .map((file: string) => ({
            fileName: file,
            sessionId: `${participantId}_${file.includes('session-1') ? 'session-1' : 'session-2'}`,
            sessionType: file.includes('session-1') ? 'session-1' : 'session-2'
          }));
        
        if (fileSystemFiles.length > 0) {
          console.warn(`Using file system fallback for video files`);
          videoFiles.push(...fileSystemFiles);
        }
      }
    }

    if (videoFiles.length === 0) {
      console.error(`No video files found for participant: ${participantId}`);
      return [];
    }

    const results: EmotionAnalysisResult[] = [];
    const { storageAdapter } = await import('../50_adapters/storage-adapter.ts');

    for (const videoFile of videoFiles) {
      const result = await analyzeVideoEmotions(participantId, videoFile.fileName, videoFile.sessionType);
      if (result) {
        results.push(result);
        // Supabaseに個別に保存
        await storageAdapter.saveEmotionAnalysis(participantId, result);
      }

      // APIレート制限を考慮して少し待つ
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  } catch (error) {
    console.error(`Error analyzing all videos for ${participantId}:`, error);
    return [];
  }
}

/**
 * Supabaseから感情分析の統計情報を取得（Neo4jから移行）
 * @deprecated この関数はgetEmotionStatisticsFromSupabaseに置き換えられました
 */
export async function getEmotionStatisticsFromNeo4j(): Promise<{
  totalAnalyses: number;
  averageEmotions: Record<string, number>;
  dominantEmotions: Array<{ emotion: string; count: number }>;
  processingStats: {
    averageTime: number;
    totalTime: number;
  };
}> {
    try {
      // Supabaseマネージャーを使用
      const { supabaseManager } = await import('./database/supabase-manager.ts');
      return await supabaseManager.getEmotionStatistics();
  } catch (error) {
    console.error('Error getting emotion statistics from Supabase:', error);
  }

  // Fallback to empty stats
  return {
    totalAnalyses: 0,
    averageEmotions: {},
    dominantEmotions: [],
    processingStats: { averageTime: 0, totalTime: 0 }
  };
}

/**
 * 感情分析の統計情報を生成（従来の関数）
 */
export function generateEmotionStatistics(results: EmotionAnalysisResult[]): {
  totalAnalyses: number;
  averageEmotions: Record<string, number>;
  dominantEmotions: Array<{ emotion: string; count: number }>;
  processingStats: {
    averageTime: number;
    totalTime: number;
  };
} {
  if (results.length === 0) {
    return {
      totalAnalyses: 0,
      averageEmotions: {},
      dominantEmotions: [],
      processingStats: { averageTime: 0, totalTime: 0 }
    };
  }

  const emotionScores: Record<string, number[]> = {};
  const dominantEmotions: Record<string, number> = {};
  let totalProcessingTime = 0;

  results.forEach(result => {
    totalProcessingTime += result.processingTime;

    result.emotions.forEach(emotion => {
      if (!emotionScores[emotion.name]) {
        emotionScores[emotion.name] = [];
      }
      emotionScores[emotion.name].push(emotion.score);
    });

    // 各分析で最もスコアの高い感情をカウント
    if (result.emotions.length > 0) {
      const dominantEmotion = result.emotions[0].name;
      dominantEmotions[dominantEmotion] = (dominantEmotions[dominantEmotion] || 0) + 1;
    }
  });

  // 平均感情スコアを計算
  const averageEmotions: Record<string, number> = {};
  Object.entries(emotionScores).forEach(([emotion, scores]) => {
    averageEmotions[emotion] = scores.reduce((a, b) => a + b, 0) / scores.length;
  });

  // ドミナント感情をソート
  const sortedDominantEmotions = Object.entries(dominantEmotions)
    .map(([emotion, count]) => ({ emotion, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalAnalyses: results.length,
    averageEmotions,
    dominantEmotions: sortedDominantEmotions,
    processingStats: {
      averageTime: totalProcessingTime / results.length,
      totalTime: totalProcessingTime
    }
  };
}
