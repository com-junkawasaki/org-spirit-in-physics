// LLM-BOUNDARY: 50_adapters - RouteHandler/ServerActions/外部API実装

import { EmotionAnalysisPort } from 'scripts/src/20_ports';
import { EmotionAnalysisResult, EmotionStatistics } from 'scripts/src/00_schema';
import { HumeClient } from 'hume';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { foldEmotionStatistics } from 'scripts/src/30_fold';
import { supabaseManager } from 'scripts/src/lib/database/supabase-manager';

const ARTIFACTS_CACHE_PATH = '/Users/junkawasaki/jun784/root/procs/250901-com-junkawasaki-spiritinphysics/.artifacts_cache';

const hume = new HumeClient({
  apiKey: process.env.HUME_API_KEY || '',
  secretKey: process.env.HUME_API || ''
});

export class EmotionAnalysisAdapter implements EmotionAnalysisPort {
  async analyzeVideoEmotions(
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
      await job.awaitCompletion();

      const predictions = await hume.expressionMeasurement.batch.getJobPredictions(job.jobId);
      const processingTime = Date.now() - startTime;

      const emotions = this.processHumePredictions(predictions);

      const result: EmotionAnalysisResult = {
        participantId,
        videoFile: videoFileName,
        sessionType,
        emotions,
        timestamp: new Date().toISOString(),
        processingTime
      };

      // 一時ファイルを削除
      try {
        if (!videoUrl && existsSync(tempFilePath)) {
          const { unlinkSync } = await import('fs');
          unlinkSync(tempFilePath);
        }
      } catch (cleanupError) {
        console.warn(`Failed to cleanup temp file:`, cleanupError);
      }

      return result;

    } catch (error) {
      console.error(`Error analyzing emotions for ${participantId}/${videoFileName}:`, error);
      return null;
    }
  }

  async analyzeAllParticipantVideos(participantId: string): Promise<EmotionAnalysisResult[]> {
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

      for (const videoFile of videoFiles) {
        const result = await this.analyzeVideoEmotions(participantId, videoFile.fileName, videoFile.sessionType);
        if (result) {
          results.push(result);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      return results;
    } catch (error) {
      console.error(`Error analyzing all videos for ${participantId}:`, error);
      return [];
    }
  }

  async getEmotionStatistics(): Promise<EmotionStatistics> {
    try {
      // これは管理画面での統計計算用
      // 実際の実装ではNeo4jからデータを取得して計算
      const results: EmotionAnalysisResult[] = [];
      return foldEmotionStatistics(results);
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

  private processHumePredictions(predictions: any): Array<{
    name: string;
    score: number;
    confidence: number;
  }> {
    if (!predictions.predictions || predictions.predictions.length === 0) {
      return [];
    }

    const prediction = predictions.predictions[0];

    return prediction.emotions.map((emotion: any) => ({
      name: emotion.name,
      score: emotion.score,
      confidence: prediction.confidence || 0.5
    })).sort((a: any, b: any) => b.score - a.score);
  }
}

export const emotionAnalysisAdapter = new EmotionAnalysisAdapter();
