// Merkle DAG: trpc_routers.routers.analysis
// 解析パイプラインルーター
// OWL: spirit:ParticipantApplication.triggers spirit:AnalysisPipeline
// SHACL: spirit:AnalysisProcessShape
// フロー: spirit:SupabaseToAnalysisPipelineFlow

import { z } from 'zod';
import type { SupabaseContext } from '../types/context';
import type { RouterOptions } from '../types/router-options';

/**
 * Merkle DAG: createAnalysisRouter
 * 解析ルーターを作成
 * OWL: spirit:ParticipantApplication.triggers spirit:AnalysisPipeline
 * 入力: spirit:ParticipantResponseData
 * 出力: spirit:AnalysisResultData
 */
export function createAnalysisRouter(
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
     * Merkle DAG: analysis.analyzeParticipant
     * 参加者のレスポンスを分析
     * OWL: spirit:ParticipantApplication.triggers spirit:AnalysisPipeline.performs spirit:ResponseDataRetrievalStep, spirit:SpiritProbabilityCalculationStep
     */
    analyzeParticipant: procedure
      .input(z.object({ participantId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const { participantId } = input;

        if (!options?.analysisFunctions) {
          throw new Error('Analysis functions not provided');
        }

        // 分析パイプラインを実行
        try {
          await options.analysisFunctions.analyzeParticipantResponses(participantId);
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
     * Merkle DAG: analysis.analyzeAll
     * 全参加者を分析
     * OWL: spirit:ParticipantApplication.triggers spirit:AnalysisPipeline.performs spirit:BatchAnalysisProcess
     */
    analyzeAll: procedure.mutation(async ({ ctx }) => {
      if (!options?.analysisFunctions) {
        throw new Error('Analysis functions not provided');
      }

      try {
        await options.analysisFunctions.analyzeAllParticipants();
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
     * Merkle DAG: analysis.getResults
     * 分析結果取得
     * OWL: spirit:ParticipantApplication.accesses spirit:AnalysisResultData
     */
    getResults: procedure
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
}

