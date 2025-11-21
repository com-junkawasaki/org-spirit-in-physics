import { serve } from 'inngest/next';
import { inngest } from '@/lib/adapters';
import {
  videoAnalysisWorkflow,
  videoAnalysisFailureWorkflow,
  resultsProcessingWorkflow
} from '@/lib/supervisors';
import {
  batchAnalysisWorkflow,
  batchAnalysisFailureWorkflow
} from '@/lib/supervisors';

// Inngest APIルート（v3形式）
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    // 動画分析ワークフロー
    videoAnalysisWorkflow,
    videoAnalysisFailureWorkflow,
    resultsProcessingWorkflow,

    // バッチ分析ワークフロー
    batchAnalysisWorkflow,
    batchAnalysisFailureWorkflow,
  ],
});
