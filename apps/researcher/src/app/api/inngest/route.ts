import { serve } from 'inngest/next';
import {
  fileImportWorkflow,
  fileImportFailureWorkflow,
  windowsGenerationWorkflow,
  kernelFusionWorkflow,
  kernelFusionFailureWorkflow,
  inngest,
} from '@/lib/workflows';

// Merkle DAG: inngest_api_route -> workflow_server
// Inngestワークフローサーバーの設定
export const { GET, POST, PUT } = serve({
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
