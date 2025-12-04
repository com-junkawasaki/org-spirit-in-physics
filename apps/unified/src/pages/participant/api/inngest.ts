import type { APIRoute } from 'astro';
import { serve } from 'inngest/astro';
import { inngest } from '../../../lib/participant/inngest';
import {
  videoAnalysisWorkflow,
  videoAnalysisFailureWorkflow,
  resultsProcessingWorkflow
} from '../../../lib/participant/supervisors';
import {
  batchAnalysisWorkflow,
  batchAnalysisFailureWorkflow
} from '../../../lib/participant/supervisors';

// Inngest APIルート（v3形式）
const handler = serve({
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

export const GET: APIRoute = async ({ request }) => {
  return handler({ request });
};

export const POST: APIRoute = async ({ request }) => {
  return handler({ request });
};

export const PUT: APIRoute = async ({ request }) => {
  return handler({ request });
};

