import type { APIRoute } from 'astro';
import { serve } from 'inngest/astro';
import {
  fileImportWorkflow,
  fileImportFailureWorkflow,
  windowsGenerationWorkflow,
  kernelFusionWorkflow,
  kernelFusionFailureWorkflow,
  inngest,
} from '../../../lib/researcher/workflows';

const handler = serve({
  client: inngest,
  functions: [
    // ファイルインポートワークフロー
    fileImportWorkflow,
    fileImportFailureWorkflow,
    
    // ウィンドウ生成ワークフロー
    windowsGenerationWorkflow,
    
    // 核融合ワークフロー
    kernelFusionWorkflow,
    kernelFusionFailureWorkflow,
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

