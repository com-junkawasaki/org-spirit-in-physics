import { serve } from 'inngest/next';
import {
  fileImportWorkflow,
  fileImportFailureWorkflow,
  windowsGenerationWorkflow,
  kernelFusionWorkflow,
  kernelFusionFailureWorkflow,
  // neo4jPersistenceWorkflow, // GraphQLサービス経由に統一のため削除済み
  // neo4jPersistenceFailureWorkflow, // GraphQLサービス経由に統一のため削除済み
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
    
    // Neo4j保存ワークフロー（GraphQLサービス経由に統一のため削除済み）
    // GraphQL経由でのデータ保存が必要な場合は、GraphQLサービス側で実装
    // neo4jPersistenceWorkflow,
    // neo4jPersistenceFailureWorkflow,
  ],
});
