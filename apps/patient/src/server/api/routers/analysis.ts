import { z } from 'zod';
import { router, publicProcedure } from '../../trpc/router';

export const analysisRouter = router({
  /**
   * 参加者のレスポンスを分析
   */
  analyzeParticipant: publicProcedure
    .input(z.object({ participantId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { participantId } = input;

      // 分析パイプラインを実行
      try {
        const { analyzeParticipantResponses } = await import('scripts/src/lib/workflows/analysis-pipeline');
        await analyzeParticipantResponses(participantId);
        return {
          success: true,
          message: `Analysis completed for participant ${participantId}`,
        };
      } catch (error) {
        throw new Error(
          `Analysis failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }),

  /**
   * 全参加者を分析
   */
  analyzeAll: publicProcedure.mutation(async ({ ctx }) => {
    try {
      const { analyzeAllParticipants } = await import('scripts/src/lib/workflows/analysis-pipeline');
      await analyzeAllParticipants();
      return {
        success: true,
        message: 'Analysis completed for all participants',
      };
    } catch (error) {
      throw new Error(
        `Batch analysis failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }),

  /**
   * 分析結果取得
   */
  getResults: publicProcedure
    .input(
      z.object({
        participantId: z.string().uuid().optional(),
        experimentId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase.from('participant_analysis_results').select('*');

      if (input.participantId) {
        query = query.eq('participant_id', input.participantId);
      }

      if (input.experimentId) {
        query = query.eq('experiment_id', input.experimentId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch analysis results: ${error.message}`);
      }

      return data || [];
    }),
});

