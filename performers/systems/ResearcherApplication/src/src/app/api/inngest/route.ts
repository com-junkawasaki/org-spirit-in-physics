import { serve } from 'inngest/next';
import {
  fileImportWorkflow,
  fileImportFailureWorkflow,
  windowsGenerationWorkflow,
  windowsGenerationFailureWorkflow,
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
    windowsGenerationFailureWorkflow,
    
    // 核融合ワークフロー
    kernelFusionWorkflow,
    kernelFusionFailureWorkflow,
    
    // Neo4j保存ワークフローはSupabase移行により無効化
  ],
});
