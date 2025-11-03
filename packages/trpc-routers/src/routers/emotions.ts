// Merkle DAG: trpc_routers.routers.emotions
// 感情分析ルーター
// OWL: spirit:ParticipantApplication.triggers spirit:EmotionAnalysisProcess
// SHACL: spirit:EmotionDataShape
// フロー: spirit:SupabaseToAnalysisPipelineFlow

import { z } from 'zod';
import type { SupabaseContext } from '../types/context';
import type { RouterOptions } from '../types/router-options';

/**
 * Merkle DAG: createEmotionsRouter
 * 感情分析ルーターを作成
 * OWL: spirit:ParticipantApplication.triggers spirit:EmotionAnalysisProcess
 * 入力: spirit:VideoFile
 * 出力: spirit:EmotionData
 */
export function createEmotionsRouter(
  t: {
    router: (procedures: Record<string, any>) => any;
    procedure: {
      input: <TInput extends any>(schema: TInput) => {
        query: (fn: (opts: { ctx: SupabaseContext; input: any }) => Promise<any>) => any;
        mutation: (fn: (opts: { ctx: SupabaseContext; input: any }) => Promise<any>) => any;
      };
      query: (fn: (opts: { ctx: SupabaseContext; input?: any }) => Promise<any>) => any;
      mutation: (fn: (opts: { ctx: SupabaseContext; input?: any }) => Promise<any>) => any;
    };
  },
  options?: RouterOptions
) {
  const { router, procedure } = t;

  return router({
    /**
     * Merkle DAG: emotions.analyzeSingle
     * 単一動画の感情分析
     * OWL: spirit:ParticipantApplication.triggers spirit:EmotionAnalysisProcess.performs spirit:VideoEmotionAnalysisStep
     */
    analyzeSingle: procedure
      .input(
        z.object({
          participantId: z.string().uuid(),
          videoFile: z.string(),
          sessionType: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        if (!options?.emotionAnalysisFunctions) {
          throw new Error('Emotion analysis functions not provided');
        }

        const result = await options.emotionAnalysisFunctions.analyzeVideoEmotions(
          input.participantId,
          input.videoFile,
          input.sessionType
        );

        if (!result) {
          throw new Error('Failed to analyze video emotions');
        }

        return {
          success: true,
          data: result,
        };
      }),

    /**
     * Merkle DAG: emotions.analyzeAll
     * 参加者の全動画を分析
     * OWL: spirit:ParticipantApplication.triggers spirit:EmotionAnalysisProcess.performs spirit:BatchVideoEmotionAnalysisStep
     */
    analyzeAll: procedure
      .input(z.object({ participantId: z.string().uuid() }))
      .mutation(async ({ input }) => {
        if (!options?.emotionAnalysisFunctions) {
          throw new Error('Emotion analysis functions not provided');
        }

        const results = await options.emotionAnalysisFunctions.analyzeAllParticipantVideos(input.participantId);
        return {
          success: true,
          data: results,
          count: results.length,
        };
      }),

    /**
     * Merkle DAG: emotions.getResults
     * 感情分析結果取得
     * OWL: spirit:ParticipantApplication.accesses spirit:EmotionData
     */
    getResults: procedure
      .input(z.object({ participantId: z.string().uuid() }))
      .query(async ({ input }) => {
        if (!options?.emotionAnalysisFunctions) {
          throw new Error('Emotion analysis functions not provided');
        }

        const results = await options.emotionAnalysisFunctions.loadEmotionAnalysisResults(input.participantId);
        const stats = options.emotionAnalysisFunctions.generateEmotionStatistics(results);

        return {
          success: true,
          data: results,
          statistics: stats,
        };
      }),

    /**
     * Merkle DAG: emotions.getStatistics
     * 感情統計情報取得
     * OWL: spirit:ParticipantApplication.accesses spirit:EmotionData
     */
    getStatistics: procedure.query(async ({ ctx }) => {
      // Supabaseから感情データを取得
      const { data: emotions } = await ctx.supabase
        .from('participant_response_data')
        .select('emotion')
        .not('emotion', 'is', null);

      // 感情データを集計
      const emotionMap: Record<string, { count: number; totalScore: number }> = {};
      (emotions || []).forEach((emotion: any) => {
        const emotionName = emotion.emotion;
        if (!emotionMap[emotionName]) {
          emotionMap[emotionName] = { count: 0, totalScore: 0 };
        }
        emotionMap[emotionName].count += 1;
        emotionMap[emotionName].totalScore += 1;
      });

      const dominantEmotions = Object.entries(emotionMap)
        .map(([emotion, stats]) => ({
          emotion,
          count: stats.count,
          averageScore: stats.totalScore / stats.count,
        }))
        .sort((a, b) => b.count - a.count);

      return {
        success: true,
        data: {
          totalAnalyses: emotions?.length || 0,
          dominantEmotions,
        },
      };
    }),
  });
}

