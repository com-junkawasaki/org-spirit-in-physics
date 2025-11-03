import { z } from 'zod';
import { router, publicProcedure } from '../../trpc/router';
import {
  analyzeVideoEmotions,
  analyzeAllParticipantVideos,
  loadEmotionAnalysisResults,
  generateEmotionStatistics,
} from '../../../../apps/researcher/src/lib/emotion-analysis';

export const emotionsRouter = router({
  /**
   * 単一動画の感情分析
   */
  analyzeSingle: publicProcedure
    .input(
      z.object({
        participantId: z.string().uuid(),
        videoFile: z.string(),
        sessionType: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await analyzeVideoEmotions(
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
   * 参加者の全動画を分析
   */
  analyzeAll: publicProcedure
    .input(z.object({ participantId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const results = await analyzeAllParticipantVideos(input.participantId);
      return {
        success: true,
        data: results,
        count: results.length,
      };
    }),

  /**
   * 感情分析結果取得
   */
  getResults: publicProcedure
    .input(z.object({ participantId: z.string().uuid() }))
    .query(async ({ input }) => {
      const results = await loadEmotionAnalysisResults(input.participantId);
      const stats = generateEmotionStatistics(results);

      return {
        success: true,
        data: results,
        statistics: stats,
      };
    }),

  /**
   * 感情統計情報取得
   */
  getStatistics: publicProcedure.query(async ({ ctx }) => {
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

