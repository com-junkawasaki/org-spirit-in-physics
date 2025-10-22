import { serve } from 'inngest/next';
import { inngest } from 'scripts/src/50_adapters';
import {
  videoAnalysisWorkflow,
  videoAnalysisFailureWorkflow,
  resultsProcessingWorkflow
} from 'scripts/src/70_supervisors';
import {
  batchAnalysisWorkflow,
  batchAnalysisFailureWorkflow
} from 'scripts/src/70_supervisors';

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
