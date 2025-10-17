import { serve } from 'inngest/next';
import {
  fileImportWorkflow,
  fileImportFailureWorkflow,
  windowsGenerationWorkflow,
  windowsGenerationFailureWorkflow,
  kernelFusionWorkflow,
  kernelFusionFailureWorkflow,
  neo4jPersistenceWorkflow,
  neo4jPersistenceFailureWorkflow,
} from '@/lib/workflows';

// Merkle DAG: inngest_api_route -> workflow_server
// Inngestワークフローサーバーの設定
export const { GET, POST, PUT } = serve({
  client: {
    id: 'spirit-in-physics-visualizer',
    name: 'Spirit-in-Physics Kernel Fusion Pipeline',
  },
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
    
    // Neo4j保存ワークフロー
    neo4jPersistenceWorkflow,
    neo4jPersistenceFailureWorkflow,
  ],
  // 開発環境での設定
  env: process.env.NODE_ENV === 'development' ? 'development' : 'production',
  // ログレベル
  logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  // リトライ設定
  retries: 3,
  // 同時実行数
  concurrency: 3,
});
