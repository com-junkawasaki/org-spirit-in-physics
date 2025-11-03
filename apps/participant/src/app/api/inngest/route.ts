import { serve } from 'inngest/next';
import { Inngest } from 'inngest';
import {
  videoAnalysisWorkflow,
  videoAnalysisFailureWorkflow,
  resultsProcessingWorkflow
} from '../../../../apps/researcher/src/lib/workflows/video-analysis';
import {
  batchAnalysisWorkflow,
  batchAnalysisFailureWorkflow
} from '../../../../apps/researcher/src/lib/workflows/batch-analysis';

// Inngestクライアントの初期化（participant用）
const inngest = new Inngest({
  id: 'spirit-in-physics',
  name: 'Spirit-in-Physics Analysis Pipeline',
  concurrency: 5, // 同時実行数
  retries: 3, // リトライ回数
  // ローカル開発環境の設定
  baseUrl: process.env.NODE_ENV === 'development' ? 'http://localhost:25250' : undefined,
});

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
