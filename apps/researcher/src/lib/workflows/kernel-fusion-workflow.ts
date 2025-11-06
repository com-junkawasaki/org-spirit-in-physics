import { inngest, events, type KernelFusionEvent } from '../inngest';
import { fuseKernels } from '../kernel-fusion';
import { createNeo4jClient } from '../neo4j'; // 新しいGraphQLクライアントを使用

// 核融合ワークフローを更新
export const kernelFusionWorkflow = inngest.createFunction(
  {
    id: 'kernel-fusion-workflow',
    name: 'Kernel Fusion and Embedding',
    description: '複数モダリティの距離行列を核融合して埋め込みを生成',
    priority: {
      run: 'event.data.priority || "normal"',
    },
  },
  { event: events.KERNEL_FUSION_REQUESTED },
  async ({ event, step }) => {
    const { participantId, distances, n, options } = event.data as KernelFusionEvent;
    
    const client = createNeo4jClient();

    try {
      // ステップ1: 距離行列の読み込み（GraphQL呼び出しに置き換え）
      const distanceMatrices = await client.getDistanceMatrices({
        participantId,
        modalities: Object.keys(distances),
      });

      // ステップ2: 核融合の実行
      const fusionResult = fuseKernels(distanceMatrices, options); // 既存のfuseKernels関数を使用

      // ステップ3: 埋め込みの生成
      const embeddingResult = calculateEmbedding(distanceMatrices, options.dimensions); // 既存のcalculateEmbedding関数を使用

      // ステップ4: 核融合実行ノードの作成
      const kernelFusionRun = await client.createKernelFusionRun({
        participantId,
        weights: fusionResult.weights,
        normalization: options.normalization,
        dimensions: options.dimensions,
        timestamp: new Date().toISOString(),
      });

      // ステップ5: 埋め込み結果ノードの作成
      for (const embedding of embeddingResult.points) {
        await client.createEmbeddingResult({
          kernelFusionRunId: kernelFusionRun.id,
          method: 'kernel_fusion',
          dimensions: options.dimensions,
          points: embedding,
        });
      }

      // ステップ6: 完了イベントの送信
      await inngest.send({
        name: events.KERNEL_FUSION_COMPLETED,
        data: {
          participantId,
          kernelFusionRunId: kernelFusionRun.id,
          embeddingDimensions: options.dimensions,
          weights: fusionResult.weights,
          timestamp: new Date().toISOString(),
        },
      });

      return {
        success: true,
        participantId,
        kernelFusionRunId: kernelFusionRun.id,
        embeddingCount: embeddingResult.points.length,
        fusionResult,
      };
    } catch (error) {
      // 失敗時のイベント送信
      await inngest.send({
        name: events.KERNEL_FUSION_FAILED,
        data: {
          participantId,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      });

      throw error;
    }
  }
);

// 失敗ハンドラー
export const kernelFusionFailureWorkflow = inngest.createFunction(
  {
    id: 'kernel-fusion-failure-handler',
    name: 'Kernel Fusion Failure Handler',
  },
  { event: events.KERNEL_FUSION_FAILED },
  async ({ event, step }) => {
    const { participantId, error } = event.data;

    // エラー処理ロジック
    console.error('Kernel fusion failed:', error);

    // 通知送信
    await inngest.send({
      name: events.NOTIFICATION_SENT,
      data: {
        type: 'kernel_fusion_failure',
        participantId,
        message: error.message,
        timestamp: new Date().toISOString(),
      },
    });

    return { handled: true };
  }
);
